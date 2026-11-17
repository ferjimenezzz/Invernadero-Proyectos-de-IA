import type { IconName, StatusLevel } from './common';

export type SensorFilter = 'todos' | 'enLinea' | 'alertas' | 'desconectados';

export interface Sensor {
  id: string; // SENS-ENV-01
  name: string; // Sensor de Temperatura
  location: string; // Zona A (Albahaca)
  icon: IconName;
  online: boolean;
  status: StatusLevel;
  statusLabel?: string; // "Umbral Próximo"
  readingLabel: string; // LECTURA ACTUAL
  value: string;
  unit: string;
  trend: number[]; // sparkline
  trendLabel: { icon: IconName; text: string };
  alertMessage?: string;
  lastSeen: string; // Hace 1 min (10:43 AM)
  hardware: { icon: IconName; text: string }; // DHT22 / SHT31 • Batería 94%
}

export interface ThresholdRule {
  id: string;
  tone: 'warning' | 'success' | 'danger';
  icon: IconName;
  title: string;
  value: string; // "< 65 %"
  description: string;
}

export interface Automation {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

export interface SensorDetail {
  id: string;
  module: string; // MÓDULO A • CAMA 02
  title: string;
  icon: IconName;
  value: string;
  unit: string;
  status: StatusLevel;
  statusLabel: string;
  lastTransmission: string;
  signal: string; // -62 dBm
  battery: string; // 89% Bat
  firmware: string; // FW v2.1.4
  stats: { label: string; value: string; unit: string; caption: string; icon: IconName }[];
  history: {
    title: string;
    unit: string;
    points: { label: string; value: number }[];
    xLabels: string[];
    comfortMin: number;
    comfortMax: number;
    threshold: number;
  };
  crop: { name: string; scientific: string; description: string };
  rules: ThresholdRule[];
  thresholdEditor: {
    title: string;
    subtitle: string;
    unit: string;
    scaleMin: number;
    scaleMax: number;
    min: number;
    max: number;
    step: number;
    automations: Automation[];
  };
}
