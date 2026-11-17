-- =============================================================================
--  BASE DE DATOS · INVERNADERO INTELIGENTE DE ALBAHACA (1.00 m × 0.60 m)
--  Materia: Gestión de Proyectos con IA · UTEQ
--  Motor:   PostgreSQL 14 o superior (usa date_bin y columnas generadas)
--  Base:    "Especificaciones de Integración: Sensores ESP32 – Proyecto Invernadero Albahaca"
-- =============================================================================
--  FLUJO DE DATOS
--   ESP32 ─(MQTT, 1 JSON cada 5 s)─▶ broker ─▶ puente del equipo de Conectividad
--        └─▶ SELECT inv.fn_ingestar_paquete(payload::jsonb, topic);
--              ├─ inv.paquete  : JSON crudo tal cual llegó (auditoría / reproceso)
--              ├─ inv.medicion : 1 fila por sensor × variable, con su estado y "valido"
--              └─ inv.alerta   : se abre, se refresca y se cierra sola según el "estado"
--   Automatización inserta en inv.comando_actuador ─▶ NOTIFY canal_comandos
--        └─▶ Conectividad lo publica en el topic de comandos del ESP32.
--   App web/móvil e IA leen las vistas v_* y la función inv.fn_historico().
--
--  EQUIPO ......................... ROL (sección 8)
--   Hardware e IoT ................ rol_hardware       catálogo de sensores y calibración
--   Conectividad .................. rol_conectividad   ingesta + despacho de comandos
--   BD y Backend .................. rol_backend        todo
--   Automatización ................ rol_automatizacion reglas, actuadores, comandos, IA
--   App web y móvil ............... rol_app            lectura + acciones de usuario
--
--  Uso:  psql -d invernadero -f invernadero_bd.sql   (o pegarlo en pgAdmin)
--  Recomendado:  ALTER DATABASE invernadero SET timezone TO 'America/Mexico_City';
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS inv;
COMMENT ON SCHEMA inv IS 'Invernadero inteligente de albahaca (1.00 m x 0.60 m)';

-- =============================================================================
-- 1. INSTALACIÓN FÍSICA
-- =============================================================================

CREATE TABLE inv.cultivo (
    id                smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo            varchar(40)  NOT NULL UNIQUE,   -- valor de "cultivo" en el JSON
    nombre_comun      varchar(80)  NOT NULL,
    nombre_cientifico varchar(120),
    notas             text
);

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

CREATE TABLE inv.nodo (
    id               smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo           varchar(60) NOT NULL UNIQUE,     -- "nodo_id" del JSON
    invernadero_id   smallint    NOT NULL REFERENCES inv.invernadero(id),
    placa            varchar(60) NOT NULL DEFAULT 'esp32doit-devkit-v1',
    firmware_version varchar(20),
    topic_telemetria varchar(120),                    -- ESP32 → broker
    topic_comandos   varchar(120),                    -- broker → ESP32
    intervalo_ms     integer     NOT NULL DEFAULT 5000 CHECK (intervalo_ms > 0),
    ultima_conexion  timestamptz,                     -- la actualiza la ingesta
    activo           boolean     NOT NULL DEFAULT true
);
COMMENT ON TABLE inv.nodo IS 'Cada ESP32. Un paquete con un nodo_id que no esté aquí se guarda pero no se procesa.';

-- =============================================================================
-- 2. CATÁLOGO DE SENSORES (lo mantiene Hardware e IoT)
-- =============================================================================

CREATE TABLE inv.tipo_sensor (
    id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    modelo      varchar(30) NOT NULL UNIQUE,          -- "tipo" en el JSON
    clave_json  varchar(40) NOT NULL UNIQUE,          -- bloque dentro de "sensores"
    es_arreglo  boolean     NOT NULL DEFAULT false,   -- true = el bloque es una lista (suelo_superficie)
    protocolo   varchar(60) NOT NULL,
    libreria    varchar(120),
    descripcion text
);

