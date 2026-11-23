-- =============================================================================
--  BASE DE DATOS · INVERNADERO INTELIGENTE DE ALBAHACA (1.00 m × 0.60 m)
--  Materia: Gestión de Proyectos con IA · UTEQ
--  Motor:   PostgreSQL 15 o superior (date_bin, columnas generadas, vistas security_invoker)
--  Base:    "Especificaciones de Integración: Sensores ESP32 – Proyecto Invernadero Albahaca"
-- =============================================================================
--  FLUJO DE DATOS
--   ESP32 ─(MQTT, 1 JSON cada 5 s)─▶ broker ─▶ suscriptor MQTT en Node.js
--        (lo programa nuestro equipo BD y Backend, actividades F y G)
--        └─▶ SELECT inv.fn_ingestar_paquete(payload::jsonb, topic, recibido_en);
--              ├─ inv.paquete  : JSON crudo tal cual llegó (auditoría / reproceso, se purga a los 7 días)
--              ├─ inv.medicion : 1 fila por sensor × variable, con su estado y "valido"
--              └─ inv.alerta   : se abre, se refresca y se cierra sola según el "estado"
--   App / Automatización insertan en inv.comando_actuador ─▶ NOTIFY canal_comandos / Supabase Realtime
--        └─▶ Conectividad lo despacha al topic de comandos del ESP32 y marca ENVIADO / CONFIRMADO.
--   App web/móvil e IA leen las vistas v_* y las funciones inv.fn_historico() / inv.fn_estadistica().
--
--  ROLES DE LA APLICACIÓN (inv.usuario.rol; los permisos y RLS están en supabase.sql)
--   ADMIN · OPERADOR · LECTOR · AUTOMATIZACION · CONECTIVIDAD · HARDWARE
--
--  Uso:  psql -d invernadero -v ON_ERROR_STOP=1 -f invernadero_bd.sql
--        y después supabase.sql (en Supabase, o en local tras pruebas/stub_supabase.sql).
--  Zona horaria: todo se guarda en timestamptz (UTC); convertir al consultar, p. ej.
--        tomado_en AT TIME ZONE 'America/Mexico_City'
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS inv;
COMMENT ON SCHEMA inv IS 'Invernadero inteligente de albahaca (1.00 m x 0.60 m)';

-- =============================================================================
-- 1. INSTALACIÓN FÍSICA
-- =============================================================================

CREATE TABLE inv.cultivo (
    id                smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo            varchar(40)  NOT NULL UNIQUE,
    nombre_comun      varchar(80)  NOT NULL,
    nombre_cientifico varchar(120),
    notas             text
);
COMMENT ON TABLE  inv.cultivo IS 'Cultivos que se pueden sembrar en un invernadero.';
COMMENT ON COLUMN inv.cultivo.id                IS 'Identificador del cultivo.';
COMMENT ON COLUMN inv.cultivo.codigo            IS 'Código del cultivo; coincide con el campo "cultivo" del JSON del ESP32.';
COMMENT ON COLUMN inv.cultivo.nombre_comun      IS 'Nombre común (p. ej. Albahaca).';
COMMENT ON COLUMN inv.cultivo.nombre_cientifico IS 'Nombre científico (p. ej. Ocimum basilicum).';
COMMENT ON COLUMN inv.cultivo.notas             IS 'Notas libres sobre el cultivo.';

