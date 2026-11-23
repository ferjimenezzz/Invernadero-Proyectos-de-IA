-- =============================================================================
--  PRUEBAS DE PERMISOS Y RLS · matriz de supabase.sql
--  Requiere stub_supabase.sql (en local) + invernadero_bd.sql + supabase.sql.
--  Simula a cada rol como lo hace Supabase: SET ROLE authenticated + request.jwt.claims.
--  Denegado = error 42501 (sin permiso o violación de RLS) o 0 filas actualizadas.
--  Todo se deshace al final (ROLLBACK).
-- =============================================================================
BEGIN;

-- Cambia a la sesión de la cuenta con ese rol (su auth_id es md5(rol)::uuid)
CREATE FUNCTION pg_temp.como(p_rol text) RETURNS void
LANGUAGE plpgsql AS $do$
BEGIN
    RESET ROLE;
    IF p_rol IN ('anon', 'service_role') THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', p_rol)::text, true);
        EXECUTE format('SET LOCAL ROLE %I', p_rol);
    ELSE
        PERFORM set_config('request.jwt.claims',
                           json_build_object('sub', md5(p_rol)::uuid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
    END IF;
END $do$;

CREATE FUNCTION pg_temp.espera_error(p_sqlstate text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $do$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN others THEN
        IF SQLSTATE <> p_sqlstate THEN
            RAISE EXCEPTION '[%] se esperaba % y salió % (%) en: %',
                  current_setting('request.jwt.claims', true), p_sqlstate, SQLSTATE, SQLERRM, p_sql;
        END IF;
        RETURN;
    END;
    RAISE EXCEPTION '[%] se esperaba el error % y la sentencia pasó: %',
          current_setting('request.jwt.claims', true), p_sqlstate, p_sql;
END $do$;

-- Filas afectadas por un UPDATE (0 = RLS lo filtró)
CREATE FUNCTION pg_temp.filas(p_sql text) RETURNS bigint
LANGUAGE plpgsql AS $do$
DECLARE n bigint;
BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $do$;

-- ------------------------------ PREPARACIÓN ----------------------------------
-- Una cuenta de Auth por rol; el trigger crea el perfil LECTOR y aquí se le sube el rol
INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT md5(r)::uuid, lower(r) || '@prueba.local', json_build_object('nombre', 'Prueba ' || r)::jsonb
  FROM unnest(ARRAY['ADMIN','OPERADOR','LECTOR','AUTOMATIZACION','CONECTIVIDAD','HARDWARE']) r;

DO $do$
BEGIN
    ASSERT (SELECT count(*) FROM inv.usuario WHERE email LIKE '%@prueba.local' AND rol = 'LECTOR'
               AND nombre LIKE 'Prueba %') = 6, 'el trigger de auth.users no creó los perfiles LECTOR';
END $do$;
UPDATE inv.usuario u SET rol = upper(split_part(u.email, '@', 1)) WHERE u.email LIKE '%@prueba.local';

-- Una alerta abierta para reconocer
SELECT inv.fn_ingestar_paquete('{"nodo_id": "invernadero_albahaca_01", "sensores": {"suelo_superficie":
        [{"id": 3, "humedad_pct": 15, "estado": "RIEGO_NECESARIO"}]}}'::jsonb, 'prueba', '2026-11-01 12:00:00+00');

-- --------------------------------- anon --------------------------------------
SELECT pg_temp.como('anon');
SELECT pg_temp.espera_error('42501', 'SELECT 1 FROM inv.nodo');
SELECT pg_temp.espera_error('42501', 'SELECT 1 FROM inv.v_ultima_medicion');
SELECT pg_temp.espera_error('42501', $$SELECT inv.fn_historico('invernadero_albahaca_01', 'humedad_suelo')$$);

-- -------------------------------- LECTOR -------------------------------------
SELECT pg_temp.como('LECTOR');
DO $do$
BEGIN
    ASSERT (SELECT count(*) FROM inv.v_ultima_medicion) = 9, 'LECTOR debe leer el tablero';
    ASSERT (SELECT count(*) FROM inv.v_bitacora) > 0, 'LECTOR debe leer la bitácora';
    ASSERT (SELECT codigo FROM inv.v_alertas_activas) = 'SENS-SOIL-03', 'LECTOR debe leer v_alertas_activas con su código';
    ASSERT (SELECT rol FROM inv.usuario WHERE id = inv.fn_usuario_actual()) = 'LECTOR', 'LECTOR lee su perfil sin correo';
    ASSERT inv.fn_rol_actual() = 'LECTOR', 'fn_rol_actual';
    ASSERT (SELECT lecturas FROM inv.fn_estadistica('SENS-SOIL-03', '2026-11-01', '2026-11-02')) = 1, 'LECTOR usa fn_estadistica';
    PERFORM pg_temp.espera_error('42501', 'SELECT email FROM inv.usuario');
    PERFORM pg_temp.espera_error('42501', 'SELECT * FROM inv.usuario');
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'ENCENDER', 'MANUAL')$$);
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
                                           VALUES ('RIEGO', 'C1', now(), '{}', 'Intento de lector')$$);
    ASSERT pg_temp.filas('UPDATE inv.alerta SET reconocida_por = inv.fn_usuario_actual(), reconocida_en = now()') = 0, 'LECTOR reconoció alerta';
    ASSERT pg_temp.filas('UPDATE inv.umbral SET fuente = $q$x$q$') = 0, 'LECTOR cambió umbral';
    ASSERT pg_temp.filas($$UPDATE inv.actuador SET modo = 'MANUAL'$$) = 0, 'LECTOR cambió actuador';
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_detener_todo()$$);
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_calibrar_sensor('SENS-SOIL-01', '{"a": 1}')$$);
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_ingestar_paquete('{}'::jsonb)$$);
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_purgar_payload(7)$$);
    PERFORM pg_temp.espera_error('42501', $$DELETE FROM inv.medicion$$);
