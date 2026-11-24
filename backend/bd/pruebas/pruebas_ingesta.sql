-- =============================================================================
--  PRUEBAS DE INGESTA · Invernadero Albahaca
--  Simula mensajes MQTT y comprueba (ASSERT) lo que guarda la BD. Si algo falla,
--  psql se detiene con el mensaje del ASSERT. Todo se deshace al final (ROLLBACK).
--  Correr en la BD de prueba (npm run test:bd), después de invernadero_bd.sql,
--  stub_supabase.sql y supabase.sql: los conteos suponen que no hay otros datos.
-- =============================================================================
BEGIN;

CREATE TEMP TABLE t_p (n int PRIMARY KEY, id bigint) ON COMMIT DROP;

-- 0) Sin lecturas: el tablero ya muestra los 9 dispositivos con SIN_LECTURA
DO $$
BEGIN
    ASSERT (SELECT array_agg(codigo ORDER BY codigo) FROM inv.v_ultima_medicion)
         = ARRAY['SENS-DIST-01','SENS-ENV-01','SENS-HUM-01','SENS-LUX-01','SENS-SOIL-01',
                 'SENS-SOIL-02','SENS-SOIL-03','SENS-TANK-01','SENS-TEMP-S01'],
           'v_ultima_medicion no trae exactamente los 9 códigos de dispositivo';
    ASSERT (SELECT bool_and(evaluacion = 'SIN_LECTURA' AND tendencia = '{}') FROM inv.v_ultima_medicion),
           'sin lecturas se esperaba SIN_LECTURA y tendencia vacía';
END $$;

