/**
 * Capa de datos de todos los módulos.
 *
 * - Sin EXPO_PUBLIC_API_URL → devuelve datos simulados (útil con Expo Go y en clase).
 * - Con EXPO_PUBLIC_API_URL → llama al backend NestJS/Supabase.
 *   Las rutas marcadas con TODO son propuestas: ajústalas a las que defina el equipo.
 */
import { buildDetailFromSensor, mockSensorDetail, mockSensors } from '../data/mockSensors';
import {
  activitySummary,
  beds,
  greenhouseInfo,
  mockActivities,
  mockActuators,
  mockNetwork,
  mockNotifications,
  mockUser,
} from '../data/mockModules';
import type { Sensor, SensorDetail } from '../types/sensors';
import type { ActuatorsOverview, FanLevel } from '../types/actuators';
import type { Activity, ActivitySummary, NewActivityDraft } from '../types/activities';
import type { AppNotification } from '../types/notifications';
import type { GreenhouseInfo, UserProfile } from '../types/profile';
import type { NetworkStatus } from '../types/network';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const isDemo = !API_URL;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Devuelve el mock en modo demo o ejecuta la petición real. */
async function demoOr<T>(mock: T | (() => T), real: () => Promise<T>): Promise<T> {
  if (isDemo) {
    await delay();
    return typeof mock === 'function' ? (mock as () => T)() : mock;
  }
  return real();
}

/* ── Auth ── */
export const login = (email: string, password: string) =>
  demoOr<UserProfile>(mockUser, () =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }), // TODO
  );

/* ── Sensores ── */
export const getSensors = () => demoOr<Sensor[]>(mockSensors, () => request('/dispositivos'));

export const getSensorDetail = (id: string) =>
  demoOr<SensorDetail>(
    () => {
      const known = mockSensorDetail[id];
      if (known) return known;
      const s = mockSensors.find((x) => x.id === id) ?? mockSensors[0];
      return buildDetailFromSensor(s);
    },
    () => request(`/dispositivos/${id}/detalle`), // TODO
  );

export const saveThresholds = (sensorId: string, min: number, max: number) =>
  demoOr<void>(undefined, () =>
    request(`/umbrales/${sensorId}`, { method: 'PUT', body: JSON.stringify({ min, max }) }), // TODO
  );

export const calibrateSensor = (sensorId: string) =>
  demoOr<void>(undefined, () => request(`/dispositivos/${sensorId}/calibrar`, { method: 'POST' })); // TODO

/* ── Actuadores ── */
export const getActuators = () =>
  demoOr<ActuatorsOverview>(mockActuators, () => request('/actuadores'));

export const setActuatorPower = (id: string, on: boolean) =>
  demoOr<void>(undefined, () =>
    request(`/actuadores/${id}`, { method: 'PATCH', body: JSON.stringify({ encendido: on }) }),
  );

export const setLightPwm = (id: string, pwm: number) =>
  demoOr<void>(undefined, () =>
    request(`/actuadores/${id}`, { method: 'PATCH', body: JSON.stringify({ pwm }) }),
  );

export const setFanLevel = (id: string, level: FanLevel) =>
  demoOr<void>(undefined, () =>
    request(`/actuadores/${id}`, { method: 'PATCH', body: JSON.stringify({ nivel: level }) }),
  );

export const killSwitch = () =>
  demoOr<void>(undefined, () => request('/actuadores/detener-todo', { method: 'POST' })); // TODO

/* ── Actividades ── */
export const getActivities = () =>
  demoOr<{ summary: ActivitySummary; items: Activity[] }>(
    () => ({ summary: activitySummary, items: [...mockActivities] }),
    () => request('/actividades'), // TODO
  );

const TYPE_META: Record<NewActivityDraft['type'], { icon: Activity['icon']; title: string }> = {
  riego: { icon: 'water-outline', title: 'Riego' },
  inspeccion: { icon: 'magnify', title: 'Inspección' },
  medicion: { icon: 'ruler', title: 'Medición' },
  fertilizacion: { icon: 'flask-outline', title: 'Fertilización' },
  mantenimiento: { icon: 'wrench-outline', title: 'Mantenimiento' },
};

export const createActivity = (draft: NewActivityDraft) =>
  demoOr<void>(
    () => {
      // En modo demo la agregamos al inicio de la lista simulada.
      const bed = beds.find((b) => b.id === draft.bedId)?.label ?? '';
      const meta = TYPE_META[draft.type];
      mockActivities.unshift({
        id: `local-${Date.now()}`,
        type: draft.type,
        icon: meta.icon,
        location: bed.toUpperCase(),
        when: draft.date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
        status: 'pendiente',
        title: `${meta.title}: ${draft.description.slice(0, 60)}`,
        description: draft.observations || draft.description,
        assignee: draft.responsible,
      });
    },
    () => request('/actividades', { method: 'POST', body: JSON.stringify(draft) }), // TODO
  );

/* ── Notificaciones ── */
export const getNotifications = () =>
  demoOr<AppNotification[]>(mockNotifications, () => request('/alertas'));

/* ── Perfil ── */
export const getGreenhouseInfo = () =>
  demoOr<GreenhouseInfo>(greenhouseInfo, () => request('/invernaderos/actual')); // TODO

/* ── Red ESP32 ── */
export const getNetworkStatus = () =>
  demoOr<NetworkStatus>(mockNetwork, () => request('/red/estado')); // TODO

/** Mide el tiempo de ida y vuelta al gateway. */
export async function pingGateway(url: string): Promise<number> {
  if (isDemo) {
    await delay(400);
    return 12 + Math.round(Math.random() * 20);
  }
  const t0 = Date.now();
  await fetch(url, { method: 'HEAD' });
  return Date.now() - t0;
}
