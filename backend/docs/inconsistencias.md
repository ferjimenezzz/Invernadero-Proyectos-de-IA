# Análisis del repositorio e inconsistencias

**Fecha:** 22 nov 2026. Lo preparó el equipo de BD y Backend.

**Base analizada:**
- `origin/main` en el commit `4c1124d`. No ha cambiado desde el 16 nov y no hay PRs, issues, forks ni otras ramas.
- Nuestro trabajo está en la rama local `backend-bd`, que todavía no se sube.

**Método:**
- Se leyó completo `app web/` y `app móvil/`.
- Se cruzó con `backend/` y con los documentos del equipo (reportes U-I, U-II, U-III, RH y el documento del ESP32).
- Regla de prioridad: **lo que pide el repo manda sobre los documentos**. La excepción es el texto de maqueta escrito por un equipo sobre datos que son de otro.
- Clases de hallazgo: **B** = bloqueante, **I** = importante, **M** = menor.

## 1. Estado del repositorio

| Carpeta | Autor | Qué hay | Real o maqueta |
|---|---|---|---|
| `app web/` | ferjimenezzz (10–12 nov) | 7 páginas PHP, `assets/js/app.js`, `config/api-contracts.php` | **Maqueta total.** No hace ni una llamada de red. `api-contracts.php` no lo carga ninguna página. El login es falso: los formularios hacen GET a `dashboard.php`. |
| `app móvil/` | jimelino (16 nov) | Expo + TypeScript, 11 pantallas, `src/services/api.ts` | UI completa. Llama a la API solo si existe `EXPO_PUBLIC_API_URL`, y aun así mucha información sigue siendo mock (§2.2). |
| `sensores/` | ferjimenezzz | `hola, sensores` (vacío) | No hay firmware. |
| `backend/` | equipo BD y Backend | SQL con RLS, suscriptor MQTT, adaptador Express, scripts y pruebas | Código real. 33 pruebas unitarias en verde con datos falsos. **Nunca se ha corrido contra PostgreSQL ni Supabase.** |

**Lo que falta de los otros equipos:**
- **Hardware:**
  - El firmware en el repo. El del documento solo escribe por el puerto serie, no por MQTT.
  - El pin de la bomba.
  - Cómo recibe el ESP32 los comandos y la calibración.
- **Conectividad:**
  - Broker, puerto y credenciales.
  - Confirmar los topics.
  - **El despachador que lleva `comando_actuador` al ESP32.** Sin él, todo comando se queda en PENDIENTE.
- **Automatización:** el motor de reglas, la IA y los umbrales de aire.
- **Aplicación:** que la web llame a la API, y los ajustes de §2.3.

## 2. App móvil ↔ backend

### 2.1 Contrato

Las 19 llamadas de `api.ts` y `homeService.ts` tienen ruta en `backend/src/api/movil.js` con el mismo método y la misma ruta.
- Los cuerpos y las respuestas cumplen los tipos de `src/types/*.ts`: campos obligatorios, enums, número o texto e íconos.
- Las rutas responden 200 con JSON o 204 sin cuerpo, que es lo que espera `request()` en `api.ts:36-37`.
- Todo lo que consulta `datos.js` existe en el SQL, y RLS se lo permite a la cuenta de equipo OPERADOR.
- **No hay bloqueantes de código.**

Bloqueantes de configuración, para cuando se conecte:

| # | Qué | Clase |
|---|---|---|
| 1 | Exponer el esquema `inv` en Supabase. Sin eso PostgREST responde PGRST106. Hoy ese error sale como "400 Datos inválidos" y sin log (§6). | B |
| 2 | Instalar el SQL y correr `npm run usuarios` para crear la cuenta `eq-app` (OPERADOR). Sin ella las rutas de datos responden 503. | B |
| 3 | `EXPO_PUBLIC_API_URL=http://IP:3000` sin `/` al final y sin `/api`, porque la app concatena tal cual. Después reiniciar con `expo start -c`. | B |
| 4 | Un APK o IPA de release bloquea `http://` hacia una IP local. Con Expo Go sí funciona. | I |

