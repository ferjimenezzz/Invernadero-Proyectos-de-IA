import type { IconName } from './common';

interface BaseActuator {
  id: string;
  name: string;
  icon: IconName;
  iconBg: 'primary' | 'lime' | 'dark';
  on: boolean;
  statusText: string; // "Activo ahora • Flujo: 2.4 L/min"
  toggleIcon: IconName;
  rule: { icon: IconName; text: string; value?: string };
}

export interface PumpActuator extends BaseActuator {
  kind: 'pump';
  remaining: string; // 03:42
}

export interface LightActuator extends BaseActuator {
  kind: 'light';
  pwm: number; // 0–100
}

export type FanLevel = 'off' | 'low' | 'high';

export interface FanActuator extends BaseActuator {
  kind: 'fan';
  level: FanLevel;
  tempBadge: string; // 27.8°C
}

export type Actuator = PumpActuator | LightActuator | FanActuator;

export interface ActuatorsOverview {
  linked: number;
  totalPower: string; // 2.1 kW
  actuators: Actuator[];
  insight: { title: string; text: string };
}