CREATE TABLE inv.variable (
    id         smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo     varchar(40) NOT NULL UNIQUE,
    nombre     varchar(80) NOT NULL,
    unidad     varchar(10) NOT NULL,
    rango_min  numeric(10,2),   -- límite FÍSICO del sensor: fuera de él la lectura es falla de hardware
    rango_max  numeric(10,2)
);

-- Qué variables mide cada tipo de sensor y con qué llave(s) llegan en el JSON.
-- Se aceptan varios nombres porque el documento usa nombres distintos en cada sección
-- (ej. humedad_pct vs humedad_relativa_pct). Gana el primero que venga en el JSON.
CREATE TABLE inv.tipo_sensor_variable (
    tipo_sensor_id smallint NOT NULL REFERENCES inv.tipo_sensor(id),
    variable_id    smallint NOT NULL REFERENCES inv.variable(id),
    campos_json    text[]   NOT NULL CHECK (cardinality(campos_json) > 0),
    PRIMARY KEY (tipo_sensor_id, variable_id)
);

CREATE TABLE inv.sensor (
    id              smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id         smallint    NOT NULL REFERENCES inv.nodo(id),
    tipo_sensor_id  smallint    NOT NULL REFERENCES inv.tipo_sensor(id),
    indice          smallint    NOT NULL DEFAULT 1 CHECK (indice > 0),  -- "id" dentro de suelo_superficie (1..3)
    nombre          varchar(80) NOT NULL,
    pines           varchar(60) NOT NULL,
    gpio_principal  smallint,                                          -- "pin" del JSON en suelo_superficie
    ubicacion       varchar(120),
    calibracion     jsonb       NOT NULL DEFAULT '{}'::jsonb,          -- constantes del firmware
    activo          boolean     NOT NULL DEFAULT true,
    instalado_en    date        DEFAULT current_date,
    UNIQUE (nodo_id, tipo_sensor_id, indice)
);

-- Todos los valores de "estado" que manda el firmware, clasificados.
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

-- Rangos agronómicos por cultivo (para la app, automatización e IA).
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

-- =============================================================================
-- 3. USUARIOS (App web y móvil)
-- =============================================================================

