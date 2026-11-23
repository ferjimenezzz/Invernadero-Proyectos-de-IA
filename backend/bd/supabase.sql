-- =============================================================================
--  SUPABASE · permisos, RLS, Auth, Realtime y retención del esquema inv
--  Correr DESPUÉS de invernadero_bd.sql. Es idempotente (se puede volver a correr,
--  p. ej. después de crear funciones o tablas nuevas para que reciban sus permisos).
--  En local: primero pruebas/stub_supabase.sql (simula auth, anon, authenticated…).
--
--  Además, en el panel de Supabase: Settings → API → Exposed schemas → agregar "inv"
--  (las apps mandan el header Accept-Profile / Content-Profile: inv).
--
--  Matriz de escritura (inv.usuario.rol). LECTOR solo lee.
--   comando_actuador INSERT ........ OPERADOR (MANUAL, a su nombre), AUTOMATIZACION (REGLA/IA), ADMIN
--   comando_actuador UPDATE ........ CONECTIVIDAD, AUTOMATIZACION, ADMIN (estado, enviado_en, confirmado_en)
--   alerta UPDATE (reconocer) ...... OPERADOR, ADMIN (reconocida_por = el propio usuario)
--   umbral INSERT/UPDATE ........... OPERADOR, AUTOMATIZACION, ADMIN
--   actuador UPDATE ................ OPERADOR, AUTOMATIZACION, HARDWARE, ADMIN
--   actividad INSERT/UPDATE ........ OPERADOR, ADMIN
--   regla_automatizacion, prediccion_ia, estado_sensor INSERT/UPDATE ... AUTOMATIZACION, ADMIN
--   nodo, tipo_sensor, variable, tipo_sensor_variable, sensor, actuador INSERT/UPDATE ... HARDWARE, ADMIN
--   usuario UPDATE ................. ADMIN
--   fn_calibrar_sensor ............. OPERADOR, HARDWARE, ADMIN (lo revisa la función)
--   fn_detener_todo ................ OPERADOR, AUTOMATIZACION, ADMIN (por RLS de las tablas)
--  Los GRANT por columna son por rol de PostgreSQL (authenticated), no por rol de la app:
--  cada tabla recibe la unión de columnas que necesita cualquier rol y RLS decide quién escribe.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Usuario y rol de la sesión (reemplazan los marcadores de invernadero_bd.sql)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION inv.fn_usuario_actual() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT id FROM inv.usuario WHERE auth_id = auth.uid() AND activo $$;

CREATE OR REPLACE FUNCTION inv.fn_rol_actual() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT rol::text FROM inv.usuario WHERE auth_id = auth.uid() AND activo $$;

-- Cada cuenta nueva de Supabase Auth recibe su perfil LECTOR (un ADMIN le sube el rol).
-- Si ya existía un perfil con ese correo sin cuenta ligada, se liga en vez de duplicarlo.
CREATE OR REPLACE FUNCTION inv.fn_crear_perfil() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE inv.usuario SET auth_id = NEW.id
     WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
    IF NOT FOUND THEN
        INSERT INTO inv.usuario (auth_id, nombre, email, rol)
        VALUES (NEW.id,
                left(coalesce(nullif(NEW.raw_user_meta_data ->> 'nombre', ''), NEW.email, NEW.id::text), 100),
                left(coalesce(NEW.email, NEW.id::text), 150),
                'LECTOR');
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_crear_perfil_inv ON auth.users;
CREATE TRIGGER tr_crear_perfil_inv AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION inv.fn_crear_perfil();

ALTER TABLE inv.comando_actuador ALTER COLUMN usuario_id SET DEFAULT inv.fn_usuario_actual();
ALTER TABLE inv.actividad        ALTER COLUMN creado_por SET DEFAULT inv.fn_usuario_actual();

-- -----------------------------------------------------------------------------
-- Vistas con los permisos y RLS de quien consulta (no del dueño)
-- -----------------------------------------------------------------------------
DO $$
DECLARE v text;
BEGIN
    FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'inv' LOOP
        EXECUTE format('ALTER VIEW inv.%I SET (security_invoker = true)', v);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Privilegios (se parte de cero para que el archivo sea idempotente)
