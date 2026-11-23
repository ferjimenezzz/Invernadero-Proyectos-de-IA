# API del backend

Hay dos formas de llegar a los datos, ambas sobre el mismo esquema `inv`:

- **Parte A · Adaptador REST (Express, puerto 3000).** Lo usan la app móvil y la app web. Habla los contratos de esas apps.
- **Parte B · PostgREST de Supabase.** Lo usan Automatización, Conectividad y Hardware directamente contra el proyecto Supabase.

> Estado (23 nov 2026): las rutas de la Parte A están probadas con datos falsos (`npm test`) y las principales (`/`, `/dispositivos`, `/mediciones/actual`, `/alertas`, `/api/v1/telemetry/live`) respondieron 200 contra el proyecto Supabase real. De la Parte B se verificaron contra Supabase la consulta de `v_lectura` y los códigos de error de §B.7, salvo el 409. Ver [`casos_prueba.md`](casos_prueba.md) y [`evidencias/2026-11-23_supabase.md`](evidencias/2026-11-23_supabase.md).

Convenciones: las fechas van en ISO 8601 (UTC en la base; las respuestas de la app móvil ya traen texto en America/Mexico_City). Los ejemplos de respuesta son cortos y ilustrativos, construidos a partir de los mapeadores de `src/api/formato.js`.

---

# Parte A · Adaptador REST

Base: `http://<IP de la laptop>:3000`. Código en `src/api/` (`app.js`, `movil.js`, `web.js`, `formato.js`, `datos.js`).

## A.1 Autenticación

| Petición | Quién actúa |
|---|---|
| Sin cabecera `Authorization` | La **cuenta de equipo** `eq-app` (`APP_EMAIL`/`APP_PASSWORD`, rol OPERADOR). El adaptador inicia sesión una vez y renueva el token solo. |
| `Authorization: Bearer <token>` | Ese usuario, con sus permisos (RLS). El token es el `access_token` de Supabase Auth; `POST /auth/login` lo devuelve. |
| `Authorization` con otro formato | **401** `Authorization debe ser Bearer <token>`. |

Consecuencia (riesgo aceptado para la demo en LAN, pendiente de decisión): sin token, cualquiera que llegue al puerto 3000 actúa como OPERADOR (puede mandar comandos al actuador y hacer el paro general).

## A.2 Reglas generales

- **CORS:** todas las respuestas llevan `Access-Control-Allow-Origin: *`, `Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`, `Allow-Headers: Content-Type, Authorization`. Un `OPTIONS` responde **204** sin cuerpo.
- **Cuerpos JSON:** máximo 100 kb (`express.json`).
- **Formato de error** (toda respuesta de error):
  ```json
  { "status": "error", "message": "Ruta no encontrada" }
  ```
- **Regla de 204:** las rutas móviles que **escriben** responden `204 No Content` sin cuerpo (la app móvil, en `api.ts`, trata 204 como `undefined`). Las rutas móviles que **leen** responden `200` con JSON. Las rutas `/api/v1` siempre responden con el sobre `{status:"success", timestamp, ...}` (200 o 201).
- **Códigos comunes a todas las rutas:**

| Código | Cuándo | Mensaje |
|---|---|---|
| 400 | JSON roto o de cuerpo inválido, parámetros fuera de regla | `Solicitud inválida` (JSON roto) o el mensaje de la validación |
| 401 | Bearer mal formado o token inválido/vencido | `Authorization debe ser Bearer <token>` / `Token inválido o vencido` |
| 403 | RLS o permisos de la BD (código SQL 42501) | `Sin permiso para esta operación` |
| 404 | Ruta inexistente o recurso no encontrado | `Ruta no encontrada` / el de cada ruta |
| 413 | Cuerpo mayor de 100 kb | `Cuerpo demasiado grande` |
| 500 | Error no esperado (p. ej. `PGRST106`); el detalle va solo al log del servidor | `Error interno` |
| 503 | Falta configuración (`.env`, cuenta de equipo) o Supabase no responde | `Backend sin configurar o cuenta de equipo no disponible` / `Supabase no disponible` |

- **Traducción de errores de Supabase** (`aError` en `datos.js`): 401, `PGRST301`, `PGRST303` o mensaje con "jwt" → 401; código `42501` → 403; `P0002` o `PGRST116` → 404; códigos `22xxx`/`23xxx` y `PGRST100/102/103` → 400 `Datos inválidos para la base de datos`; fallas de red (fetch failed, ECONN, timeout...) → 503; cualquier otro → 500.
- **Ping:** `GET /` y `HEAD /` → `200 {"ok":true}` (la app móvil lo usa para medir latencia). No necesita Supabase.
- **Frescura:** una lectura con más de **10 minutos** de antigüedad no se considera "actual": se muestra `--`/`null` y el sensor aparece sin conexión.