CREATE TABLE inv.usuario (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         varchar(100) NOT NULL,
    email          varchar(150) NOT NULL,
    password_hash  varchar(255) NOT NULL,   -- bcrypt/argon2 generado por el backend; nunca texto plano
    rol            varchar(15)  NOT NULL DEFAULT 'LECTOR'
                   CHECK (rol IN ('ADMIN','OPERADOR','LECTOR')),
    activo         boolean      NOT NULL DEFAULT true,
    creado_en      timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_email ON inv.usuario (lower(email));

-- =============================================================================
-- 4. TELEMETRÍA (la llena Conectividad vía inv.fn_ingestar_paquete)
-- =============================================================================

CREATE TABLE inv.paquete (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id             smallint REFERENCES inv.nodo(id),
    nodo_codigo         varchar(60),            -- lo que vino en "nodo_id", aunque no exista
    topic               varchar(160),
    recibido_en         timestamptz NOT NULL DEFAULT now(),
    ts_dispositivo      timestamptz,            -- solo si el JSON trae "timestamp" (el firmware actual no)
    estado_general      varchar(40),            -- solo si el JSON lo trae
    payload             jsonb,                  -- JSON crudo; se puede poner en NULL para ahorrar espacio
    procesado           boolean NOT NULL DEFAULT false,
    error_procesamiento text                    -- avisos de la ingesta (nodo desconocido, sensor faltante…)
);
CREATE INDEX ix_paquete_nodo_t  ON inv.paquete (nodo_id, recibido_en DESC);
CREATE INDEX ix_paquete_t       ON inv.paquete (recibido_en);
CREATE INDEX ix_paquete_errores ON inv.paquete (recibido_en) WHERE error_procesamiento IS NOT NULL;

CREATE TABLE inv.medicion (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paquete_id   bigint      NOT NULL REFERENCES inv.paquete(id) ON DELETE CASCADE,
    sensor_id    smallint    NOT NULL REFERENCES inv.sensor(id),
    variable_id  smallint    NOT NULL REFERENCES inv.variable(id),
    tomado_en    timestamptz NOT NULL,          -- = paquete.recibido_en (hora del servidor)
    valor        numeric(10,2),
    estado       varchar(60) NOT NULL REFERENCES inv.estado_sensor(codigo),
    valido       boolean     NOT NULL,          -- false = no usar en gráficas, promedios ni IA
    UNIQUE (paquete_id, sensor_id, variable_id)
);
CREATE INDEX ix_medicion_sensor_var_t ON inv.medicion (sensor_id, variable_id, tomado_en DESC);
CREATE INDEX ix_medicion_t_brin       ON inv.medicion USING brin (tomado_en);
COMMENT ON TABLE inv.medicion IS
  '~9 filas por paquete (2 DHT22 + 1 BH1750 + 1 DS18B20 + 2 HC-SR04 + 3 capacitivos) ≈ 155 mil filas/día a 5 s.';

CREATE TABLE inv.alerta (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id         smallint    NOT NULL REFERENCES inv.nodo(id),
    sensor_id       smallint    NOT NULL REFERENCES inv.sensor(id),
    estado          varchar(60) NOT NULL REFERENCES inv.estado_sensor(codigo),
    categoria       varchar(15) NOT NULL,
    mensaje         varchar(250),
    abierta_en      timestamptz NOT NULL DEFAULT now(),
    ultima_vez_en   timestamptz NOT NULL DEFAULT now(),
    ocurrencias     integer     NOT NULL DEFAULT 1,   -- cuántos paquetes seguidos la repitieron
    resuelta_en     timestamptz,                      -- NULL = sigue activa
    reconocida_por  integer REFERENCES inv.usuario(id),
    reconocida_en   timestamptz
);
-- Una sola alerta abierta por sensor y estado (evita 720 alertas por hora).
CREATE UNIQUE INDEX ux_alerta_abierta ON inv.alerta (sensor_id, estado) WHERE resuelta_en IS NULL;
CREATE INDEX ix_alerta_nodo_abiertas  ON inv.alerta (nodo_id) WHERE resuelta_en IS NULL;

-- =============================================================================
-- 5. AUTOMATIZACIÓN E IA
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
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (nodo_id, codigo)
);

-- Regla simple: "cuando un sensor reporte ESTADO X → hacer ACCIÓN en el actuador".
-- El equipo de Automatización decide si las ejecuta su servicio o la IA.
CREATE TABLE inv.regla_automatizacion (
    id                smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            varchar(100) NOT NULL,
    estado_disparador varchar(60)  NOT NULL REFERENCES inv.estado_sensor(codigo),
    actuador_id       smallint     NOT NULL REFERENCES inv.actuador(id),
    accion            varchar(10)  NOT NULL CHECK (accion IN ('ENCENDER','APAGAR')),
    duracion_s        integer      CHECK (duracion_s > 0),        -- NULL = hasta nueva orden
    espera_s          integer      NOT NULL DEFAULT 300 CHECK (espera_s >= 0), -- tiempo mínimo entre ejecuciones
    prioridad         smallint     NOT NULL DEFAULT 10,           -- menor = más importante (seguridad primero)
    activa            boolean      NOT NULL DEFAULT true
);

