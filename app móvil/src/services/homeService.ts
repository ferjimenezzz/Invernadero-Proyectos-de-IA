import { mockHome, mockSeries } from '../data/mockHome';
import type { ChartRange, ChartSeries, ChartVariable, HomeData } from '../types/home';

/**
 * URL del backend (NestJS + Supabase). Define EXPO_PUBLIC_API_URL en tu .env,
 * p. ej. EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
 * Si no está definida, la pantalla funciona con datos simulados.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchHome(): Promise<HomeData> {
  if (!API_URL) return mockHome;
  // Ajusta el mapeo a la forma real de GET /mediciones/actual
  const actual = await get<Record<string, number>>('/mediciones/actual');
  return {
    ...mockHome,
    metrics: mockHome.metrics.map((m) => {
      const raw = actual[m.id];
      return raw == null ? m : { ...m, value: String(raw) };
    }),
  };
}

export async function fetchSeries(variable: ChartVariable, range: ChartRange): Promise<ChartSeries> {
  if (!API_URL) return mockSeries(variable, range);
  return get<ChartSeries>(`/mediciones/historico?variable=${variable}&rango=${range}`);
}

export async function toggleManualIrrigation(active: boolean): Promise<void> {
  if (!API_URL) return;
  await fetch(`${API_URL}/actuadores/riego-manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo: active }),
  });
}