## A.3 Rutas de la app móvil

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| POST | `/auth/login` | Inicia sesión y devuelve perfil con token | 200 |
| GET | `/mediciones/actual` | Temperatura, humedad de aire y suelo, luz | 200 |
| GET | `/mediciones/historico` | Serie para la gráfica | 200 |
| GET | `/dispositivos` | Lista de sensores con su última lectura | 200 |
| GET | `/dispositivos/:id/detalle` | Detalle, estadísticas 24 h y reglas | 200 |
| POST | `/dispositivos/:id/calibrar` | Solicita calibración | 204 |
| PUT | `/umbrales/:sensorId` | Cambia el rango óptimo | 204 |
| GET | `/actuadores` | Tarjetas de actuadores y recomendación IA | 200 |
| POST | `/actuadores/detener-todo` | Paro general | 204 |
| POST | `/actuadores/riego-manual` | Enciende/apaga la bomba | 204 |
| PATCH | `/actuadores/:id` | Comando a un actuador | 204 |
| GET | `/alertas` | Alertas activas y resueltas | 200 |
| GET | `/actividades` | Bitácora de labores y resumen | 200 |
| POST | `/actividades` | Registra una labor | 204 |
| GET | `/invernaderos/actual` | Datos del invernadero | 200 |
| GET | `/red/estado` | Estado de la red y de los nodos | 200 |

`:id` y `:sensorId` son **códigos de dispositivo** (`SENS-…`, ver A.5) y deben cumplir `^[A-Za-z0-9_-]{1,40}$`; si no, o si no existe, la ruta responde 404 `Dispositivo no encontrado`.

### POST /auth/login

Body: `{ "email": string ≤254, "password": string ≤256 }`, ambos no vacíos. No requiere `Authorization`.
- 200:
  ```json
  { "id": "7", "name": "eq-app@invernadero.test", "role": "Operador", "faculty": "", "stats": [], "token": "<access_token>" }
  ```
  `role` es la traducción del rol de `inv.usuario` (Administrador, Operador, Lector, Equipo de Automatización/Conectividad/Hardware). `name` es el nombre del perfil, o el correo si no hay.
- 400 `email y password son obligatorios`; 401 `Credenciales inválidas`.

### GET /mediciones/actual

Promedio de las lecturas **válidas y vigentes** de cada variable (la humedad de suelo promedia las 3 zonas). `null` si no hay dato válido: nunca se manda 0 por un sensor caído.
```json
{ "temp": 24.5, "hum-aire": 60, "hum-suelo": 34.3, "luz": 14500 }
```

### GET /mediciones/historico

Query obligatoria: `variable` ∈ `temperatura | humedad | luz` (aire y luz; `humedad` es la del aire) y `rango` ∈ `1h | 6h | 24h | 7d`. El rango fija el intervalo de agrupación: 5 minutos, 30 minutos, 1 hora y 6 horas respectivamente.
- 200:
  ```json
  { "variable": "temperatura", "unit": "°C", "comfortMin": 20.1, "comfortMax": 20.4,
    "xLabels": ["09:15", "09:35", "09:55", "Ahora"],
    "points": [ { "label": "09:15", "value": 20.1 }, { "label": "09:20", "value": 20.4 } ],
    "sensorName": "Ambiente (DHT22)" }
  ```
  `points` queda vacío si hay menos de 2 puntos (la gráfica de la app divide entre cero). `comfortMin/Max` son el umbral óptimo de la BD; si la variable no tiene umbral (aire, hoy) la banda abarca el rango de los datos.
- 400 `variable (temperatura|humedad|luz) y rango (1h|6h|24h|7d) son obligatorios`; 404 `No hay sensor para esa variable`.

### GET /dispositivos

Una fila por sensor × variable (9 en el seed). Ejemplo de uno:
```json
{ "id": "SENS-SOIL-03", "name": "Humedad del sustrato (superficie) · Zona 3", "location": "Zona 3",
  "icon": "cup-water", "online": true, "status": "warning", "statusLabel": "Fuera de rango óptimo",
  "readingLabel": "HUMEDAD DEL SUSTRATO (SUPERFICIE)", "value": "15", "unit": "%",
  "trend": [15, 15, 15], "trendLabel": { "icon": "minus", "text": "Estable" },
  "alertMessage": "Humedad del sustrato menor a 35 %",
  "lastSeen": "Hace 3 seg (10:15 AM)",
  "hardware": { "icon": "chip", "text": "CAPACITIVO_V1.2 • Pines GPIO 34" } }
```
`status` ∈ `normal | warning | critical` (se deriva de la categoría del estado y de la evaluación contra umbrales). `value` es `--` si la última lectura no es válida o no existe; `alertMessage` solo aparece si `status` no es `normal`.

### GET /dispositivos/:id/detalle

Combina la última lectura, `fn_estadistica` y `fn_historico` de las últimas 24 h (agrupado por hora), las reglas activas y el cultivo. Campos de primer nivel: `id`, `module`, `title`, `icon`, `value`, `unit`, `status`, `statusLabel`, `lastTransmission`, `signal` (`N/D`), `battery` (`N/D`), `firmware` (`FW v1.0` o `N/D`), `stats` (mínimo, promedio, máximo; `--` y `Sin datos` si no hay lecturas), `history`, `crop`, `rules` (umbrales críticos/óptimos del cultivo), `thresholdEditor` (escala, valores actuales y reglas de automatización).
- 404 `Dispositivo no encontrado`.

