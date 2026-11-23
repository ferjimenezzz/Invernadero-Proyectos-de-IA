// Configura el proyecto Supabase con la Management API y llena backend/.env. Nunca imprime secretos.
//   node scripts/configurar_supabase.js [nombre-del-proyecto]   (por defecto: invernadero-albahaca)
// Necesita en .env: SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens) y
// SUPABASE_DB_PASSWORD (la contraseña de la BD que se puso al crear el proyecto).
// Hace: SUPABASE_URL, llaves anon/service_role, SUPABASE_DB_URL (Session pooler),
// expone el esquema inv en la Data API y desactiva el registro público.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RUTA_ENV = fileURLToPath(new URL('../.env', import.meta.url));
process.loadEnvFile(RUTA_ENV);
const { SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_DB_PASSWORD: CLAVE_BD } = process.env;
if (!TOKEN || !CLAVE_BD) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN y/o SUPABASE_DB_PASSWORD en backend/.env');
  process.exit(1);
}
const nombre = process.argv[2] || 'invernadero-albahaca';

async function api(ruta, opciones = {}) {
  const r = await fetch(`https://api.supabase.com/v1${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${opciones.method || 'GET'} ${ruta} → ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

function fijar(texto, clave, valor) {
  const linea = `${clave}=${valor}`;
  const re = new RegExp(`^${clave}=.*$`, 'm');
  return re.test(texto) ? texto.replace(re, () => linea) : `${texto}${texto && !texto.endsWith('\n') ? '\n' : ''}${linea}\n`;
}

// 1. Proyecto y espera a que esté listo
const proyecto = (await api('/projects')).find((p) => p.name === nombre);
if (!proyecto) throw new Error(`No encontré un proyecto llamado "${nombre}" en tu cuenta`);
const ref = proyecto.id ?? proyecto.ref;
for (let i = 0; ; i++) {
  const { status } = await api(`/projects/${ref}`);
  if (status === 'ACTIVE_HEALTHY') break;
  if (i >= 60) throw new Error(`El proyecto sigue en ${status} después de 5 minutos`);
  if (i === 0) console.log(`Esperando a que el proyecto esté listo (${status})…`);
  await new Promise((r) => setTimeout(r, 5000));
}
console.log(`Proyecto ${nombre} (${ref}) listo`);

// 2. Llaves (legacy anon/service_role; si no hay, publishable/secret)
const llaves = await api(`/projects/${ref}/api-keys?reveal=true`);
const llave = (legacy, nuevo) =>
  llaves.find((k) => k.name === legacy)?.api_key ?? llaves.find((k) => k.type === nuevo)?.api_key;
const anon = llave('anon', 'publishable');
const servicio = llave('service_role', 'secret');
if (!anon || !servicio) throw new Error('No pude leer las llaves anon/service_role del proyecto');

// 3. Session pooler (puerto 5432): sirve para psql y pg_dump desde redes IPv4
const poolers = await api(`/projects/${ref}/config/database/pooler`);
const p = poolers.find((x) => x.database_type === 'PRIMARY') ?? poolers[0];
if (!p?.db_host || !p?.db_user) throw new Error('No pude leer la configuración del pooler');
const dbUrl = `postgresql://${p.db_user}:${encodeURIComponent(CLAVE_BD)}@${p.db_host}:5432/${p.db_name || 'postgres'}`;

let env = readFileSync(RUTA_ENV, 'utf8');
env = fijar(env, 'SUPABASE_URL', `https://${ref}.supabase.co`);
env = fijar(env, 'SUPABASE_ANON_KEY', anon);
env = fijar(env, 'SUPABASE_SERVICE_ROLE_KEY', servicio);
env = fijar(env, 'SUPABASE_DB_URL', dbUrl);
writeFileSync(RUTA_ENV, env);
console.log('backend/.env: URL, llaves y cadena del Session pooler escritas (no se muestran)');

// 4. Exponer el esquema inv en la Data API (sin quitar los que ya están)
const { db_schema } = await api(`/projects/${ref}/postgrest`);
const esquemas = db_schema.split(',').map((s) => s.trim()).filter(Boolean);
if (!esquemas.includes('inv')) {
  await api(`/projects/${ref}/postgrest`, { method: 'PATCH', body: JSON.stringify({ db_schema: [...esquemas, 'inv'].join(', ') }) });
}
console.log('Data API: esquema inv expuesto');

// 5. Nadie puede registrarse solo con la llave pública
await api(`/projects/${ref}/config/auth`, { method: 'PATCH', body: JSON.stringify({ disable_signup: true }) });
console.log('Auth: registro público desactivado');
