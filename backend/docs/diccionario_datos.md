# Diccionario de datos · esquema `inv`

Generado por `npm run diccionario` desde los COMMENT de `bd/invernadero_bd.sql` (BD `invernadero_test`). No editar a mano.
Fechas y horas en `timestamptz` (UTC); convertir a America/Mexico_City al consultar.

## Tablas

### inv.actividad

Bitácora y agenda de labores de la app móvil.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador de la actividad. |
| tipo | character varying(15) | NO |  | RIEGO, INSPECCION, MEDICION, FERTILIZACION o MANTENIMIENTO. |
| cantero | character varying(20) | NO |  | Cantero o zona donde se hace. |
| programada_en | timestamp with time zone | NO |  | Fecha y hora programada. |
| responsable | jsonb | NO |  | Persona responsable (JSON {initials, name, role, color?}). |
| descripcion | text | NO |  | Qué se va a hacer (mínimo 10 caracteres). |
| observaciones | text | SÍ |  | Notas al terminar. |
| estado | character varying(12) | NO |  | PENDIENTE, EN_PROCESO o COMPLETADA. |
| fotos | jsonb | NO |  | Metadatos de las fotos (JSON arreglo); los archivos no se guardan aquí. |
| creado_por | integer | SÍ | FK → inv.usuario(id) | Usuario que la registró. |
| creado_en | timestamp with time zone | NO |  | Hora de registro. |

### inv.actuador

Actuadores conectados a un nodo (bomba, ventilador…).

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del actuador. |
| nodo_id | smallint | NO | UQ, FK → inv.nodo(id) | Nodo que lo controla. |
| codigo | character varying(40) | NO | UQ | Código del actuador (único por nodo). |
| nombre | character varying(80) | NO |  | Nombre legible. |
| tipo | character varying(20) | NO |  | BOMBA, VENTILADOR, CALEFACTOR, ILUMINACION, MALLA_SOMBRA u OTRO. |
| pin | character varying(20) | SÍ |  | Pin del ESP32 (lo define Hardware). |
| modo | character varying(12) | NO |  | AUTOMATICO = lo manejan las reglas; MANUAL = solo comandos de usuario. |
| encendido | boolean | NO |  | Último estado confirmado por el nodo. |
| valor | smallint | SÍ |  | Último nivel confirmado (PWM o velocidad). Unidad: % (0–100); NULL = solo encendido/apagado. |
| actualizado_en | timestamp with time zone | NO |  | Hora de la última confirmación o cambio. |

### inv.alerta

Alertas agronómicas y de hardware; la ingesta las abre, refresca y cierra.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador de la alerta. |
| nodo_id | smallint | NO | FK → inv.nodo(id) | Nodo del sensor. |
| sensor_id | smallint | NO | FK → inv.sensor(id) | Sensor que la generó. |
| estado | character varying(60) | NO | FK → inv.estado_sensor(codigo) | Estado del sensor que la generó. |
| categoria | character varying(15) | NO |  | Categoría del estado al abrirla (ALERTA, CRITICO, ERROR_HW). |
| mensaje | character varying(250) | SÍ |  | Texto para mostrar. |
| abierta_en | timestamp with time zone | NO |  | Hora del primer paquete con ese estado. |
| ultima_vez_en | timestamp with time zone | NO |  | Hora del último paquete con ese estado. |
| ocurrencias | integer | NO |  | Cuántos paquetes la repitieron. Unidad: paquetes. |
| resuelta_en | timestamp with time zone | SÍ |  | Hora en que el sensor cambió de estado; NULL = sigue activa. |
| reconocida_por | integer | SÍ | FK → inv.usuario(id) | Usuario que la reconoció. |
| reconocida_en | timestamp with time zone | SÍ |  | Hora del reconocimiento. |

### inv.comando_actuador