### POST /dispositivos/:id/calibrar

Sin body. Mezcla `{"solicitud_calibracion": "<ISO>"}` en `sensor.calibracion` mediante `fn_calibrar_sensor` (solo registra la solicitud; el firmware no la lee todavía). 204; 404 `Dispositivo no encontrado`; 403 si el rol no puede calibrar (OPERADOR, HARDWARE y ADMIN sí).

### PUT /umbrales/:sensorId

Body: `{ "min": number, "max": number }`, números finitos con `min < max`. Además deben caer dentro del rango físico de la variable (`variable.rango_min`/`rango_max`). Hace upsert del rango óptimo (`min_optimo`, `max_optimo`) en `inv.umbral` para el cultivo del invernadero; no toca los valores críticos.
- 204; 400 `min y max deben ser números con min < max`; 400 `Los umbrales deben estar entre 0 y 100 %` (texto con el rango y unidad reales); 404 `Dispositivo no encontrado`; 403 si el rol no puede escribir umbrales (OPERADOR, AUTOMATIZACION y ADMIN sí).

### GET /actuadores

Solo se muestran actuadores de tipo BOMBA, ILUMINACION y VENTILADOR (en el seed solo existe `bomba_riego`). El estado combina `actuador` con el último comando válido (no FALLIDO/CANCELADO) más reciente que la última confirmación; si está PENDIENTE o ENVIADO se añade " • Esperando confirmación".
```json
{ "linked": 1, "totalPower": "N/D",
  "actuators": [ { "id": "bomba_riego", "name": "Bomba de riego", "icon": "water-outline", "iconBg": "primary",
                   "on": false, "toggleIcon": "waves",
                   "rule": { "icon": "shield-check-outline", "text": "Bloquear bomba si el tanque está casi vacío" },
                   "kind": "pump", "statusText": "Detenida", "remaining": "--:--" } ],
  "insight": { "title": "Sin recomendaciones", "text": "El modelo de IA aún no ha generado recomendaciones para el invernadero." } }
```
Las luces llevan `kind:"light"` y `pwm`; los ventiladores `kind:"fan"`, `level` (`off|low|high`) y `tempBadge`. `insight` toma la última `prediccion_ia` de tipo RECOMENDACION.

### POST /actuadores/detener-todo

Sin body. Llama a `fn_detener_todo('Parada de emergencia desde la app móvil')`: inserta un comando APAGAR MANUAL por cada actuador y pone todos en modo MANUAL. 204; 403 si el rol no puede insertar comandos o no hay usuario activo.

### POST /actuadores/riego-manual

Body: `{ "activo": boolean }`. Crea un comando ENCENDER/APAGAR MANUAL ("Riego manual desde la app móvil") para el primer actuador de tipo BOMBA. Un ENCENDER sin duración toma la de la regla de riego activa del actuador (10 s en el seed; ver `tg_comando_duracion`).
- 204; 400 `activo debe ser booleano`; 404 `No hay bomba de riego registrada`.

### PATCH /actuadores/:id

`:id` es el código del actuador (`bomba_riego`). Body con **exactamente una** clave:
- `{ "encendido": true|false }` → ENCENDER / APAGAR.
- `{ "pwm": 0–100 }` (entero) → 0 apaga; otro valor enciende con ese `valor` en %.
- `{ "nivel": "off"|"low"|"high" }` → off apaga; low enciende al 50 %; high al 100 %.

Crea un comando MANUAL ("Control manual desde la app móvil"). 204; 400 `Envía exactamente uno: encendido (boolean), pwm (0-100) o nivel (off|low|high)`; 404 `Actuador no encontrado`.

### GET /alertas

Alertas abiertas (`v_alertas_activas`, máx. 100) y las resueltas en los últimos 7 días (máx. 100).
```json
[ { "id": "12", "kind": "advertencia", "tag": "ADVERTENCIA • ACTIVA", "icon": "alert-outline",
    "title": "Humedad suelo 3 • Riego necesario",
    "body": "`SENS-SOIL-03` Humedad suelo 3: Humedad del sustrato menor a 35 %",
    "time": "Hace 12 seg", "read": false,
    "detail": [ { "icon": "repeat", "text": "4 ocurrencias" }, { "icon": "information-outline", "text": "Activar riego" } ],
    "actions": [ { "label": "Ver sensor", "action": "verSensor" } ],
    "footer": "Hoy, 10:14 hrs • Humedad suelo 3", "sensorId": "SENS-SOIL-03" } ]
```
`kind` es `critica` para categorías CRITICO y ERROR_HW, `advertencia` para ALERTA. Las resueltas llevan `tag` `... • RESUELTA`, `read: true` y `resolution`.

