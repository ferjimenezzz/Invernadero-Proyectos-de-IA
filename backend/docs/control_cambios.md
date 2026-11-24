# Control de cambios del modelo

El modelo de datos se congeló en el hito **H2** con el esquema `bd/invernadero_bd.sql` tal como lo recibió el equipo (commit `205a7ed`, 17 tablas y 4 vistas). Este documento registra cada cambio posterior, de acuerdo con el control de cambios de la metodología (Reporte Unidad I). La lista sale de `git diff 205a7ed -- backend/bd/invernadero_bd.sql` y del archivo nuevo `backend/bd/supabase.sql`.

- **Fechas de los cambios:** 17, 22, 23 y 24 de noviembre de 2026.
- **Estado de aprobación de todos los cambios: pendiente de revisión del equipo.** Ninguno ha sido aprobado formalmente; se aplicaron para que el modelo cumpla lo que piden las apps del repositorio, Supabase y los criterios de seguridad.
- Resultado: 18 tablas y 6 vistas. El esquema corre completo y pasa sus pruebas en un PostgreSQL 18 temporal (ver [`casos_prueba.md`](casos_prueba.md)). El 23 nov se instaló sin errores en el proyecto Supabase del equipo.

## 1. Cambios al esquema (`invernadero_bd.sql`)

