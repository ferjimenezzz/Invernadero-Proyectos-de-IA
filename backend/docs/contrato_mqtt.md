# Contrato MQTT y de datos

Acuerdo entre Hardware e IoT (firmware del ESP32), Conectividad (broker) y BD y Backend (suscriptor). Describe **lo que el código de este repositorio ya hace**; los puntos que dependen de otro equipo están marcados como **pendientes**.

> Estado: el suscriptor y la función de ingesta están probados con mensajes simulados (`npm test`, `npm run test:bd`). No se ha probado con el broker real de Conectividad ni con el ESP32. El contrato todavía no está firmado por escrito con esos equipos (actividad A del plan).

## 1. Topics y QoS

| Dirección | Topic | Cómo se define |
|---|---|---|
| Telemetría (ESP32 → suscriptor) | `invernadero/albahaca_01/telemetria` | Variable de entorno `MQTT_TOPIC_TELEMETRIA`; ese es el valor por omisión del suscriptor y de `simular.js`. Coincide con `nodo.topic_telemetria` del seed, pero el suscriptor usa la variable, no la columna: deben mantenerse iguales. |
| Comandos (despachador → ESP32) | `invernadero/albahaca_01/comandos` | Solo existe como dato: `nodo.topic_comandos` del seed. **Pendiente de confirmar con Conectividad.** Ningún código de este repo publica en él. |

- **QoS 1** (al menos una vez): el suscriptor se suscribe con QoS 1 y el simulador publica con QoS 1. Por eso puede haber duplicados, y por eso la ingesta es idempotente (sección 7).
- El suscriptor usa `clean: true`, reconexión cada 2 s y un `clientId` único por proceso (`suscriptor_bd_<pid>_<aleatorio>`).
- Se suscribe a **un solo topic exacto** (sin comodines). Un segundo nodo con otro topic requiere cambiar la variable o ampliar el código.

## 2. Variables del broker (pendientes de Conectividad)

| Variable | Valor por omisión | Estado |
|---|---|---|
| `MQTT_URL` | `mqtt://localhost:1883` | Host y puerto del broker real: **pendiente** |
| `MQTT_USERNAME` | (vacío = sin autenticación) | **Pendiente** |
| `MQTT_PASSWORD` | (vacío) | **Pendiente** |
| `MQTT_TOPIC_TELEMETRIA` | `invernadero/albahaca_01/telemetria` | Confirmar |
| `BUFFER_PATH` | `./buffer/pendientes.jsonl` (relativo a `backend/`) | Propio del suscriptor |

Para pruebas sin hardware, `npm run broker` levanta un broker local (aedes) en el puerto de `MQTT_URL`.

## 3. JSON de telemetría

Un mensaje cada 5 s por nodo (`nodo.intervalo_ms = 5000`). Tamaño máximo 16 KB.

### Formato real del firmware (sección 6 del documento de Hardware)

No trae `timestamp` ni `estado_general`; los nombres de campo son los de abajo.
```json
{
  "nodo_id": "invernadero_albahaca_01",
  "cultivo": "albahaca",
  "sensores": {
    "ambiente":          { "tipo": "DHT22",   "temperatura_c": 24.5, "humedad_pct": 60, "estado": "OPTIMO" },
    "luz":               { "tipo": "BH1750",  "luxes": 14500, "estado": "ILUMINACION_ADECUADA" },
    "suelo_profundidad": { "tipo": "DS18B20", "temperatura_c": 19.5, "estado": "TEMPERATURA_OPTIMA" },
    "tanque_agua":       { "tipo": "HC-SR04", "distancia_cm": 12, "nivel_pct": 80, "estado": "NIVEL_SEGURO" },
    "suelo_superficie": [
      { "id": 1, "pin": 32, "humedad_pct": 40, "estado": "OPTIMO" },
      { "id": 2, "pin": 33, "humedad_pct": 48, "estado": "OPTIMO" },
      { "id": 3, "pin": 34, "humedad_pct": 15, "estado": "RIEGO_NECESARIO" }
    ]
  }
}
```

### Formato del ejemplo (sección 5 del documento)

