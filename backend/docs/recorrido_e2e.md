# Recorrido de extremo a extremo: MQTT → BD → API

> **Ejecutado en parte el 23 nov 2026** contra el proyecto Supabase del equipo y con el **broker local**: resultados en [`evidencias/2026-11-23_supabase.md`](evidencias/2026-11-23_supabase.md). Falta correrlo con el broker de Conectividad y el ESP32, y la reconexión del paso 7. Este documento es el procedimiento; no contiene resultados. Las salidas "esperadas" se derivan del código y de las pruebas SQL; deben compararse con lo que salga de verdad y registrarse en [`casos_prueba.md`](casos_prueba.md) (CP-P04 a CP-P08).

Objetivo (hito H4/H6): demostrar que ≥ 10 mensajes válidos consecutivos llegan a la base con sensor, valor y hora correctos; que un mensaje inválido **no** se guarda como lectura válida y deja su error; y que la API devuelve esos datos.

## 0. Prerrequisitos

- Proyecto Supabase creado, `bd/invernadero_bd.sql` y `bd/supabase.sql` instalados, esquema `inv` expuesto y `npm run usuarios` ejecutado (pasos 1 a 5 del README).
- `backend/.env` completo: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_EMAIL`/`APP_PASSWORD`, `MQTT_URL`.
- Tres terminales en `backend/`. Para consultar por PostgREST: `$SUPABASE_URL`, `$ANON_KEY` y `$TOKEN` (ver `API.md` §B.1; **no registrar valores de llaves ni tokens en la evidencia**).
- Anotar la hora UTC de inicio (`$INICIO`, p. ej. `2026-11-22T16:00:00Z`) para filtrar.

## 1. Broker (terminal 1)

```
npm run broker
```
Esperado: `[HH:MM:SS] broker MQTT en el puerto 1883` (o el puerto de `MQTT_URL`). Con el broker real de Conectividad se omite este paso y se ajusta `MQTT_URL`/credenciales.

## 2. Suscriptor y API (terminal 2)

```
npm start
```
Esperado, en este orden aproximado:
```
[api] adaptador REST escuchando en 0.0.0.0:3000
[HH:MM:SS] MQTT conectado, suscrito a invernadero/albahaca/invernadero_albahaca_01/telemetria
```
Si imprime `Falta SUPABASE_URL...`, revisar el `.env`. Si ya había mensajes en el búfer: `búfer con N pendientes de una sesión anterior`.

## 3. Publicar mensajes simulados (terminal 3)

```
npm run simular -- --validos 12 --invalidos --intervalo 1000
```
Esperado en la terminal 3: `enviado 1/15` ... `enviado 15/15` y `Resumen: 12 válidos + 3 inválidos publicados en invernadero/albahaca/invernadero_albahaca_01/telemetria`. Los mensajes 13 a 15 son: texto que no es JSON, un JSON sin `sensores` y un JSON con el DS18B20 desconectado.

Esperado en la terminal 2 (suscriptor), un renglón por mensaje:
- Mensajes 1 a 12: `OK paquete=<id> nodo=invernadero_albahaca_01`.
- Mensaje 13: `INVALIDO motivo=JSON no interpretable topic=...` y luego `REGISTRADO paquete=<id> (con error de formato)`.
- Mensaje 14: `INVALIDO motivo=falta sensores (objeto) topic=...` y luego `REGISTRADO paquete=<id> (con error de formato)`.
- Mensaje 15: `OK paquete=<id> ...` (es un mensaje bien formado; trae un sensor con falla de hardware, no un formato inválido).

**Capturar:** la salida de las terminales 2 y 3 completas.

## 4. Verificar en la base (PostgREST)

Paquetes (los últimos 15):
```bash
curl "$SUPABASE_URL/rest/v1/paquete?select=id,recibido_en,nodo_codigo,procesado,error_procesamiento&order=id.desc&limit=15" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
```
Esperado, por construcción de los mensajes:
- 12 paquetes con `procesado: true` y `error_procesamiento: null` (mensajes 1 a 12).
- 1 con `procesado: false`, `nodo_codigo: null` y `error_procesamiento: "El payload no es un objeto JSON"` (mensaje 13).
- 1 con `procesado: false`, `nodo_codigo: "invernadero_albahaca_01"` y `error_procesamiento: "El JSON no trae el objeto \"sensores\""` (mensaje 14).
- 1 con `procesado: true` y `error_procesamiento` con avisos `Sin datos para ambiente[1]; Sin datos para luz[1]; Sin datos para tanque_agua[1]; Sin datos para suelo_superficie[2]; Sin datos para suelo_superficie[3]` (mensaje 15).
- Los `recibido_en` separados ≈ 1 s y en orden de envío.

Los dos paquetes inválidos **no deben tener** mediciones:
```bash
curl "$SUPABASE_URL/rest/v1/medicion?select=id&paquete_id=in.(<id13>,<id14>)" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
# esperado: []
```
**Capturar:** ambas respuestas.

## 5. Lecturas conocidas con filtro de fechas (H5)

Humedad de suelo de la zona 1: el mensaje *i* trae `40 + i` (i = 0..11) y el mensaje 15 trae 40.
```bash
curl -G "$SUPABASE_URL/rest/v1/v_lectura" \
  --data-urlencode "codigo=eq.SENS-SOIL-01" --data-urlencode "zona=eq.Zona 1" \
  --data-urlencode "tomado_en=gte.$INICIO" --data-urlencode "order=tomado_en.asc" \
  --data-urlencode "select=codigo,zona,valor,unidad,valido,estado,tomado_en" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
