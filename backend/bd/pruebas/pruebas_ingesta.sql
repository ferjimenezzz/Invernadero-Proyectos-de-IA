-- =============================================================================
--  PRUEBAS DE INGESTA · Invernadero Albahaca
--  Simula 4 mensajes MQTT y revisa lo que guarda la BD.
--  Todo corre dentro de una transacción y se deshace al final (ROLLBACK),
--  así que se puede ejecutar las veces que quieran sin ensuciar la BD.
-- =============================================================================
BEGIN;

-- 1) JSON tal como lo imprime el firmware de la sección 6 (humedad_pct, nivel_pct, id numérico)
SELECT inv.fn_ingestar_paquete($json$
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
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', now() - interval '20 seconds') AS paquete_1;

-- 2) JSON con el formato del ejemplo de la sección 5 (humedad_relativa_pct, nivel_llenado_pct, timestamp)
SELECT inv.fn_ingestar_paquete($json$
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
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', now() - interval '15 seconds') AS paquete_2;

-- Automatización: genera comandos a partir de las reglas activas y alertas abiertas
INSERT INTO inv.comando_actuador (actuador_id, accion, duracion_s, origen, regla_id, alerta_id, motivo)
SELECT r.actuador_id, r.accion, r.duracion_s, 'REGLA', r.id, a.id, r.nombre
  FROM inv.regla_automatizacion r
  JOIN inv.alerta a ON a.estado = r.estado_disparador AND a.resuelta_en IS NULL
 WHERE r.activa
RETURNING id, accion, duracion_s, motivo, estado;

-- 3) Fallas de hardware: DHT22 sin respuesta, DS18B20 desconectado (-127),
--    HC-SR04 desconectado (distancia 0 → el firmware dice NIVEL_MAXIMO), poca luz.
--    El sensor 3 ya regresó a OPTIMO → su alerta de riego se debe cerrar sola.
SELECT inv.fn_ingestar_paquete($json$
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
}$json$::jsonb, 'invernadero/albahaca_01/telemetria', now() - interval '10 seconds') AS paquete_3;

-- 4) Nodo que no está registrado → se guarda pero no se procesa
SELECT inv.fn_ingestar_paquete('{"nodo_id": "nodo_fantasma", "sensores": {}}'::jsonb,
                               'invernadero/fantasma/telemetria', now() - interval '5 seconds') AS paquete_4;

-- ---------------------------- RESULTADOS ------------------------------------
SELECT 'v_ultima_medicion' AS consulta;
SELECT sensor, variable, valor, unidad, valido, estado, evaluacion FROM inv.v_ultima_medicion;

SELECT 'v_alertas_activas' AS consulta;
SELECT sensor, estado, categoria, accion_sugerida, ocurrencias FROM inv.v_alertas_activas;

SELECT 'alertas cerradas' AS consulta;
SELECT s.nombre AS sensor, a.estado, a.ocurrencias, a.resuelta_en IS NOT NULL AS resuelta
  FROM inv.alerta a JOIN inv.sensor s ON s.id = a.sensor_id
 WHERE a.resuelta_en IS NOT NULL;

SELECT 'paquetes' AS consulta;
SELECT id, nodo_codigo, procesado, ts_dispositivo, estado_general, error_procesamiento FROM inv.paquete ORDER BY id;

SELECT 'v_estado_nodo' AS consulta;
SELECT codigo, en_linea, alertas_abiertas FROM inv.v_estado_nodo;

SELECT 'fn_historico humedad_suelo' AS consulta;
SELECT * FROM inv.fn_historico('invernadero_albahaca_01', 'humedad_suelo',
                               now() - interval '1 hour', now() + interval '1 minute', interval '1 hour');

SELECT 'v_dataset_ia' AS consulta;
SELECT * FROM inv.v_dataset_ia ORDER BY tomado_en;

ROLLBACK;
