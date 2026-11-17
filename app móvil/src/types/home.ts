import type { IconName, StatusLevel } from './common';

export type { IconName, StatusLevel } from './common';

export interface MetricReading {
  id: string;
  label: string;
  value: string; // ya formateado: "24.2", "18.5k"
  unit: string;
  icon: IconName;
  status: StatusLevel;
  /** Línea inferior: tendencia, umbral o dato complementario. */
  footnote: { icon: IconName; text: string; tone?: 'default' | 'danger' };
}

export interface GreenhouseStatus {
  condition: string; // "Condición Óptima"
  cycle: string; // "Ciclo fotosintético diurno"
  sensorsOnline: number;
  sensorsTotal: number;
  preventiveAlerts: number;
  lastReadingMinutes: number;
  message: { text: string; highlight?: string; suffix?: string };
}

export interface ChartPoint {
  label: string; // "10:30 AM"
  value: number;
}

export type ChartVariable = 'temperatura' | 'humedad' | 'luz';
export type ChartRange = '1h' | '6h' | '24h' | '7d';

export interface ChartSeries {
  variable: ChartVariable;
  unit: string;
  comfortMin: number;
  comfortMax: number;
  xLabels: string[];
  points: ChartPoint[];
  sensorName: string;
}

export interface HomeData {
  greenhouseName: string;
  subtitle: string;
  connected: boolean;
  unreadNotifications: number;
  avatarUrl?: string;
  hero: {
    lot: string;
    updatedAt: string;
    title: string;
    description: string;
    device: string;
  };
  status: GreenhouseStatus;
  zoneLabel: string;
  metrics: MetricReading[];
  substrate: {
    label: string;
    sensor: string;
    value: string;
    unit: string;
    status: StatusLevel;
  };
  manualIrrigation: { title: string; valve: string; active: boolean };
}