CREATE TABLE inv.invernadero (
    id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      varchar(80)  NOT NULL,
    largo_cm    numeric(6,1) NOT NULL CHECK (largo_cm > 0),
    ancho_cm    numeric(6,1) NOT NULL CHECK (ancho_cm > 0),
    area_m2     numeric(7,3) GENERATED ALWAYS AS (largo_cm * ancho_cm / 10000) STORED,
    cultivo_id  smallint REFERENCES inv.cultivo(id),
    ubicacion   varchar(120),
    creado_en   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  inv.invernadero IS 'Invernadero físico donde están los nodos.';
COMMENT ON COLUMN inv.invernadero.id         IS 'Identificador del invernadero.';
COMMENT ON COLUMN inv.invernadero.nombre     IS 'Nombre del invernadero.';
COMMENT ON COLUMN inv.invernadero.largo_cm   IS 'Largo interior. Unidad: cm.';
COMMENT ON COLUMN inv.invernadero.ancho_cm   IS 'Ancho interior. Unidad: cm.';
COMMENT ON COLUMN inv.invernadero.area_m2    IS 'Área calculada (largo × ancho). Unidad: m².';
COMMENT ON COLUMN inv.invernadero.cultivo_id IS 'Cultivo sembrado; define qué umbrales aplican.';
COMMENT ON COLUMN inv.invernadero.ubicacion  IS 'Ubicación física (texto libre).';
COMMENT ON COLUMN inv.invernadero.creado_en  IS 'Fecha y hora de alta del registro.';

CREATE TABLE inv.nodo (
    id               smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo           varchar(60) NOT NULL UNIQUE,
    invernadero_id   smallint    NOT NULL REFERENCES inv.invernadero(id),
    placa            varchar(60) NOT NULL DEFAULT 'esp32doit-devkit-v1',
    firmware_version varchar(20),
    topic_telemetria varchar(120),
    topic_comandos   varchar(120),
    intervalo_ms     integer     NOT NULL DEFAULT 5000 CHECK (intervalo_ms > 0),
    ultima_conexion  timestamptz,
    activo           boolean     NOT NULL DEFAULT true
);
COMMENT ON TABLE  inv.nodo IS 'Cada ESP32. Un paquete con un nodo_id que no esté aquí se guarda pero no se procesa.';
COMMENT ON COLUMN inv.nodo.id               IS 'Identificador del nodo.';
COMMENT ON COLUMN inv.nodo.codigo           IS 'Código del nodo; coincide con "nodo_id" del JSON.';
COMMENT ON COLUMN inv.nodo.invernadero_id   IS 'Invernadero donde está instalado.';
COMMENT ON COLUMN inv.nodo.placa            IS 'Modelo de placa (PlatformIO board).';
COMMENT ON COLUMN inv.nodo.firmware_version IS 'Versión del firmware cargado.';
COMMENT ON COLUMN inv.nodo.topic_telemetria IS 'Topic MQTT donde el ESP32 publica la telemetría.';
COMMENT ON COLUMN inv.nodo.topic_comandos   IS 'Topic MQTT donde el ESP32 recibe comandos.';
COMMENT ON COLUMN inv.nodo.intervalo_ms     IS 'Periodo de envío de telemetría. Unidad: ms.';
COMMENT ON COLUMN inv.nodo.ultima_conexion  IS 'Hora del último paquete recibido (la actualiza la ingesta).';
COMMENT ON COLUMN inv.nodo.activo           IS 'false = se ignoran sus paquetes.';

-- =============================================================================
-- 2. CATÁLOGO DE SENSORES (lo mantiene Hardware e IoT)
-- =============================================================================

CREATE TABLE inv.tipo_sensor (
    id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    modelo      varchar(30) NOT NULL UNIQUE,
    clave_json  varchar(40) NOT NULL UNIQUE,
    es_arreglo  boolean     NOT NULL DEFAULT false,
    protocolo   varchar(60) NOT NULL,
    libreria    varchar(120),
    descripcion text
);
COMMENT ON TABLE  inv.tipo_sensor IS 'Modelos de sensor y en qué bloque del JSON llegan sus datos.';
COMMENT ON COLUMN inv.tipo_sensor.id          IS 'Identificador del tipo de sensor.';
COMMENT ON COLUMN inv.tipo_sensor.modelo      IS 'Modelo comercial; coincide con "tipo" del JSON (p. ej. DHT22).';
COMMENT ON COLUMN inv.tipo_sensor.clave_json  IS 'Nombre del bloque dentro de "sensores" en el JSON (p. ej. ambiente).';
COMMENT ON COLUMN inv.tipo_sensor.es_arreglo  IS 'true = el bloque es una lista de sensores (suelo_superficie).';
COMMENT ON COLUMN inv.tipo_sensor.protocolo   IS 'Protocolo de comunicación con el ESP32.';
COMMENT ON COLUMN inv.tipo_sensor.libreria    IS 'Librería de firmware usada.';
COMMENT ON COLUMN inv.tipo_sensor.descripcion IS 'Qué mide y para qué sirve.';

CREATE TABLE inv.variable (
    id                  smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo              varchar(40) NOT NULL UNIQUE,
    nombre              varchar(80) NOT NULL,
    unidad              varchar(10) NOT NULL,
    rango_min           numeric(10,2),
    rango_max           numeric(10,2),
    prefijo_dispositivo varchar(10) NOT NULL
);
COMMENT ON TABLE  inv.variable IS 'Magnitudes físicas que se miden.';
COMMENT ON COLUMN inv.variable.id                  IS 'Identificador de la variable.';
COMMENT ON COLUMN inv.variable.codigo              IS 'Código de la variable (p. ej. humedad_suelo).';
COMMENT ON COLUMN inv.variable.nombre              IS 'Nombre legible.';
COMMENT ON COLUMN inv.variable.unidad              IS 'Unidad de medida (°C, %, lx, cm).';
COMMENT ON COLUMN inv.variable.rango_min           IS 'Límite físico inferior del sensor, en la unidad de la variable; abajo es falla de hardware.';
COMMENT ON COLUMN inv.variable.rango_max           IS 'Límite físico superior del sensor, en la unidad de la variable; arriba es falla de hardware.';
COMMENT ON COLUMN inv.variable.prefijo_dispositivo IS 'Prefijo del código de dispositivo de las apps: SENS-<prefijo><índice 2 dígitos>.';

-- Qué variables mide cada tipo de sensor y con qué llave(s) llegan en el JSON.
-- Se aceptan varios nombres porque el documento usa nombres distintos en cada sección
-- (ej. humedad_pct vs humedad_relativa_pct). Gana el primero que venga en el JSON.
CREATE TABLE inv.tipo_sensor_variable (
    tipo_sensor_id smallint NOT NULL REFERENCES inv.tipo_sensor(id),
    variable_id    smallint NOT NULL REFERENCES inv.variable(id),
    campos_json    text[]   NOT NULL CHECK (cardinality(campos_json) > 0),
    PRIMARY KEY (tipo_sensor_id, variable_id)
);
COMMENT ON TABLE  inv.tipo_sensor_variable IS 'Qué variables mide cada tipo de sensor y con qué llaves del JSON.';
COMMENT ON COLUMN inv.tipo_sensor_variable.tipo_sensor_id IS 'Tipo de sensor.';
COMMENT ON COLUMN inv.tipo_sensor_variable.variable_id    IS 'Variable que mide.';
COMMENT ON COLUMN inv.tipo_sensor_variable.campos_json    IS 'Llaves aceptadas en el JSON, en orden de preferencia.';

CREATE TABLE inv.sensor (
    id              smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id         smallint    NOT NULL REFERENCES inv.nodo(id),
    tipo_sensor_id  smallint    NOT NULL REFERENCES inv.tipo_sensor(id),
    indice          smallint    NOT NULL DEFAULT 1 CHECK (indice > 0),
    nombre          varchar(80) NOT NULL,
    pines           varchar(60) NOT NULL,
    gpio_principal  smallint,
    ubicacion       varchar(120),
    calibracion     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    activo          boolean     NOT NULL DEFAULT true,
    instalado_en    date        DEFAULT current_date,
    UNIQUE (nodo_id, tipo_sensor_id, indice)
);
COMMENT ON TABLE  inv.sensor IS 'Sensores físicos instalados en cada nodo.';
COMMENT ON COLUMN inv.sensor.id             IS 'Identificador del sensor.';
COMMENT ON COLUMN inv.sensor.nodo_id        IS 'Nodo (ESP32) al que está conectado.';
COMMENT ON COLUMN inv.sensor.tipo_sensor_id IS 'Modelo del sensor.';
COMMENT ON COLUMN inv.sensor.indice         IS 'Número del sensor dentro de su tipo ("id" en suelo_superficie: 1..3).';
COMMENT ON COLUMN inv.sensor.nombre         IS 'Nombre legible.';
COMMENT ON COLUMN inv.sensor.pines          IS 'Pines del ESP32 que usa (texto).';
COMMENT ON COLUMN inv.sensor.gpio_principal IS 'GPIO principal ("pin" del JSON en suelo_superficie).';
COMMENT ON COLUMN inv.sensor.ubicacion      IS 'Zona o lugar dentro del invernadero.';
COMMENT ON COLUMN inv.sensor.calibracion    IS 'Constantes de calibración del firmware (JSON).';
COMMENT ON COLUMN inv.sensor.activo         IS 'false = la ingesta lo ignora y no aparece en el tablero.';
COMMENT ON COLUMN inv.sensor.instalado_en   IS 'Fecha de instalación.';

-- categoria decide qué pasa con la lectura:
--   NORMAL      → lectura válida, sin alerta
--   ALERTA      → lectura válida, abre alerta agronómica
--   CRITICO     → lectura válida, abre alerta de prioridad alta
--   ERROR_HW    → el número NO sirve (valido = false) y abre alerta de hardware
--   DESCONOCIDO → estado nuevo que la BD no conocía; se da de alta solo
CREATE TABLE inv.estado_sensor (
    codigo          varchar(60)  PRIMARY KEY,
    categoria       varchar(15)  NOT NULL
                    CHECK (categoria IN ('NORMAL','ALERTA','CRITICO','ERROR_HW','DESCONOCIDO')),
    descripcion     varchar(200),
    accion_sugerida varchar(200)
);
COMMENT ON TABLE  inv.estado_sensor IS 'Valores de "estado" que manda el firmware, clasificados por categoría.';
COMMENT ON COLUMN inv.estado_sensor.codigo          IS 'Código del estado tal como llega en el JSON.';
COMMENT ON COLUMN inv.estado_sensor.categoria       IS 'NORMAL, ALERTA, CRITICO, ERROR_HW o DESCONOCIDO.';
COMMENT ON COLUMN inv.estado_sensor.descripcion     IS 'Qué significa el estado.';
COMMENT ON COLUMN inv.estado_sensor.accion_sugerida IS 'Qué debe hacer el operador.';

-- Óptimo: min_optimo <= valor <= max_optimo.   Crítico: valor <= min_critico o valor >= max_critico.
CREATE TABLE inv.umbral (
    id           smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cultivo_id   smallint NOT NULL REFERENCES inv.cultivo(id),
    variable_id  smallint NOT NULL REFERENCES inv.variable(id),
    min_optimo   numeric(10,2),
    max_optimo   numeric(10,2),
    min_critico  numeric(10,2),
    max_critico  numeric(10,2),
    fuente       varchar(120),
    UNIQUE (cultivo_id, variable_id),
    CHECK (min_optimo IS NULL OR max_optimo IS NULL OR min_optimo <= max_optimo)
);
COMMENT ON TABLE  inv.umbral IS 'Rangos agronómicos por cultivo y variable (app, automatización e IA).';
COMMENT ON COLUMN inv.umbral.id          IS 'Identificador del umbral.';
COMMENT ON COLUMN inv.umbral.cultivo_id  IS 'Cultivo al que aplica.';
COMMENT ON COLUMN inv.umbral.variable_id IS 'Variable a la que aplica.';
COMMENT ON COLUMN inv.umbral.min_optimo  IS 'Mínimo del rango óptimo, en la unidad de la variable.';
COMMENT ON COLUMN inv.umbral.max_optimo  IS 'Máximo del rango óptimo, en la unidad de la variable.';
COMMENT ON COLUMN inv.umbral.min_critico IS 'Valor igual o menor es crítico, en la unidad de la variable.';
COMMENT ON COLUMN inv.umbral.max_critico IS 'Valor igual o mayor es crítico, en la unidad de la variable.';
COMMENT ON COLUMN inv.umbral.fuente      IS 'De dónde sale el rango (firmware, bibliografía…).';

-- =============================================================================
-- 3. USUARIOS (perfil de Supabase Auth; las contraseñas las guarda auth.users con bcrypt)
-- =============================================================================

CREATE TABLE inv.usuario (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_id    uuid         UNIQUE,   -- sin FK a auth.users para que el respaldo de inv se restaure en cualquier PostgreSQL
    nombre     varchar(100) NOT NULL,
    email      varchar(150) NOT NULL,
    rol        varchar(15)  NOT NULL DEFAULT 'LECTOR'
               CHECK (rol IN ('ADMIN','OPERADOR','LECTOR','AUTOMATIZACION','CONECTIVIDAD','HARDWARE')),
    activo     boolean      NOT NULL DEFAULT true,
    creado_en  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_email ON inv.usuario (lower(email));
COMMENT ON TABLE  inv.usuario IS 'Perfil y rol de cada cuenta de Supabase Auth (personas y cuentas de servicio de cada equipo).';
COMMENT ON COLUMN inv.usuario.id        IS 'Identificador del usuario.';
COMMENT ON COLUMN inv.usuario.auth_id   IS 'id de la cuenta en auth.users (Supabase Auth).';
COMMENT ON COLUMN inv.usuario.nombre    IS 'Nombre visible.';
COMMENT ON COLUMN inv.usuario.email     IS 'Correo (único, sin distinguir mayúsculas). No visible para el rol authenticated.';
COMMENT ON COLUMN inv.usuario.rol       IS 'ADMIN, OPERADOR, LECTOR, AUTOMATIZACION, CONECTIVIDAD o HARDWARE.';
COMMENT ON COLUMN inv.usuario.activo    IS 'false = la cuenta no tiene permisos en inv.';
COMMENT ON COLUMN inv.usuario.creado_en IS 'Fecha y hora de alta.';

-- =============================================================================
-- 4. TELEMETRÍA (la llena el suscriptor MQTT vía inv.fn_ingestar_paquete)
-- =============================================================================

CREATE TABLE inv.paquete (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id             smallint REFERENCES inv.nodo(id),
    nodo_codigo         varchar(60),
    topic               varchar(160),
    recibido_en         timestamptz NOT NULL DEFAULT now(),
    ts_dispositivo      timestamptz,
    estado_general      varchar(40),
    payload             jsonb,
    procesado           boolean NOT NULL DEFAULT false,
    error_procesamiento text,
    UNIQUE (nodo_codigo, recibido_en)   -- reintentos del suscriptor (buffer local) no duplican
);
CREATE INDEX ix_paquete_nodo_t  ON inv.paquete (nodo_id, recibido_en DESC);
CREATE INDEX ix_paquete_t       ON inv.paquete (recibido_en);
CREATE INDEX ix_paquete_errores ON inv.paquete (recibido_en) WHERE error_procesamiento IS NOT NULL;
COMMENT ON TABLE  inv.paquete IS 'Cada mensaje MQTT recibido, tal como llegó (auditoría y reproceso).';
COMMENT ON COLUMN inv.paquete.id                  IS 'Identificador del paquete.';
COMMENT ON COLUMN inv.paquete.nodo_id             IS 'Nodo registrado que lo envió; NULL si el nodo no existe o está inactivo.';
COMMENT ON COLUMN inv.paquete.nodo_codigo         IS 'Valor de "nodo_id" que vino en el JSON, aunque no exista.';
COMMENT ON COLUMN inv.paquete.topic               IS 'Topic MQTT por donde llegó.';
COMMENT ON COLUMN inv.paquete.recibido_en         IS 'Hora de recepción en el servidor (la del mensaje original si vino del buffer).';
COMMENT ON COLUMN inv.paquete.ts_dispositivo      IS 'Campo "timestamp" del JSON, si viene (el firmware actual no lo manda).';
COMMENT ON COLUMN inv.paquete.estado_general      IS 'Campo "estado_general" del JSON, si viene.';
COMMENT ON COLUMN inv.paquete.payload             IS 'JSON crudo; se pone en NULL a los 7 días (inv.fn_purgar_payload).';
COMMENT ON COLUMN inv.paquete.procesado           IS 'true = se generaron sus mediciones.';
COMMENT ON COLUMN inv.paquete.error_procesamiento IS 'Motivo por el que no se procesó o avisos (nodo desconocido, sensor faltante…).';

CREATE TABLE inv.medicion (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paquete_id   bigint      NOT NULL REFERENCES inv.paquete(id) ON DELETE CASCADE,
    sensor_id    smallint    NOT NULL REFERENCES inv.sensor(id),
    variable_id  smallint    NOT NULL REFERENCES inv.variable(id),
    tomado_en    timestamptz NOT NULL,
    valor        numeric(10,2),
    estado       varchar(60) NOT NULL REFERENCES inv.estado_sensor(codigo),
    valido       boolean     NOT NULL,
    UNIQUE (paquete_id, sensor_id, variable_id)
);
CREATE INDEX ix_medicion_sensor_var_t ON inv.medicion (sensor_id, variable_id, tomado_en DESC);
CREATE INDEX ix_medicion_t_brin       ON inv.medicion USING brin (tomado_en);
COMMENT ON TABLE  inv.medicion IS
  'Una lectura por sensor y variable. ~9 filas por paquete (2 DHT22 + 1 BH1750 + 1 DS18B20 + 2 HC-SR04 + 3 capacitivos) ≈ 155 mil filas/día a 5 s.';
COMMENT ON COLUMN inv.medicion.id          IS 'Identificador de la lectura.';
COMMENT ON COLUMN inv.medicion.paquete_id  IS 'Paquete del que salió.';
COMMENT ON COLUMN inv.medicion.sensor_id   IS 'Sensor que la tomó.';
COMMENT ON COLUMN inv.medicion.variable_id IS 'Variable medida.';
COMMENT ON COLUMN inv.medicion.tomado_en   IS 'Hora de la lectura (= paquete.recibido_en).';
COMMENT ON COLUMN inv.medicion.valor       IS 'Valor medido, en la unidad de la variable (inv.variable.unidad).';
COMMENT ON COLUMN inv.medicion.estado      IS 'Estado reportado por el firmware (o LECTURA_FUERA_DE_RANGO).';
COMMENT ON COLUMN inv.medicion.valido      IS 'false = falla de hardware o fuera de rango físico; no usar en gráficas, promedios ni IA.';

CREATE TABLE inv.alerta (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id         smallint    NOT NULL REFERENCES inv.nodo(id),
    sensor_id       smallint    NOT NULL REFERENCES inv.sensor(id),
    estado          varchar(60) NOT NULL REFERENCES inv.estado_sensor(codigo),
    categoria       varchar(15) NOT NULL,
    mensaje         varchar(250),
    abierta_en      timestamptz NOT NULL DEFAULT now(),
    ultima_vez_en   timestamptz NOT NULL DEFAULT now(),
    ocurrencias     integer     NOT NULL DEFAULT 1,
    resuelta_en     timestamptz,
    reconocida_por  integer REFERENCES inv.usuario(id),
    reconocida_en   timestamptz
);
-- Una sola alerta abierta por sensor y estado (evita 720 alertas por hora).
CREATE UNIQUE INDEX ux_alerta_abierta ON inv.alerta (sensor_id, estado) WHERE resuelta_en IS NULL;
CREATE INDEX ix_alerta_nodo_abiertas  ON inv.alerta (nodo_id) WHERE resuelta_en IS NULL;
COMMENT ON TABLE  inv.alerta IS 'Alertas agronómicas y de hardware; la ingesta las abre, refresca y cierra.';
COMMENT ON COLUMN inv.alerta.id             IS 'Identificador de la alerta.';
COMMENT ON COLUMN inv.alerta.nodo_id        IS 'Nodo del sensor.';
COMMENT ON COLUMN inv.alerta.sensor_id      IS 'Sensor que la generó.';
COMMENT ON COLUMN inv.alerta.estado         IS 'Estado del sensor que la generó.';
COMMENT ON COLUMN inv.alerta.categoria      IS 'Categoría del estado al abrirla (ALERTA, CRITICO, ERROR_HW).';
COMMENT ON COLUMN inv.alerta.mensaje        IS 'Texto para mostrar.';
COMMENT ON COLUMN inv.alerta.abierta_en     IS 'Hora del primer paquete con ese estado.';
COMMENT ON COLUMN inv.alerta.ultima_vez_en  IS 'Hora del último paquete con ese estado.';
COMMENT ON COLUMN inv.alerta.ocurrencias    IS 'Cuántos paquetes la repitieron. Unidad: paquetes.';
COMMENT ON COLUMN inv.alerta.resuelta_en    IS 'Hora en que el sensor cambió de estado; NULL = sigue activa.';
COMMENT ON COLUMN inv.alerta.reconocida_por IS 'Usuario que la reconoció.';
COMMENT ON COLUMN inv.alerta.reconocida_en  IS 'Hora del reconocimiento.';

-- =============================================================================
-- 5. AUTOMATIZACIÓN, IA Y BITÁCORA
-- =============================================================================

CREATE TABLE inv.actuador (
    id             smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id        smallint    NOT NULL REFERENCES inv.nodo(id),
    codigo         varchar(40) NOT NULL,
    nombre         varchar(80) NOT NULL,
    tipo           varchar(20) NOT NULL
                   CHECK (tipo IN ('BOMBA','VENTILADOR','CALEFACTOR','ILUMINACION','MALLA_SOMBRA','OTRO')),
    pin            varchar(20),
    modo           varchar(12) NOT NULL DEFAULT 'AUTOMATICO' CHECK (modo IN ('AUTOMATICO','MANUAL')),
    encendido      boolean     NOT NULL DEFAULT false,
    valor          smallint    CHECK (valor BETWEEN 0 AND 100),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (nodo_id, codigo)
);
COMMENT ON TABLE  inv.actuador IS 'Actuadores conectados a un nodo (bomba, ventilador…).';
COMMENT ON COLUMN inv.actuador.id             IS 'Identificador del actuador.';
COMMENT ON COLUMN inv.actuador.nodo_id        IS 'Nodo que lo controla.';
COMMENT ON COLUMN inv.actuador.codigo         IS 'Código del actuador (único por nodo).';
COMMENT ON COLUMN inv.actuador.nombre         IS 'Nombre legible.';
COMMENT ON COLUMN inv.actuador.tipo           IS 'BOMBA, VENTILADOR, CALEFACTOR, ILUMINACION, MALLA_SOMBRA u OTRO.';
COMMENT ON COLUMN inv.actuador.pin            IS 'Pin del ESP32 (lo define Hardware).';
COMMENT ON COLUMN inv.actuador.modo           IS 'AUTOMATICO = lo manejan las reglas; MANUAL = solo comandos de usuario.';
COMMENT ON COLUMN inv.actuador.encendido      IS 'Último estado confirmado por el nodo.';
COMMENT ON COLUMN inv.actuador.valor          IS 'Último nivel confirmado (PWM o velocidad). Unidad: % (0–100); NULL = solo encendido/apagado.';
COMMENT ON COLUMN inv.actuador.actualizado_en IS 'Hora de la última confirmación o cambio.';

-- Regla simple: "cuando un sensor reporte ESTADO X → hacer ACCIÓN en el actuador".
CREATE TABLE inv.regla_automatizacion (
    id                smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            varchar(100) NOT NULL,
    estado_disparador varchar(60)  NOT NULL REFERENCES inv.estado_sensor(codigo),
    actuador_id       smallint     NOT NULL REFERENCES inv.actuador(id),
    accion            varchar(10)  NOT NULL CHECK (accion IN ('ENCENDER','APAGAR')),
    duracion_s        integer      CHECK (duracion_s > 0),
    espera_s          integer      NOT NULL DEFAULT 300 CHECK (espera_s >= 0),
    prioridad         smallint     NOT NULL DEFAULT 10,
    activa            boolean      NOT NULL DEFAULT true
);
COMMENT ON TABLE  inv.regla_automatizacion IS 'Reglas estado → acción que ejecuta el equipo de Automatización.';
COMMENT ON COLUMN inv.regla_automatizacion.id                IS 'Identificador de la regla.';
COMMENT ON COLUMN inv.regla_automatizacion.nombre            IS 'Descripción corta.';
COMMENT ON COLUMN inv.regla_automatizacion.estado_disparador IS 'Estado de sensor que la dispara.';
COMMENT ON COLUMN inv.regla_automatizacion.actuador_id       IS 'Actuador sobre el que actúa.';
COMMENT ON COLUMN inv.regla_automatizacion.accion            IS 'ENCENDER o APAGAR.';
COMMENT ON COLUMN inv.regla_automatizacion.duracion_s        IS 'Duración de la acción. Unidad: s; NULL = hasta nueva orden.';
COMMENT ON COLUMN inv.regla_automatizacion.espera_s          IS 'Tiempo mínimo entre ejecuciones. Unidad: s.';
COMMENT ON COLUMN inv.regla_automatizacion.prioridad         IS 'Menor = más importante (seguridad primero).';
COMMENT ON COLUMN inv.regla_automatizacion.activa            IS 'false = no se evalúa.';

CREATE TABLE inv.comando_actuador (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actuador_id   smallint    NOT NULL REFERENCES inv.actuador(id),
    accion        varchar(10) NOT NULL CHECK (accion IN ('ENCENDER','APAGAR')),
    duracion_s    integer     CHECK (duracion_s > 0),
    valor         smallint    CHECK (valor BETWEEN 0 AND 100),
    origen        varchar(10) NOT NULL CHECK (origen IN ('REGLA','MANUAL','IA')),
    regla_id      smallint    REFERENCES inv.regla_automatizacion(id),
    usuario_id    integer     REFERENCES inv.usuario(id),
    alerta_id     bigint      REFERENCES inv.alerta(id),
    motivo        varchar(250),
    estado        varchar(12) NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','ENVIADO','CONFIRMADO','FALLIDO','CANCELADO')),
    creado_en     timestamptz NOT NULL DEFAULT now(),
    enviado_en    timestamptz,
    confirmado_en timestamptz,
    CHECK (origen <> 'MANUAL' OR usuario_id IS NOT NULL),
    CHECK (origen <> 'REGLA'  OR regla_id   IS NOT NULL)
);
CREATE INDEX ix_comando_pendiente ON inv.comando_actuador (actuador_id, creado_en)
    WHERE estado IN ('PENDIENTE','ENVIADO');
COMMENT ON TABLE  inv.comando_actuador IS 'Órdenes a los actuadores: PENDIENTE → ENVIADO → CONFIRMADO / FALLIDO / CANCELADO.';
COMMENT ON COLUMN inv.comando_actuador.id            IS 'Identificador del comando.';
COMMENT ON COLUMN inv.comando_actuador.actuador_id   IS 'Actuador destino.';
COMMENT ON COLUMN inv.comando_actuador.accion        IS 'ENCENDER o APAGAR.';
COMMENT ON COLUMN inv.comando_actuador.duracion_s    IS 'Duración. Unidad: s; NULL = hasta nueva orden.';
COMMENT ON COLUMN inv.comando_actuador.valor         IS 'Nivel pedido (PWM o velocidad). Unidad: % (0–100); NULL = solo encender/apagar.';
COMMENT ON COLUMN inv.comando_actuador.origen        IS 'REGLA, MANUAL (usuario) o IA.';
COMMENT ON COLUMN inv.comando_actuador.regla_id      IS 'Regla que lo generó (obligatoria si origen = REGLA).';
COMMENT ON COLUMN inv.comando_actuador.usuario_id    IS 'Usuario que lo pidió (obligatorio si origen = MANUAL).';
COMMENT ON COLUMN inv.comando_actuador.alerta_id     IS 'Alerta que lo motivó, si aplica.';
COMMENT ON COLUMN inv.comando_actuador.motivo        IS 'Texto libre del motivo.';
COMMENT ON COLUMN inv.comando_actuador.estado        IS 'PENDIENTE, ENVIADO, CONFIRMADO, FALLIDO o CANCELADO.';
COMMENT ON COLUMN inv.comando_actuador.creado_en     IS 'Hora de creación.';
COMMENT ON COLUMN inv.comando_actuador.enviado_en    IS 'Hora en que Conectividad lo publicó al ESP32.';
COMMENT ON COLUMN inv.comando_actuador.confirmado_en IS 'Hora en que el ESP32 confirmó.';

CREATE TABLE inv.prediccion_ia (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id      smallint    NOT NULL REFERENCES inv.nodo(id),
    variable_id  smallint    REFERENCES inv.variable(id),
    modelo       varchar(60) NOT NULL,
    tipo         varchar(20) NOT NULL
                 CHECK (tipo IN ('PRONOSTICO','ANOMALIA','RECOMENDACION','CLASIFICACION')),
    generado_en  timestamptz NOT NULL DEFAULT now(),
    objetivo_en  timestamptz,
    valor        numeric(10,2),
    confianza    numeric(4,3) CHECK (confianza BETWEEN 0 AND 1),
    detalle      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_prediccion_nodo_t ON inv.prediccion_ia (nodo_id, generado_en DESC);
COMMENT ON TABLE  inv.prediccion_ia IS 'Resultados de los modelos de IA del equipo de Automatización.';
COMMENT ON COLUMN inv.prediccion_ia.id          IS 'Identificador de la predicción.';
COMMENT ON COLUMN inv.prediccion_ia.nodo_id     IS 'Nodo al que se refiere.';
COMMENT ON COLUMN inv.prediccion_ia.variable_id IS 'Variable pronosticada, si aplica.';
COMMENT ON COLUMN inv.prediccion_ia.modelo      IS 'Nombre y versión del modelo.';
COMMENT ON COLUMN inv.prediccion_ia.tipo        IS 'PRONOSTICO, ANOMALIA, RECOMENDACION o CLASIFICACION.';
COMMENT ON COLUMN inv.prediccion_ia.generado_en IS 'Hora en que se generó.';
COMMENT ON COLUMN inv.prediccion_ia.objetivo_en IS 'Momento al que se refiere el pronóstico.';
COMMENT ON COLUMN inv.prediccion_ia.valor       IS 'Valor pronosticado, en la unidad de la variable.';
COMMENT ON COLUMN inv.prediccion_ia.confianza   IS 'Confianza del modelo (0 a 1).';
COMMENT ON COLUMN inv.prediccion_ia.detalle     IS 'Datos extra del modelo (JSON).';

CREATE TABLE inv.actividad (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo          varchar(15) NOT NULL
                  CHECK (tipo IN ('RIEGO','INSPECCION','MEDICION','FERTILIZACION','MANTENIMIENTO')),
    cantero       varchar(20) NOT NULL,
    programada_en timestamptz NOT NULL,
    responsable   jsonb       NOT NULL,
    descripcion   text        NOT NULL CHECK (char_length(descripcion) >= 10),
    observaciones text,
    estado        varchar(12) NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','EN_PROCESO','COMPLETADA')),
    fotos         jsonb       NOT NULL DEFAULT '[]'::jsonb,
    creado_por    integer     REFERENCES inv.usuario(id),
    creado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_actividad_programada ON inv.actividad (programada_en);
COMMENT ON TABLE  inv.actividad IS 'Bitácora y agenda de labores de la app móvil.';
COMMENT ON COLUMN inv.actividad.id            IS 'Identificador de la actividad.';
COMMENT ON COLUMN inv.actividad.tipo          IS 'RIEGO, INSPECCION, MEDICION, FERTILIZACION o MANTENIMIENTO.';
COMMENT ON COLUMN inv.actividad.cantero       IS 'Cantero o zona donde se hace.';
COMMENT ON COLUMN inv.actividad.programada_en IS 'Fecha y hora programada.';
COMMENT ON COLUMN inv.actividad.responsable   IS 'Persona responsable (JSON {initials, name, role, color?}).';
COMMENT ON COLUMN inv.actividad.descripcion   IS 'Qué se va a hacer (mínimo 10 caracteres).';
COMMENT ON COLUMN inv.actividad.observaciones IS 'Notas al terminar.';
COMMENT ON COLUMN inv.actividad.estado        IS 'PENDIENTE, EN_PROCESO o COMPLETADA.';
COMMENT ON COLUMN inv.actividad.fotos         IS 'Metadatos de las fotos (JSON arreglo); los archivos no se guardan aquí.';
COMMENT ON COLUMN inv.actividad.creado_por    IS 'Usuario que la registró.';
COMMENT ON COLUMN inv.actividad.creado_en     IS 'Hora de registro.';

-- =============================================================================
-- 6. FUNCIONES
-- =============================================================================

-- Marcadores para PostgreSQL sin Supabase: supabase.sql los reemplaza por los reales
-- (usuario y rol de la sesión de Supabase Auth). Sin Auth no hay sesión de app, así que
-- quien se conecta directo a la BD es el administrador.
CREATE FUNCTION inv.fn_usuario_actual() RETURNS integer
LANGUAGE sql STABLE AS $$ SELECT NULL::integer $$;
CREATE FUNCTION inv.fn_rol_actual() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT 'ADMIN'::text $$;

-- Código de dispositivo que usan las apps: SENS-ENV-01, SENS-SOIL-03, SENS-TEMP-S01…
CREATE FUNCTION inv.fn_codigo_dispositivo(p_prefijo text, p_indice integer) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT 'SENS-' || p_prefijo || lpad(p_indice::text, 2, '0') $$;

-- Código "principal" de un sensor físico (para sus alertas): primero la variable que tiene
-- umbral para el cultivo del invernadero, luego la de menor id. HC-SR04 → SENS-TANK-01, DHT22 → SENS-ENV-01.
CREATE FUNCTION inv.fn_codigo_sensor(p_sensor_id integer) RETURNS text
LANGUAGE sql STABLE
AS $$
    SELECT inv.fn_codigo_dispositivo(v.prefijo_dispositivo, s.indice)
      FROM inv.sensor s
      JOIN inv.nodo n                  ON n.id = s.nodo_id
      JOIN inv.invernadero i           ON i.id = n.invernadero_id
      JOIN inv.tipo_sensor_variable tv ON tv.tipo_sensor_id = s.tipo_sensor_id
      JOIN inv.variable v              ON v.id = tv.variable_id
      LEFT JOIN inv.umbral um          ON um.cultivo_id = i.cultivo_id AND um.variable_id = v.id
     WHERE s.id = p_sensor_id
     ORDER BY um.id IS NULL, v.id
     LIMIT 1
$$;

-- Saca un número de un objeto JSON probando varias llaves (acepta número o texto numérico).
CREATE FUNCTION inv._num(p_obj jsonb, VARIADIC p_claves text[])
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    k   text;
    val jsonb;
BEGIN
    IF p_obj IS NULL OR jsonb_typeof(p_obj) <> 'object' THEN
        RETURN NULL;
    END IF;
    FOREACH k IN ARRAY p_claves LOOP
        val := p_obj -> k;
        CONTINUE WHEN val IS NULL OR jsonb_typeof(val) = 'null';
        IF jsonb_typeof(val) = 'number' THEN
            RETURN (val #>> '{}')::numeric;
        ELSIF jsonb_typeof(val) = 'string' AND (val #>> '{}') ~ '^\s*-?\d+(\.\d+)?\s*$' THEN
            RETURN btrim(val #>> '{}')::numeric;
        END IF;
    END LOOP;
    RETURN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- INGESTA: la ÚNICA puerta de entrada de la telemetría.
-- El suscriptor MQTT la llama por cada mensaje:
--     SELECT inv.fn_ingestar_paquete($1::jsonb, $2, $3);   -- payload, topic, hora de recepción
-- Devuelve el id del paquete. Nunca rechaza un mensaje: si algo no cuadra,
-- lo guarda igual y deja el motivo en paquete.error_procesamiento.
-- Es idempotente: el mismo (nodo_id, recibido_en) devuelve el paquete ya guardado.
-- Es data-driven: para agregar un sensor nuevo (ej. pH) basta con insertar en
-- tipo_sensor, variable, tipo_sensor_variable y sensor; no hay que tocar esta función.
-- -----------------------------------------------------------------------------
CREATE FUNCTION inv.fn_ingestar_paquete(
    p_payload     jsonb,
    p_topic       text        DEFAULT NULL,
    p_recibido_en timestamptz DEFAULT now()
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inv, pg_temp
AS $$
DECLARE
    v_paquete_id bigint;
    v_nodo_id    smallint;
    v_codigo     text;
    v_s          jsonb;
    v_b          jsonb;
    v_ts_disp    timestamptz;
    v_estado     text;
    v_categoria  text;
    v_fuera      boolean;
    v_avisos     text[] := '{}';
    r            record;
BEGIN
    -- Un mensaje inválido se guarda como evidencia, sin mediciones
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        INSERT INTO inv.paquete (topic, recibido_en, payload, error_procesamiento)
        VALUES (left(p_topic, 160), p_recibido_en, p_payload,
                CASE WHEN p_payload IS NULL THEN 'Payload vacío' ELSE 'El payload no es un objeto JSON' END)
        RETURNING id INTO v_paquete_id;
        RETURN v_paquete_id;
    END IF;

    v_codigo := left(p_payload ->> 'nodo_id', 60);
    v_s      := p_payload -> 'sensores';

    BEGIN   -- "timestamp" es opcional; si viene mal formado se ignora
        v_ts_disp := (p_payload ->> 'timestamp')::timestamptz;
    EXCEPTION WHEN others THEN
        v_ts_disp := NULL;
    END;

    SELECT id INTO v_nodo_id FROM inv.nodo WHERE codigo = v_codigo AND activo;

    INSERT INTO inv.paquete (nodo_id, nodo_codigo, topic, recibido_en, ts_dispositivo, estado_general, payload)
    VALUES (v_nodo_id, v_codigo, left(p_topic, 160), p_recibido_en, v_ts_disp,
            left(p_payload ->> 'estado_general', 40), p_payload)
    ON CONFLICT (nodo_codigo, recibido_en) DO NOTHING
    RETURNING id INTO v_paquete_id;

    IF v_paquete_id IS NULL THEN   -- reintento: ya estaba guardado y procesado
        SELECT id INTO v_paquete_id FROM inv.paquete
         WHERE nodo_codigo = v_codigo AND recibido_en = p_recibido_en;
        RETURN v_paquete_id;
    END IF;

    IF v_nodo_id IS NULL THEN
        UPDATE inv.paquete
           SET error_procesamiento = 'Nodo no registrado o inactivo: ' || coalesce(v_codigo, '(sin nodo_id)')
         WHERE id = v_paquete_id;
        RETURN v_paquete_id;
    END IF;

    IF v_s IS NULL OR jsonb_typeof(v_s) <> 'object' THEN
        UPDATE inv.paquete SET error_procesamiento = 'El JSON no trae el objeto "sensores"'
         WHERE id = v_paquete_id;
        RETURN v_paquete_id;
    END IF;

    -- Recorre los sensores dados de alta para este nodo y busca su bloque en el JSON
    FOR r IN
        SELECT s.id AS sensor_id, s.tipo_sensor_id, s.indice, t.clave_json, t.es_arreglo
          FROM inv.sensor s
          JOIN inv.tipo_sensor t ON t.id = s.tipo_sensor_id
         WHERE s.nodo_id = v_nodo_id AND s.activo
         ORDER BY t.id, s.indice
    LOOP
        v_b := NULL;
        IF r.es_arreglo THEN
            IF jsonb_typeof(v_s -> r.clave_json) = 'array' THEN
                -- se empata por "id" (1, 2, 3 o "sensor_1"…); si no hay id, por posición
                SELECT a.e INTO v_b
                  FROM jsonb_array_elements(v_s -> r.clave_json) WITH ORDINALITY AS a(e, o)
                 WHERE coalesce(substring(a.e ->> 'id' FROM '(\d{1,4})\s*$')::int, a.o::int) = r.indice
                 LIMIT 1;
            END IF;
        ELSE
            v_b := v_s -> r.clave_json;
        END IF;

        IF v_b IS NULL OR jsonb_typeof(v_b) <> 'object' THEN
            v_avisos := v_avisos || format('Sin datos para %s[%s]', r.clave_json, r.indice);
            CONTINUE;
        END IF;

        -- Estado reportado; si es nuevo se da de alta como DESCONOCIDO
        v_estado := left(upper(btrim(coalesce(nullif(v_b ->> 'estado', ''), 'SIN_ESTADO'))), 60);
        INSERT INTO inv.estado_sensor (codigo, categoria, descripcion)
        VALUES (v_estado, 'DESCONOCIDO', 'Alta automática: estado recibido del nodo que no estaba catalogado')
        ON CONFLICT (codigo) DO NOTHING;
        SELECT categoria INTO v_categoria FROM inv.estado_sensor WHERE codigo = v_estado;

        -- ¿Algún valor fuera del rango físico del sensor? (ej. HC-SR04 desconectado
        -- manda distancia 0 y el firmware lo reporta como NIVEL_MAXIMO)
        SELECT coalesce(bool_or(x.n IS NOT NULL AND (
                   (v.rango_min IS NOT NULL AND x.n < v.rango_min) OR
                   (v.rango_max IS NOT NULL AND x.n > v.rango_max))), false)
          INTO v_fuera
          FROM inv.tipo_sensor_variable tv
          JOIN inv.variable v ON v.id = tv.variable_id
          CROSS JOIN LATERAL (SELECT inv._num(v_b, VARIADIC tv.campos_json) AS n) x
         WHERE tv.tipo_sensor_id = r.tipo_sensor_id;

        IF v_fuera AND v_categoria <> 'ERROR_HW' THEN
            -- el estado original queda en paquete.payload
            v_estado    := 'LECTURA_FUERA_DE_RANGO';
            v_categoria := 'ERROR_HW';
        END IF;

        INSERT INTO inv.medicion (paquete_id, sensor_id, variable_id, tomado_en, valor, estado, valido)
        SELECT v_paquete_id, r.sensor_id, v.id, p_recibido_en, x.valor, v_estado,
               (v_categoria <> 'ERROR_HW' AND x.valor IS NOT NULL
                AND (v.rango_min IS NULL OR x.valor >= v.rango_min)
                AND (v.rango_max IS NULL OR x.valor <= v.rango_max))
          FROM inv.tipo_sensor_variable tv
          JOIN inv.variable v ON v.id = tv.variable_id
          CROSS JOIN LATERAL (
                SELECT CASE WHEN abs(q.n) < 1e8 THEN round(q.n, 2) END AS valor
                  FROM (SELECT inv._num(v_b, VARIADIC tv.campos_json) AS n) q
          ) x
         WHERE tv.tipo_sensor_id = r.tipo_sensor_id
        ON CONFLICT (paquete_id, sensor_id, variable_id) DO NOTHING;
    END LOOP;

    -- ALERTAS ---------------------------------------------------------------
    -- a) se cierran las alertas abiertas de sensores que ya reportan otro estado
    UPDATE inv.alerta al
       SET resuelta_en = p_recibido_en
      FROM (SELECT DISTINCT sensor_id, estado FROM inv.medicion WHERE paquete_id = v_paquete_id) m
     WHERE al.sensor_id = m.sensor_id
       AND al.resuelta_en IS NULL
       AND al.estado <> m.estado;

    -- b) se abre una alerta nueva o se refresca la que ya estaba abierta
    INSERT INTO inv.alerta AS al (nodo_id, sensor_id, estado, categoria, mensaje, abierta_en, ultima_vez_en)
    SELECT v_nodo_id, m.sensor_id, m.estado, e.categoria,
           left(s.nombre || ': ' || coalesce(e.descripcion, m.estado), 250),
           p_recibido_en, p_recibido_en
      FROM (SELECT DISTINCT sensor_id, estado FROM inv.medicion WHERE paquete_id = v_paquete_id) m
      JOIN inv.estado_sensor e ON e.codigo = m.estado
      JOIN inv.sensor s        ON s.id = m.sensor_id
     WHERE e.categoria IN ('ALERTA','CRITICO','ERROR_HW')
    ON CONFLICT (sensor_id, estado) WHERE resuelta_en IS NULL
    DO UPDATE SET ultima_vez_en = EXCLUDED.ultima_vez_en,
                  ocurrencias   = al.ocurrencias + 1;

    UPDATE inv.nodo
       SET ultima_conexion = greatest(coalesce(ultima_conexion, p_recibido_en), p_recibido_en)
     WHERE id = v_nodo_id;

    UPDATE inv.paquete
       SET procesado = true,
           error_procesamiento = CASE WHEN cardinality(v_avisos) > 0
                                      THEN array_to_string(v_avisos, '; ') END
     WHERE id = v_paquete_id;

    RETURN v_paquete_id;
END $$;

-- Histórico agrupado para gráficas (App) y análisis (IA).
--   SELECT * FROM inv.fn_historico('invernadero_albahaca_01', 'humedad_suelo');
--   SELECT * FROM inv.fn_historico('invernadero_albahaca_01', 'temperatura_aire',
--                                  now() - interval '7 days', now(), interval '1 hour');
CREATE FUNCTION inv.fn_historico(
    p_nodo      text,
    p_variable  text,
    p_desde     timestamptz DEFAULT now() - interval '24 hours',
    p_hasta     timestamptz DEFAULT now(),
    p_intervalo interval    DEFAULT interval '15 minutes'
) RETURNS TABLE (sensor text, indice smallint, periodo timestamptz,
                 promedio numeric, minimo numeric, maximo numeric, lecturas bigint)
LANGUAGE sql STABLE
AS $$
    SELECT s.nombre::text,
           s.indice,
           date_bin(p_intervalo, m.tomado_en, timestamptz '2000-01-01'),
           round(avg(m.valor), 2),
           min(m.valor),
           max(m.valor),
           count(*)
      FROM inv.medicion m
      JOIN inv.sensor   s ON s.id = m.sensor_id
      JOIN inv.nodo     n ON n.id = s.nodo_id
      JOIN inv.variable v ON v.id = m.variable_id
     WHERE n.codigo = p_nodo
       AND v.codigo = p_variable
       AND m.valido
       AND m.tomado_en >= p_desde
       AND m.tomado_en <  p_hasta
     GROUP BY s.nombre, s.indice, 3
     ORDER BY 3, s.indice;
$$;

-- Resumen de un dispositivo en [desde, hasta) con solo lecturas válidas:
--   SELECT * FROM inv.fn_estadistica('SENS-SOIL-01', now() - interval '24 hours', now());
CREATE FUNCTION inv.fn_estadistica(p_codigo text, p_desde timestamptz, p_hasta timestamptz)
RETURNS TABLE (minimo numeric, minimo_en timestamptz, promedio numeric,
               maximo numeric, maximo_en timestamptz, lecturas bigint)
LANGUAGE sql STABLE
AS $$
    SELECT min(m.valor),
           (array_agg(m.tomado_en ORDER BY m.valor, m.tomado_en DESC))[1],
           round(avg(m.valor), 2),
           max(m.valor),
           (array_agg(m.tomado_en ORDER BY m.valor DESC, m.tomado_en DESC))[1],
           count(*)
      FROM inv.medicion m
      JOIN inv.sensor   s ON s.id = m.sensor_id
      JOIN inv.variable v ON v.id = m.variable_id
     WHERE inv.fn_codigo_dispositivo(v.prefijo_dispositivo, s.indice) = p_codigo
       AND m.valido
       AND m.tomado_en >= p_desde
       AND m.tomado_en <  p_hasta;
$$;

-- Paro general: APAGAR a todos los actuadores y pasarlos a MANUAL para que las reglas
-- no los vuelvan a encender. Corre con los permisos de quien la llama (RLS aplica).
CREATE FUNCTION inv.fn_detener_todo(p_motivo text DEFAULT 'Paro general') RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = inv, pg_temp
AS $$
DECLARE
    v_usuario integer := inv.fn_usuario_actual();
    v_n       integer;
BEGIN
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'El paro general requiere un usuario autenticado y activo'
              USING ERRCODE = '42501';
    END IF;
    INSERT INTO inv.comando_actuador (actuador_id, accion, origen, usuario_id, motivo)
    SELECT id, 'APAGAR', 'MANUAL', v_usuario, left(p_motivo, 250) FROM inv.actuador;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    UPDATE inv.actuador SET modo = 'MANUAL' WHERE modo <> 'MANUAL';
    RETURN v_n;
END $$;

-- Mezcla constantes de calibración en el sensor detrás de un código de dispositivo:
--   SELECT inv.fn_calibrar_sensor('SENS-SOIL-01', '{"aire_crudo": 2500}');
-- SECURITY DEFINER porque OPERADOR calibra sin poder editar el catálogo; el rol se revisa aquí.
CREATE FUNCTION inv.fn_calibrar_sensor(p_codigo text, p_calibracion jsonb) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inv, pg_temp
AS $$
DECLARE
    v_cal jsonb;
BEGIN
    IF (inv.fn_rol_actual() IN ('OPERADOR','HARDWARE','ADMIN')) IS NOT TRUE THEN
        RAISE EXCEPTION 'Sin permiso para calibrar sensores' USING ERRCODE = '42501';
    END IF;
    IF p_calibracion IS NULL OR jsonb_typeof(p_calibracion) <> 'object' THEN
        RAISE EXCEPTION 'La calibración debe ser un objeto JSON' USING ERRCODE = '22023';
    END IF;

    UPDATE inv.sensor s
       SET calibracion = s.calibracion || p_calibracion
      FROM inv.tipo_sensor_variable tv
      JOIN inv.variable v ON v.id = tv.variable_id
     WHERE tv.tipo_sensor_id = s.tipo_sensor_id
       AND inv.fn_codigo_dispositivo(v.prefijo_dispositivo, s.indice) = p_codigo
    RETURNING s.calibracion INTO v_cal;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el dispositivo %', p_codigo USING ERRCODE = 'P0002';
    END IF;
    RETURN v_cal;
END $$;

-- Retención: borra el JSON crudo de paquetes viejos (las mediciones se conservan).
CREATE FUNCTION inv.fn_purgar_payload(p_dias integer DEFAULT 7) RETURNS integer
LANGUAGE plpgsql
SET search_path = inv, pg_temp
AS $$
DECLARE
    v_n integer;
BEGIN
    UPDATE inv.paquete SET payload = NULL
     WHERE payload IS NOT NULL
       AND recibido_en < now() - make_interval(days => p_dias);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN v_n;
END $$;

-- Avisos en tiempo real con LISTEN/NOTIFY (en Supabase se usa Realtime, ver supabase.sql)
--   Conectividad:  LISTEN canal_comandos;   App/Automatización:  LISTEN canal_alertas;
CREATE FUNCTION inv.tg_notificar() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify(TG_ARGV[0], to_jsonb(NEW)::text);
    RETURN NEW;
END $$;

CREATE TRIGGER tr_comando_notifica AFTER INSERT ON inv.comando_actuador
    FOR EACH ROW EXECUTE FUNCTION inv.tg_notificar('canal_comandos');
CREATE TRIGGER tr_alerta_notifica AFTER INSERT ON inv.alerta
    FOR EACH ROW EXECUTE FUNCTION inv.tg_notificar('canal_alertas');

-- Al confirmar un comando, el actuador refleja el estado real.
-- SECURITY DEFINER: Conectividad solo puede actualizar comando_actuador, no actuador.
CREATE FUNCTION inv.tg_comando_confirmado() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inv, pg_temp
AS $$
BEGIN
    UPDATE inv.actuador
       SET encendido      = (NEW.accion = 'ENCENDER'),
           valor          = NEW.valor,
           actualizado_en = coalesce(NEW.confirmado_en, now())
     WHERE id = NEW.actuador_id;
    RETURN NEW;
END $$;

CREATE TRIGGER tr_comando_confirmado AFTER UPDATE OF estado ON inv.comando_actuador
    FOR EACH ROW WHEN (NEW.estado = 'CONFIRMADO' AND OLD.estado IS DISTINCT FROM 'CONFIRMADO')
    EXECUTE FUNCTION inv.tg_comando_confirmado();

-- Un riego manual sin duración podría dejar la bomba encendida: se toma la duración de la
-- regla ENCENDER activa del mismo actuador (la definió el equipo, no se inventa); sin regla queda NULL.
CREATE FUNCTION inv.tg_comando_duracion() RETURNS trigger
LANGUAGE plpgsql
SET search_path = inv, pg_temp
AS $$
BEGIN
    SELECT r.duracion_s INTO NEW.duracion_s
      FROM inv.regla_automatizacion r
     WHERE r.actuador_id = NEW.actuador_id
       AND r.activa AND r.accion = 'ENCENDER' AND r.duracion_s IS NOT NULL
     ORDER BY r.prioridad, r.id
     LIMIT 1;
    RETURN NEW;
END $$;

CREATE TRIGGER tr_comando_duracion BEFORE INSERT ON inv.comando_actuador
    FOR EACH ROW WHEN (NEW.origen = 'MANUAL' AND NEW.accion = 'ENCENDER' AND NEW.duracion_s IS NULL)
    EXECUTE FUNCTION inv.tg_comando_duracion();

-- =============================================================================
-- 7. VISTAS (los nombres de columna son contrato con el adaptador REST)
-- =============================================================================

-- Tablero en vivo: un renglón por sensor activo × variable (aunque aún no tenga lecturas),
-- su último valor, evaluación contra umbrales y tendencia (últimas ≤12 válidas, vieja → nueva).
CREATE VIEW inv.v_ultima_medicion AS
SELECT n.codigo        AS nodo,
       inv.fn_codigo_dispositivo(v.prefijo_dispositivo, s.indice) AS codigo,
       s.id            AS sensor_id,
       v.id            AS variable_id,
       s.nombre        AS sensor,
       ts.modelo,
       s.pines,
       s.indice,
       s.ubicacion     AS zona,
       v.codigo        AS variable,
       v.nombre        AS variable_nombre,
       v.unidad,
       v.rango_min,
       v.rango_max,
       u.valor,
       u.valido,
       u.estado,
       e.categoria,
       e.descripcion   AS estado_descripcion,
       e.accion_sugerida,
       u.tomado_en,
       CASE
           WHEN u.tomado_en IS NULL THEN 'SIN_LECTURA'
           WHEN NOT u.valido THEN 'SIN_DATO_VALIDO'
           WHEN (um.min_critico IS NOT NULL AND u.valor <= um.min_critico)
             OR (um.max_critico IS NOT NULL AND u.valor >= um.max_critico) THEN 'CRITICO'
           WHEN (um.min_optimo IS NOT NULL AND u.valor < um.min_optimo)
             OR (um.max_optimo IS NOT NULL AND u.valor > um.max_optimo)   THEN 'FUERA_DE_OPTIMO'
           WHEN um.id IS NULL THEN 'SIN_UMBRAL'
           ELSE 'OPTIMO'
       END AS evaluacion,
       um.min_optimo,
       um.max_optimo,
       um.min_critico,
       um.max_critico,
       ARRAY(SELECT t.valor
               FROM (SELECT m.valor, m.tomado_en
                       FROM inv.medicion m
                      WHERE m.sensor_id = s.id AND m.variable_id = v.id AND m.valido
                      ORDER BY m.tomado_en DESC
                      LIMIT 12) t
              ORDER BY t.tomado_en) AS tendencia
  FROM inv.sensor s
  JOIN inv.nodo n                  ON n.id = s.nodo_id
  JOIN inv.invernadero i           ON i.id = n.invernadero_id
  JOIN inv.tipo_sensor ts          ON ts.id = s.tipo_sensor_id
  JOIN inv.tipo_sensor_variable tv ON tv.tipo_sensor_id = s.tipo_sensor_id
  JOIN inv.variable v              ON v.id = tv.variable_id
  LEFT JOIN LATERAL (
        SELECT m.valor, m.valido, m.estado, m.tomado_en
          FROM inv.medicion m
         WHERE m.sensor_id = s.id AND m.variable_id = v.id
         ORDER BY m.tomado_en DESC
         LIMIT 1
  ) u ON true
  LEFT JOIN inv.estado_sensor e    ON e.codigo = u.estado
  LEFT JOIN inv.umbral um          ON um.cultivo_id = i.cultivo_id AND um.variable_id = v.id
 WHERE s.activo
 ORDER BY n.codigo, ts.id, s.indice, v.id;
COMMENT ON VIEW inv.v_ultima_medicion IS 'Último valor por sensor activo × variable, con evaluación, umbrales y tendencia.';

-- Alertas activas, las críticas primero
CREATE VIEW inv.v_alertas_activas AS
SELECT a.id,
       n.codigo   AS nodo,
       a.sensor_id,
       s.nombre   AS sensor,
       a.estado,
       a.categoria,
       a.mensaje,
       e.accion_sugerida,
       a.abierta_en,
       a.ultima_vez_en,
       a.ocurrencias,
       (a.reconocida_en IS NOT NULL) AS reconocida,
       inv.fn_codigo_sensor(a.sensor_id) AS codigo
  FROM inv.alerta a
  JOIN inv.nodo n          ON n.id = a.nodo_id
  JOIN inv.sensor s        ON s.id = a.sensor_id
  JOIN inv.estado_sensor e ON e.codigo = a.estado
 WHERE a.resuelta_en IS NULL
 ORDER BY CASE a.categoria WHEN 'CRITICO' THEN 1 WHEN 'ERROR_HW' THEN 2 ELSE 3 END, a.abierta_en;
COMMENT ON VIEW inv.v_alertas_activas IS 'Alertas sin resolver; críticas primero.';

-- ¿El ESP32 está en línea? (se considera caído si faltan 3 paquetes seguidos)
CREATE VIEW inv.v_estado_nodo AS
SELECT n.id,
       n.codigo,
       i.nombre        AS invernadero,
       c.nombre_comun  AS cultivo,
       n.firmware_version,
       n.topic_telemetria,
       n.intervalo_ms,
       n.ultima_conexion,
       (n.ultima_conexion IS NOT NULL
        AND now() - n.ultima_conexion <= n.intervalo_ms * 3 * interval '1 millisecond') AS en_linea,
       (SELECT count(*) FROM inv.alerta a
         WHERE a.nodo_id = n.id AND a.resuelta_en IS NULL) AS alertas_abiertas
  FROM inv.nodo n
  JOIN inv.invernadero i ON i.id = n.invernadero_id
  LEFT JOIN inv.cultivo c ON c.id = i.cultivo_id
 WHERE n.activo;
COMMENT ON VIEW inv.v_estado_nodo IS 'Nodos activos, si están en línea y cuántas alertas abiertas tienen.';

-- Histórico en formato largo (1 fila por lectura) para filtrar por dispositivo, sensor, zona y fecha.
--   SELECT * FROM inv.v_lectura WHERE codigo = 'SENS-SOIL-01' AND tomado_en >= now() - interval '1 day';
CREATE VIEW inv.v_lectura AS
SELECT m.id,
       m.paquete_id,
       inv.fn_codigo_dispositivo(v.prefijo_dispositivo, s.indice) AS codigo,
       n.codigo     AS nodo,
       m.sensor_id,
       s.nombre     AS sensor,
       s.ubicacion  AS zona,
       v.codigo     AS variable,
       v.unidad,
       m.valor,
       m.valido,
       m.estado,
       m.tomado_en
  FROM inv.medicion m
  JOIN inv.sensor   s ON s.id = m.sensor_id
  JOIN inv.nodo     n ON n.id = s.nodo_id
  JOIN inv.variable v ON v.id = m.variable_id;
COMMENT ON VIEW inv.v_lectura IS 'Todas las lecturas en formato largo con código de dispositivo y zona.';

-- Bitácora de eventos para la página de auditoría web:
--   telemetry = paquete recibido · manual / auto = comando · alert = alerta abierta
CREATE VIEW inv.v_bitacora AS
SELECT p.recibido_en                         AS ocurrido_en,
       'telemetry'::text                     AS tipo,
       coalesce(n.codigo, p.nodo_codigo, '(desconocido)')::text AS dispositivo,
       ('Lectura periódica' || coalesce(': ' || p.error_procesamiento, ''))::text AS detalle,
       'ESP32'::text                         AS disparador,
       CASE WHEN NOT p.procesado THEN 'NO_PROCESADO'
            WHEN p.error_procesamiento IS NOT NULL THEN 'CON_AVISOS'
            ELSE 'OK' END                    AS estado,
       p.id                                  AS referencia_id
  FROM inv.paquete p
  LEFT JOIN inv.nodo n ON n.id = p.nodo_id
UNION ALL
SELECT c.creado_en,
       CASE c.origen WHEN 'MANUAL' THEN 'manual' ELSE 'auto' END,
       a.codigo::text,
       (c.accion || coalesce(' ' || c.valor || ' %', '') || coalesce(' por ' || c.duracion_s || ' s', '')
               || coalesce(' · ' || c.motivo, ''))::text,
       CASE c.origen WHEN 'MANUAL' THEN u.nombre::text
                     WHEN 'REGLA'  THEN r.nombre::text
                     ELSE 'IA' END,
       c.estado::text,
       c.id
  FROM inv.comando_actuador c
  JOIN inv.actuador a                  ON a.id = c.actuador_id
  LEFT JOIN inv.usuario u              ON u.id = c.usuario_id
  LEFT JOIN inv.regla_automatizacion r ON r.id = c.regla_id
UNION ALL
SELECT al.abierta_en,
       'alert',
       coalesce(inv.fn_codigo_sensor(al.sensor_id), s.nombre::text),
       coalesce(al.mensaje, al.estado)::text,
       'ESP32',
       CASE WHEN al.resuelta_en IS NOT NULL THEN 'RESUELTA'
            WHEN al.reconocida_en IS NOT NULL THEN 'RECONOCIDA'
            ELSE 'ACTIVA' END,
       al.id
  FROM inv.alerta al
  JOIN inv.sensor s ON s.id = al.sensor_id;
COMMENT ON VIEW inv.v_bitacora IS 'Eventos (telemetría, comandos manuales/automáticos y alertas) para auditoría.';

-- Dataset "ancho" (1 fila por paquete, 1 columna por variable), solo lecturas válidas.
-- Pensado para exportar a CSV / pandas y entrenar modelos.
--   SELECT * FROM inv.v_dataset_ia WHERE tomado_en >= now() - interval '7 days';
CREATE VIEW inv.v_dataset_ia AS
SELECT p.id           AS paquete_id,
       n.codigo       AS nodo,
       p.recibido_en  AS tomado_en,
       max(m.valor) FILTER (WHERE v.codigo = 'temperatura_aire'  AND m.valido) AS temp_aire_c,
       max(m.valor) FILTER (WHERE v.codigo = 'humedad_aire'      AND m.valido) AS humedad_aire_pct,
       max(m.valor) FILTER (WHERE v.codigo = 'iluminancia'       AND m.valido) AS luz_lux,
       max(m.valor) FILTER (WHERE v.codigo = 'temperatura_suelo' AND m.valido) AS temp_suelo_c,
       max(m.valor) FILTER (WHERE v.codigo = 'distancia_agua'    AND m.valido) AS distancia_agua_cm,
       max(m.valor) FILTER (WHERE v.codigo = 'nivel_tanque'      AND m.valido) AS nivel_tanque_pct,
       max(m.valor) FILTER (WHERE v.codigo = 'humedad_suelo' AND s.indice = 1 AND m.valido) AS humedad_suelo_1_pct,
       max(m.valor) FILTER (WHERE v.codigo = 'humedad_suelo' AND s.indice = 2 AND m.valido) AS humedad_suelo_2_pct,
       max(m.valor) FILTER (WHERE v.codigo = 'humedad_suelo' AND s.indice = 3 AND m.valido) AS humedad_suelo_3_pct,
       bool_or(e.categoria = 'ERROR_HW') AS hubo_falla_hw
  FROM inv.paquete p
  JOIN inv.nodo n          ON n.id = p.nodo_id
  JOIN inv.medicion m      ON m.paquete_id = p.id
  JOIN inv.variable v      ON v.id = m.variable_id
  JOIN inv.sensor s        ON s.id = m.sensor_id
  JOIN inv.estado_sensor e ON e.codigo = m.estado
 GROUP BY p.id, n.codigo, p.recibido_en;
COMMENT ON VIEW inv.v_dataset_ia IS 'Dataset ancho para IA: 1 fila por paquete, solo lecturas válidas.';

-- =============================================================================
-- 8. DATOS INICIALES (sacados del documento de integración)
-- =============================================================================

INSERT INTO inv.cultivo (codigo, nombre_comun, nombre_cientifico)
VALUES ('albahaca', 'Albahaca', 'Ocimum basilicum');

INSERT INTO inv.invernadero (nombre, largo_cm, ancho_cm, cultivo_id)
SELECT 'Invernadero Albahaca 01', 100, 60, id FROM inv.cultivo WHERE codigo = 'albahaca';

INSERT INTO inv.nodo (codigo, invernadero_id, placa, firmware_version, topic_telemetria, topic_comandos, intervalo_ms)
SELECT 'invernadero_albahaca_01', id, 'esp32doit-devkit-v1', '1.0',
       'invernadero/albahaca/invernadero_albahaca_01/telemetria', 'invernadero/albahaca_01/comandos', 5000
  FROM inv.invernadero WHERE nombre = 'Invernadero Albahaca 01';

INSERT INTO inv.tipo_sensor (modelo, clave_json, es_arreglo, protocolo, libreria, descripcion) VALUES
 ('DHT22',           'ambiente',          false, 'Digital 1 hilo (propietario DHT)',
  'adafruit/DHT sensor library @ ^1.4.6 + adafruit/Adafruit Unified Sensor @ ^1.1.14',
  'Temperatura y humedad relativa del aire alrededor del follaje'),
 ('BH1750',          'luz',               false, 'I2C',
  'claws/BH1750 @ ^1.3.0', 'Intensidad luminosa en lux'),
 ('DS18B20',         'suelo_profundidad', false, 'OneWire',
  'paulstoffregen/OneWire @ ^2.3.7 + milesburton/DallasTemperature @ ^3.11.0',
  'Temperatura de la zona radicular (sumergible)'),
 ('HC-SR04',         'tanque_agua',       false, 'Pulsos (tiempo de vuelo)',
  NULL, 'Distancia a la superficie del agua para calcular el nivel del tanque'),
 ('CAPACITIVO_V1.2', 'suelo_superficie',  true,  'Analógico ADC1',
  NULL, 'Humedad del sustrato en superficie; varios puntos por arreglo');

-- prefijo_dispositivo: los códigos SENS-* están fijos en la app móvil
INSERT INTO inv.variable (codigo, nombre, unidad, rango_min, rango_max, prefijo_dispositivo) VALUES
 ('temperatura_aire',  'Temperatura del aire',               '°C',  -40,   80,   'ENV-'),
 ('humedad_aire',      'Humedad relativa del aire',          '%',     0,  100,   'HUM-'),
 ('iluminancia',       'Iluminancia',                        'lx',    0, 65535,  'LUX-'),
 ('temperatura_suelo', 'Temperatura del suelo (raíz)',       '°C',  -55,  125,   'TEMP-S'),
 ('distancia_agua',    'Distancia sensor–superficie agua',   'cm',    2,  400,   'DIST-'),
 ('nivel_tanque',      'Nivel de llenado del tanque',        '%',     0,  100,   'TANK-'),
 ('humedad_suelo',     'Humedad del sustrato (superficie)',  '%',     0,  100,   'SOIL-');

INSERT INTO inv.tipo_sensor_variable (tipo_sensor_id, variable_id, campos_json)
SELECT t.id, v.id, x.campos
  FROM (VALUES
        ('DHT22',           'temperatura_aire',  ARRAY['temperatura_c']),
        ('DHT22',           'humedad_aire',      ARRAY['humedad_pct','humedad_relativa_pct']),
        ('BH1750',          'iluminancia',       ARRAY['luxes','iluminancia_lux']),
        ('DS18B20',         'temperatura_suelo', ARRAY['temperatura_c']),
        ('HC-SR04',         'distancia_agua',    ARRAY['distancia_cm']),
        ('HC-SR04',         'nivel_tanque',      ARRAY['nivel_pct','nivel_llenado_pct']),
        ('CAPACITIVO_V1.2', 'humedad_suelo',     ARRAY['humedad_pct'])
       ) AS x(modelo, variable, campos)
  JOIN inv.tipo_sensor t ON t.modelo = x.modelo
  JOIN inv.variable    v ON v.codigo = x.variable;

INSERT INTO inv.sensor (nodo_id, tipo_sensor_id, indice, nombre, pines, gpio_principal, ubicacion, calibracion)
SELECT n.id, t.id, x.indice, x.nombre, x.pines, x.gpio, x.ubicacion, x.calib::jsonb
  FROM (VALUES
        ('DHT22',           1, 'Ambiente (DHT22)',          'GPIO 4',                         4,  'Aire, a la altura del follaje',
         '{"temp_offset": 0.0, "hum_offset": 0.0}'),
        ('BH1750',          1, 'Luz (BH1750)',              'GPIO 21 (SDA), GPIO 22 (SCL)',   21, 'Sobre el cultivo',
         '{}'),
        ('DS18B20',         1, 'Suelo profundo (DS18B20)',  'GPIO 5',                         5,  'Zona radicular',
         '{"pullup": "4.7k", "valor_desconectado": -127}'),
        ('HC-SR04',         1, 'Tanque de agua (HC-SR04)',  'GPIO 19 (TRIG), GPIO 18 (ECHO)', 19, 'Tanque principal',
         '{"tanque_vacio_cm": 40, "tanque_lleno_cm": 5}'),
        ('CAPACITIVO_V1.2', 1, 'Humedad suelo 1',           'GPIO 32',                        32, 'Zona 1',
         '{"aire_crudo": 2450, "agua_crudo": 550, "alfa_filtro": 0.15}'),
        ('CAPACITIVO_V1.2', 2, 'Humedad suelo 2',           'GPIO 33',                        33, 'Zona 2',
         '{"aire_crudo": 2450, "agua_crudo": 550, "alfa_filtro": 0.15}'),
        ('CAPACITIVO_V1.2', 3, 'Humedad suelo 3',           'GPIO 34',                        34, 'Zona 3',
         '{"aire_crudo": 2450, "agua_crudo": 550, "alfa_filtro": 0.15}')
       ) AS x(modelo, indice, nombre, pines, gpio, ubicacion, calib)
  JOIN inv.tipo_sensor t ON t.modelo = x.modelo
  CROSS JOIN inv.nodo n
 WHERE n.codigo = 'invernadero_albahaca_01';

-- Estados que emite el firmware (sección 6 del documento) + los de la tabla de la sección 4
INSERT INTO inv.estado_sensor (codigo, categoria, descripcion, accion_sugerida) VALUES
 -- genéricos
 ('OK',                              'NORMAL',      'Sensor operando correctamente', NULL),
 ('OPTIMO',                          'NORMAL',      'Lectura dentro del rango óptimo', NULL),
 ('SIN_ESTADO',                      'DESCONOCIDO', 'El bloque llegó sin campo "estado"', 'Revisar firmware'),
 ('LECTURA_FUERA_DE_RANGO',          'ERROR_HW',    'Valor fuera del rango físico del sensor', 'Revisar conexión y cableado del sensor'),
 -- DHT22
 ('ERROR_DHT',                       'ERROR_HW',    'DHT22 sin respuesta (lectura NaN)', 'Revisar cableado del DHT22 en GPIO 4'),
 -- BH1750
 ('NO_DETECTADO',                    'ERROR_HW',    'BH1750 sin respuesta en el bus I2C', 'Revisar SDA (GPIO 21) y SCL (GPIO 22)'),
 ('ERROR_BH1750',                    'ERROR_HW',    'Falla del BH1750', 'Revisar SDA (GPIO 21) y SCL (GPIO 22)'),
 ('SOMBRA_EXCESIVA',                 'ALERTA',      'Luz menor a 2,000 lx', 'Encender iluminación o mover el invernadero'),
 ('ILUMINACION_ADECUADA',            'NORMAL',      'Luz entre 2,000 y 15,000 lx', NULL),
 ('SOL_DIRECTO_EXTREMO',             'ALERTA',      'Luz mayor a 15,000 lx', 'Poner malla sombra o ventilar'),
 -- DS18B20
 ('TEMPERATURA_OPTIMA',              'NORMAL',      'Raíz entre 15 y 28 °C', NULL),
 ('ALERTA_FRIO_ACTIVAR_CALEFACCION', 'ALERTA',      'Raíz por debajo de 15 °C', 'Encender calefacción'),
 ('PELIGRO_SOBRECALENTADO',          'CRITICO',     'Raíz por encima de 28 °C', 'Ventilar y sombrear'),
 ('ERROR_DS18B20_DESCONECTADO',      'ERROR_HW',    'DS18B20 devuelve -127 °C (desconectado)', 'Revisar GPIO 5 y resistencia de 4.7 kΩ'),
 ('ERROR_DS18B20',                   'ERROR_HW',    'Falla del DS18B20', 'Revisar GPIO 5 y resistencia de 4.7 kΩ'),
 -- HC-SR04
 ('NIVEL_SEGURO',                    'NORMAL',      'Tanque entre 16 % y 84 %', NULL),
 ('NIVEL_MAXIMO',                    'NORMAL',      'Tanque al 85 % o más', NULL),
 ('ALERTA_BOMBA_EN_SECO',            'CRITICO',     'Tanque al 15 % o menos', 'Bloquear la bomba y rellenar el tanque'),
 ('ERROR_ULTRASONICO',               'ERROR_HW',    'Falla del HC-SR04', 'Revisar TRIG (GPIO 19) y ECHO (GPIO 18)'),
 -- Capacitivos de suelo
 ('RIEGO_NECESARIO',                 'ALERTA',      'Humedad del sustrato menor a 35 %', 'Activar riego'),
 ('PELIGRO_INUNDACION',              'CRITICO',     'Humedad del sustrato mayor a 75 %', 'Detener riego'),
 ('ALERTA_DESCONECTADO',             'ERROR_HW',    'Lectura ADC fuera de 100–4000 (sensor desconectado)', 'Revisar el sensor capacitivo y su pin');

-- Umbrales: los mismos cortes que tiene programados el firmware.
-- Aire (DHT22) no tiene cortes en el firmware: agregarlos cuando el equipo los defina, p. ej.
--   INSERT INTO inv.umbral (cultivo_id, variable_id, min_optimo, max_optimo, fuente) VALUES (...);
INSERT INTO inv.umbral (cultivo_id, variable_id, min_optimo, max_optimo, min_critico, max_critico, fuente)
SELECT c.id, v.id, x.min_opt, x.max_opt, x.min_crit, x.max_crit, 'Firmware ESP32 v1.0'
  FROM (VALUES
        ('humedad_suelo',     35,    75,    NULL::numeric, NULL::numeric),
        ('temperatura_suelo', 15,    28,    NULL, NULL),
        ('iluminancia',       2000,  15000, NULL, NULL),
        ('nivel_tanque',      NULL,  NULL,  15,   NULL)
       ) AS x(variable, min_opt, max_opt, min_crit, max_crit)
  JOIN inv.variable v ON v.codigo = x.variable
  CROSS JOIN inv.cultivo c
 WHERE c.codigo = 'albahaca';

-- Actuador implícito en el documento (ALERTA_BOMBA_EN_SECO). El equipo de Automatización
-- agrega los suyos (ventilador, calefactor…) y pone el pin real.
INSERT INTO inv.actuador (nodo_id, codigo, nombre, tipo, pin)
SELECT id, 'bomba_riego', 'Bomba de riego', 'BOMBA', NULL
  FROM inv.nodo WHERE codigo = 'invernadero_albahaca_01';

-- Reglas de ejemplo (duraciones a ajustar con pruebas reales)
INSERT INTO inv.regla_automatizacion (nombre, estado_disparador, actuador_id, accion, duracion_s, espera_s, prioridad)
SELECT x.nombre, x.estado, a.id, x.accion, x.duracion, x.espera, x.prioridad
  FROM (VALUES
        ('Bloquear bomba si el tanque está casi vacío', 'ALERTA_BOMBA_EN_SECO', 'APAGAR',   NULL::int, 0,   1),
        ('Cortar riego si hay inundación',              'PELIGRO_INUNDACION',   'APAGAR',   NULL,      0,   2),
        ('Regar cuando el sustrato esté seco',          'RIEGO_NECESARIO',      'ENCENDER', 10,        600, 10)
       ) AS x(nombre, estado, accion, duracion, espera, prioridad)
  JOIN inv.actuador a ON a.codigo = 'bomba_riego';

COMMIT;

-- Retención (el JSON crudo ocupa ~17 MB/día): conservar 7 días.
-- En Supabase lo programa supabase.sql con pg_cron; a mano:
--   SELECT inv.fn_purgar_payload(7);