### GET /actividades · POST /actividades

GET devuelve `{ "summary": { "title": "Bitácora Universitaria", "compliance": "0% Cumplimiento", "text": "0 tareas completadas este mes" }, "items": [ ... ] }` con las últimas 100 labores; cada item tiene `id`, `type`, `icon`, `location` (`CANTERO 1`), `when` (`Hoy, 16:00 hrs`), `status` (`pendiente|enProceso|completada`), `title`, `description`, `assignee` y, si hay fotos, `hasEvidence`.

POST body (`NewActivityDraft`):

| Campo | Regla |
|---|---|
| `type` | `riego`, `inspeccion`, `medicion`, `fertilizacion` o `mantenimiento` |
| `bedId` | texto no vacío, máx. 20 |
| `date` | texto de fecha ISO 8601 |
| `responsible` | `{ initials, name, role }` no vacíos (`color` opcional) |
| `description` | al menos 10 caracteres |
| `observations` | opcional, texto |
| `photos` | opcional, lista de `{ name, size }` |

204; 400 con uno de: `Cuerpo inválido`, `type inválido`, `bedId inválido`, `date debe ser una fecha ISO`, `responsible inválido`, `description debe tener al menos 10 caracteres`, `observations inválido`. La actividad se guarda `PENDIENTE`.

### GET /invernaderos/actual

```json
{ "project": "Invernadero Albahaca 01", "surface": "100×60 cm • 0.6 m²",
  "species": [ { "common": "Albahaca", "scientific": "Ocimum basilicum" } ],
  "network": "1 nodo • ESP32 MQTT" }
```
404 `Invernadero no encontrado` si la tabla está vacía.

### GET /red/estado

```json
{ "mode": "real", "synced": true,
  "gateway": { "band": "WiFi 2.4 GHz", "apiUrl": "http://192.168.1.50:3000", "ip": "192.168.1.50", "mac": "N/D",
               "port": "3000", "portOpen": true, "latencyMs": 84 },
  "nodes": [ { "id": "invernadero_albahaca_01", "name": "invernadero_albahaca_01", "icon": "chip",
               "detail": "Firmware 1.0 • Hace 3 seg", "badge": "En línea", "badgeTone": "success", "healthy": true } ],
  "cloudSync": true }
```
`latencyMs` es el tiempo de una consulta mínima a Supabase (0 si no responde, con `cloudSync:false`). Un nodo está "En línea" si su último paquete tiene menos de 3 × `intervalo_ms` (15 s). Solo 401/403 propagan error; cualquier otro fallo da `cloudSync:false`.

## A.4 Rutas de la web (`/api/v1`)

Sobre de éxito: `{ "status": "success", "timestamp": "<ISO>", ... }`. Contrato de origen: `app web/config/api-contracts.php`.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/v1/telemetry/live` | 200 |
| POST | `/api/v1/actuators/command` | 201 |
| PUT | `/api/v1/sensors/calibration` | 200 |
| GET | `/api/v1/audit/logs` | 200 |

### GET /api/v1/telemetry/live

`zone_id` es el id del (único) invernadero. EC y CO₂ no tienen sensor: siempre `null`. VPD y punto de rocío se calculan con las mismas fórmulas que `app.js` de la web.
```json
{ "status": "success", "timestamp": "2026-11-22T16:15:03.120Z", "zone_id": 1,
  "data": { "temp_air_c": 24.5, "hum_air_pct": 60, "hum_soil_pct": 34.3, "radiation_lux": 14500,
            "temp_substrate_c": 19.5, "vpd_kpa": 1.23, "dew_point_c": 16.2, "ec_ms_cm": null, "co2_ppm": null } }
