import type { IconName } from './common';

export interface UserProfile {
  id: string;
  name: string;
  role: string; // Estudiante de Agronomía • 8vo Semestre
  faculty: string;
  avatarUrl?: string;
  stats: { label: string; value: string }[];
}

export interface GreenhouseInfo {
  project: string;
  surface: string;
  species: { common: string; scientific: string }[];
  network: string;
}

export interface SettingRow {
  id: string;
  icon: IconName;
  label: string;
  value: string;
}

export interface NotificationPrefs {
  criticalAlerts: boolean;
  tasks: boolean;
  dailyReport: boolean;
}

export interface SystemPrefs {
  demoMode: boolean;
  offlineSync: boolean;
}