-- -----------------------------------------------------------------------------
REVOKE ALL ON SCHEMA inv FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES    IN SCHEMA inv FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA inv FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA inv FROM PUBLIC, anon, authenticated;
-- shortcut: los privilegios por omisión por esquema solo pueden AGREGAR permisos (no quitan el
-- EXECUTE global a PUBLIC); por eso las funciones nuevas quedan protegidas al volver a correr este archivo.

-- service_role: el suscriptor MQTT y los scripts (salta RLS)
GRANT USAGE ON SCHEMA inv TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA inv TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA inv TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA inv TO service_role;

-- authenticated: lectura de todo menos el correo de los usuarios
GRANT USAGE ON SCHEMA inv TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA inv TO authenticated;
REVOKE SELECT ON inv.usuario FROM authenticated;
GRANT SELECT (id, auth_id, nombre, rol, activo) ON inv.usuario TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA inv TO authenticated;

-- authenticated: escritura (RLS de abajo decide qué rol de la app puede)
GRANT INSERT (actuador_id, accion, duracion_s, valor, origen, regla_id, usuario_id, alerta_id, motivo)
      ON inv.comando_actuador TO authenticated;
GRANT UPDATE (estado, enviado_en, confirmado_en) ON inv.comando_actuador TO authenticated;
GRANT UPDATE (reconocida_por, reconocida_en) ON inv.alerta TO authenticated;
GRANT UPDATE (nombre, rol, activo) ON inv.usuario TO authenticated;
GRANT INSERT, UPDATE ON inv.umbral, inv.actividad, inv.regla_automatizacion, inv.prediccion_ia,
                        inv.estado_sensor, inv.nodo, inv.tipo_sensor, inv.variable,
                        inv.tipo_sensor_variable, inv.sensor, inv.actuador TO authenticated;

GRANT EXECUTE ON FUNCTION
      inv.fn_historico(text, text, timestamptz, timestamptz, interval),
      inv.fn_estadistica(text, timestamptz, timestamptz),
      inv.fn_detener_todo(text),
      inv.fn_calibrar_sensor(text, jsonb),
      inv.fn_usuario_actual(),
      inv.fn_rol_actual(),
      inv.fn_codigo_dispositivo(text, integer),
      inv.fn_codigo_sensor(integer)
   TO authenticated;
-- fn_ingestar_paquete y fn_purgar_payload: solo service_role (ya lo tiene arriba).

-- -----------------------------------------------------------------------------
-- RLS: todas las tablas; authenticated lee todo; escritura según la matriz
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'inv' LOOP
        EXECUTE format('ALTER TABLE inv.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS lectura ON inv.%I', t);
        EXECUTE format('CREATE POLICY lectura ON inv.%I FOR SELECT TO authenticated USING (true)', t);
    END LOOP;
END $$;