```
Cualquier valor sin lectura válida y vigente es `null`.

### POST /api/v1/actuators/command

Body: `{ "actuator_code": string, "action": "START"|"STOP"|"SET_SPEED"|"SET_POWER", "parameters": { ... } }`. `actuator_code` es el **código real** del actuador (`bomba_riego`), no los de la maqueta (`EV_01`...).

| `action` | `parameters` | Comando generado |
|---|---|---|
| `START` | — | ENCENDER |
| `STOP` | — | APAGAR |
| `SET_POWER` | `power_pct` entero 0–100 | 0 → APAGAR; otro → ENCENDER con `valor` = `power_pct` |
| `SET_SPEED` | `speed` ∈ `OFF`, `Baja` (33), `Media` (66), `Alta` (100) | OFF → APAGAR; otro → ENCENDER con ese `valor` |

`parameters.duration_minutes` (opcional, entero 1–1440) se convierte a `duracion_s` solo si el comando es ENCENDER. Motivo guardado: "Comando desde la web".
- 201: `{ "status": "success", "timestamp": "...", "data": { "command_id": 57, "estado": "PENDIENTE" } }`
- 400: `actuator_code y parameters inválidos` · `duration_minutes debe ser un entero entre 1 y 1440` · `power_pct debe ser un entero entre 0 y 100` · `speed debe ser OFF, Baja, Media o Alta` · `action debe ser START, STOP, SET_SPEED o SET_POWER`.
- 404: `Actuador desconocido. Códigos válidos: bomba_riego`.

El comando queda `PENDIENTE`: lo despacha Conectividad (ver [`contrato_mqtt.md`](contrato_mqtt.md)).

### PUT /api/v1/sensors/calibration

Body: `{ "sensor_code": string ≤40, "raw_dry_point": entero 0–4095, "raw_wet_point": entero 0–4095, "offset_linear": número (opcional, 0 por omisión) }`. El punto seco (aire) debe ser **mayor** que el mojado (agua). Se guarda en `sensor.calibracion` como `aire_crudo`, `agua_crudo` y `offset` (mezclado con lo que ya tenía).
```json
{ "status": "success", "timestamp": "...", "data": { "aire_crudo": 3140, "agua_crudo": 1280, "offset": 1.5, "alfa_filtro": 0.15 } }
```
- 400: `sensor_code inválido` · `raw_dry_point y raw_wet_point deben ser enteros 0–4095 (ADC de 12 bits) y offset_linear un número` · `raw_dry_point (aire) debe ser mayor que raw_wet_point (agua) en el sensor capacitivo`.
- 404 si el código no existe; 403 si el rol no puede calibrar.
- La ruta no comprueba que el sensor sea capacitivo: aceptaría `SENS-ENV-01`.

### GET /api/v1/audit/logs

Query (todo opcional):

| Parámetro | Regla |
|---|---|
| `device_id` | texto ≤60; filtra `dispositivo` (código de actuador o sensor, o código del nodo) |
| `severity` | `all`, `telemetry`, `manual`, `auto`, `alert`; admite varios separados por coma (`manual,auto,alert`). Por omisión `all` |
| `from`, `to` | fechas ISO 8601; `from` debe ser anterior a `to`; `from` inclusivo, `to` exclusivo |
| `page`, `per_page` | enteros positivos (1 y 50 por omisión); `per_page` se limita a 200 |
| `zone_id` | se acepta pero **no filtra** (hay un solo invernadero) |

```json
{ "status": "success", "timestamp": "...", "page": 1, "per_page": 50, "total": 240,
  "data": [ { "timestamp": "2026-11-22T16:14:50.000Z", "device": "bomba_riego", "event_type": "manual",
              "parameter_value": "ENCENDER por 10 s · Comando desde la web", "trigger": "eq-app@invernadero.test", "state": "PENDIENTE" } ] }
```
Orden: más reciente primero. 400: `severity debe ser: all, telemetry, manual, auto, alert (separados por coma)` · `device_id inválido` · `from debe ser una fecha ISO 8601` / `to ...` · `from debe ser anterior a to` · `page y per_page deben ser enteros positivos`.


## A.5 Códigos de dispositivo y de actuador

Salen de `inv.fn_codigo_dispositivo(prefijo, índice)` = `SENS-<prefijo><índice de 2 dígitos>`; el prefijo está en `inv.variable.prefijo_dispositivo`. Son los que usa la app móvil y los que debe usar la web (no los de su maqueta).

| Código | Variable (unidad) | Sensor | Ubicación |
|---|---|---|---|
| `SENS-ENV-01` | temperatura_aire (°C) | DHT22 | Aire, a la altura del follaje |
| `SENS-HUM-01` | humedad_aire (%) | DHT22 | Aire, a la altura del follaje |
| `SENS-LUX-01` | iluminancia (lx) | BH1750 | Sobre el cultivo |
| `SENS-TEMP-S01` | temperatura_suelo (°C) | DS18B20 | Zona radicular |
| `SENS-DIST-01` | distancia_agua (cm) | HC-SR04 | Tanque principal |
| `SENS-TANK-01` | nivel_tanque (%) | HC-SR04 | Tanque principal |
| `SENS-SOIL-01` … `SENS-SOIL-03` | humedad_suelo (%) | Capacitivo V1.2 | Zona 1, Zona 2, Zona 3 |

Actuador: `bomba_riego` (tipo BOMBA, nodo `invernadero_albahaca_01`, pin pendiente de Hardware).

Las **alertas** de un sensor de dos variables (el HC-SR04) usan un solo código "principal": el de la variable que tiene umbral (`SENS-TANK-01`) o, si ninguna, la de menor id (`inv.fn_codigo_sensor`).

---

# Parte B · PostgREST directo (Supabase)

Para Automatización, Conectividad y Hardware. No pasa por el adaptador.

## B.1 URL base y cabeceras

Base: `https://<ref>.supabase.co/rest/v1/`. Variables de los ejemplos: `$SUPABASE_URL`, `$ANON_KEY` (llave `anon`/*publishable*) y `$TOKEN` (JWT del usuario). **No pegar llaves ni tokens reales en documentos ni en el repo.**