END $do$;

-- ------------------------------- OPERADOR ------------------------------------
SELECT pg_temp.como('OPERADOR');
DO $do$
DECLARE yo integer := inv.fn_usuario_actual();
BEGIN
    -- comando manual: usuario_id lo pone el DEFAULT
    PERFORM pg_temp.filas($$INSERT INTO inv.comando_actuador (actuador_id, accion, valor, origen)
                            VALUES ((SELECT min(id) FROM inv.actuador), 'ENCENDER', 50, 'MANUAL')$$);
    ASSERT (SELECT duracion_s FROM inv.comando_actuador WHERE valor = 50) = 10,
           'el riego manual del OPERADOR debía tomar la duración de la regla';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'ENCENDER', 'IA')$$);
    PERFORM pg_temp.espera_error('42501', format($$INSERT INTO inv.comando_actuador (actuador_id, accion, origen, usuario_id)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'ENCENDER', 'MANUAL', %s)$$, yo + 1));
    PERFORM pg_temp.espera_error('42501', $$UPDATE inv.alerta SET reconocida_por = (SELECT min(id) FROM inv.usuario
                                           WHERE id <> inv.fn_usuario_actual()), reconocida_en = now()$$);
    ASSERT pg_temp.filas('UPDATE inv.alerta SET reconocida_por = inv.fn_usuario_actual(), reconocida_en = now()') = 1,
           'OPERADOR debe reconocer alertas';
    ASSERT (SELECT reconocida FROM inv.v_alertas_activas LIMIT 1), 'la alerta debía quedar reconocida';
    ASSERT pg_temp.filas('UPDATE inv.umbral SET fuente = $q$Ajuste operador$q$') = 4, 'OPERADOR debe cambiar umbrales';
    ASSERT pg_temp.filas($$UPDATE inv.actuador SET modo = 'MANUAL'$$) = 1, 'OPERADOR debe cambiar el modo';
    PERFORM pg_temp.filas($$INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
                            VALUES ('RIEGO', 'C1', now(), '{"initials":"OP","name":"Operador","role":"Op"}', 'Riego del cantero 1')$$);
    ASSERT (SELECT creado_por FROM inv.actividad) = yo, 'actividad.creado_por debía ser el usuario actual';
    ASSERT pg_temp.filas($$UPDATE inv.actividad SET estado = 'COMPLETADA'$$) = 1, 'OPERADOR debe actualizar actividades';
    ASSERT pg_temp.filas($$UPDATE inv.comando_actuador SET estado = 'ENVIADO'$$) = 0, 'OPERADOR no despacha comandos';
    ASSERT pg_temp.filas($$UPDATE inv.sensor SET activo = true$$) = 0, 'OPERADOR no edita el catálogo';
    ASSERT pg_temp.filas($$UPDATE inv.usuario SET activo = true$$) = 0, 'OPERADOR no edita usuarios';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.regla_automatizacion (nombre, estado_disparador, actuador_id, accion)
                                           VALUES ('x', 'OK', (SELECT min(id) FROM inv.actuador), 'APAGAR')$$);
    ASSERT inv.fn_calibrar_sensor('SENS-SOIL-01', '{"aire_crudo": 2500}') ->> 'aire_crudo' = '2500', 'OPERADOR debe calibrar';
    PERFORM pg_temp.espera_error('P0002', $$SELECT inv.fn_calibrar_sensor('SENS-NO-99', '{"a": 1}')$$);
    ASSERT inv.fn_detener_todo('Paro operador') = 1, 'OPERADOR debe poder hacer paro general';
