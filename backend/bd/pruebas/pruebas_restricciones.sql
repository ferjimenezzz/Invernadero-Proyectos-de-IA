-- =============================================================================
--  PRUEBAS DE RESTRICCIONES · las relaciones y valores inválidos se rechazan (hito H3)
--  Cada caso ejecuta un INSERT/UPDATE inválido y comprueba el SQLSTATE esperado:
--   23503 = llave foránea · 23514 = CHECK · 23505 = UNIQUE · 23502 = NOT NULL
--  Todo se deshace al final (ROLLBACK).
-- =============================================================================
BEGIN;

CREATE FUNCTION pg_temp.espera_error(p_sqlstate text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN others THEN
        IF SQLSTATE <> p_sqlstate THEN
            RAISE EXCEPTION 'Se esperaba % y salió % (%) en: %', p_sqlstate, SQLSTATE, SQLERRM, p_sql;
        END IF;
        RETURN;
    END;
    RAISE EXCEPTION 'Se esperaba el error % y la sentencia pasó: %', p_sqlstate, p_sql;
END $$;

-- Llaves foráneas
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.sensor (nodo_id, tipo_sensor_id, nombre, pines)
                                       VALUES (9999, (SELECT min(id) FROM inv.tipo_sensor), 'X', 'GPIO 1')$$);
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.alerta (nodo_id, sensor_id, estado, categoria)
                                       VALUES ((SELECT min(id) FROM inv.nodo), 9999, 'OK', 'NORMAL')$$);
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.alerta (nodo_id, sensor_id, estado, categoria)
                                       VALUES ((SELECT min(id) FROM inv.nodo), (SELECT min(id) FROM inv.sensor),
                                               'ESTADO_INEXISTENTE', 'ALERTA')$$);
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.regla_automatizacion (nombre, estado_disparador, actuador_id, accion)
                                       VALUES ('X', 'ESTADO_INEXISTENTE', (SELECT min(id) FROM inv.actuador), 'APAGAR')$$);
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen, regla_id)
                                       VALUES (9999, 'APAGAR', 'REGLA', (SELECT min(id) FROM inv.regla_automatizacion))$$);
SELECT pg_temp.espera_error('23503', $$INSERT INTO inv.medicion (paquete_id, sensor_id, variable_id, tomado_en, estado, valido)
                                       VALUES (9999, (SELECT min(id) FROM inv.sensor), (SELECT min(id) FROM inv.variable),
                                               now(), 'OK', true)$$);

-- CHECK
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen, regla_id)
                                       VALUES ((SELECT min(id) FROM inv.actuador), 'PRENDER', 'REGLA',
                                               (SELECT min(id) FROM inv.regla_automatizacion))$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                       VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'MANUAL')$$);   -- MANUAL sin usuario
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.comando_actuador (actuador_id, accion, origen)
                                       VALUES ((SELECT min(id) FROM inv.actuador), 'APAGAR', 'REGLA')$$);    -- REGLA sin regla
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.comando_actuador (actuador_id, accion, valor, origen)
                                       VALUES ((SELECT min(id) FROM inv.actuador), 'ENCENDER', 101, 'IA')$$);
SELECT pg_temp.espera_error('23514', $$UPDATE inv.actuador SET valor = 101$$);
SELECT pg_temp.espera_error('23514', $$UPDATE inv.actuador SET modo = 'SEMI'$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
                                       VALUES ('RIEGO', 'C1', now(), '{"initials":"AB","name":"Ana","role":"Op"}', 'corta')$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
                                       VALUES ('PODA', 'C1', now(), '{"initials":"AB","name":"Ana","role":"Op"}',
                                               'Descripción suficientemente larga')$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.usuario (nombre, email, rol) VALUES ('X', 'x@prueba.local', 'ROOT')$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.estado_sensor (codigo, categoria) VALUES ('NUEVO', 'RARO')$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.umbral (cultivo_id, variable_id, min_optimo, max_optimo)
                                       VALUES ((SELECT min(id) FROM inv.cultivo),
                                               (SELECT id FROM inv.variable WHERE codigo = 'humedad_aire'), 80, 40)$$);
SELECT pg_temp.espera_error('23514', $$INSERT INTO inv.prediccion_ia (nodo_id, modelo, tipo, confianza)
                                       VALUES ((SELECT min(id) FROM inv.nodo), 'm', 'PRONOSTICO', 1.5)$$);

-- UNIQUE
SELECT pg_temp.espera_error('23505', $$INSERT INTO inv.nodo (codigo, invernadero_id)
                                       VALUES ('invernadero_albahaca_01', (SELECT min(id) FROM inv.invernadero))$$);
SELECT pg_temp.espera_error('23505', $$INSERT INTO inv.sensor (nodo_id, tipo_sensor_id, indice, nombre, pines)
                                       SELECT nodo_id, tipo_sensor_id, indice, 'Duplicado', pines FROM inv.sensor LIMIT 1$$);
INSERT INTO inv.usuario (nombre, email) VALUES ('Prueba', 'Prueba@Invernadero.local');
SELECT pg_temp.espera_error('23505', $$INSERT INTO inv.usuario (nombre, email) VALUES ('Otra', 'prueba@invernadero.local')$$);
SELECT pg_temp.espera_error('23505', $$INSERT INTO inv.paquete (nodo_codigo, recibido_en) VALUES ('n', '2026-11-01'), ('n', '2026-11-01')$$);

-- NOT NULL
SELECT pg_temp.espera_error('23502', $$INSERT INTO inv.variable (codigo, nombre, unidad) VALUES ('ph', 'pH', 'pH')$$);

-- Los valores válidos sí pasan
DO $$
BEGIN
    INSERT INTO inv.actividad (tipo, cantero, programada_en, responsable, descripcion)
    VALUES ('RIEGO', 'C1', now(), '{"initials":"AB","name":"Ana","role":"Op"}', 'Riego de prueba del cantero 1');
    ASSERT (SELECT estado = 'PENDIENTE' AND fotos = '[]'::jsonb FROM inv.actividad), 'defaults de actividad';
    UPDATE inv.actuador SET valor = 100;
    ASSERT (SELECT rol FROM inv.usuario WHERE email = 'Prueba@Invernadero.local') = 'LECTOR', 'rol por omisión';
END $$;

SELECT 'pruebas_restricciones: OK' AS resultado;

ROLLBACK;