| Cabecera | Valor | Cuándo |
|---|---|---|
| `apikey` | `$ANON_KEY` | Siempre |
| `Authorization` | `Bearer $TOKEN` | Siempre que haya sesión. Sin token actúa `anon`, que **no tiene permiso sobre nada** del esquema (403/401). |
| `Accept-Profile` | `inv` | Lecturas (`GET`, y respuestas de RPC) |
| `Content-Profile` | `inv` | Escrituras y `POST /rpc/...` |
| `Prefer` | `return=representation` | Opcional: devuelve la fila escrita |

Obtener el token (cada equipo tiene su cuenta, creada con `npm run usuarios`):
```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"eq-automatizacion@invernadero.test","password":"<contraseña de la cuenta>"}'
# -> {"access_token":"<JWT>", ...}
```

Las vistas de `inv` son `security_invoker`: aplican los permisos y RLS de quien consulta. Todos los roles autenticados leen todas las tablas y vistas (excepto la columna `email` de `usuario`). Las respuestas están limitadas por el máximo de filas del proyecto (Settings → API); usar `limit`, `offset` o la cabecera `Range` en consultas grandes.

## B.2 Lecturas

**Última medición por dispositivo** (tablero en vivo; 9 filas en el seed, aunque aún no haya lecturas: `evaluacion` = `SIN_LECTURA`):
```bash
curl "$SUPABASE_URL/rest/v1/v_ultima_medicion?select=codigo,variable,valor,unidad,valido,estado,evaluacion,tomado_en&order=codigo" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
```
```json
[ { "codigo": "SENS-ENV-01", "variable": "temperatura_aire", "valor": 24.5, "unidad": "°C", "valido": true,
    "estado": "OPTIMO", "evaluacion": "SIN_UMBRAL", "tomado_en": "2026-11-22T16:15:03.120+00:00" } ]
```
`evaluacion` ∈ `SIN_LECTURA`, `SIN_DATO_VALIDO`, `CRITICO`, `FUERA_DE_OPTIMO`, `SIN_UMBRAL`, `OPTIMO`. Trae también `tendencia` (últimos ≤12 valores válidos), `min_optimo`, `max_optimo`, `min_critico`, `max_critico`, `zona`, `nodo`.

**Histórico en formato largo** (`v_lectura`, una fila por lectura) filtrando por código, zona y rango de fechas:
```bash
curl -G "$SUPABASE_URL/rest/v1/v_lectura" \
  --data-urlencode "codigo=eq.SENS-SOIL-01" --data-urlencode "zona=eq.Zona 1" \
  --data-urlencode "tomado_en=gte.2026-11-22T00:00:00Z" --data-urlencode "tomado_en=lt.2026-11-23T00:00:00Z" \
  --data-urlencode "valido=is.true" --data-urlencode "order=tomado_en.asc" --data-urlencode "limit=100" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
```
Columnas: `id, paquete_id, codigo, nodo, sensor_id, sensor, zona, variable, unidad, valor, valido, estado, tomado_en`. El filtro de fechas es `>= desde` y `< hasta`.

**Histórico agrupado** (`fn_historico`, para gráficas; solo lecturas válidas):
```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_historico" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"p_nodo":"invernadero_albahaca_01","p_variable":"humedad_suelo","p_desde":"2026-11-22T00:00:00Z","p_hasta":"2026-11-23T00:00:00Z","p_intervalo":"1 hour"}'
```
Devuelve `sensor, indice, periodo, promedio, minimo, maximo, lecturas`. Los parámetros `p_desde`, `p_hasta` y `p_intervalo` son opcionales (24 h hacia atrás y 15 minutos por omisión).

**Estadística de un dispositivo** (`fn_estadistica`):
```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_estadistica" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"p_codigo":"SENS-SOIL-01","p_desde":"2026-11-22T00:00:00Z","p_hasta":"2026-11-23T00:00:00Z"}'
# -> [{"minimo":40.00,"minimo_en":"...","promedio":45.5,"maximo":51.00,"maximo_en":"...","lecturas":12}]
```

**Estado del nodo:** `GET v_estado_nodo` → `id, codigo, invernadero, cultivo, firmware_version, topic_telemetria, intervalo_ms, ultima_conexion, en_linea, alertas_abiertas`.

**Bitácora:** `GET v_bitacora?tipo=in.(manual,auto,alert)&ocurrido_en=gte.2026-11-22T00:00:00Z&order=ocurrido_en.desc&limit=50`. Columnas: `ocurrido_en, tipo (telemetry|manual|auto|alert), dispositivo, detalle, disparador, estado, referencia_id`.

**Dataset para IA** en CSV (1 fila por paquete, solo lecturas válidas):
```bash
curl "$SUPABASE_URL/rest/v1/v_dataset_ia?tomado_en=gte.2026-11-15T00:00:00Z&order=tomado_en.asc" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv" -H "Accept: text/csv" > dataset.csv
```
Columnas: `paquete_id, nodo, tomado_en, temp_aire_c, humedad_aire_pct, luz_lux, temp_suelo_c, distancia_agua_cm, nivel_tanque_pct, humedad_suelo_1_pct, humedad_suelo_2_pct, humedad_suelo_3_pct, hubo_falla_hw`.