Órdenes a los actuadores: PENDIENTE → ENVIADO → CONFIRMADO / FALLIDO / CANCELADO.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador del comando. |
| actuador_id | smallint | NO | FK → inv.actuador(id) | Actuador destino. |
| accion | character varying(10) | NO |  | ENCENDER o APAGAR. |
| duracion_s | integer | SÍ |  | Duración. Unidad: s; NULL = hasta nueva orden. |
| valor | smallint | SÍ |  | Nivel pedido (PWM o velocidad). Unidad: % (0–100); NULL = solo encender/apagar. |
| origen | character varying(10) | NO |  | REGLA, MANUAL (usuario) o IA. |
| regla_id | smallint | SÍ | FK → inv.regla_automatizacion(id) | Regla que lo generó (obligatoria si origen = REGLA). |
| usuario_id | integer | SÍ | FK → inv.usuario(id) | Usuario que lo pidió (obligatorio si origen = MANUAL). |
| alerta_id | bigint | SÍ | FK → inv.alerta(id) | Alerta que lo motivó, si aplica. |
| motivo | character varying(250) | SÍ |  | Texto libre del motivo. |
| estado | character varying(12) | NO |  | PENDIENTE, ENVIADO, CONFIRMADO, FALLIDO o CANCELADO. |
| creado_en | timestamp with time zone | NO |  | Hora de creación. |
| enviado_en | timestamp with time zone | SÍ |  | Hora en que Conectividad lo publicó al ESP32. |
| confirmado_en | timestamp with time zone | SÍ |  | Hora en que el ESP32 confirmó. |

### inv.cultivo

Cultivos que se pueden sembrar en un invernadero.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del cultivo. |
| codigo | character varying(40) | NO | UQ | Código del cultivo; coincide con el campo "cultivo" del JSON del ESP32. |
| nombre_comun | character varying(80) | NO |  | Nombre común (p. ej. Albahaca). |
| nombre_cientifico | character varying(120) | SÍ |  | Nombre científico (p. ej. Ocimum basilicum). |
| notas | text | SÍ |  | Notas libres sobre el cultivo. |

### inv.estado_sensor

Valores de "estado" que manda el firmware, clasificados por categoría.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| codigo | character varying(60) | NO | PK | Código del estado tal como llega en el JSON. |
| categoria | character varying(15) | NO |  | NORMAL, ALERTA, CRITICO, ERROR_HW o DESCONOCIDO. |
| descripcion | character varying(200) | SÍ |  | Qué significa el estado. |
| accion_sugerida | character varying(200) | SÍ |  | Qué debe hacer el operador. |

### inv.invernadero

Invernadero físico donde están los nodos.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del invernadero. |
| nombre | character varying(80) | NO |  | Nombre del invernadero. |
| largo_cm | numeric(6,1) | NO |  | Largo interior. Unidad: cm. |
| ancho_cm | numeric(6,1) | NO |  | Ancho interior. Unidad: cm. |
| area_m2 | numeric(7,3) | SÍ |  | Área calculada (largo × ancho). Unidad: m². |
| cultivo_id | smallint | SÍ | FK → inv.cultivo(id) | Cultivo sembrado; define qué umbrales aplican. |
| ubicacion | character varying(120) | SÍ |  | Ubicación física (texto libre). |
| creado_en | timestamp with time zone | NO |  | Fecha y hora de alta del registro. |

### inv.medicion

Una lectura por sensor y variable. ~9 filas por paquete (2 DHT22 + 1 BH1750 + 1 DS18B20 + 2 HC-SR04 + 3 capacitivos) ≈ 155 mil filas/día a 5 s.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador de la lectura. |
| paquete_id | bigint | NO | UQ, FK → inv.paquete(id) | Paquete del que salió. |
| sensor_id | smallint | NO | UQ, FK → inv.sensor(id) | Sensor que la tomó. |
| variable_id | smallint | NO | UQ, FK → inv.variable(id) | Variable medida. |
| tomado_en | timestamp with time zone | NO |  | Hora de la lectura (= paquete.recibido_en). |
| valor | numeric(10,2) | SÍ |  | Valor medido, en la unidad de la variable (inv.variable.unidad). |
| estado | character varying(60) | NO | FK → inv.estado_sensor(codigo) | Estado reportado por el firmware (o LECTURA_FUERA_DE_RANGO). |
| valido | boolean | NO |  | false = falla de hardware o fuera de rango físico; no usar en gráficas, promedios ni IA. |

### inv.nodo

