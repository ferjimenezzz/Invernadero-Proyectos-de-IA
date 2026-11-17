import type { IconName } from './common';

export type ActivityStatus = 'pendiente' | 'enProceso' | 'completada';
export type ActivityType = 'riego' | 'inspeccion' | 'medicion' | 'fertilizacion' | 'mantenimiento';

export interface Person {
  initials: string;
  name: string;
  role: string; // Estudiante, Docente, Tesista
  color?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  icon: IconName;
  location: string; // CANTERO 2 • ROMERO Y TOMILLO
  when: string; // Hoy, 16:00 hrs
  status: ActivityStatus;
  title: string;
  description: string;
  assignee: Person;
  footerNote?: string; // "Revisado por tutor"
  /** URL pública de la foto (p. ej. Supabase Storage). */
  imageUrl?: string;
  /** Tiene evidencia aunque aún no haya URL (muestra marcador). */
  hasEvidence?: boolean;
  growth?: { label: string; value: string; bars: number[] };
}

export interface ActivitySummary {
  title: string;
  compliance: string; // 95% Cumplimiento
  text: string;
}

export interface NewActivityDraft {
  type: ActivityType;
  bedId: string;
  date: Date;
  responsible: Person;
  description: string;
  observations: string;
  photos: { name: string; size: string }[];
}