-- 1) JSON tal como lo imprime el firmware de la sección 6 (humedad_pct, nivel_pct, id numérico)
INSERT INTO t_p SELECT 1, inv.fn_ingestar_paquete($json$
{
  "nodo_id": "invernadero_albahaca_01",
  "cultivo": "albahaca",
  "sensores": {
    "ambiente":          { "tipo": "DHT22",   "temperatura_c": 24.50, "humedad_pct": 60.20, "estado": "OPTIMO" },
    "luz":               { "tipo": "BH1750",  "luxes": 14500.00, "estado": "ILUMINACION_ADECUADA" },
    "suelo_profundidad": { "tipo": "DS18B20", "temperatura_c": 19.50, "estado": "TEMPERATURA_OPTIMA" },
    "tanque_agua":       { "tipo": "HC-SR04", "distancia_cm": 12.00, "nivel_pct": 80, "estado": "NIVEL_SEGURO" },
    "suelo_superficie": [
      { "id": 1, "pin": 32, "humedad_pct": 45, "estado": "OPTIMO" },
      { "id": 2, "pin": 33, "humedad_pct": 48, "estado": "OPTIMO" },
      { "id": 3, "pin": 34, "humedad_pct": 15, "estado": "RIEGO_NECESARIO" }
    ]
  }
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:00+00');

-- 2) JSON con el formato del ejemplo de la sección 5 (humedad_relativa_pct, nivel_llenado_pct, timestamp)
INSERT INTO t_p SELECT 2, inv.fn_ingestar_paquete($json$
{
  "nodo_id": "invernadero_albahaca_01",
  "timestamp": "2026-10-11T10:00:00Z",
  "cultivo": "albahaca",
  "estado_general": "OPERATIVO",
  "sensores": {
    "ambiente":          { "tipo": "DHT22",   "temperatura_c": 24.6, "humedad_relativa_pct": 60.0, "estado": "OPTIMO" },
    "luz":               { "tipo": "BH1750",  "luxes": 14400, "estado": "ILUMINACION_ADECUADA" },
    "suelo_profundidad": { "tipo": "DS18B20", "temperatura_c": 19.6, "estado": "TEMPERATURA_OPTIMA" },
    "tanque_agua":       { "tipo": "HC-SR04", "distancia_cm": 12, "nivel_llenado_pct": 75, "estado": "NIVEL_SEGURO" },
    "suelo_superficie": [
      { "id": 1, "pin": 32, "humedad_pct": 45, "estado": "OPTIMO" },
      { "id": 2, "pin": 33, "humedad_pct": 48, "estado": "OPTIMO" },
      { "id": 3, "pin": 34, "humedad_pct": 16, "estado": "RIEGO_NECESARIO" }
    ]
  }
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:05+00');

DO $$
DECLARE p1 bigint := (SELECT id FROM t_p WHERE n = 1);
        p2 bigint := (SELECT id FROM t_p WHERE n = 2);
BEGIN
    ASSERT (SELECT count(*) FROM inv.medicion WHERE paquete_id = p1 AND valido) = 9, 'paquete 1: se esperaban 9 lecturas válidas';
    ASSERT (SELECT count(*) FROM inv.medicion WHERE paquete_id = p2 AND valido) = 9, 'paquete 2: se esperaban 9 lecturas válidas';
    ASSERT (SELECT procesado AND error_procesamiento IS NULL AND estado_general = 'OPERATIVO'
                   AND ts_dispositivo = '2026-10-11T10:00:00Z'
              FROM inv.paquete WHERE id = p2), 'paquete 2: timestamp / estado_general mal guardados';
    ASSERT (SELECT valor FROM inv.v_lectura WHERE paquete_id = p2 AND codigo = 'SENS-HUM-01') = 60.0,
           'humedad_relativa_pct no se mapeó a humedad_aire';
    ASSERT (SELECT valor FROM inv.v_lectura WHERE paquete_id = p2 AND codigo = 'SENS-TANK-01') = 75,
           'nivel_llenado_pct no se mapeó a nivel_tanque';
    -- la alerta de riego se abrió con el paquete 1 y se refrescó con el 2
    ASSERT (SELECT ocurrencias FROM inv.alerta
             WHERE estado = 'RIEGO_NECESARIO' AND resuelta_en IS NULL
               AND abierta_en = '2026-11-01 12:00:00+00' AND ultima_vez_en = '2026-11-01 12:00:05+00') = 2,
           'la alerta RIEGO_NECESARIO no se abrió/refrescó';
    ASSERT (SELECT sensor_id IS NOT NULL FROM inv.v_alertas_activas WHERE estado = 'RIEGO_NECESARIO'),
           'v_alertas_activas sin sensor_id';
END $$;

-- Reintento del mismo mensaje (buffer local): mismo id y sin duplicar lecturas
DO $$
DECLARE p1 bigint := (SELECT id FROM t_p WHERE n = 1);
        r  bigint;
BEGIN
    r := inv.fn_ingestar_paquete((SELECT payload FROM inv.paquete WHERE id = p1),
                                 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:00+00');
    ASSERT r = p1, 'el reintento devolvió otro paquete';
    ASSERT (SELECT count(*) FROM inv.paquete
             WHERE nodo_codigo = 'invernadero_albahaca_01' AND recibido_en = '2026-11-01 12:00:00+00') = 1,
           'el reintento duplicó el paquete';
    ASSERT (SELECT count(*) FROM inv.medicion WHERE paquete_id = p1) = 9, 'el reintento duplicó lecturas';
    ASSERT (SELECT ocurrencias FROM inv.alerta WHERE estado = 'RIEGO_NECESARIO' AND resuelta_en IS NULL) = 2,
           'el reintento volvió a contar la alerta';
END $$;

-- Automatización: genera comandos a partir de las reglas activas y alertas abiertas
INSERT INTO inv.comando_actuador (actuador_id, accion, duracion_s, origen, regla_id, alerta_id, motivo)
SELECT r.actuador_id, r.accion, r.duracion_s, 'REGLA', r.id, a.id, r.nombre
  FROM inv.regla_automatizacion r
  JOIN inv.alerta a ON a.estado = r.estado_disparador AND a.resuelta_en IS NULL
 WHERE r.activa;

DO $$
BEGIN
    ASSERT (SELECT count(*) FROM inv.comando_actuador WHERE origen = 'REGLA' AND accion = 'ENCENDER'
               AND estado = 'PENDIENTE' AND duracion_s = 10) = 1, 'la regla de riego no generó su comando';
END $$;

-- 3) Fallas de hardware: DHT22 sin respuesta (0.0), DS18B20 desconectado (-127),
--    HC-SR04 desconectado (distancia 0 → el firmware dice NIVEL_MAXIMO), poca luz.
--    El sensor 3 ya regresó a OPTIMO → su alerta de riego se debe cerrar sola.
INSERT INTO t_p SELECT 3, inv.fn_ingestar_paquete($json$
{
  "nodo_id": "invernadero_albahaca_01",
  "cultivo": "albahaca",
  "sensores": {
    "ambiente":          { "tipo": "DHT22",   "temperatura_c": 0.00, "humedad_pct": 0.00, "estado": "ERROR_DHT" },
    "luz":               { "tipo": "BH1750",  "luxes": 850.00, "estado": "SOMBRA_EXCESIVA" },
    "suelo_profundidad": { "tipo": "DS18B20", "temperatura_c": -127.00, "estado": "ERROR_DS18B20_DESCONECTADO" },
    "tanque_agua":       { "tipo": "HC-SR04", "distancia_cm": 0.00, "nivel_pct": 100, "estado": "NIVEL_MAXIMO" },
    "suelo_superficie": [
      { "id": 1, "pin": 32, "humedad_pct": 44, "estado": "OPTIMO" },
      { "id": 2, "pin": 33, "humedad_pct": 47, "estado": "OPTIMO" },
      { "id": 3, "pin": 34, "humedad_pct": 50, "estado": "OPTIMO" }
    ]
  }
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:10+00');

DO $$
DECLARE p3 bigint := (SELECT id FROM t_p WHERE n = 3);
BEGIN
    ASSERT (SELECT array_agg(codigo ORDER BY codigo) FROM inv.v_lectura WHERE paquete_id = p3 AND NOT valido)
         = ARRAY['SENS-DIST-01','SENS-ENV-01','SENS-HUM-01','SENS-TANK-01','SENS-TEMP-S01'],
           'paquete 3: las fallas de hardware no quedaron como valido = false';
    ASSERT (SELECT bool_and(estado = 'LECTURA_FUERA_DE_RANGO') FROM inv.v_lectura
             WHERE paquete_id = p3 AND codigo IN ('SENS-DIST-01','SENS-TANK-01')),
           'HC-SR04 con distancia 0 debía marcarse LECTURA_FUERA_DE_RANGO';
    ASSERT (SELECT resuelta_en FROM inv.alerta WHERE estado = 'RIEGO_NECESARIO') = '2026-11-01 12:00:10+00',
           'la alerta de riego no se cerró sola';
    ASSERT (SELECT array_agg(estado::text ORDER BY estado) FROM inv.v_alertas_activas)
         = ARRAY['ERROR_DHT','ERROR_DS18B20_DESCONECTADO','LECTURA_FUERA_DE_RANGO','SOMBRA_EXCESIVA'],
           'alertas activas inesperadas tras el paquete 3';
    -- código principal del sensor: la variable con umbral primero (tanque → TANK), si no la de menor id (DHT22 → ENV)
    ASSERT (SELECT array_agg(codigo || ':' || estado ORDER BY codigo) FROM inv.v_alertas_activas)
         = ARRAY['SENS-ENV-01:ERROR_DHT','SENS-LUX-01:SOMBRA_EXCESIVA',
                 'SENS-TANK-01:LECTURA_FUERA_DE_RANGO','SENS-TEMP-S01:ERROR_DS18B20_DESCONECTADO'],
           'v_alertas_activas.codigo no sigue la regla del código principal';
    ASSERT (SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'inv' AND table_name = 'v_alertas_activas'
             ORDER BY ordinal_position DESC LIMIT 1) = 'codigo', 'codigo debe ser la última columna de v_alertas_activas';
END $$;

-- 4) Nodo que no está registrado → se guarda pero no se procesa
INSERT INTO t_p SELECT 4, inv.fn_ingestar_paquete('{"nodo_id": "nodo_fantasma", "sensores": {}}'::jsonb,
                                                  'invernadero/fantasma/telemetria', '2026-11-01 12:00:15+00');

-- 5) Mensajes que no son objeto JSON: se guardan con su error y sin lecturas (no truena)
INSERT INTO t_p SELECT 5, inv.fn_ingestar_paquete('"texto"'::jsonb, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:16+00');
INSERT INTO t_p SELECT 6, inv.fn_ingestar_paquete('[1, 2, 3]'::jsonb, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:17+00');
INSERT INTO t_p SELECT 7, inv.fn_ingestar_paquete(NULL, 'invernadero/albahaca_01/telemetria', '2026-11-01 12:00:18+00');

DO $$
BEGIN
    ASSERT (SELECT NOT procesado AND error_procesamiento LIKE 'Nodo no registrado%'
              FROM inv.paquete WHERE id = (SELECT id FROM t_p WHERE n = 4)), 'nodo fantasma mal registrado';
    ASSERT (SELECT count(*) FROM inv.paquete p JOIN t_p ON t_p.id = p.id AND t_p.n IN (5, 6)
             WHERE NOT p.procesado AND p.error_procesamiento = 'El payload no es un objeto JSON'
               AND p.payload IS NOT NULL) = 2, 'payload no-objeto mal registrado';
    ASSERT (SELECT NOT procesado AND error_procesamiento = 'Payload vacío'
              FROM inv.paquete WHERE id = (SELECT id FROM t_p WHERE n = 7)), 'payload NULL mal registrado';
    ASSERT (SELECT count(*) FROM inv.medicion m JOIN t_p ON t_p.id = m.paquete_id AND t_p.n >= 4) = 0,
           'mensajes inválidos generaron lecturas';
END $$;

-- ---------------------------- CONSULTAS -------------------------------------
DO $$
BEGIN
    -- tablero (columnas que usaba la versión original de esta prueba)
    ASSERT (SELECT evaluacion FROM inv.v_ultima_medicion WHERE codigo = 'SENS-SOIL-03') = 'OPTIMO', 'SOIL-03 debía estar OPTIMO';
    ASSERT (SELECT evaluacion FROM inv.v_ultima_medicion WHERE codigo = 'SENS-LUX-01') = 'FUERA_DE_OPTIMO', 'LUX-01 debía estar FUERA_DE_OPTIMO';
    ASSERT (SELECT evaluacion FROM inv.v_ultima_medicion WHERE codigo = 'SENS-TANK-01') = 'SIN_DATO_VALIDO', 'TANK-01 debía estar SIN_DATO_VALIDO';
    ASSERT (SELECT evaluacion FROM inv.v_ultima_medicion WHERE codigo = 'SENS-ENV-01') = 'SIN_DATO_VALIDO', 'ENV-01 debía estar SIN_DATO_VALIDO';
    ASSERT (SELECT count(*) FROM (SELECT sensor, variable, valor, unidad, valido, estado, evaluacion
                                    FROM inv.v_ultima_medicion) x) = 9, 'v_ultima_medicion debía tener 9 filas';
    ASSERT (SELECT zona = 'Zona 1' AND unidad = '%' AND min_optimo = 35 AND max_optimo = 75
              FROM inv.v_ultima_medicion WHERE codigo = 'SENS-SOIL-01'), 'SOIL-01: zona/unidad/umbral';
    -- tendencia: solo válidas, de la más vieja a la más nueva
    ASSERT (SELECT tendencia FROM inv.v_ultima_medicion WHERE codigo = 'SENS-SOIL-01') = '{45,45,44}'::numeric[],
           'tendencia de SOIL-01 incorrecta';
    ASSERT (SELECT tendencia FROM inv.v_ultima_medicion WHERE codigo = 'SENS-ENV-01') = '{24.5,24.6}'::numeric[],
           'tendencia de ENV-01 debía excluir la lectura inválida';

    -- estadística en [desde, hasta): el límite superior queda fuera
    ASSERT (SELECT (minimo, minimo_en, promedio, maximo, maximo_en, lecturas)
              FROM inv.fn_estadistica('SENS-SOIL-03', '2026-11-01 12:00:00+00', '2026-11-01 12:00:10+00'))
         = (15::numeric, '2026-11-01 12:00:00+00'::timestamptz, 15.5::numeric,
            16::numeric, '2026-11-01 12:00:05+00'::timestamptz, 2::bigint),
           'fn_estadistica con rango acotado';
    ASSERT (SELECT lecturas FROM inv.fn_estadistica('SENS-SOIL-03', '2026-11-01 11:00:00+00', '2026-11-01 13:00:00+00')) = 3,
           'fn_estadistica con rango amplio';
    ASSERT (SELECT lecturas FROM inv.fn_estadistica('SENS-ENV-01', '2026-11-01 11:00:00+00', '2026-11-01 13:00:00+00')) = 2,
           'fn_estadistica debía ignorar lecturas inválidas';
    ASSERT (SELECT lecturas FROM inv.fn_estadistica('SENS-SOIL-03', '2026-10-01', '2026-10-02')) = 0,
           'fn_estadistica fuera de rango debía dar 0 lecturas';
    -- v_lectura: el filtro de fechas excluye lo de fuera
    ASSERT (SELECT count(*) FROM inv.v_lectura WHERE codigo = 'SENS-SOIL-03'
               AND tomado_en >= '2026-11-01 12:00:05+00' AND tomado_en < '2026-11-01 12:00:10+00') = 1,
           'v_lectura filtro de fechas';
    ASSERT (SELECT count(*) FROM inv.v_lectura WHERE zona = 'Zona 3') = 3, 'v_lectura filtro por zona';

    ASSERT (SELECT sum(lecturas) FROM inv.fn_historico('invernadero_albahaca_01', 'humedad_suelo',
                   '2026-11-01 11:00:00+00', '2026-11-01 13:00:00+00', interval '1 hour')) = 9, 'fn_historico';
    ASSERT (SELECT count(*) FROM inv.v_dataset_ia) = 3, 'v_dataset_ia: 1 fila por paquete procesado';
    ASSERT (SELECT hubo_falla_hw FROM inv.v_dataset_ia WHERE tomado_en = '2026-11-01 12:00:10+00'), 'v_dataset_ia: falla HW';
    ASSERT (SELECT alertas_abiertas = 4 AND intervalo_ms = 5000 AND firmware_version = '1.0'
               AND topic_telemetria = 'invernadero/albahaca/invernadero_albahaca_01/telemetria'
              FROM inv.v_estado_nodo), 'v_estado_nodo';
END $$;

-- Paro general y confirmación de comandos (con un ADMIN simulado de Supabase Auth)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin.prueba@invernadero.local', '{"nombre": "Admin Prueba"}');
UPDATE inv.usuario SET rol = 'ADMIN' WHERE auth_id = '00000000-0000-0000-0000-0000000000a1';
SELECT set_config('request.jwt.claims',
                  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

DO $$
DECLARE c bigint;
BEGIN
    ASSERT inv.fn_detener_todo('Prueba de paro') = (SELECT count(*) FROM inv.actuador), 'fn_detener_todo debía crear 1 comando por actuador';
    ASSERT (SELECT bool_and(modo = 'MANUAL') FROM inv.actuador), 'fn_detener_todo no pasó a MANUAL';
    ASSERT (SELECT count(*) FROM inv.comando_actuador c JOIN inv.usuario u ON u.id = c.usuario_id
             WHERE c.origen = 'MANUAL' AND c.accion = 'APAGAR' AND u.nombre = 'Admin Prueba') = (SELECT count(*) FROM inv.actuador),
           'fn_detener_todo: comando sin usuario';

    -- comando manual con nivel; usuario_id lo pone el DEFAULT
    INSERT INTO inv.comando_actuador (actuador_id, accion, valor, origen, motivo)
    SELECT id, 'ENCENDER', 60, 'MANUAL', 'Prueba PWM' FROM inv.actuador WHERE codigo = 'bomba_riego'
    RETURNING id INTO c;
    UPDATE inv.comando_actuador SET estado = 'ENVIADO', enviado_en = '2026-11-01 12:01:00+00' WHERE id = c;
    ASSERT (SELECT NOT encendido FROM inv.actuador WHERE codigo = 'bomba_riego'), 'ENVIADO no debe cambiar el actuador';
    UPDATE inv.comando_actuador SET estado = 'CONFIRMADO', confirmado_en = '2026-11-01 12:01:01+00' WHERE id = c;
    ASSERT (SELECT encendido AND valor = 60 AND actualizado_en = '2026-11-01 12:01:01+00'
              FROM inv.actuador WHERE codigo = 'bomba_riego'), 'confirmar no actualizó el actuador';

    ASSERT (SELECT array_agg(DISTINCT tipo ORDER BY tipo) FROM inv.v_bitacora)
         = ARRAY['alert','auto','manual','telemetry'], 'v_bitacora debía traer los 4 tipos';
    ASSERT (SELECT disparador FROM inv.v_bitacora WHERE tipo = 'manual' AND detalle LIKE 'ENCENDER 60 %') = 'Admin Prueba',
           'v_bitacora: disparador manual';
    ASSERT (SELECT dispositivo FROM inv.v_bitacora WHERE tipo = 'alert' AND detalle LIKE 'Humedad suelo 3%') = 'SENS-SOIL-03',
           'v_bitacora: dispositivo de la alerta';
    ASSERT (SELECT dispositivo FROM inv.v_bitacora WHERE tipo = 'alert' AND detalle LIKE 'Tanque de agua%') = 'SENS-TANK-01',
           'v_bitacora: la alerta del tanque debía ser SENS-TANK-01';
    ASSERT (SELECT dispositivo FROM inv.v_bitacora WHERE tipo = 'alert' AND detalle LIKE 'Ambiente%') = 'SENS-ENV-01',
           'v_bitacora: la alerta del DHT22 debía ser SENS-ENV-01';
    ASSERT (SELECT count(*) FROM inv.v_bitacora WHERE tipo = 'telemetry') = 7, 'v_bitacora: 1 fila por paquete';
END $$;

-- Riego manual sin duración: toma la de la regla ENCENDER activa del actuador (menor prioridad, luego id)
DO $$
DECLARE b smallint := (SELECT id FROM inv.actuador WHERE codigo = 'bomba_riego');
        d integer;
BEGIN
    ASSERT (SELECT duracion_s FROM inv.comando_actuador WHERE valor = 60) = 10,
           'el ENCENDER manual sin duración debía tomar los 10 s de la regla de riego';
    INSERT INTO inv.comando_actuador (actuador_id, accion, duracion_s, origen) VALUES (b, 'ENCENDER', 30, 'MANUAL')
    RETURNING duracion_s INTO d;
    ASSERT d = 30, 'una duración explícita no se debe cambiar';
    INSERT INTO inv.comando_actuador (actuador_id, accion, origen) VALUES (b, 'APAGAR', 'MANUAL') RETURNING duracion_s INTO d;
    ASSERT d IS NULL, 'APAGAR no lleva duración';
    INSERT INTO inv.comando_actuador (actuador_id, accion, origen) VALUES (b, 'ENCENDER', 'IA') RETURNING duracion_s INTO d;
    ASSERT d IS NULL, 'solo los comandos MANUAL toman la duración de la regla';

    INSERT INTO inv.regla_automatizacion (nombre, estado_disparador, actuador_id, accion, duracion_s, prioridad)
    VALUES ('Riego corto de prueba', 'SOMBRA_EXCESIVA', b, 'ENCENDER', 20, 5);
    INSERT INTO inv.comando_actuador (actuador_id, accion, origen) VALUES (b, 'ENCENDER', 'MANUAL') RETURNING duracion_s INTO d;
    ASSERT d = 20, 'debía ganar la regla de menor prioridad';

    UPDATE inv.regla_automatizacion SET activa = false WHERE accion = 'ENCENDER';
    INSERT INTO inv.comando_actuador (actuador_id, accion, origen) VALUES (b, 'ENCENDER', 'MANUAL') RETURNING duracion_s INTO d;
    ASSERT d IS NULL, 'sin regla activa la duración queda NULL';
END $$;

-- Retención: purga el JSON crudo pero conserva las lecturas
DO $$
DECLARE con_payload bigint := (SELECT count(*) FROM inv.paquete WHERE payload IS NOT NULL);
        lecturas    bigint := (SELECT count(*) FROM inv.medicion);
BEGIN
    ASSERT inv.fn_purgar_payload(0) = con_payload, 'fn_purgar_payload no purgó lo esperado';
    ASSERT (SELECT count(*) FROM inv.paquete WHERE payload IS NOT NULL) = 0, 'quedó payload sin purgar';
    ASSERT (SELECT count(*) FROM inv.medicion) = lecturas, 'la purga borró lecturas';
END $$;

SELECT 'pruebas_ingesta: OK' AS resultado;

ROLLBACK;