-- Tablas donde basta el rol: (tabla, roles que insertan, roles que actualizan)
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('umbral',               '{OPERADOR,AUTOMATIZACION,ADMIN}',          '{OPERADOR,AUTOMATIZACION,ADMIN}'),
        ('actividad',            '{OPERADOR,ADMIN}',                         '{OPERADOR,ADMIN}'),
        ('regla_automatizacion', '{AUTOMATIZACION,ADMIN}',                   '{AUTOMATIZACION,ADMIN}'),
        ('prediccion_ia',        '{AUTOMATIZACION,ADMIN}',                   '{AUTOMATIZACION,ADMIN}'),
        ('estado_sensor',        '{AUTOMATIZACION,ADMIN}',                   '{AUTOMATIZACION,ADMIN}'),
        ('nodo',                 '{HARDWARE,ADMIN}',                         '{HARDWARE,ADMIN}'),
        ('tipo_sensor',          '{HARDWARE,ADMIN}',                         '{HARDWARE,ADMIN}'),
        ('variable',             '{HARDWARE,ADMIN}',                         '{HARDWARE,ADMIN}'),
        ('tipo_sensor_variable', '{HARDWARE,ADMIN}',                         '{HARDWARE,ADMIN}'),
        ('sensor',               '{HARDWARE,ADMIN}',                         '{HARDWARE,ADMIN}'),
        ('actuador',             '{HARDWARE,ADMIN}',                         '{OPERADOR,AUTOMATIZACION,HARDWARE,ADMIN}')
    ) AS x(tabla, ins, upd) LOOP
        EXECUTE format('DROP POLICY IF EXISTS escritura_insert ON inv.%I', r.tabla);
        EXECUTE format('CREATE POLICY escritura_insert ON inv.%I FOR INSERT TO authenticated
                        WITH CHECK (inv.fn_rol_actual() = ANY (%L::text[]))', r.tabla, r.ins);
        EXECUTE format('DROP POLICY IF EXISTS escritura_update ON inv.%I', r.tabla);
        EXECUTE format('CREATE POLICY escritura_update ON inv.%I FOR UPDATE TO authenticated
                        USING (inv.fn_rol_actual() = ANY (%L::text[]))
                        WITH CHECK (inv.fn_rol_actual() = ANY (%L::text[]))', r.tabla, r.upd, r.upd);
    END LOOP;
END $$;

-- AUTOMATIZACION también puede dejar comandos MANUAL a su nombre: los genera fn_detener_todo.
DROP POLICY IF EXISTS escritura_insert ON inv.comando_actuador;
CREATE POLICY escritura_insert ON inv.comando_actuador FOR INSERT TO authenticated
WITH CHECK (
       inv.fn_rol_actual() = 'ADMIN'
    OR (inv.fn_rol_actual() IN ('OPERADOR','AUTOMATIZACION')
        AND origen = 'MANUAL' AND usuario_id = inv.fn_usuario_actual())
    OR (inv.fn_rol_actual() = 'AUTOMATIZACION' AND origen IN ('REGLA','IA'))
);

DROP POLICY IF EXISTS escritura_update ON inv.comando_actuador;
CREATE POLICY escritura_update ON inv.comando_actuador FOR UPDATE TO authenticated
USING      (inv.fn_rol_actual() IN ('CONECTIVIDAD','AUTOMATIZACION','ADMIN'))
WITH CHECK (inv.fn_rol_actual() IN ('CONECTIVIDAD','AUTOMATIZACION','ADMIN'));

DROP POLICY IF EXISTS reconocer ON inv.alerta;
CREATE POLICY reconocer ON inv.alerta FOR UPDATE TO authenticated
USING      (inv.fn_rol_actual() IN ('OPERADOR','ADMIN'))
WITH CHECK (inv.fn_rol_actual() IN ('OPERADOR','ADMIN') AND reconocida_por = inv.fn_usuario_actual());

DROP POLICY IF EXISTS escritura_update ON inv.usuario;
CREATE POLICY escritura_update ON inv.usuario FOR UPDATE TO authenticated
USING (inv.fn_rol_actual() = 'ADMIN') WITH CHECK (inv.fn_rol_actual() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- Realtime: las apps y Conectividad escuchan alertas y comandos (no pueden hacer LISTEN)
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RAISE NOTICE 'No existe la publicación supabase_realtime; se omite Realtime';
        RETURN;
    END IF;
    FOREACH t IN ARRAY ARRAY['alerta','comando_actuador'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                        WHERE pubname = 'supabase_realtime' AND schemaname = 'inv' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE inv.%I', t);
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Retención: purga diaria del JSON crudo (> 7 días) con pg_cron, si está disponible
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'pg_cron no disponible (%). Programar aparte: SELECT inv.fn_purgar_payload(7);', SQLERRM;
        RETURN;
    END;
    EXECUTE $q$SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purgar-payload-inv'$q$;
    -- 09:00 UTC = 03:00 en America/Mexico_City
    EXECUTE $q$SELECT cron.schedule('purgar-payload-inv', '0 9 * * *', 'SELECT inv.fn_purgar_payload(7)')$q$;
END $$;

COMMIT;