Agrega `timestamp` y `estado_general`, y usa otros nombres: `humedad_relativa_pct`, `nivel_llenado_pct`, y `id` como número o texto (`"sensor_1"`).
```json
{
  "nodo_id": "invernadero_albahaca_01", "timestamp": "2026-10-11T10:00:00Z", "cultivo": "albahaca", "estado_general": "OPERATIVO",
  "sensores": {
    "ambiente":          { "tipo": "DHT22",   "temperatura_c": 24.5, "humedad_relativa_pct": 60.2, "estado": "OPTIMO" },
    "luz":               { "tipo": "BH1750",  "luxes": 14500, "estado": "ILUMINACION_ADECUADA" },
    "suelo_profundidad": { "tipo": "DS18B20", "temperatura_c": 19.5, "estado": "TEMPERATURA_OPTIMA" },
    "tanque_agua":       { "tipo": "HC-SR04", "distancia_cm": 12, "nivel_llenado_pct": 75, "estado": "NIVEL_SEGURO" },
    "suelo_superficie": [ { "id": 1, "pin": 32, "humedad_pct": 45, "estado": "OPTIMO" } ]
  }
}
```

### Qué campos lee la ingesta

La función `inv.fn_ingestar_paquete` es **guiada por datos** (tablas `tipo_sensor`, `tipo_sensor_variable`, `sensor`): para cada sensor activo del nodo busca su bloque en `sensores[clave_json]` y, dentro del bloque, la **primera** llave que exista de la lista (variantes aceptadas):

| Bloque (`clave_json`) | Sensor | Variable | Llaves aceptadas, en orden |
|---|---|---|---|
| `ambiente` | DHT22 | temperatura_aire | `temperatura_c` |
| `ambiente` | DHT22 | humedad_aire | `humedad_pct`, `humedad_relativa_pct` |
| `luz` | BH1750 | iluminancia | `luxes`, `iluminancia_lux` |
| `suelo_profundidad` | DS18B20 | temperatura_suelo | `temperatura_c` |
| `tanque_agua` | HC-SR04 | distancia_agua | `distancia_cm` |
| `tanque_agua` | HC-SR04 | nivel_tanque | `nivel_pct`, `nivel_llenado_pct` |
| `suelo_superficie` (arreglo) | Capacitivo V1.2 | humedad_suelo | `humedad_pct` |

- Cada valor puede venir como número o como **texto numérico** (`"24.5"`). Cualquier otra cosa (texto no numérico, `null`, ausente) se guarda como `valor = NULL` y la lectura queda no válida.
- Los elementos del arreglo `suelo_superficie` se empatan con `sensor.indice` por el **`id`** (número `3`, o texto cuyo final sean dígitos, como `"sensor_3"`); si un elemento no trae `id`, por su **posición** en el arreglo.
- `estado` se normaliza a mayúsculas sin espacios sobrantes (máx. 60). Si falta, se usa `SIN_ESTADO`.
- Los campos `tipo`, `pin` y `cultivo` no se usan para decidir nada: el sensor se identifica por su bloque y su `id`.
- Un bloque o sensor ausente no rechaza el mensaje: se omite y se anota en `paquete.error_procesamiento` (`Sin datos para ambiente[1]`).
- Agregar un sensor nuevo (p. ej. pH) solo requiere insertar filas en `tipo_sensor`, `variable`, `tipo_sensor_variable` y `sensor` (rol HARDWARE o ADMIN); no hay que tocar la función.

## 4. Unidades

| Variable | Unidad | Rango físico válido |
|---|---|---|
| temperatura_aire | °C | -40 a 80 |
| humedad_aire | % | 0 a 100 |
| iluminancia | lx | 0 a 65 535 |
| temperatura_suelo | °C | -55 a 125 |
| distancia_agua | cm | 2 a 400 |
| nivel_tanque | % | 0 a 100 |
| humedad_suelo | % | 0 a 100 |

Los valores se guardan con 2 decimales (`numeric(10,2)`); un valor de magnitud 10^8 o mayor se guarda como `NULL`. El "rango físico" es el del sensor: fuera de él la lectura es una falla de hardware, no un dato agronómico.

## 5. Hora

- **La hora de la lectura es la hora de recepción en el suscriptor** (`recibido_en`, tomada en cuanto llega el mensaje, en UTC). Se guarda igual en `paquete.recibido_en` y `medicion.tomado_en`.
- El campo `timestamp` del JSON es **opcional**: si viene y es una fecha válida se guarda aparte en `paquete.ts_dispositivo`; si viene mal formado se ignora. **Nunca** sustituye a la hora de recepción (el firmware actual no lo manda, y un ESP32 sin reloj sincronizado daría horas falsas).
- Todo se guarda en `timestamptz`; las apps convierten a America/Mexico_City al mostrar.

## 6. Validación y mensajes inválidos

El suscriptor (`src/ingesta.js`, `validar`) revisa cada mensaje **antes** de enviarlo. Un mensaje inválido **no se descarta**: se manda igual a la BD para que quede registrado con su error, y la BD **nunca** lo guarda como lectura válida.