```
Esperado: 13 filas con `valido: true`; valores `40, 41, ..., 51` y al final `40` (mensaje 15); `unidad: "%"`; `estado: "OPTIMO"`.

Temperatura del aire: `SENS-ENV-01` con valores `20.0, 20.1, ... 21.1` (12 filas, `unidad: "°C"`).

Filtro de fechas: repetir la consulta con `tomado_en=lt.<hora del 5.º mensaje>` y comprobar que solo devuelve los mensajes anteriores (los de fuera del intervalo no aparecen), y con un intervalo anterior a `$INICIO` debe devolver `[]`.

Falla de hardware (mensaje 15): `SENS-TEMP-S01` tiene una lectura con `valor: -127`, `valido: false`, `estado: ERROR_DS18B20_DESCONECTADO`, que **no** aparece al filtrar `valido=is.true` ni en `fn_historico`.

Alertas esperadas (`v_alertas_activas`): `RIEGO_NECESARIO` en la zona 3 con `ocurrencias` = 12 (el sensor 3 siempre trae 15 %) y `ERROR_DS18B20_DESCONECTADO` con `ocurrencias` = 1 (el resto de los mensajes no trae el DS18B20 desconectado). Las críticas/de hardware salen primero.

**Capturar:** las respuestas JSON con los 13 valores y el filtro de fechas.

## 6. Verificar la API del adaptador

Sin `Authorization` (actúa `eq-app`):
```bash
curl http://localhost:3000/mediciones/actual
curl http://localhost:3000/dispositivos
curl "http://localhost:3000/mediciones/historico?variable=temperatura&rango=1h"
curl http://localhost:3000/api/v1/telemetry/live
curl http://localhost:3000/alertas
```
Esperado (dentro de los 10 minutos posteriores al envío): `mediciones/actual` con `temp` ≈ 21.1 (último mensaje con ambiente), `hum-aire` 60, `luz` 14500 y `hum-suelo` ≈ promedio de las zonas válidas; `temp_substrate_c` en `telemetry/live` **`null`** (la última lectura del DS18B20 es la no válida: nunca 0); `ec_ms_cm` y `co2_ppm` `null`; `/dispositivos` con 9 elementos; `/alertas` con las dos alertas de arriba. Después de más de 10 minutos sin mensajes, los valores pasan a `null` y los sensores a `online: false`.

Con token (actúa ese usuario):
```bash
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"eq-app@invernadero.test","password":"<contraseña de la cuenta>"}'
curl http://localhost:3000/dispositivos -H "Authorization: Bearer <token devuelto>"
```
Casos de error a capturar: `curl -i http://localhost:3000/no-existe` (404 `{"status":"error","message":"Ruta no encontrada"}`); `curl -i http://localhost:3000/dispositivos -H "Authorization: Basic x"` (401 `Authorization debe ser Bearer <token>`); `curl -i "http://localhost:3000/mediciones/historico?variable=x"` (400).


## 7. Corte de internet y búfer (opcional pero recomendado)

1. Con el suscriptor corriendo y el broker **local** (que sigue funcionando sin internet), desconectar la laptop de internet.
2. `npm run simular -- --validos 5 --intervalo 1000`.
   Esperado en el suscriptor: `SIN CONEXION → búfer (1 pendientes) causa=...` ... `(5 pendientes)`; el archivo `buffer/pendientes.jsonl` tiene 5 líneas.
3. Reconectar. En ≤ 15 s: `REENVIADOS 5 (0 pendientes)`.
4. Comprobar que se guardaron 5 paquetes nuevos **con su `recibido_en` original** (no la hora del reenvío) y sin duplicados. Reiniciar el suscriptor con pendientes también debe mostrar `búfer con N pendientes de una sesión anterior` y reenviarlos.

## 8. Qué capturar como evidencia

Guardar con fecha y hora, sin llaves ni tokens (recortar o sustituir por `<TOKEN>`):
1. Terminales 1, 2 y 3 completas (pasos 1 a 3).
2. Respuesta de `paquete` y de `medicion` de los inválidos (paso 4).
3. Respuesta de `v_lectura` con los 13 valores, y la consulta con filtro de fechas (paso 5).
4. Respuestas del adaptador, incluidos los errores 400/401/404 (paso 6).
5. Salida del corte de internet y el reenvío (paso 7).
6. Resultado de `npm run respaldo` después de la sesión (con el origen Supabase) y confirmación de que el archivo está en el Google Drive.
7. Tamaño de la base tras la sesión (consulta del README) frente al umbral de 400 MB.

Cada evidencia se referencia en la columna "Evidencia" de `casos_prueba.md` y su resultado real reemplaza a **PENDIENTE**.
