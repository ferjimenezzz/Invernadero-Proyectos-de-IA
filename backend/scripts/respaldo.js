// Respaldo del esquema inv y restauración comprobada en una BD local (invernadero_restore).
// Uso: node scripts/respaldo.js [--origen supabase|local]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { env } from '../src/supabase.js';
import { sinClave } from './psql.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const { values: a } = parseArgs({ options: { origen: { type: 'string', default: 'supabase' } } });
if (!['supabase', 'local'].includes(a.origen)) throw new Error('--origen debe ser supabase o local');

const bin = (n) => join(env('PG_BIN', 'C:/Program Files/PostgreSQL/18/bin'), n);
const conUrl = (url, bd) => { const u = new URL(url); if (bd) u.pathname = `/${bd}`; return u.toString(); };

// La contraseña viaja en PGPASSWORD (sinClave), nunca en los argumentos; el error solo muestra stderr.
function correr(herramienta, url, args) {
  const c = sinClave(url);
  try {
    return execFileSync(bin(herramienta), ['-d', c.url, ...args], {
      encoding: 'utf8', env: c.env, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    throw new Error(`${herramienta} falló:\n${String(e.stderr || e.message).trim()}`);
  }
}

const urlLocal = env('LOCAL_DB_URL');
const urlOrigen = a.origen === 'local' ? conUrl(urlLocal, 'invernadero_test') : env('SUPABASE_DB_URL');
const urlRestore = conUrl(urlLocal, 'invernadero_restore');
const urlAdmin = conUrl(urlLocal, 'postgres');

const sql = (url, consulta) => correr('psql', url, ['-X', '-tA', '-v', 'ON_ERROR_STOP=1', '-c', consulta]);
const archivo = (url, ruta) => correr('psql', url, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', ruta]);

function conteos(url) {
  const tablas = sql(url, "select tablename from pg_tables where schemaname='inv' order by 1").split(/\r?\n/).filter(Boolean); // psql en Windows usa CRLF
  const res = {};
  for (const t of tablas) res[t] = Number(sql(url, `select count(*) from inv."${t}"`));
  return res;
}

// 1) volcado solo del esquema inv
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const dir = join(RAIZ, 'backups');
mkdirSync(dir, { recursive: true });
const dump = join(dir, `inv_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.sql`);
correr('pg_dump', urlOrigen, ['-n', 'inv', '--no-owner', '--no-privileges', '-f', dump]);
console.log(`Respaldo creado: ${dump}`);

// 2) BD de restauración limpia
sql(urlAdmin, 'drop database if exists invernadero_restore with (force)');
sql(urlAdmin, 'create database invernadero_restore');

// 3) roles/auth de Supabase simulados y luego el volcado
archivo(urlRestore, join(RAIZ, 'bd', 'pruebas', 'stub_supabase.sql'));
archivo(urlRestore, dump);

// 4) comparación de filas por tabla
const origen = conteos(urlOrigen);
const restaurado = conteos(urlRestore);
let ok = true;
console.log('\ntabla'.padEnd(32) + 'origen'.padStart(10) + 'restaurado'.padStart(12));
for (const t of Object.keys({ ...origen, ...restaurado })) {
  const igual = origen[t] === restaurado[t];
  ok &&= igual;
  console.log(t.padEnd(31) + String(origen[t] ?? '-').padStart(10) + String(restaurado[t] ?? '-').padStart(12) + (igual ? '' : '  <-- DIFIERE'));
}
console.log(ok ? '\nRestauración verificada: todas las tablas coinciden.' : '\nERROR: hay tablas que no coinciden.');
console.log(`Copiar este archivo al Google Drive del equipo: ${dump}`);
process.exit(ok ? 0 : 1);