### 2.2 Lo que sigue siendo mock en la app aunque haya API

- **Encabezado:** la campana siempre muestra 2 (`mockNotifications`) y "Conectado" está fijo.
- **Inicio:** hero, tarjeta de estado (5/5 sensores, 1 alerta), estado y nota de cada métrica, sustrato y riego manual. Si la API manda `null`, **se muestra el valor mock como si fuera real** (`homeService.ts:25`).
- **Detalle de sensor:** el selector de rango no hace nada y el CSV es solo un aviso.
- **Actividades:**
  - El filtro ALBAHACA/ROMERO/MENTA busca en `location` y siempre queda vacío.
  - "Marcar completada" solo cambia la vista local.
  - Los canteros y responsables son mock.
- **Notificaciones:** la tarjeta "Microclima Estable" está fija y "leído" se guarda solo en el teléfono.
- **Conectividad:** el selector demo/real y "AgroCloud" son locales.

### 2.3 Riesgos en la app (código del equipo de Aplicación)

| Riesgo | Dónde | Clase |
|---|---|---|
| **Riego manual:** cada refresco de 30 s vuelve a poner `irrigating=false` desde el mock. El botón regresa a "Activar" con la bomba encendida y el siguiente toque manda ENCENDER otra vez. Junto con §6.2, **la bomba puede quedar prendida**. | `home/HomeScreen.tsx:32-34`, `homeService.ts:21-27` | I |
| El riego manual no revisa `res.ok`, así que un 404 o 503 se toma como éxito. | `homeService.ts:37-41` | I |
| La fecha de una actividad se calcula con `toISOString` (UTC). Después de las 18:00 en CDMX, "Hoy" se guarda como mañana. | `NewActivityScreen.tsx:35,93` | I |
| Escrituras sin `catch`, incluido el paro de emergencia: el usuario no se entera si falló. | `ActuatorsScreen.tsx:50,58` y otros | I |
| Inicio se queda en el spinner para siempre si `/mediciones/actual` falla. | `home/HomeScreen.tsx:54-57` | I |
| Gráfica con 1 punto, o búsquedas sin valor por defecto: NaN o la app truena. | `LineChart.tsx`, `ActivityCard.tsx` y otros | M (el backend ya lo evita) |

## 3. App web ↔ backend

- `/api/v1` está completo según `api-contracts.php` (las 4 rutas, el sobre `{status, …}` y las mismas claves). Aun así **solo alimentaría una parte de la pantalla**:
  - las métricas del dashboard;
  - el riego;
  - la calibración;
  - la tabla del histórico.
- Para lo demás, lo más barato es que la web use las rutas de la app móvil, que viven en el mismo servidor: `/dispositivos`, `/alertas`, `/actuadores`, `/red/estado`, `/invernaderos/actual` y `/auth/login`.
- **Los identificadores del contrato no existen en la BD.**
  - `EV_01`, `LED_PWM_03`, `FAN_M02`, `NB_01` y `SOIL_CAP_01` aparecen en el contrato.
  - Los reales son `bomba_riego` y `SENS-SOIL-01..03`.
  - Hay que pasarle a Aplicación la tabla de códigos (§7).
- **`/audit/logs` no filtra por fecha**, y el hito H5 lo pide. La telemetría agrega unas 17,280 filas al día a la bitácora y tapa los comandos y las alertas (§6).
- **Sin ninguna fuente de datos:**
  - EC y CO₂;
  - IP, MAC, RSSI y uptime del ESP32;
  - el ADC crudo;
  - la consola MQTT (un navegador no habla MQTT por TCP);
  - los KPIs y el PDF del histórico;
  - el modo global y la pausa.
