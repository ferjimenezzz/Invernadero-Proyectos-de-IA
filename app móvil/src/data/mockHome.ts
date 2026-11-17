import type { ChartRange, ChartSeries, ChartVariable, HomeData } from '../types/home';

export const mockHome: HomeData = {
  greenhouseName: 'Invernadero Inteligente',
  subtitle: 'Univ. • Hierbas Aromáticas',
  connected: true,
  unreadNotifications: 2,
  avatarUrl: undefined, // URL de la foto del usuario
  hero: {
    lot: 'Lote Experimental A-1',
    updatedAt: 'Hoy 10:42 AM',
    title: '¡Hola! Bienvenido al invernadero',
    description: 'Monitoreo de hierbas aromáticas • Albahaca, Romero y Menta',
    device: 'Prototipo activo • ESP32 Gateway (Telemetría en vivo)',
  },
  status: {
    condition: 'Condición Óptima',
    cycle: 'Ciclo fotosintético diurno',
    sensorsOnline: 5,
    sensorsTotal: 5,
    preventiveAlerts: 1,
    lastReadingMinutes: 2,
    message: {
      text: 'Microclima estable para desarrollo foliar. Próximo ciclo de nebulización programado para las ',
      highlight: '16:00 hrs',
      suffix: ' en Cantero Romero.',
    },
  },
  zoneLabel: 'Cantero 01 - 03',
  metrics: [
    {
      id: 'temp',
      label: 'Temp. Ambiente',
      value: '24.2',
      unit: '°C',
      icon: 'thermometer',
      status: 'normal',
      footnote: { icon: 'trending-up', text: '+0.4°C vs 1h' },
    },
    {
      id: 'hum-aire',
      label: 'Humedad Aire',
      value: '62',
      unit: '%',
      icon: 'water-outline',
      status: 'normal',
      footnote: { icon: 'trending-down', text: '-2% vs 1h' },
    },
    {
      id: 'hum-suelo',
      label: 'Humedad Suelo',
      value: '68',
      unit: '%',
      icon: 'cup-outline',
      status: 'warning',
      footnote: { icon: 'alert-outline', text: 'Min: 65% Romero', tone: 'danger' },
    },
    {
      id: 'luz',
      label: 'Intensidad Luz',
      value: '18.5k',
      unit: 'lx',
      icon: 'white-balance-sunny',
      status: 'normal',
      footnote: { icon: 'weather-sunset-up', text: 'PAR 450 µmol' },
    },
  ],
  substrate: {
    label: 'Temperatura Sustrato',
    sensor: 'Sonda DS18B20 • Menta Piperita',
    value: '22.1',
    unit: '°C',
    status: 'normal',
  },
  manualIrrigation: {
    title: 'Riego Manual Auxiliar',
    valve: 'Válvula solenoide 2 • Cantero Romero',
    active: false,
  },
};

const temp6h = [17.6, 18.4, 19.3, 20.3, 21.0, 21.4, 21.3, 21.0, 21.1, 21.9, 23.2, 24.2, 23.8, 23.4];

const META: Record<ChartVariable, { unit: string; min: number; max: number; base: number[] }> = {
  temperatura: { unit: '°C', min: 20, max: 26, base: temp6h },
  humedad: { unit: '%', min: 50, max: 70, base: temp6h.map((t) => 90 - t * 1.2) },
  luz: { unit: 'klx', min: 10, max: 25, base: temp6h.map((t) => (t - 16) * 2.3) },
};

const LABELS: Record<ChartRange, string[]> = {
  '1h': ['11:00', '11:20', '11:40', '12:00'],
  '6h': ['06:00', '08:00', '10:00', '12:00'],
  '24h': ['00:00', '08:00', '16:00', 'Ahora'],
  '7d': ['Lun', 'Mié', 'Vie', 'Dom'],
};

/** Genera series de ejemplo. Sustitúyelo por la respuesta de tu API. */
export function mockSeries(variable: ChartVariable, range: ChartRange): ChartSeries {
  const m = META[variable];
  return {
    variable,
    unit: m.unit,
    comfortMin: m.min,
    comfortMax: m.max,
    xLabels: LABELS[range],
    sensorName: 'Sensor Cantero A',
    points: m.base.map((v, i) => ({
      label: `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
      value: Number(v.toFixed(1)),
    })),
  };
}