| Caso | Motivo en el log del suscriptor | Qué guarda la BD en `inv.paquete` |
|---|---|---|
| Más de 16 KB (16 384 bytes) | `mensaje de N bytes (máx 16384)` | El texto truncado a **2000 caracteres** como cadena; `error_procesamiento = El payload no es un objeto JSON` |
| No es JSON | `JSON no interpretable` | El texto (máx. 2000 caracteres); mismo error |
| JSON que no es un objeto (lista, número...) | `el JSON no es un objeto` | `El payload no es un objeto JSON` |
| Sin `nodo_id` (texto no vacío) | `falta nodo_id (texto)` | El objeto; `Nodo no registrado o inactivo: (sin nodo_id)` |
| Sin `sensores` (objeto) | `falta sensores (objeto)` | El objeto; `El JSON no trae el objeto "sensores"` |
| `nodo_id` que no existe o está inactivo | (pasa la validación) | El paquete se guarda con `nodo_id` NULL y `Nodo no registrado o inactivo: <código>`; sin mediciones |

En todos estos casos `procesado = false` y no se crea ninguna fila en `medicion`. Un paquete correcto queda `procesado = true`, con avisos opcionales (`CON_AVISOS` en la bitácora) si faltaron bloques.

### Lecturas no válidas dentro de un mensaje correcto

Un mensaje bien formado puede traer sensores caídos. La lectura se guarda con `valido = false` (y no entra en gráficas, promedios, estadísticas ni en `v_dataset_ia`) cuando:
- el estado reportado tiene categoría `ERROR_HW` (p. ej. `ERROR_DS18B20_DESCONECTADO`, que llega con -127 °C); o
- el valor falta o no es numérico; o
- el valor está **fuera del rango físico** de la variable. Si además el estado no era ya `ERROR_HW`, la BD lo reemplaza por `LECTURA_FUERA_DE_RANGO` (el estado original queda en `paquete.payload` hasta la purga). Ejemplo: un HC-SR04 desconectado manda distancia 0 y el firmware dice `NIVEL_MAXIMO`; la BD lo marca como falla.

## 7. Sin conexión e idempotencia

**Búfer local.** Si `fn_ingestar_paquete` falla (sin internet, Supabase caído o pausado, tiempo de espera de 10 s), el suscriptor guarda el mensaje en `BUFFER_PATH` (JSONL; una línea `{"payload", "topic", "recibido_en"}` por mensaje) y lo registra en el log como `SIN CONEXION → búfer (N pendientes)`.
- **Orden:** mientras haya pendientes, todo mensaje nuevo se agrega **detrás** de ellos, aunque la conexión haya vuelto, para no alterar el orden.
- **Reenvío:** cada 15 s y cada vez que el cliente MQTT se (re)conecta. Se reenvía en orden **con el `recibido_en` original**, de modo que la hora de la lectura no cambia. Se detiene en el primer fallo y conserva el resto (el archivo se reescribe de forma atómica).
- **Líneas corruptas** (JSON roto o sin `recibido_en`/`topic`) se mueven a `pendientes.corruptos.jsonl`; nunca se pierden.
- Al arrancar, el suscriptor lee el archivo y avisa cuántos pendientes dejó la sesión anterior.
- El proceso se detiene con SIGINT/SIGTERM; lo que no estaba en el búfer ni se había enviado se pierde (no hay cola persistente de entrada).
- Limitación: si la BD rechaza de forma permanente un mensaje (p. ej. esquema `inv` no expuesto), ese mensaje bloquea el reenvío de los siguientes hasta resolver la causa.

**Idempotencia.** `inv.paquete` tiene `UNIQUE (nodo_codigo, recibido_en)`. Reenviar el mismo mensaje (duplicado QoS 1, reintento del búfer) devuelve el id del paquete ya guardado y **no duplica** lecturas ni alertas. Solo aplica a mensajes con `nodo_id` (con `nodo_codigo` NULL la restricción no distingue).

## 8. Estados del firmware

Tabla `inv.estado_sensor` (datos iniciales). La categoría decide qué pasa: `NORMAL` lectura válida sin alerta; `ALERTA` y `CRITICO` lectura válida que abre alerta; `ERROR_HW` lectura **no** válida y alerta de hardware; `DESCONOCIDO` estado nuevo que no estaba catalogado (se da de alta solo y no abre alerta).