Cada ESP32. Un paquete con un nodo_id que no esté aquí se guarda pero no se procesa.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del nodo. |
| codigo | character varying(60) | NO | UQ | Código del nodo; coincide con "nodo_id" del JSON. |
| invernadero_id | smallint | NO | FK → inv.invernadero(id) | Invernadero donde está instalado. |
| placa | character varying(60) | NO |  | Modelo de placa (PlatformIO board). |
| firmware_version | character varying(20) | SÍ |  | Versión del firmware cargado. |
| topic_telemetria | character varying(120) | SÍ |  | Topic MQTT donde el ESP32 publica la telemetría. |
| topic_comandos | character varying(120) | SÍ |  | Topic MQTT donde el ESP32 recibe comandos. |
| intervalo_ms | integer | NO |  | Periodo de envío de telemetría. Unidad: ms. |
| ultima_conexion | timestamp with time zone | SÍ |  | Hora del último paquete recibido (la actualiza la ingesta). |
| activo | boolean | NO |  | false = se ignoran sus paquetes. |

### inv.paquete

Cada mensaje MQTT recibido, tal como llegó (auditoría y reproceso).

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador del paquete. |
| nodo_id | smallint | SÍ | FK → inv.nodo(id) | Nodo registrado que lo envió; NULL si el nodo no existe o está inactivo. |
| nodo_codigo | character varying(60) | SÍ | UQ | Valor de "nodo_id" que vino en el JSON, aunque no exista. |
| topic | character varying(160) | SÍ |  | Topic MQTT por donde llegó. |
| recibido_en | timestamp with time zone | NO | UQ | Hora de recepción en el servidor (la del mensaje original si vino del buffer). |
| ts_dispositivo | timestamp with time zone | SÍ |  | Campo "timestamp" del JSON, si viene (el firmware actual no lo manda). |
| estado_general | character varying(40) | SÍ |  | Campo "estado_general" del JSON, si viene. |
| payload | jsonb | SÍ |  | JSON crudo; se pone en NULL a los 7 días (inv.fn_purgar_payload). |
| procesado | boolean | NO |  | true = se generaron sus mediciones. |
| error_procesamiento | text | SÍ |  | Motivo por el que no se procesó o avisos (nodo desconocido, sensor faltante…). |

### inv.prediccion_ia

Resultados de los modelos de IA del equipo de Automatización.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | bigint | NO | PK | Identificador de la predicción. |
| nodo_id | smallint | NO | FK → inv.nodo(id) | Nodo al que se refiere. |
| variable_id | smallint | SÍ | FK → inv.variable(id) | Variable pronosticada, si aplica. |
| modelo | character varying(60) | NO |  | Nombre y versión del modelo. |
| tipo | character varying(20) | NO |  | PRONOSTICO, ANOMALIA, RECOMENDACION o CLASIFICACION. |
| generado_en | timestamp with time zone | NO |  | Hora en que se generó. |
| objetivo_en | timestamp with time zone | SÍ |  | Momento al que se refiere el pronóstico. |
| valor | numeric(10,2) | SÍ |  | Valor pronosticado, en la unidad de la variable. |
| confianza | numeric(4,3) | SÍ |  | Confianza del modelo (0 a 1). |
| detalle | jsonb | NO |  | Datos extra del modelo (JSON). |

### inv.regla_automatizacion

Reglas estado → acción que ejecuta el equipo de Automatización.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador de la regla. |
| nombre | character varying(100) | NO |  | Descripción corta. |
| estado_disparador | character varying(60) | NO | FK → inv.estado_sensor(codigo) | Estado de sensor que la dispara. |
| actuador_id | smallint | NO | FK → inv.actuador(id) | Actuador sobre el que actúa. |
| accion | character varying(10) | NO |  | ENCENDER o APAGAR. |
| duracion_s | integer | SÍ |  | Duración de la acción. Unidad: s; NULL = hasta nueva orden. |
| espera_s | integer | NO |  | Tiempo mínimo entre ejecuciones. Unidad: s. |
| prioridad | smallint | NO |  | Menor = más importante (seguridad primero). |
| activa | boolean | NO |  | false = no se evalúa. |

### inv.sensor

