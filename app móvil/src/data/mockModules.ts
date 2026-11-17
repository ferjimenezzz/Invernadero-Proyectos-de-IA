import type { ActuatorsOverview } from '../types/actuators';
import type { Activity, ActivitySummary, Person } from '../types/activities';
import type { AppNotification } from '../types/notifications';
import type { GreenhouseInfo, SettingRow, UserProfile } from '../types/profile';
import type { NetworkStatus } from '../types/network';

/* ───────────────────────── Actuadores ───────────────────────── */

export const mockActuators: ActuatorsOverview = {
  linked: 3,
  totalPower: '2.1 kW',
  actuators: [
    {
      kind: 'pump',
      id: 'pump-a',
      name: 'Bomba de Riego Principal (Zona A)',
      icon: 'water-outline',
      iconBg: 'primary',
      on: true,
      statusText: 'Activo ahora • Flujo: 2.4 L/min',
      toggleIcon: 'waves',
      remaining: '03:42',
      rule: { icon: 'water-check-outline', text: 'Auto-disparo si humedad < 45%', value: 'Actual: 38%' },
    },
    {
      kind: 'light',
      id: 'lamps',
      name: 'Lámparas Espectro Completo',
      icon: 'lightbulb-outline',
      iconBg: 'lime',
      on: true,
      statusText: '75% Potencia • 280W',
      toggleIcon: 'white-balance-sunny',
      pwm: 75,
      rule: { icon: 'clock-outline', text: 'Auto: 06:00 a 18:00 (Fotoperiodo vegetativo)' },
    },
    {
      kind: 'fan',
      id: 'fan',
      name: 'Extractor Central & Persianas',
      icon: 'weather-windy',
      iconBg: 'dark',
      on: true,
      statusText: 'Velocidad actual: Alta • 1,200 RPM',
      toggleIcon: 'fan',
      level: 'high',
      tempBadge: '27.8°C',
      rule: { icon: 'shield-check-outline', text: 'Modo automático térmico activado', value: 'Límite: 26°C' },
    },
  ],
  insight: {
    title: 'Optimización Solar Diurna',
    text: 'El algoritmo redujo el ciclo de bombeo un 12% por nubosidad prevista.',
  },
};

/* ───────────────────────── Actividades ───────────────────────── */

export const people: Person[] = [
  { initials: 'CM', name: 'Carlos M.', role: 'Estudiante Agronomía' },
  { initials: 'ES', name: 'Dra. Elena Silva', role: 'Docente' },
  { initials: 'SR', name: 'Sofía R.', role: 'Estudiante', color: '#4E7D2E' },
  { initials: 'MG', name: 'Mateo G.', role: 'Tesista' },
];

export const activitySummary: ActivitySummary = {
  title: 'Bitácora Universitaria',
  compliance: '95% Cumplimiento',
  text: '12 tareas completadas con rigor científico este mes',
};

export const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'riego',
    icon: 'water-outline',
    location: 'CANTERO 2 • ROMERO Y TOMILLO',
    when: 'Hoy, 16:00 hrs',
    status: 'pendiente',
    title: 'Riego manual y fertilización líquida orgánica',
    description: 'Aplicar 15L de solución bioestimulante según recomendación del profesor tutor.',
    assignee: people[0],
  },
  {
    id: 'a2',
    type: 'mantenimiento',
    icon: 'robot-industrial-outline',
    location: 'NODO SENS-SOIL-02',
    when: 'Hoy, 11:30 hrs',
    status: 'enProceso',
    title: 'Mantenimiento y limpieza de sonda de humedad',
    description: 'Limpieza con agua destilada y verificación de contacto con sustrato orgánico.',
    assignee: people[1],
  },
  {
    id: 'a3',
    type: 'inspeccion',
    icon: 'bug-outline',
    location: 'CANTERO 1 • ALBAHACA',
    when: 'Ayer, 09:15 hrs',
    status: 'completada',
    title: 'Inspección de hojas y detección de plagas',
    description: 'Hojas en excelente estado, sin signos de mosca blanca ni mildiu. Altura promedio 22 cm.',
    assignee: people[2],
    footerNote: 'Revisado por tutor',
    hasEvidence: true, // agrega imageUrl con la URL pública de la foto en Supabase Storage
  },
  {
    id: 'a4',
    type: 'medicion',
    icon: 'ruler',
    location: 'CANTERO 3 • MENTA PIPERITA',
    when: 'Hace 2 días',
    status: 'completada',
    title: 'Medición semanal de altura y biomasa',
    description: 'Incremento vegetativo de 3.2 cm en la última semana. Crecimiento acorde a modelo estacional.',
    assignee: people[3],
    footerNote: 'Datos validados',
    growth: { label: 'Tasa de crecimiento', value: '+14.5%', bars: [0.35, 0.5, 0.75, 1] },
  },
];

export const beds = [
  { id: 'c1', label: 'Cantero 1 - Albahaca (Zona A)' },
  { id: 'c2', label: 'Cantero 2 - Romero y Tomillo (Zona B)' },
  { id: 'c3', label: 'Cantero 3 - Menta Piperita (Zona C)' },
];

/* ───────────────────────── Notificaciones ───────────────────────── */