**Catálogos** (solo `GET`): `cultivo`, `umbral`, `invernadero`, `nodo`, `sensor`, `variable`, `tipo_sensor`, `tipo_sensor_variable`, `estado_sensor`, `actuador`, `actividad`, `usuario` (solo `id, auth_id, nombre, rol, activo`).

## B.3 Alertas

```bash
# Activas, críticas primero
curl "$SUPABASE_URL/rest/v1/v_alertas_activas" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
```
Columnas: `id, nodo, sensor_id, sensor, estado, categoria, mensaje, accion_sugerida, abierta_en, ultima_vez_en, ocurrencias, reconocida, codigo`.

**Reconocer** (OPERADOR o ADMIN). La política exige `reconocida_por` = el id del propio usuario en `inv.usuario`; se obtiene con `rpc/fn_usuario_actual`:
```bash
YO=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/fn_usuario_actual" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Profile: inv" -H "Content-Type: application/json" -d '{}')
curl -X PATCH "$SUPABASE_URL/rest/v1/alerta?id=eq.12" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -H "Prefer: return=representation" -d "{\"reconocida_por\": $YO, \"reconocida_en\": \"2026-11-22T16:20:00Z\"}"
```
Si el rol no puede reconocer, o el `reconocida_por` no es el propio, RLS rechaza (403 `42501`) o devuelve `[]` sin cambios. Solo esas dos columnas son actualizables.

## B.4 Actuadores y comandos

```bash
# Catálogo de actuadores (id, codigo, tipo, modo, encendido, valor, actualizado_en)
curl "$SUPABASE_URL/rest/v1/actuador" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"

# Crear un comando manual (OPERADOR; usuario_id se llena solo con el usuario de la sesión)
curl -X POST "$SUPABASE_URL/rest/v1/comando_actuador" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"actuador_id":1,"accion":"ENCENDER","duracion_s":10,"origen":"MANUAL","motivo":"Riego de prueba"}'

# Conectividad marca ENVIADO y luego CONFIRMADO (o FALLIDO)
curl -X PATCH "$SUPABASE_URL/rest/v1/comando_actuador?id=eq.57" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"estado":"ENVIADO","enviado_en":"2026-11-22T16:21:00Z"}'
curl -X PATCH "$SUPABASE_URL/rest/v1/comando_actuador?id=eq.57" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"estado":"CONFIRMADO","confirmado_en":"2026-11-22T16:21:02Z"}'
```
Campos del `POST`: `actuador_id` (obligatorio), `accion` (`ENCENDER|APAGAR`), `duracion_s` (>0), `valor` (0–100), `origen` (`MANUAL|REGLA|IA`; obligatorio), `regla_id` (obligatorio si `origen=REGLA`), `usuario_id` (obligatorio si `MANUAL`; por omisión el de la sesión), `alerta_id`, `motivo`. Un `ENCENDER` manual sin `duracion_s` toma la de la regla de encendido activa de ese actuador (si no hay regla, queda sin duración). Al pasar a `CONFIRMADO`, un trigger actualiza `actuador.encendido`, `valor` y `actualizado_en`. Solo se pueden modificar `estado`, `enviado_en` y `confirmado_en`.

**Paro general:** `POST rpc/fn_detener_todo` con `{"p_motivo":"..."}` → devuelve el número de comandos APAGAR creados y pone los actuadores en modo MANUAL.

## B.5 Reglas, predicciones y umbrales (Automatización)

```bash
# Reglas activas
curl "$SUPABASE_URL/rest/v1/regla_automatizacion?activa=is.true&order=prioridad" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Accept-Profile: inv"
# Nueva regla (AUTOMATIZACION o ADMIN)
curl -X POST "$SUPABASE_URL/rest/v1/regla_automatizacion" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"nombre":"Regar con sustrato seco","estado_disparador":"RIEGO_NECESARIO","actuador_id":1,"accion":"ENCENDER","duracion_s":20,"espera_s":600,"prioridad":10}'
# Resultado de un modelo de IA
curl -X POST "$SUPABASE_URL/rest/v1/prediccion_ia" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Profile: inv" -H "Content-Type: application/json" \
  -d '{"nodo_id":1,"variable_id":7,"modelo":"modelo-demo-v1","tipo":"PRONOSTICO","objetivo_en":"2026-11-22T18:00:00Z","valor":38.5,"confianza":0.82,"detalle":{}}'
# Cambiar un umbral (OPERADOR, AUTOMATIZACION o ADMIN)
curl -X PATCH "$SUPABASE_URL/rest/v1/umbral?id=eq.1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Profile: inv" -H "Content-Type: application/json" -d '{"min_optimo":30,"max_optimo":70}'
```
`estado_disparador` debe existir en `estado_sensor`; `tipo` de `prediccion_ia` ∈ `PRONOSTICO|ANOMALIA|RECOMENDACION|CLASIFICACION`; `confianza` entre 0 y 1. Los ids de los ejemplos (`actuador_id:1`, `nodo_id:1`, `variable_id:7` = humedad_suelo) corresponden a una instalación limpia con los datos iniciales; confirmar con un `GET` antes de usarlos.