| Estado | Categoría | Significado |
|---|---|---|
| `OK` | NORMAL | Sensor operando correctamente |
| `OPTIMO` | NORMAL | Lectura dentro del rango óptimo |
| `SIN_ESTADO` | DESCONOCIDO | El bloque llegó sin campo `estado` |
| `LECTURA_FUERA_DE_RANGO` | ERROR_HW | Lo asigna la BD: valor fuera del rango físico |
| `ERROR_DHT` | ERROR_HW | DHT22 sin respuesta |
| `NO_DETECTADO` | ERROR_HW | BH1750 sin respuesta en I2C |
| `ERROR_BH1750` | ERROR_HW | Falla del BH1750 |
| `SOMBRA_EXCESIVA` | ALERTA | Luz menor a 2 000 lx |
| `ILUMINACION_ADECUADA` | NORMAL | Luz entre 2 000 y 15 000 lx |
| `SOL_DIRECTO_EXTREMO` | ALERTA | Luz mayor a 15 000 lx |
| `TEMPERATURA_OPTIMA` | NORMAL | Raíz entre 15 y 28 °C |
| `ALERTA_FRIO_ACTIVAR_CALEFACCION` | ALERTA | Raíz por debajo de 15 °C |
| `PELIGRO_SOBRECALENTADO` | CRITICO | Raíz por encima de 28 °C |
| `ERROR_DS18B20_DESCONECTADO` | ERROR_HW | DS18B20 devuelve -127 °C |
| `ERROR_DS18B20` | ERROR_HW | Falla del DS18B20 |
| `NIVEL_SEGURO` | NORMAL | Tanque entre 16 % y 84 % |
| `NIVEL_MAXIMO` | NORMAL | Tanque al 85 % o más |
| `ALERTA_BOMBA_EN_SECO` | CRITICO | Tanque al 15 % o menos |
| `ERROR_ULTRASONICO` | ERROR_HW | Falla del HC-SR04 |
| `RIEGO_NECESARIO` | ALERTA | Humedad del sustrato menor a 35 % |
| `PELIGRO_INUNDACION` | CRITICO | Humedad del sustrato mayor a 75 % |
| `ALERTA_DESCONECTADO` | ERROR_HW | Lectura ADC fuera de 100–4000 (sensor desconectado) |

**Alertas.** Se abre una alerta por (sensor, estado) para las categorías ALERTA, CRITICO y ERROR_HW; mientras el sensor repite el estado solo sube `ocurrencias` y `ultima_vez_en`; cuando el sensor reporta otro estado, la alerta se cierra sola (`resuelta_en`). Hay a lo sumo una alerta abierta por sensor y estado. Un estado nuevo no catalogado queda como `DESCONOCIDO` hasta que Automatización lo clasifique en `estado_sensor`.

## 9. Comandos hacia el ESP32

Flujo de `inv.comando_actuador`. Lo **despacha Conectividad**; este repositorio solo guarda el comando y sus estados.

```
PENDIENTE ──► ENVIADO ──► CONFIRMADO
                 │
                 └──────► FALLIDO          (CANCELADO también es un estado válido)
```

1. Una app, Automatización o el paro general **inserta** el comando (`accion` ENCENDER/APAGAR, `duracion_s`, `valor` 0–100 %, `origen` MANUAL/REGLA/IA). Nace `PENDIENTE` y se emite por Realtime (`INSERT` en `comando_actuador`).
2. El despachador (cuenta `eq-conectividad`) lo ve, lo publica en el topic de comandos y hace `PATCH estado=ENVIADO, enviado_en`.
3. Cuando el ESP32 confirma, hace `PATCH estado=CONFIRMADO, confirmado_en`; un trigger actualiza el actuador (`encendido`, `valor`, `actualizado_en`). Si falla: `FALLIDO`.

**Sin el despachador, todo comando se queda en `PENDIENTE`** y la bomba no se mueve. Conectividad solo puede modificar `estado`, `enviado_en` y `confirmado_en`.

**Lo que Hardware y Conectividad deben definir y entregar (pendiente):**
- El formato del mensaje en el topic de comandos (este repo no lo fija; un mínimo razonable es `id` del comando, `actuador` (código), `accion`, `duracion_s`, `valor`).
- Cómo confirma el ESP32 la ejecución (topic y formato) para que Conectividad marque `CONFIRMADO`.
- El pin de la bomba (`actuador.pin` es NULL) y si el firmware lee la calibración guardada en `sensor.calibracion`.
- Publicar por MQTT el JSON de la sección 3 (el firmware del documento solo escribe por el puerto serie).
- Broker, puerto, credenciales y confirmación de los topics (sección 2).
- Recomendación (no es un requisito acordado): la regla de ejemplo `ALERTA_BOMBA_EN_SECO` apaga la bomba con el tanque al 15 % o menos y depende del flujo MQTT → BD → despachador; conviene que el firmware tenga además su propio corte local.