CREATE TABLE inv.comando_actuador (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actuador_id   smallint    NOT NULL REFERENCES inv.actuador(id),
    accion        varchar(10) NOT NULL CHECK (accion IN ('ENCENDER','APAGAR')),
    duracion_s    integer     CHECK (duracion_s > 0),
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

CREATE TABLE inv.prediccion_ia (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nodo_id      smallint    NOT NULL REFERENCES inv.nodo(id),
    variable_id  smallint    REFERENCES inv.variable(id),
    modelo       varchar(60) NOT NULL,             -- nombre + versión del modelo
    tipo         varchar(20) NOT NULL
                 CHECK (tipo IN ('PRONOSTICO','ANOMALIA','RECOMENDACION','CLASIFICACION')),
    generado_en  timestamptz NOT NULL DEFAULT now(),
    objetivo_en  timestamptz,                      -- momento al que se refiere el pronóstico
    valor        numeric(10,2),
    confianza    numeric(4,3) CHECK (confianza BETWEEN 0 AND 1),
    detalle      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_prediccion_nodo_t ON inv.prediccion_ia (nodo_id, generado_en DESC);

-- =============================================================================
-- 6. FUNCIONES
-- =============================================================================

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
-- Conectividad la llama por cada mensaje MQTT:
--     SELECT inv.fn_ingestar_paquete($1::jsonb, $2);   -- $1 = payload, $2 = topic
-- Devuelve el id del paquete. Nunca rechaza un JSON válido: si algo no cuadra,
-- lo guarda igual y deja el motivo en paquete.error_procesamiento.
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
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'El payload debe ser un objeto JSON';
    END IF;

    v_codigo := p_payload ->> 'nodo_id';
    v_s      := p_payload -> 'sensores';

    BEGIN   -- "timestamp" es opcional; si viene mal formado se ignora
        v_ts_disp := (p_payload ->> 'timestamp')::timestamptz;
    EXCEPTION WHEN others THEN
        v_ts_disp := NULL;
    END;

    SELECT id INTO v_nodo_id FROM inv.nodo WHERE codigo = v_codigo AND activo;

    INSERT INTO inv.paquete (nodo_id, nodo_codigo, topic, recibido_en, ts_dispositivo, estado_general, payload)
    VALUES (v_nodo_id, left(v_codigo, 60), left(p_topic, 160), p_recibido_en, v_ts_disp,
            left(p_payload ->> 'estado_general', 40), p_payload)
    RETURNING id INTO v_paquete_id;

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

-- Avisos en tiempo real con LISTEN/NOTIFY (evita que los servicios hagan polling)
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

-- =============================================================================
-- 7. VISTAS
-- =============================================================================

-- Tablero en vivo: último valor de cada sensor/variable + evaluación contra umbrales
CREATE VIEW inv.v_ultima_medicion AS
SELECT n.codigo      AS nodo,
       s.id          AS sensor_id,
       s.nombre      AS sensor,
       ts.modelo,
       s.indice,
       v.codigo      AS variable,
       v.unidad,
       u.valor,
       u.valido,
       u.estado,
       e.categoria,
       u.tomado_en,
       CASE
           WHEN NOT u.valido THEN 'SIN_DATO_VALIDO'
           WHEN (um.min_critico IS NOT NULL AND u.valor <= um.min_critico)
             OR (um.max_critico IS NOT NULL AND u.valor >= um.max_critico) THEN 'CRITICO'
           WHEN (um.min_optimo IS NOT NULL AND u.valor < um.min_optimo)
             OR (um.max_optimo IS NOT NULL AND u.valor > um.max_optimo)   THEN 'FUERA_DE_OPTIMO'
           WHEN um.id IS NULL THEN 'SIN_UMBRAL'
           ELSE 'OPTIMO'
       END AS evaluacion
  FROM inv.sensor s
  JOIN inv.nodo n                  ON n.id = s.nodo_id
  JOIN inv.invernadero i           ON i.id = n.invernadero_id
  JOIN inv.tipo_sensor ts          ON ts.id = s.tipo_sensor_id
  JOIN inv.tipo_sensor_variable tv ON tv.tipo_sensor_id = s.tipo_sensor_id
  JOIN inv.variable v              ON v.id = tv.variable_id
  JOIN LATERAL (
        SELECT m.valor, m.valido, m.estado, m.tomado_en
          FROM inv.medicion m
         WHERE m.sensor_id = s.id AND m.variable_id = v.id
         ORDER BY m.tomado_en DESC
         LIMIT 1
  ) u ON true
  JOIN inv.estado_sensor e         ON e.codigo = u.estado
  LEFT JOIN inv.umbral um          ON um.cultivo_id = i.cultivo_id AND um.variable_id = v.id
 WHERE s.activo
 ORDER BY n.codigo, ts.id, s.indice, v.id;

-- Alertas activas, las críticas primero
CREATE VIEW inv.v_alertas_activas AS
SELECT a.id,
       n.codigo   AS nodo,
       s.nombre   AS sensor,
       a.estado,
       a.categoria,
       a.mensaje,
       e.accion_sugerida,
       a.abierta_en,
       a.ultima_vez_en,
       a.ocurrencias,
       (a.reconocida_en IS NOT NULL) AS reconocida
  FROM inv.alerta a
  JOIN inv.nodo n          ON n.id = a.nodo_id
  JOIN inv.sensor s        ON s.id = a.sensor_id
  JOIN inv.estado_sensor e ON e.codigo = a.estado
 WHERE a.resuelta_en IS NULL
 ORDER BY CASE a.categoria WHEN 'CRITICO' THEN 1 WHEN 'ERROR_HW' THEN 2 ELSE 3 END, a.abierta_en;

-- ¿El ESP32 está en línea? (se considera caído si faltan 3 paquetes seguidos)
CREATE VIEW inv.v_estado_nodo AS
SELECT n.id,
       n.codigo,
       i.nombre        AS invernadero,
       c.nombre_comun  AS cultivo,
       n.ultima_conexion,
       (n.ultima_conexion IS NOT NULL
        AND now() - n.ultima_conexion <= n.intervalo_ms * 3 * interval '1 millisecond') AS en_linea,
       (SELECT count(*) FROM inv.alerta a
         WHERE a.nodo_id = n.id AND a.resuelta_en IS NULL) AS alertas_abiertas
  FROM inv.nodo n
  JOIN inv.invernadero i ON i.id = n.invernadero_id
  LEFT JOIN inv.cultivo c ON c.id = i.cultivo_id
 WHERE n.activo;

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

-- =============================================================================
-- 8. DATOS INICIALES (sacados del documento de integración)
-- =============================================================================

INSERT INTO inv.cultivo (codigo, nombre_comun, nombre_cientifico)
VALUES ('albahaca', 'Albahaca', 'Ocimum basilicum');

INSERT INTO inv.invernadero (nombre, largo_cm, ancho_cm, cultivo_id)
SELECT 'Invernadero Albahaca 01', 100, 60, id FROM inv.cultivo WHERE codigo = 'albahaca';

INSERT INTO inv.nodo (codigo, invernadero_id, placa, firmware_version, topic_telemetria, topic_comandos, intervalo_ms)
SELECT 'invernadero_albahaca_01', id, 'esp32doit-devkit-v1', '1.0',
       'invernadero/albahaca_01/telemetria', 'invernadero/albahaca_01/comandos', 5000
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

INSERT INTO inv.variable (codigo, nombre, unidad, rango_min, rango_max) VALUES
 ('temperatura_aire',  'Temperatura del aire',               '°C',  -40,   80),
 ('humedad_aire',      'Humedad relativa del aire',          '%',     0,  100),
 ('iluminancia',       'Iluminancia',                        'lx',    0, 65535),
 ('temperatura_suelo', 'Temperatura del suelo (raíz)',       '°C',  -55,  125),
 ('distancia_agua',    'Distancia sensor–superficie agua',   'cm',    2,  400),
 ('nivel_tanque',      'Nivel de llenado del tanque',        '%',     0,  100),
 ('humedad_suelo',     'Humedad del sustrato (superficie)',  '%',     0,  100);

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

-- =============================================================================
-- 9. ROLES POR EQUIPO (opcional: requiere permiso CREATEROLE; en AWS RDS lo tiene el usuario maestro)
--    Va fuera de la transacción para que, si falla, el esquema ya quede creado.
-- =============================================================================

DO $$
DECLARE
    r text;
BEGIN
    FOREACH r IN ARRAY ARRAY['rol_hardware','rol_conectividad','rol_backend','rol_automatizacion','rol_app'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA inv TO rol_hardware, rol_conectividad, rol_backend, rol_automatizacion, rol_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA inv FROM PUBLIC;

-- BD y Backend: todo
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA inv TO rol_backend;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA inv TO rol_backend;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA inv TO rol_backend;

-- Lectura general (sin hashes de contraseña)
GRANT SELECT ON ALL TABLES IN SCHEMA inv TO rol_hardware, rol_automatizacion, rol_app;
REVOKE SELECT ON inv.usuario FROM rol_hardware, rol_automatizacion, rol_app;
GRANT SELECT (id, nombre, email, rol, activo) ON inv.usuario TO rol_app;
GRANT EXECUTE ON FUNCTION inv.fn_historico(text, text, timestamptz, timestamptz, interval)
      TO rol_hardware, rol_automatizacion, rol_app;

-- Hardware e IoT: mantiene el catálogo físico
GRANT INSERT, UPDATE ON inv.nodo, inv.tipo_sensor, inv.variable, inv.tipo_sensor_variable,
                        inv.sensor, inv.actuador TO rol_hardware;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA inv TO rol_hardware;

-- Conectividad: solo puede meter telemetría por la función y despachar comandos
GRANT EXECUTE ON FUNCTION inv.fn_ingestar_paquete(jsonb, text, timestamptz) TO rol_conectividad;
GRANT SELECT ON inv.nodo, inv.actuador, inv.comando_actuador TO rol_conectividad;
GRANT UPDATE (estado, enviado_en, confirmado_en) ON inv.comando_actuador TO rol_conectividad;

-- Automatización (incluye la parte de IA)
GRANT INSERT, UPDATE ON inv.regla_automatizacion, inv.umbral, inv.estado_sensor TO rol_automatizacion;
GRANT UPDATE (modo, encendido, actualizado_en) ON inv.actuador TO rol_automatizacion;
GRANT INSERT ON inv.comando_actuador, inv.prediccion_ia TO rol_automatizacion;
GRANT UPDATE (estado) ON inv.comando_actuador TO rol_automatizacion;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA inv TO rol_automatizacion;

-- App web y móvil: lectura + comandos manuales + reconocer alertas
GRANT INSERT ON inv.comando_actuador TO rol_app;
GRANT UPDATE (reconocida_por, reconocida_en) ON inv.alerta TO rol_app;
GRANT UPDATE (modo) ON inv.actuador TO rol_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA inv TO rol_app;

-- Crear el usuario real de cada equipo (cambiar contraseñas):
-- CREATE ROLE eq_hardware       LOGIN PASSWORD 'cambia-esta-clave' IN ROLE rol_hardware;
-- CREATE ROLE eq_conectividad   LOGIN PASSWORD 'cambia-esta-clave' IN ROLE rol_conectividad;
-- CREATE ROLE eq_backend        LOGIN PASSWORD 'cambia-esta-clave' IN ROLE rol_backend;
-- CREATE ROLE eq_automatizacion LOGIN PASSWORD 'cambia-esta-clave' IN ROLE rol_automatizacion;
-- CREATE ROLE eq_app            LOGIN PASSWORD 'cambia-esta-clave' IN ROLE rol_app;

-- Mantenimiento sugerido (el JSON crudo ocupa ~17 MB/día):
-- UPDATE inv.paquete SET payload = NULL WHERE recibido_en < now() - interval '30 days';