END $do$;

-- ---------------------------- AUTOMATIZACION ---------------------------------
SELECT pg_temp.como('AUTOMATIZACION');
DO $do$
BEGIN
    PERFORM pg_temp.filas($$INSERT INTO inv.comando_actuador (actuador_id, accion, origen, regla_id)
                            SELECT actuador_id, accion, 'REGLA', id FROM inv.regla_automatizacion LIMIT 1$$);
    PERFORM pg_temp.filas($$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                            VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'IA')$$);
    ASSERT pg_temp.filas($$UPDATE inv.comando_actuador SET estado = 'CANCELADO' WHERE origen = 'IA'$$) = 1,
           'AUTOMATIZACION debe actualizar el estado de comandos';
    ASSERT pg_temp.filas($$UPDATE inv.actuador SET encendido = false, valor = NULL, actualizado_en = now(), modo = 'AUTOMATICO'$$) = 1,
           'AUTOMATIZACION debe actualizar actuadores';
    PERFORM pg_temp.filas($$INSERT INTO inv.prediccion_ia (nodo_id, modelo, tipo, valor)
                            VALUES ((SELECT min(id) FROM inv.nodo), 'prueba-v1', 'PRONOSTICO', 40)$$);
    PERFORM pg_temp.filas($$INSERT INTO inv.estado_sensor (codigo, categoria) VALUES ('ESTADO_PRUEBA', 'NORMAL')$$);
    ASSERT pg_temp.filas($$UPDATE inv.regla_automatizacion SET espera_s = 120$$) = 3, 'AUTOMATIZACION debe editar reglas';
    ASSERT pg_temp.filas($$UPDATE inv.umbral SET fuente = 'IA'$$) = 4, 'AUTOMATIZACION debe editar umbrales';
    ASSERT pg_temp.filas('UPDATE inv.alerta SET reconocida_por = inv.fn_usuario_actual(), reconocida_en = now()') = 0,
           'AUTOMATIZACION no reconoce alertas';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
                                           VALUES ('RIEGO', 'C1', now(), '{}', 'Intento de automatización')$$);
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_calibrar_sensor('SENS-SOIL-01', '{"a": 1}')$$);
    ASSERT inv.fn_detener_todo('Paro automatización') = 1, 'AUTOMATIZACION debe poder hacer paro general';
END $do$;

-- ----------------------------- CONECTIVIDAD ----------------------------------
SELECT pg_temp.como('CONECTIVIDAD');
DO $do$
DECLARE c bigint := (SELECT min(id) FROM inv.comando_actuador WHERE accion = 'ENCENDER' AND valor = 50);
BEGIN
    ASSERT pg_temp.filas(format($$UPDATE inv.comando_actuador SET estado = 'ENVIADO', enviado_en = now() WHERE id = %s$$, c)) = 1,
           'CONECTIVIDAD debe marcar ENVIADO';
    ASSERT pg_temp.filas(format($$UPDATE inv.comando_actuador SET estado = 'CONFIRMADO',
                                  confirmado_en = '2026-11-01 13:00:00+00' WHERE id = %s$$, c)) = 1,
           'CONECTIVIDAD debe marcar CONFIRMADO';
    ASSERT (SELECT encendido AND valor = 50 AND actualizado_en = '2026-11-01 13:00:00+00' FROM inv.actuador),
           'confirmar debía actualizar el actuador (trigger SECURITY DEFINER)';
    PERFORM pg_temp.espera_error('42501', format($$UPDATE inv.comando_actuador SET motivo = 'x' WHERE id = %s$$, c));
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'IA')$$);
    ASSERT pg_temp.filas($$UPDATE inv.actuador SET encendido = false$$) = 0, 'CONECTIVIDAD no edita actuadores';
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_detener_todo()$$);
END $do$;

