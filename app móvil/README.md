# Invernadero Inteligente — App móvil (React Native + Expo SDK 58)

App completa a partir del diseño de Figma: 11 pantallas, navegación por pestañas + stack,
componentes reutilizables y capa de datos con modo demo.

## Ejecutar

Requiere **Node 22.13+** (Node 18 no funciona con SDK 58).

```bash
npm install
npx expo start            # misma red Wi-Fi
npx expo start --tunnel   # red de la universidad (requiere `npx expo login`)
```

Escanea el QR **de la terminal** con Expo Go. En modo demo entra con los datos precargados.

- No corras `npm audit fix --force` (rompe las versiones de Expo).
- Para agregar librerías nativas usa `npx expo install <paquete>`, no `npm install`.

## Conectar al backend

Crea `.env` en la raíz:

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Sin esa variable todo funciona con datos simulados (`src/data/`). Con ella, cada función de
`src/services/api.ts` llama al backend. Las rutas marcadas `// TODO` son propuestas: cámbialas
por las que defina el equipo.

## Inventario de pantallas

| # | Pantalla | Archivo | Origen en Figma |
|---|---|---|---|
| 1 | Login | `screens/auth/LoginScreen` | *No viene en Figma*, mismo estilo |
| 2 | Inicio | `screens/home/HomeScreen` | image_1 (+ Dashboard de Monitoreo) |
| 3 | Sensores (lista) | `screens/sensors/SensorsScreen` | image_4 |
| 4 | Sensor Detalle | `screens/sensors/SensorDetailScreen` | image_2 |
| 5 | Ajuste de Umbrales (hoja) | `components/sensors/ThresholdSheet` | Gestión de Sensores y Umbrales |
| 6 | Control de Actuadores | `screens/control/ActuatorsScreen` | Control de Actuadores |
| 7 | Actividades (bitácora) | `screens/activities/ActivitiesScreen` | image_3 |
| 8 | Registrar Actividad | `screens/activities/NewActivityScreen` | image_5 |
| 9 | Perfil y Configuración | `screens/profile/ProfileScreen` | image_6 |
| 10 | Notificaciones | `screens/notifications/NotificationsScreen` | image_7 |
| 11 | Conectividad ESP32 | `screens/network/ConnectivityScreen` | Conectividad y Red ESP32 |

## Navegación

```
RootStack (native-stack)
├─ Login                         ← si no hay sesión
└─ (con sesión)
   ├─ Main (bottom tabs)
   │   ├─ Inicio
   │   ├─ Sensores
   │   ├─ Control
   │   ├─ Actividades
   │   └─ Perfil
   ├─ SensorDetalle { sensorId } ← Sensores › Ver historial · Inicio › tarjeta · Notificación › Ver sensor
   ├─ Notificaciones             ← campana del header (todas las pestañas)
   ├─ Conectividad               ← Perfil › Red Telemétrica · Sensores › Escanear nodos
   └─ RegistrarActividad (modal) ← Actividades › Registrar
```

Los tipos de rutas están en `src/navigation/types.ts`; `useNavigation()` queda tipado en toda la app.

## Estructura

```
App.tsx                     providers: SafeArea → Auth → Navigation
index.ts                    registerRootComponent
src/
├── theme/                  colores, tipografía, spacing, escala responsiva
├── navigation/             RootNavigator, BottomTabs, types
├── context/AuthContext     sesión (login/logout)
├── hooks/                  useResponsive, useAsync (carga + pull-to-refresh)
├── services/api.ts         TODAS las llamadas al backend, con fallback demo
├── data/                   mocks por módulo
├── types/                  tipos por módulo
├── components/
│   ├── common/             reutilizables: Card, Badge, Button, Toggle, Slider, RangeSlider,
│   │                       Sparkline, FilterChips, SearchBar, Avatar, CardHeader, InfoNote,
│   │                       ListRow, BottomSheet, SegmentedControl, Loading/Error/EmptyState
│   ├── layout/             TabScreenLayout, StackScreenLayout, BackPill
│   ├── home/               tarjetas de Inicio + LineChart (banda, umbral, tooltip)
│   ├── sensors/            SensorCard, StatTriplet, ThresholdRuleCard, ThresholdSheet
│   ├── actuators/          ActuatorCard (bomba/lámpara/extractor), KillSwitchPanel
│   ├── activities/         ActivityCard, FieldLabel, TileSelector, SelectField, TextArea
│   ├── notifications/      NotificationCard (texto enriquecido **negrita** y `código`)
│   ├── profile/            ProfileHeaderCard
│   └── network/            ModeSwitch, TechTile, MeshNodeRow
└── screens/                una carpeta por módulo
```

## Colores

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#0F5A45` | Verde corporativo: botones, chips activos, líneas |
| `primaryDark` | `#0B3D2E` | Texto sobre menta, tooltip, pestaña activa |
| `primarySoft` | `#CFEBDD` | Badges "Normal", "Conectado", tipo seleccionado |
| `primaryTint` | `#EAF6F0` | Banda de confort, cajas informativas, hoja de umbrales |
| `lime` | `#D9F2A9` | Badge "Activo", ícono de lámparas, latencia |
| `background` | `#F7F9F8` | Fondo de la app |
| `surface` | `#FFFFFF` | Tarjetas |
| `surfaceSunken` | `#E8ECEA` | Cajas internas, segmentados |
| `warningBg` / `warning` | `#FDF0C8` / `#8A5A00` | Badge "Atención", "Pendiente" |
| `warningSoft` | `#FCE9D7` | Alerta Baja (estrés hídrico) |
| `dangerSoft` / `emergency` | `#FBE3DF` / `#B3261E` | Kill Switch, Alerta Alta, cerrar sesión |

Los componentes solo importan `colors` de `src/theme`.