- La web usa `innerHTML` sin escapar (`footer.php:51`, `app.js:161-166`). Se volverá XSS en cuanto pinte datos reales.

## 4. Contradicciones repo ↔ documentos

| # | Tema | Repo (maqueta) | Documentos / BD | Decisión | Clase |
|---|---|---|---|---|---|
| C1 | Cultivo | Hortalizas y tomate | Albahaca, *Ocimum basilicum*, 1.00 × 0.60 m | Albahaca. Leerlo de `/invernaderos/actual`. | I |
| C2 | Topics MQTT | `invernadero/zona1/...` | `invernadero/albahaca_01/telemetria` y `/comandos` | Los del seed, que son configurables por `.env`. Falta acordarlo por escrito con Conectividad. | I |
| C3 | Formato del mensaje | `temp_c`, `moisture_ch1`… | JSON del documento de Hardware | El de Hardware. El otro se guarda como inválido. | M |
| C4 | Nodos | 3 nodos (uno LoRa), "Node #08" | 1 nodo, `invernadero_albahaca_01` | Un solo nodo. | I |
| C5 | Sensores | 2 sondas, sin HC-SR04 | DHT22, BH1750, DS18B20, HC-SR04 y 3 capacitivos | El catálogo de la BD. El nivel del tanque tiene que mostrarse porque es lo que bloquea la bomba. | I |
| C6 | Zonas | "Zona 1" = todo el invernadero | "Zona 1/2/3" = cada sonda de suelo | `zone_id` = id del invernadero. | M |
| C7 | Horas y unidades | "UTC-5", muestreo de 500 ms a 30 s, PAR y W/m² | America/Mexico_City (UTC-6), 5 s, lux | Lo de los documentos. | M |
| C8 | Umbrales | Suelo mínimo 60 %, luz 15k–35k, aire 21–27 °C | Suelo 35–75, luz 2,000–15,000, aire sin definir | Manda `inv.umbral`. Con los de la maqueta, un suelo al 45 % saldría "bajo umbral", al revés que en la BD. | I |
| C9 | Actuadores | Válvula, LED, extractor, nebulizador, cortina | Solo `bomba_riego` | No se inventan actuadores. Las tarjetas sin hardware deben decir "no instalado". | I |
| C10 | CO₂ y EC | 780 ppm y 2.3 mS/cm fijos | No hay sensores | El backend manda `null` y la app debe mostrar N/D. | M |
| C11 | Autenticación | La web no autentica y la móvil no manda token | RLS y llaves | Ver §6.1 (decisión pendiente). | I |
| C12 | Servidor | "Microservicio Express", `/api/v1` | "Sin Express salvo que haga falta" | Express, justificado por el repo. Se registra en control de cambios. | M |
| C13 | URL y puerto | `192.168.1.100:3000` | PostgREST en supabase.co | Puerto 3000 y la IP de la laptop que corra el backend. | M |
| C14 | Calibración | "Se graba en la EEPROM del ESP32" | La calibración es de Hardware | El backend solo la guarda en `sensor.calibracion`. Acordar con Hardware si el firmware la lee. | I |
| C15 | Restauración | — | PostgreSQL 16 | Se restaura en el 18 instalado. Un volcado de `pg_dump` 18 puede no entrar en un 16. | M |
| C16 | Afirmaciones falsas | "TLS 1.3 / mTLS", firma SHA-256 fija | — | Quitarlas de la web. | M |

## 5. Supabase compartido

El proyecto usará el Supabase de otra persona, con un esquema propio (`inv`). Eso cambia varias cosas del SQL:

| # | Hallazgo | Dónde | Cambio propuesto | Clase |
|---|---|---|---|---|
| S1 | Trigger en `auth.users`: crea un perfil `inv.usuario` por **cada** usuario de la app del dueño. Si fallara, **bloquearía sus registros**. | `bd/supabase.sql:41-59` | Quitar el trigger. `scripts/usuarios.js` crea el perfil de nuestras cuentas directamente. | I |
| S2 | La política de lectura es `TO authenticated USING (true)`: **cualquier usuario del proyecto del dueño leería nuestras tablas**. | `bd/supabase.sql:128` | Exigir un perfil activo: `USING ((SELECT inv.fn_rol_actual()) IS NOT NULL)`. | I |
| S3 | `CREATE EXTENSION pg_cron` activa una extensión en un proyecto ajeno. | `bd/supabase.sql:207` | No crearla. Programar la purga solo si el dueño ya tiene pg_cron; si no, avisar. | M |
| S4 | El suscriptor usaría la **service_role del dueño**, que da acceso total a todo su proyecto. | `src/supabase.js`, `src/suscriptor.js` | Usar una cuenta de equipo nuestra con permiso solo para `fn_ingestar_paquete`. Así no hay que pedirle su llave maestra. | I |
| S5 | Comparte el límite del plan Free: **500 MB para los dos proyectos**. A 5 s nuestro esquema crece unos 20–40 MB por día de sesión. | — | Acordarlo con el dueño. Mantener la purga de 7 días y medir el uso de disco cada semana. | I |
| S6 | Nuestras cuentas (`eq-*@invernadero.test`) quedan en su `auth.users`. Si sus políticas permiten leer a cualquier `authenticated`, nuestras cuentas verían sus datos. | — | Avisar al dueño. | M |
| S7 | Exponer `inv` en Settings → API, agregar nuestras tablas a `supabase_realtime` y la pausa tras una semana sin uso dependen del dueño. | `bd/supabase.sql:7-8, 186-199` | Pedírselo y documentarlo. | M |

## 6. Pendientes del backend (nuestros)

| # | Hallazgo | Dónde | Propuesta | Clase |
|---|---|---|---|---|
| 6.1 | **API abierta.** Sin `Authorization` actúa como la cuenta OPERADOR, con CORS `*` y escuchando en 0.0.0.0. Cualquiera en la red puede prender la bomba o hacer el paro. | `src/api/app.js:11-32`, `datos.js:8-15` | **Decisión pendiente:** exigir token en las escrituras (rompe la app móvil hasta que mande el token) o dejarlo como riesgo aceptado para la demo en LAN. | I |
| 6.2 | `riego-manual` y `PATCH {encendido}` mandan ENCENDER **sin duración**. | `src/api/movil.js:119,128` | Usar la duración de la regla de riego activa (10 s en el seed), así no se inventa ningún número. | I |
| 6.3 | Un error PGRST1xx sale como "400 Datos inválidos" y sin log, lo que esconde problemas de configuración como un esquema no expuesto. | `src/api/datos.js:26`, `app.js:44-47` | PGRST106 y parecidos como 503 con log; solo los errores de parámetros como 400. | I |
| 6.4 | `/api/v1/audit/logs` no filtra por fecha ni acepta varios tipos a la vez. | `src/api/web.js:56-67` | Agregar los parámetros `from`, `to` y `severity` con varios valores. | I |
| 6.5 | Aparece "Zona Zona 1": la ubicación ya dice "Zona" y el formato la vuelve a anteponer. | `src/api/formato.js:133,142` | Quitar el prefijo. | M |
| 6.6 | En el detalle de un sensor salen todas las reglas activas, no solo las de ese sensor. | `formato.js:290-295` | Filtrar por los estados del sensor. | M |
| 6.7 | `/mediciones/historico` no filtra por `indice`. Hoy no se nota porque hay un sensor por variable. | `movil.js:48-52` | Filtrar `indice = 1`. | M |
| 6.8 | El título de la alerta muestra el código crudo (por ejemplo `RIEGO_NECESARIO`). | `formato.js:395` | Usar la descripción del estado. | M |
| 6.9 | Si se invalida la sesión de la cuenta de equipo, queda en caché y todo responde 401 hasta reiniciar. | `datos.js:10-13` | Al recibir 401, olvidar el cliente y volver a iniciar sesión. | M |
| 6.10 | La velocidad del ventilador no coincide entre web y móvil: la web usa 33/66/100 y la móvil 50/100 con corte en 75. | `web.js`, `formato.js` | Unificar. | M |
| 6.11 | La calibración no valida el rango 0–4095 ni que el punto seco sea mayor que el mojado. | `web.js:48-54` | Validar en el adaptador. | M |
| 6.12 | En la bitácora, las alertas del tanque salen con el código `SENS-DIST-01` y no `SENS-TANK-01`. | `bd/invernadero_bd.sql:1015-1019` | Elegir la variable que corresponde al estado. | M |
| 6.13 | La contraseña de la BD viaja como argumento de `pg_dump` y `psql`, y se ve en el administrador de tareas. | `scripts/respaldo.js`, `scripts/psql.js` | Pasarla por `PGPASSWORD`. | M |
| 6.14 | `engines` dice Node ≥ 20.12, pero el glob de `node --test` necesita 21 o más. | `package.json:8` | Cambiar a `>=22`. | M |

