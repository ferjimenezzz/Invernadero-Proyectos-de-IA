# Análisis del repositorio e inconsistencias

**Fecha:** 22 nov 2026. Lo preparó el equipo de BD y Backend.

**Base analizada:**
- `origin/main` en el commit `4c1124d`. No ha cambiado desde el 16 nov y no hay PRs, issues, forks ni otras ramas.
- Nuestro trabajo estaba en la rama `backend-bd`; se fusionó a `main` con el PR #1 el 23 nov.

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
| `backend/` | equipo BD y Backend | SQL con RLS, suscriptor MQTT, adaptador Express, scripts y pruebas | Código real. El SQL pasó sus pruebas en un PostgreSQL 18 temporal y la restauración del respaldo coincide (22 nov); 38 pruebas unitarias en verde. **Nunca se ha corrido contra Supabase.** |

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
| C2 | Topics MQTT | `invernadero/zona1/...` | `invernadero/albahaca/invernadero_albahaca_01/telemetria` (confirmado por Conectividad el 23 nov) y `invernadero/albahaca_01/comandos` | Configurables por `.env`. Falta confirmar el de comandos. | I |
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

## 5. Supabase: un proyecto propio por equipo

Se evaluó usar el Supabase de otra persona con un esquema propio, pero **se descartó: cada equipo usa su propio proyecto** (confirmado el 22 nov). Por eso el SQL se queda como estaba diseñado, para un proyecto propio:
- el perfil se crea con un trigger en `auth.users`;
- la service_role la usa solo el suscriptor;
- la purga de 7 días se programa con pg_cron.

Lo que sigue aplicando del plan Free: los 500 MB son solo nuestros, pero a 5 s el esquema crece unos 20–40 MB por día de sesión. Se mantiene la purga de 7 días y se mide el uso de disco cada semana. El proyecto se pausa tras una semana sin uso.

## 6. Pendientes del backend (nuestros)

| # | Hallazgo | Dónde | Estado | Clase |
|---|---|---|---|---|
| 6.1 | **API abierta.** Sin `Authorization` actúa como la cuenta OPERADOR, con CORS `*` y escuchando en 0.0.0.0. Cualquiera en la red puede prender la bomba o hacer el paro. | `src/api/app.js:11-32`, `datos.js:8-15` | **Decisión pendiente.** Opciones: exigir token en las escrituras (rompe la app móvil hasta que mande el token) o dejarlo como riesgo aceptado para la demo en LAN. | I |
| 6.2 | `riego-manual` y `PATCH {encendido}` mandaban ENCENDER **sin duración**. | `src/api/movil.js` | Corregido en la BD: un ENCENDER manual sin duración toma la de la regla activa de ese actuador (10 s en el seed). Si no hay regla, queda sin duración. | I |
| 6.3 | Un error PGRST1xx salía como "400 Datos inválidos" y sin log. | `src/api/datos.js` | Corregido: solo PGRST100/102/103 son 400. El resto (p. ej. PGRST106, esquema no expuesto) es 500 y queda en el log. | I |
| 6.4 | `/api/v1/audit/logs` no filtraba por fecha ni aceptaba varios tipos. | `src/api/web.js` | Corregido: `from`, `to` (ISO 8601) y `severity` con varios valores separados por coma. | I |
| 6.5 | Aparecía "Zona Zona 1". | `src/api/formato.js` | Corregido: la ubicación se muestra tal cual. | M |
| 6.6 | En el detalle de un sensor salen todas las reglas activas. | `formato.js` | Abierto: el modelo no liga estados con tipos de sensor, así que no hay con qué filtrar sin inventar la relación. | M |
| 6.7 | `/mediciones/historico` no filtraba por `indice`. | `movil.js` | Corregido. | M |
| 6.8 | El título de la alerta mostraba el código crudo. | `formato.js` | Corregido: "Riego necesario" en vez de `RIEGO_NECESARIO`. | M |
| 6.9 | Una sesión vencida de la cuenta de equipo quedaba en caché. | `datos.js` | Corregido: con un 401 se olvida y se vuelve a entrar en la siguiente petición. | M |
| 6.10 | La velocidad del ventilador no coincidía entre web y móvil. | `formato.js` | Corregido: más de 50 % es "alta" en las dos. | M |
| 6.11 | La calibración no validaba los puntos crudos. | `web.js` | Corregido: enteros 0–4095 y punto seco mayor que el mojado. | M |
| 6.12 | Las alertas del tanque salían con el código `SENS-DIST-01`. | BD y `movil.js` | Corregido: el código principal de un sensor es la variable con umbral y, si ninguna tiene, la de menor id. Se aplica igual en la BD y en el adaptador. | M |
| 6.13 | La contraseña de la BD viajaba como argumento de `pg_dump` y `psql`. | `scripts/respaldo.js`, `scripts/psql.js` | Corregido: va por `PGPASSWORD`. | M |
| 6.14 | `engines` pedía Node ≥ 20.12. | `package.json` | Corregido: `>=22`. | M |

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
2. ¿La duración del riego manual sale de la regla de riego (10 s hoy), o el equipo define otra (§6.2)? Se cambia en `regla_automatizacion` sin tocar código.
3. ¿Conectividad y Hardware entregan algo antes de la presentación? Sin el despachador ni el firmware, la demo de punta a punta no mueve la bomba.