| # | Cambio | Por qué | Motivo | Estado |
|---|---|---|---|---|
| C-01 | Tabla nueva **`actividad`** (tipo, cantero, programada_en, responsable jsonb, descripcion ≥ 10 caracteres, estado, fotos jsonb, creado_por) con índice por fecha | La app móvil tiene una pantalla de bitácora/agenda (`GET`/`POST /actividades`) sin tabla donde guardarla | Requisito del repo (app móvil) | Pendiente de revisión |
| C-02 | **`variable.prefijo_dispositivo`** `NOT NULL` y su dato inicial (`ENV-`, `HUM-`, `LUX-`, `TEMP-S`, `DIST-`, `TANK-`, `SOIL-`) | Los códigos `SENS-ENV-01`... están fijos en la app móvil; se derivan de la BD en vez de escribirse en el adaptador | Requisito del repo (app móvil) | Pendiente de revisión |
| C-03 | **`usuario`**: se elimina `password_hash`; se agrega `auth_id uuid UNIQUE`; el `CHECK` de `rol` pasa de 3 a 6 valores (+ AUTOMATIZACION, CONECTIVIDAD, HARDWARE) | Supabase Auth guarda las contraseñas (bcrypt) en `auth.users`; `inv.usuario` queda como perfil y rol. Cada equipo necesita su propio rol. Sin FK a `auth.users` para poder restaurar `inv` en cualquier PostgreSQL | Supabase / seguridad | Pendiente de revisión |
| C-04 | **`paquete`**: `UNIQUE (nodo_codigo, recibido_en)`; `nodo_codigo` guarda el valor completo recibido (recortado a 60 en la función) | Idempotencia: los reintentos del búfer local y los duplicados de QoS 1 no deben duplicar lecturas | Requisito del plan (actividad G, búfer sin conexión) | Pendiente de revisión |
| C-05 | **`actuador.valor`** y **`comando_actuador.valor`** (`smallint`, 0–100) | La app móvil manda PWM (luces) y nivel (ventilador); sin esta columna el nivel se perdía | Requisito del repo (app móvil y web: `power_pct`, `SET_SPEED`) | Pendiente de revisión |
| C-06 | **`fn_ingestar_paquete`**: un mensaje que no es objeto JSON (o es nulo) ya no lanza excepción; se guarda como evidencia con su error. Reintento idempotente que devuelve el id existente | Criterio H4: un mensaje inválido no se guarda como lectura válida **y su error queda registrado** (con la excepción, el error no quedaba en la BD) | Requisito del plan (H4) | Pendiente de revisión |
| C-07 | Funciones nuevas: `fn_codigo_dispositivo`, `fn_codigo_sensor`, `fn_estadistica`, `fn_detener_todo`, `fn_calibrar_sensor`, `fn_purgar_payload`; marcadores `fn_usuario_actual` y `fn_rol_actual` (los reemplaza `supabase.sql`) | Códigos de dispositivo de las apps; estadística mínimo/promedio/máximo del detalle de sensor; paro de emergencia y calibración de la app; retención de 7 días; permisos por usuario | Requisito del repo + Supabase | Pendiente de revisión |
| C-08 | Triggers nuevos: `tg_comando_confirmado` (al confirmar, el actuador refleja el estado real; `SECURITY DEFINER` para que Conectividad no necesite escribir en `actuador`) y `tg_comando_duracion` (un ENCENDER manual sin duración toma la de la regla de encendido activa) | Estado real del actuador para la app; evitar una bomba encendida sin límite por riego manual (hallazgo 6.2 del análisis) | Seguridad / requisito de la app | Pendiente de revisión |
| C-09 | **`v_ultima_medicion`** ampliada: columnas `codigo`, `variable_id`, `modelo`, `pines`, `indice`, `zona`, `variable_nombre`, `rango_min/max`, `estado_descripcion`, `accion_sugerida`, umbrales y `tendencia` (≤ 12 valores válidos); `LEFT JOIN` para mostrar sensores sin lecturas (`SIN_LECTURA`) y evaluación `SIN_DATO_VALIDO` | La app móvil necesita un renglón por dispositivo aunque no haya datos, con tendencia y umbrales | Requisito del repo (app móvil) | Pendiente de revisión |
| C-10 | **`v_alertas_activas`**: + `sensor_id` y `codigo`. **`v_estado_nodo`**: + `firmware_version`, `topic_telemetria`, `intervalo_ms` | Notificaciones ligadas al dispositivo; pantalla de red y detalle de sensor | Requisito del repo (app móvil) | Pendiente de revisión |
| C-11 | Vistas nuevas **`v_lectura`** (histórico en formato largo con código y zona) y **`v_bitacora`** (telemetría + comandos + alertas) | Filtros por sensor, zona y fecha (H5, actividad I); página de auditoría de la web (`/api/v1/audit/logs`) | Requisito del plan + repo (app web) | Pendiente de revisión |
| C-12 | **`COMMENT ON`** en todas las tablas, vistas y columnas, y comentarios `--` de columna eliminados | Diccionario de datos generado automáticamente (E1): cada campo con tipo, significado, unidad, nulabilidad y clave | Requisito del plan (E1) | Pendiente de revisión |
| C-13 | Se elimina la **sección 9 de roles `rol_*`** (`rol_hardware`, `rol_conectividad`, `rol_backend`, `rol_automatizacion`, `rol_app`) | Supabase usa `anon`, `authenticated` y `service_role`; los permisos se reexpresan como RLS (archivo nuevo `supabase.sql`) | Supabase / seguridad | Pendiente de revisión |
| C-14 | Retención del JSON crudo: de **30 a 7 días** (comentario y `fn_purgar_payload(7)`) | El plan de la Unidad III fija 7 días por el límite de 500 MB del plan Free | Requisito del plan | Pendiente de revisión |
| C-15 | Motor mínimo de PostgreSQL 14 a **15** | Vistas `security_invoker` (PostgreSQL 15) | Seguridad (las vistas deben respetar RLS de quien consulta) | Pendiente de revisión |
| C-16 | Cabecera: el flujo describe al **suscriptor MQTT de este equipo** (no el "puente de Conectividad") y la zona horaria se resuelve con `timestamptz` y conversión al consultar (se quita la recomendación `ALTER DATABASE ... SET timezone`) | El plan asigna el suscriptor a BD y Backend (F y G); `ALTER DATABASE` puede no estar permitido en Supabase | Supabase / requisito del plan | Pendiente de revisión |
| C-17 | Seed: `nodo.topic_telemetria` pasa de `invernadero/albahaca_01/telemetria` a **`invernadero/albahaca/invernadero_albahaca_01/telemetria`** (también en el proyecto Supabase con un `UPDATE`, y como valor por omisión del suscriptor y del simulador) | Es el topic que Conectividad configuró en su broker (23 nov) | Acuerdo con otro equipo | Pendiente de revisión |
| C-18 | Seed del catálogo físico: DS18B20 de GPIO 5 a **GPIO 14**; TRIG del HC-SR04 de GPIO 19 a **GPIO 5** (ECHO sigue en 18), con los textos de `estado_sensor` que nombran esos pines; `bomba_riego.pin` = **GPIO 26 (IN1)**; actuador nuevo **`calefactor_01`** (CALEFACTOR, manta de 14 W a 127 V CA, GPIO 27, IN2). También en el proyecto Supabase | Documento de Hardware del 24 nov con los pines oficiales y el segundo canal del relevador | Acuerdo con otro equipo | Pendiente de revisión |

Sin cambios respecto de lo congelado: tablas del catálogo y control (`cultivo`, `invernadero`, `nodo`, `tipo_sensor`, `tipo_sensor_variable`, `sensor`, `estado_sensor`, `umbral`, `medicion`, `alerta`, `regla_automatizacion`, `prediccion_ia`), `fn_historico`, `v_dataset_ia`, los triggers `pg_notify`, y los datos iniciales de umbrales y reglas (los de nodo, sensores, estados y actuadores cambiaron en C-17 y C-18).

