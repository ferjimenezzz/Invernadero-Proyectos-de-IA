import type { IconName } from './common';

export type TelemetryMode = 'demo' | 'real';

export interface MeshNode {
  id: string;
  name: string;
  icon: IconName;
  detail: string;
  badge: string; // Master, Relé OK, RSSI -64
  badgeTone: 'success' | 'lime';
  healthy: boolean;
}

export interface NetworkStatus {
  mode: TelemetryMode;
  synced: boolean;
  gateway: {
    band: string; // Wi-Fi 2.4GHz
    apiUrl: string;
    ip: string;
    mac: string;
    port: string;
    portOpen: boolean;
    latencyMs: number;
  };
  nodes: MeshNode[];
  cloudSync: boolean;
}