## 7. Para los otros equipos

**Aplicación:**
1. Riego manual:
   - Tomar el estado de la bomba de `GET /actuadores` (actuador `pump`, campo `on`).
   - No resincronizar desde el mock.
   - Usar `request()`, que sí revisa `res.ok`.
2. Inicio:
   - Mostrar `--` cuando llegue `null`.
   - Tomar el estado y la nota de cada métrica de `/dispositivos`.
3. La campana y "Conectado" deben salir de `/alertas` y `/red/estado`.
4. Avisar cuando falle una escritura, sobre todo el paro de emergencia.
5. Calcular la fecha de la actividad en hora local, no con `toISOString`.
6. Usar el cultivo albahaca con Zona 1–3. Quitar Romero y Menta.
7. Mandar `Authorization: Bearer <token>`. `/auth/login` ya devuelve el token y el backend ya lo acepta.
8. Web: llamar a la API usando los códigos reales. Tabla de códigos:

   | Dispositivo | Código |
   |---|---|
   | Temperatura del aire | `SENS-ENV-01` |
   | Humedad del aire | `SENS-HUM-01` |
   | Luz | `SENS-LUX-01` |
   | Temperatura del suelo | `SENS-TEMP-S01` |
   | Humedad de suelo, zonas 1–3 | `SENS-SOIL-01..03` |
   | Nivel del tanque | `SENS-TANK-01` |
   | Distancia al agua | `SENS-DIST-01` |
   | Bomba | `bomba_riego` |

9. Escapar el HTML antes de pintar datos reales.

**Conectividad:**
- Definir broker, credenciales y topics.
- Programar el despachador: escuchar `comando_actuador` por Realtime, publicarlo en el topic de comandos y marcar ENVIADO y luego CONFIRMADO. La cuenta `eq-conectividad` ya tiene permiso.

**Hardware:**
- Publicar por MQTT el JSON del documento.
- Indicar el pin de la bomba.
- Decidir si el firmware lee la calibración guardada en la BD.

**Automatización:**
- Definir los umbrales de aire.
- Implementar las reglas con la cuenta `eq-automatizacion`.

## 8. Preguntas abiertas

1. ¿Las escrituras de la API exigen token (§6.1)?
2. ¿Quién es el dueño del Supabase? ¿Acepta exponer `inv`, compartir los 500 MB y activar pg_cron (§5)?
3. ¿El suscriptor entra con una cuenta de equipo en lugar de la service_role del dueño (S4)?
4. ¿Cuál es la duración por defecto del riego manual (§6.2)?
5. ¿Conectividad y Hardware entregan algo antes de la presentación? Sin el despachador ni el firmware, la demo de punta a punta no mueve la bomba.