## B.6 Matriz de permisos por rol

Fuente: `bd/supabase.sql`. `anon` no tiene ningún permiso en `inv`; `service_role` (solo el suscriptor y los scripts) salta RLS y puede todo. Nadie con sesión puede hacer `DELETE`. Una cuenta con `activo = false` pierde todos los permisos de escritura.

| Recurso / acción | ADMIN | OPERADOR | LECTOR | AUTOMATIZACION | CONECTIVIDAD | HARDWARE |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Leer tablas y vistas (menos `usuario.email`) | sí | sí | sí | sí | sí | sí |
| `comando_actuador` INSERT | cualquier origen | MANUAL, a su nombre | no | MANUAL a su nombre; REGLA e IA | no | no |
| `comando_actuador` UPDATE (`estado`, `enviado_en`, `confirmado_en`) | sí | no | no | sí | sí | no |
| `alerta` UPDATE (reconocer) | sí | sí | no | no | no | no |
| `umbral` INSERT/UPDATE | sí | sí | no | sí | no | no |
| `actuador` UPDATE | sí | sí | no | sí | no | sí |
| `actuador` INSERT | sí | no | no | no | no | sí |
| `actividad` INSERT/UPDATE | sí | sí | no | no | no | no |
| `regla_automatizacion`, `prediccion_ia`, `estado_sensor` INSERT/UPDATE | sí | no | no | sí | no | no |
| `nodo`, `tipo_sensor`, `variable`, `tipo_sensor_variable`, `sensor` INSERT/UPDATE | sí | no | no | no | no | sí |
| `usuario` UPDATE (`nombre`, `rol`, `activo`) | sí | no | no | no | no | no |
| `fn_calibrar_sensor` | sí | sí | no | no | no | sí |
| `fn_detener_todo` | sí | sí | no | sí | no | no |
| `fn_historico`, `fn_estadistica`, `fn_usuario_actual`, `fn_rol_actual`, `fn_codigo_dispositivo`, `fn_codigo_sensor` | sí | sí | sí | sí | sí | sí |
| `fn_ingestar_paquete`, `fn_purgar_payload` | solo `service_role` | | | | | |

Cada cuenta nueva de Supabase Auth recibe un perfil `LECTOR`; un ADMIN (o `npm run usuarios`) le sube el rol.

## B.7 Errores de PostgREST y su código HTTP

Según la documentación de PostgREST (no verificado contra el proyecto real). El cuerpo trae `code`, `message`, `details` y `hint`.

| Situación | Código | HTTP |
|---|---|---|
| Esquema no expuesto o `Accept-Profile` inválido | `PGRST106` | 406 |
| Parámetro de consulta mal formado | `PGRST100` | 400 |
| Valor inválido para el tipo (`22P02`, `22023`) o violación de CHECK (`23514`) | SQLSTATE | 400 |
| Llave única (`23505`) o foránea (`23503`) violada | SQLSTATE | 409 |
| JWT inválido o vencido | `PGRST301` / `PGRST303` | 401 |
| Sin permiso o RLS: rol `anon` | `42501` | 401 |
| Sin permiso o RLS: usuario autenticado | `42501` | 403 |
| Tabla, vista o función inexistente | `PGRST205` / `PGRST202` | 404 |
| Se pidió un único objeto y no hay exactamente uno | `PGRST116` | 406 |
| Excepción lanzada por una función (`RAISE EXCEPTION`, p. ej. dispositivo inexistente en `fn_calibrar_sensor`) | SQLSTATE de la excepción | 400 (a confirmar) |

Un `PATCH` o `DELETE` que RLS deja sin filas **no es un error**: responde 2xx con cero filas afectadas (con `Prefer: return=representation` devuelve `[]`). Comprobar siempre el resultado.

## B.8 Realtime

Se publican las tablas `alerta` y `comando_actuador` (`supabase_realtime`; los clientes de Supabase no pueden hacer `LISTEN`). RLS aplica: hace falta un token de usuario autenticado (todos los roles leen). Ejemplo con `supabase-js` (cliente con `db: { schema: 'inv' }`):
```js
supabase.channel('comandos')
  .on('postgres_changes', { event: 'INSERT', schema: 'inv', table: 'comando_actuador' }, (p) => despachar(p.new))
  .subscribe();
supabase.channel('alertas')
  .on('postgres_changes', { event: '*', schema: 'inv', table: 'alerta' }, (p) => mostrar(p.new))
  .subscribe();
```
Conectividad escucha los `INSERT` de `comando_actuador` con `estado = 'PENDIENTE'`. Si `supabase_realtime` no existe en el servidor (PostgreSQL local), `supabase.sql` omite este paso con un NOTICE.