Sensores físicos instalados en cada nodo.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del sensor. |
| nodo_id | smallint | NO | UQ, FK → inv.nodo(id) | Nodo (ESP32) al que está conectado. |
| tipo_sensor_id | smallint | NO | UQ, FK → inv.tipo_sensor(id) | Modelo del sensor. |
| indice | smallint | NO | UQ | Número del sensor dentro de su tipo ("id" en suelo_superficie: 1..3). |
| nombre | character varying(80) | NO |  | Nombre legible. |
| pines | character varying(60) | NO |  | Pines del ESP32 que usa (texto). |
| gpio_principal | smallint | SÍ |  | GPIO principal ("pin" del JSON en suelo_superficie). |
| ubicacion | character varying(120) | SÍ |  | Zona o lugar dentro del invernadero. |
| calibracion | jsonb | NO |  | Constantes de calibración del firmware (JSON). |
| activo | boolean | NO |  | false = la ingesta lo ignora y no aparece en el tablero. |
| instalado_en | date | SÍ |  | Fecha de instalación. |

### inv.tipo_sensor

Modelos de sensor y en qué bloque del JSON llegan sus datos.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del tipo de sensor. |
| modelo | character varying(30) | NO | UQ | Modelo comercial; coincide con "tipo" del JSON (p. ej. DHT22). |
| clave_json | character varying(40) | NO | UQ | Nombre del bloque dentro de "sensores" en el JSON (p. ej. ambiente). |
| es_arreglo | boolean | NO |  | true = el bloque es una lista de sensores (suelo_superficie). |
| protocolo | character varying(60) | NO |  | Protocolo de comunicación con el ESP32. |
| libreria | character varying(120) | SÍ |  | Librería de firmware usada. |
| descripcion | text | SÍ |  | Qué mide y para qué sirve. |

### inv.tipo_sensor_variable

Qué variables mide cada tipo de sensor y con qué llaves del JSON.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| tipo_sensor_id | smallint | NO | PK, FK → inv.tipo_sensor(id) | Tipo de sensor. |
| variable_id | smallint | NO | PK, FK → inv.variable(id) | Variable que mide. |
| campos_json | text[] | NO |  | Llaves aceptadas en el JSON, en orden de preferencia. |

### inv.umbral

Rangos agronómicos por cultivo y variable (app, automatización e IA).

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador del umbral. |
| cultivo_id | smallint | NO | UQ, FK → inv.cultivo(id) | Cultivo al que aplica. |
| variable_id | smallint | NO | UQ, FK → inv.variable(id) | Variable a la que aplica. |
| min_optimo | numeric(10,2) | SÍ |  | Mínimo del rango óptimo, en la unidad de la variable. |
| max_optimo | numeric(10,2) | SÍ |  | Máximo del rango óptimo, en la unidad de la variable. |
| min_critico | numeric(10,2) | SÍ |  | Valor igual o menor es crítico, en la unidad de la variable. |
| max_critico | numeric(10,2) | SÍ |  | Valor igual o mayor es crítico, en la unidad de la variable. |
| fuente | character varying(120) | SÍ |  | De dónde sale el rango (firmware, bibliografía…). |

### inv.usuario

Perfil y rol de cada cuenta de Supabase Auth (personas y cuentas de servicio de cada equipo).

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | integer | NO | PK | Identificador del usuario. |
| auth_id | uuid | SÍ | UQ | id de la cuenta en auth.users (Supabase Auth). |
| nombre | character varying(100) | NO |  | Nombre visible. |
| email | character varying(150) | NO |  | Correo (único, sin distinguir mayúsculas). No visible para el rol authenticated. |
| rol | character varying(15) | NO |  | ADMIN, OPERADOR, LECTOR, AUTOMATIZACION, CONECTIVIDAD o HARDWARE. |
| activo | boolean | NO |  | false = la cuenta no tiene permisos en inv. |
| creado_en | timestamp with time zone | NO |  | Fecha y hora de alta. |

### inv.variable

Magnitudes físicas que se miden.

| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id | smallint | NO | PK | Identificador de la variable. |
| codigo | character varying(40) | NO | UQ | Código de la variable (p. ej. humedad_suelo). |
| nombre | character varying(80) | NO |  | Nombre legible. |
| unidad | character varying(10) | NO |  | Unidad de medida (°C, %, lx, cm). |
| rango_min | numeric(10,2) | SÍ |  | Límite físico inferior del sensor, en la unidad de la variable; abajo es falla de hardware. |
| rango_max | numeric(10,2) | SÍ |  | Límite físico superior del sensor, en la unidad de la variable; arriba es falla de hardware. |
| prefijo_dispositivo | character varying(10) | NO |  | Prefijo del código de dispositivo de las apps: SENS-<prefijo><índice 2 dígitos>. |

## Vistas

### inv.v_alertas_activas

Alertas sin resolver; críticas primero.

| Columna | Tipo |
|---|---|
| id | bigint |
| nodo | character varying(60) |
| sensor_id | smallint |
| sensor | character varying(80) |
| estado | character varying(60) |
| categoria | character varying(15) |
| mensaje | character varying(250) |
| accion_sugerida | character varying(200) |
| abierta_en | timestamp with time zone |
| ultima_vez_en | timestamp with time zone |
| ocurrencias | integer |
| reconocida | boolean |
| codigo | text |

### inv.v_bitacora

Eventos (telemetría, comandos manuales/automáticos y alertas) para auditoría.

| Columna | Tipo |
|---|---|
| ocurrido_en | timestamp with time zone |
| tipo | text |
| dispositivo | text |
| detalle | text |
| disparador | text |
| estado | text |
| referencia_id | bigint |

### inv.v_dataset_ia

Dataset ancho para IA: 1 fila por paquete, solo lecturas válidas.

| Columna | Tipo |
|---|---|
| paquete_id | bigint |
| nodo | character varying(60) |
| tomado_en | timestamp with time zone |
| temp_aire_c | numeric |
| humedad_aire_pct | numeric |
| luz_lux | numeric |
| temp_suelo_c | numeric |
| distancia_agua_cm | numeric |
| nivel_tanque_pct | numeric |
| humedad_suelo_1_pct | numeric |
| humedad_suelo_2_pct | numeric |
| humedad_suelo_3_pct | numeric |
| hubo_falla_hw | boolean |

### inv.v_estado_nodo

Nodos activos, si están en línea y cuántas alertas abiertas tienen.

| Columna | Tipo |
|---|---|
| id | smallint |
| codigo | character varying(60) |
| invernadero | character varying(80) |
| cultivo | character varying(80) |
| firmware_version | character varying(20) |
| topic_telemetria | character varying(120) |
| intervalo_ms | integer |
| ultima_conexion | timestamp with time zone |
| en_linea | boolean |
| alertas_abiertas | bigint |

### inv.v_lectura

Todas las lecturas en formato largo con código de dispositivo y zona.

| Columna | Tipo |
|---|---|
| id | bigint |
| paquete_id | bigint |
| codigo | text |
| nodo | character varying(60) |
| sensor_id | smallint |
| sensor | character varying(80) |
| zona | character varying(120) |
| variable | character varying(40) |
| unidad | character varying(10) |
| valor | numeric(10,2) |
| valido | boolean |
| estado | character varying(60) |
| tomado_en | timestamp with time zone |

### inv.v_ultima_medicion

Último valor por sensor activo × variable, con evaluación, umbrales y tendencia.

| Columna | Tipo |
|---|---|
| nodo | character varying(60) |
| codigo | text |
| sensor_id | smallint |
| variable_id | smallint |
| sensor | character varying(80) |
| modelo | character varying(30) |
| pines | character varying(60) |
| indice | smallint |
| zona | character varying(120) |
| variable | character varying(40) |
| variable_nombre | character varying(80) |
| unidad | character varying(10) |
| rango_min | numeric(10,2) |
| rango_max | numeric(10,2) |
| valor | numeric(10,2) |
| valido | boolean |
| estado | character varying(60) |
| categoria | character varying(15) |
| estado_descripcion | character varying(200) |
| accion_sugerida | character varying(200) |
| tomado_en | timestamp with time zone |
| evaluacion | text |
| min_optimo | numeric(10,2) |
| max_optimo | numeric(10,2) |
| min_critico | numeric(10,2) |
| max_critico | numeric(10,2) |
| tendencia | numeric(10,2)[] |
