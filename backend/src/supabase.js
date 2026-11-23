// Carga backend/.env y crea los clientes de Supabase sobre el esquema inv.
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  // Sin .env: se usan las variables del sistema.
}

export function env(nombre, porDefecto) {
  const valor = process.env[nombre] || porDefecto;
  if (!valor) throw new Error(`Falta ${nombre} en backend/.env (ver .env.example)`);
  return valor;
}

const opciones = (extra = {}) => ({
  db: { schema: 'inv' },
  auth: { persistSession: false, autoRefreshToken: false, ...extra.auth },
  ...(extra.token && { global: { headers: { Authorization: `Bearer ${extra.token}` } } }),
});

// Solo el suscriptor: la service_role salta RLS y nunca va a un front.
export const clienteServicio = () =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), opciones());

// Llave pública; con token actúa como ese usuario (aplica RLS).
export const clientePublico = (token) =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), opciones({ token }));

// Cliente con sesión de una cuenta (p. ej. eq_app); renueva su token solo.
export async function clienteCuenta(email, password) {
  const c = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), opciones({ auth: { autoRefreshToken: true } }));
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  return c;
}