## 2. Archivo nuevo: `bd/supabase.sql` (permisos, RLS y Realtime)

No altera tablas; agrega la capa de seguridad que pide Supabase. Contenido:
- `fn_usuario_actual()` / `fn_rol_actual()` reales (por `auth.uid()`), y trigger `tr_crear_perfil_inv` en `auth.users` que crea el perfil `LECTOR` de cada cuenta nueva.
- Vistas `security_invoker`; `REVOKE` de todo a `PUBLIC`, `anon` y `authenticated`, y `GRANT` mínimos (lectura general sin la columna `email`; escrituras por columna).
- RLS en todas las tablas: lectura para `authenticated`; escritura según la matriz por rol (OPERADOR, AUTOMATIZACION, CONECTIVIDAD, HARDWARE, ADMIN, LECTOR solo lee). La matriz está en [`API.md`](API.md) §B.6 y se prueba en `bd/pruebas/pruebas_rls.sql`.
- Publicación `supabase_realtime` con `alerta` y `comando_actuador`.
- Purga diaria con `pg_cron` (09:00 UTC = 03:00 en America/Mexico_City), con aviso si la extensión no está disponible.

Motivo: Supabase / seguridad (las llaves y la `service_role` nunca van a un front; el suscriptor es el único que usa `service_role`). Estado: pendiente de revisión del equipo.

## 3. Decisiones técnicas

| # | Decisión | Alternativa original | Razón |
|---|---|---|---|
| D-01 | **Adaptador Express** (puerto 3000) con las rutas en español de la app móvil y `/api/v1` de la web, además de PostgREST | "No se va a programar un servidor Express aparte, salvo que haga falta para algo puntual" (Unidad III) | Es la excepción prevista en el plan: las apps del repo piden rutas y formatos que PostgREST no ofrece (textos listos para mostrar, sobre `{status, timestamp}`, traducción de comandos, códigos de dispositivo). Los demás equipos siguen pudiendo usar PostgREST directo. |
| D-02 | **PostgreSQL 18** para la restauración local | PostgreSQL 16 | Es el que está instalado; un volcado de `pg_dump` 18 puede no entrar en un servidor 16. La restauración se comprueba comparando filas por tabla. |
| D-03 | **Retención de 7 días** del JSON crudo (`paquete.payload`); las mediciones se conservan | 30 días (script original) | Límite de 500 MB del plan Free: el JSON crudo es ~17 MB/día. Umbral de alerta al 80 % (400 MB). |
| D-04 | Los roles de base de datos **`rol_*` se sustituyen por `inv.usuario.rol` + RLS** | Cinco roles `NOLOGIN` por equipo con `GRANT` | En Supabase se entra por Auth/PostgREST con `authenticated`; la identidad y el rol salen del perfil del usuario. Cada equipo recibe una cuenta (`eq-app`, `eq-automatizacion`, `eq-conectividad`, `eq-hardware`) con su rol. |
| D-05 | Cada equipo usa **su propio proyecto Supabase** (decidido el 22 nov) | Compartir el proyecto de otra persona con un esquema propio | Se descartó el proyecto compartido; el SQL se mantiene tal como se diseñó (trigger en `auth.users`, `service_role` solo en el suscriptor, `pg_cron`). |
| D-06 | La hora de la lectura es la **hora de recepción del suscriptor** (`recibido_en`); el `timestamp` del dispositivo es opcional y solo se guarda aparte | Confiar en el `timestamp` del JSON | El firmware real no lo manda y el ESP32 podría no tener reloj sincronizado. |
| D-07 | **Búfer JSONL local** en el suscriptor para cortes de internet | Perder lecturas durante el corte | Requisito del plan (actividad G); con el `recibido_en` original e idempotencia en la BD. |
| D-08 | La API acepta peticiones **sin token** (actúa la cuenta de equipo OPERADOR) | Exigir `Authorization` en todo | La app móvil del repo todavía no manda token. Riesgo conocido y **pendiente de decisión** (`inconsistencias.md` §6.1). |

## 4. Cambios del código fuera del modelo (referencia)

No cambian el modelo de datos pero afectan los contratos; están en `inconsistencias.md` §6 (duración del riego manual, traducción de errores PGRST, filtros de fecha y tipos de `/audit/logs`, código principal de sensor, `PGPASSWORD` en lugar de argumentos, `engines` Node ≥ 22). Desde el 24 nov, `PUT /api/v1/sensors/calibration` guarda la calibración como propuesta (`propuesta_calibracion`) en lugar de sobrescribir `aire_crudo` y `agua_crudo`, porque Hardware decidió que el firmware no lee la base.