-- ------------------------------- HARDWARE ------------------------------------
SELECT pg_temp.como('HARDWARE');
DO $do$
BEGIN
    PERFORM pg_temp.filas($$INSERT INTO inv.sensor (nodo_id, tipo_sensor_id, indice, nombre, pines, ubicacion)
                            SELECT nodo_id, tipo_sensor_id, 4, 'Humedad suelo 4', 'GPIO 35', 'Zona 4'
                              FROM inv.sensor WHERE nombre = 'Humedad suelo 1'$$);
    ASSERT pg_temp.filas($$UPDATE inv.nodo SET firmware_version = '1.1'$$) = 1, 'HARDWARE debe editar nodos';
    PERFORM pg_temp.filas($$INSERT INTO inv.actuador (nodo_id, codigo, nombre, tipo)
                            VALUES ((SELECT min(id) FROM inv.nodo), 'ventilador_prueba', 'Ventilador', 'VENTILADOR')$$);
    ASSERT inv.fn_calibrar_sensor('SENS-SOIL-04', '{"aire_crudo": 2400}') IS NOT NULL, 'HARDWARE debe calibrar';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'MANUAL')$$);
    ASSERT pg_temp.filas($$UPDATE inv.umbral SET fuente = 'hw'$$) = 0, 'HARDWARE no edita umbrales';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.regla_automatizacion (nombre, estado_disparador, actuador_id, accion)
                                           VALUES ('x', 'OK', (SELECT min(id) FROM inv.actuador), 'APAGAR')$$);
END $do$;

-- -------------------------------- ADMIN --------------------------------------
SELECT pg_temp.como('ADMIN');
DO $do$
BEGIN
    ASSERT pg_temp.filas($$UPDATE inv.usuario SET rol = 'OPERADOR' WHERE nombre = 'Prueba LECTOR'$$) = 1,
           'ADMIN debe cambiar roles';
    PERFORM pg_temp.filas($$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                            VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'IA')$$);
    ASSERT pg_temp.filas($$UPDATE inv.usuario SET activo = false WHERE nombre = 'Prueba OPERADOR'$$) = 1,
           'ADMIN debe desactivar usuarios';
    PERFORM pg_temp.espera_error('42501', $$SELECT email FROM inv.usuario$$);
END $do$;

-- Cuenta desactivada: pierde sus permisos de escritura
SELECT pg_temp.como('OPERADOR');
DO $do$
BEGIN
    ASSERT inv.fn_rol_actual() IS NULL, 'usuario inactivo no debe tener rol';
    PERFORM pg_temp.espera_error('42501', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                           VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'MANUAL')$$);
    PERFORM pg_temp.espera_error('42501', $$SELECT inv.fn_calibrar_sensor('SENS-SOIL-01', '{"a": 1}')$$);
END $do$;

-- ----------------------------- service_role ----------------------------------
SELECT pg_temp.como('service_role');
DO $do$
BEGIN
    ASSERT inv.fn_ingestar_paquete('{"nodo_id": "invernadero_albahaca_01", "sensores": {}}'::jsonb,
                                   'prueba', '2026-11-01 12:30:00+00') IS NOT NULL, 'service_role debe ingerir';
    ASSERT inv.fn_purgar_payload(7) >= 0, 'service_role debe purgar';
    ASSERT (SELECT count(email) FROM inv.usuario) >= 6, 'service_role lee correos';
END $do$;

RESET ROLE;
SELECT 'pruebas_rls: OK' AS resultado;

ROLLBACK;
