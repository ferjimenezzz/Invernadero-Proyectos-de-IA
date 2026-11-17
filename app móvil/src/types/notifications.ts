import type { IconName } from './common';

export type NotificationKind = 'advertencia' | 'red' | 'critica' | 'actividad';
export type NotificationFilter = 'todas' | 'criticas' | 'advertencias' | 'actividades';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  tag: string; // ADVERTENCIA, RED IOT, CRÍTICA • RESUELTA
  icon: IconName;
  title: string;
  /** Texto con fragmentos resaltados: **negrita** y `código`. */
  body: string;
  time: string; // Hace 12 min / 08:15 AM
  read: boolean;
  detail?: { icon: IconName; text: string; value?: string }[];
  resolution?: string;
  actions?: { label: string; icon?: IconName; primary?: boolean; action: 'programarRiego' | 'verSensor' | 'verBitacora' | 'completar' }[];
  footer: string;
  sensorId?: string;
}
