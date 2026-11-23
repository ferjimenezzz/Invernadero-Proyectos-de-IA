// Corre archivos .sql con psql contra el PostgreSQL local o Supabase.
//   node scripts/psql.js [--supabase] [--db nombre] archivo.sql...
//   node scripts/psql.js --pruebas      (npm run test:bd: crea invernadero_test y corre todo)
// Nunca imprime la cadena de conexión (lleva la contraseña).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(join(raiz, '.env'));
} catch {
  // Sin .env: se usan las variables del sistema.
}

export const BD_PRUEBAS = 'invernadero_test';

const binario = () => {
  const dir = process.env.PG_BIN || 'C:\\Program Files\\PostgreSQL\\18\\bin';
  const exe = join(dir, process.platform === 'win32' ? 'psql.exe' : 'psql');
  return existsSync(exe) ? exe : 'psql'; // si no está en PG_BIN, se busca en el PATH
};

// URL de conexión; con db se cambia solo el nombre de la base
export function conexion({ supabase = false, db } = {}) {
  const nombre = supabase ? 'SUPABASE_DB_URL' : 'LOCAL_DB_URL';
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre} en backend/.env (ver .env.example)`);
  const url = new URL(valor);
  if (db) url.pathname = '/' + encodeURIComponent(db);
  return url.toString();
}

// Para psql / pg_dump: la URL sin contraseña (los argumentos se ven en la lista de procesos)
// y la contraseña en PGPASSWORD del proceso hijo.
export function sinClave(url) {
  const u = new URL(url);
  const clave = decodeURIComponent(u.password);
  u.password = '';
  const env = { ...process.env, PGCLIENTENCODING: 'UTF8' }; // los .sql llevan acentos
  if (clave) env.PGPASSWORD = clave;
  return { url: u.toString(), env };
}

// Ejecuta psql; devuelve { ok, stdout, stderr }. Los archivos van con ON_ERROR_STOP.
// entrada: SQL por stdin (en Windows los argumentos no-ASCII llegan en la página de códigos ANSI).
export function psql(url, args, entrada) {
  const c = sinClave(url);
  const r = spawnSync(binario(), ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', c.url, ...args], {
    encoding: 'utf8',
    env: c.env,
    input: entrada,
  });
  if (r.error) return { ok: false, stdout: '', stderr: `No se pudo ejecutar psql: ${r.error.message}` };
  return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr };
}

function pruebas() {
  const servidor = conexion();
  const prep = psql(servidor, [
    '-c', `DROP DATABASE IF EXISTS ${BD_PRUEBAS} WITH (FORCE)`,
    '-c', `CREATE DATABASE ${BD_PRUEBAS}`,
  ]);
  if (!prep.ok) {
    console.error(`FAIL  crear ${BD_PRUEBAS}\n${prep.stderr}`);
    return 1;
  }
  const url = conexion({ db: BD_PRUEBAS });
  const archivos = [
    'bd/pruebas/stub_supabase.sql',
    'bd/invernadero_bd.sql',
    'bd/supabase.sql',
    'bd/pruebas/pruebas_restricciones.sql',
    'bd/pruebas/pruebas_ingesta.sql',
    'bd/pruebas/pruebas_rls.sql',
  ];
  let fallas = 0;
  for (const archivo of archivos) {
    const r = psql(url, ['-f', join(raiz, archivo)]);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${archivo}`);
    if (!r.ok) {
      fallas++;
      console.error(r.stderr.trim());
      if (!archivo.includes('/pruebas_')) break; // sin esquema no tiene caso seguir
    }
  }
  console.log(fallas ? `${fallas} archivo(s) con fallas` : `Todo en verde (BD ${BD_PRUEBAS})`);
  return fallas ? 1 : 0;
}

function main(argv) {
  if (argv.includes('--pruebas')) return pruebas();
  let supabase = false;
  let db;
  const archivos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--supabase') supabase = true;
    else if (argv[i] === '--db') db = argv[++i];
    else archivos.push(argv[i]);
  }
  if (!archivos.length || (argv.includes('--db') && !db)) {
    console.error('Uso: node scripts/psql.js [--supabase] [--db nombre] archivo.sql...\n     node scripts/psql.js --pruebas');
    return 2;
  }
  const url = conexion({ supabase, db });
  for (const archivo of archivos) {
    const r = psql(url, ['-f', archivo]);
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
    console.log(`${r.ok ? 'OK   ' : 'ERROR'} ${archivo}`);
    if (!r.ok) return 1;
  }
  return 0;
}

// Solo corre como programa (diccionario.js importa conexion y psql)
const mismo = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
if (process.argv[1] && mismo(fileURLToPath(import.meta.url), process.argv[1])) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