export const mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'advertencia',
    tag: 'ADVERTENCIA',
    icon: 'water-alert-outline',
    title: 'Humedad del suelo requiere revisión',
    body: 'El sensor `SENS-SOIL-02` en Cantero 2 (Romero) reporta **68% HR**, acercándose al umbral mínimo configurado (65%).',
    time: 'Hace 12 min',
    read: false,
    detail: [{ icon: 'trending-down', text: 'Tendencia: -3% en última hora', value: '68% / 65% min' }],
    actions: [
      { label: 'Programar riego', icon: 'water-outline', primary: true, action: 'programarRiego' },
      { label: 'Ver sensor', action: 'verSensor' },
    ],
    footer: 'Hoy a las 10:35 AM • Módulo Romero B',
    sensorId: 'SENS-SOIL-02',
  },
  {
    id: 'n2',
    kind: 'red',
    tag: 'RED IOT',
    icon: 'monitor-dashboard',
    title: 'Sincronización de red IoT completada',
    body: 'Se recibieron nuevas mediciones de los 5 sensores ambientales a través del Gateway universitario central sin pérdida de paquetes.',
    time: '',
    read: true,
    detail: [
      { icon: 'router-wireless', text: 'Gateway U-04' },
      { icon: 'speedometer', text: 'Latencia 42ms' },
    ],
    footer: 'Hoy a las 10:40 AM • Sincronización automática',
  },
  {
    id: 'n3',
    kind: 'critica',
    tag: 'CRÍTICA • RESUELTA',
    icon: 'wifi-off',
    title: 'Pérdida temporal de enlace inalámbrico',
    body: 'El sensor de radiación lumínica `SENS-LUX-01` reconectó exitosamente tras 4 minutos fuera de línea.',
    time: '08:15 AM',
    read: true,
    resolution: 'Resuelto automáticamente por Mesh Failover',
    footer: 'Hoy a las 08:15 AM • Restablecido a las 08:19 AM',
    sensorId: 'SENS-LUX-01',
  },
  {
    id: 'n4',
    kind: 'actividad',
    tag: 'ACTIVIDAD',
    icon: 'clipboard-text-outline',
    title: 'Actividad de cultivo pendiente: Riego manual',
    body: 'Tienes una tarea asignada en **Cantero 2** para las 16:00 hrs: Aplicar solución bioestimulante orgánica y verificar drenaje.',
    time: 'Para hoy 16:00 hrs',
    read: false,
    actions: [
      { label: 'Ver en bitácora', icon: 'book-open-variant', primary: false, action: 'verBitacora' },
      { label: 'Completar', icon: 'check', action: 'completar' },
    ],
    footer: 'Hoy a las 07:00 AM • Asignado por Prof. Arismendi',
  },
];

/* ───────────────────────── Perfil ───────────────────────── */

export const mockUser: UserProfile = {
  id: 'u1',
  name: 'Sofía Rodríguez Morales',
  role: 'Estudiante de Agronomía • 8vo Semestre',
  faculty: 'Facultad de Ciencias Agrarias • Universidad',
  avatarUrl: undefined,
  stats: [
    { label: 'Turnos', value: '18' },
    { label: 'Lotes', value: 'A-1' },
    { label: 'Alertas', value: '0 res.' },
  ],
};

export const greenhouseInfo: GreenhouseInfo = {
  project: 'Invernadero Inteligente IoT - Lote Experimental A-1',
  surface: '120 m² • 4 Canteros Automatizados',
  species: [
    { common: 'Romero', scientific: 'Rosmarinus officinalis' },
    { common: 'Albahaca', scientific: 'Ocimum basilicum' },
    { common: 'Menta', scientific: 'Mentha piperita' },
  ],
  network: '5 Nodos activos • Gateway ESP32 MQTT',
};

export const unitRows: SettingRow[] = [
  { id: 'temp', icon: 'thermometer-lines', label: 'Temperatura', value: 'Celsius (°C)' },
  { id: 'hum', icon: 'water-outline', label: 'Humedad Suelo / Ambiente', value: 'Porcentaje Relativo (% HR)' },
  { id: 'rad', icon: 'white-balance-sunny', label: 'Radiación Fotosintética', value: 'Lux (lx) / PAR (µmol/m²s)' },
];

/* ───────────────────────── Red / ESP32 ───────────────────────── */

export const mockNetwork: NetworkStatus = {
  mode: 'real',
  synced: true,
  gateway: {
    band: 'Wi-Fi 2.4GHz',
    apiUrl: 'http://192.168.1.100:3000/api',
    ip: '192.168.1.142',
    mac: 'A4:CF:12:8B:90:2C',
    port: '8080 (WebSocket Stream)',
    portOpen: true,
    latencyMs: 18,
  },
  nodes: [
    {
      id: 'gw',
      name: 'ESP32 Gateway Central',
      icon: 'chip',
      detail: 'Firmware v2.4.1 • Uptime: 14d 6h',
      badge: 'Master',
      badgeTone: 'success',
      healthy: true,
    },
    {
      id: 'relay',
      name: 'Módulo Relés Riego',
      icon: 'electric-switch',
      detail: 'Zona A (4 Canales) • Bus I2C #2',
      badge: 'Relé OK',
      badgeTone: 'lime',
      healthy: true,
    },
    {
      id: 'canopy',
      name: 'Nodo Sensores Canopia',
      icon: 'access-point',
      detail: 'LoRaWAN 915MHz • Paquetes: 99.8%',
      badge: 'RSSI -64',
      badgeTone: 'success',
      healthy: true,
    },
  ],
  cloudSync: true,
};
