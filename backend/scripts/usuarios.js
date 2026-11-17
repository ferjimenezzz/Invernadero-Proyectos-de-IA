// Crea las cuentas de equipo en Supabase Auth (service_role) y fija su rol en inv.usuario.
//   npm run usuarios            crea las que falten y corrige rol (no toca contraseñas existentes)
//   npm run usuarios -- --reset regenera TODAS las contraseñas
// Escribe correos y contraseñas en backend/.env. Nunca imprime contraseñas.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { clienteServicio } from '../src/supabase.js';

const CUENTAS = [
  { prefijo: 'APP', email: 'eq-app@invernadero.test', rol: 'OPERADOR' },
  { prefijo: 'AUTOMATIZACION', email: 'eq-automatizacion@invernadero.test', rol: 'AUTOMATIZACION' },
  { prefijo: 'CONECTIVIDAD', email: 'eq-conectividad@invernadero.test', rol: 'CONECTIVIDAD' },
  { prefijo: 'HARDWARE', email: 'eq-hardware@invernadero.test', rol: 'HARDWARE' },
  { prefijo: 'LECTOR', email: 'prueba-lector@invernadero.test', rol: 'LECTOR' },
];
const RUTA_ENV = fileURLToPath(new URL('../.env', import.meta.url));
const reset = process.argv.includes('--reset');
const nuevaClave = () => randomBytes(18).toString('base64url');

/** Pone KEY=valor en el texto del .env (reemplaza la línea o la agrega al final). */
function fijar(texto, clave, valor) {
  const linea = `${clave}=${valor}`;
  const re = new RegExp(`^${clave}=.*$`, 'm');
  return re.test(texto) ? texto.replace(re, () => linea) : `${texto}${texto && !texto.endsWith('\n') ? '\n' : ''}${linea}\n`;
}

async function usuariosAuth(admin) {
  const todos = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    todos.push(...data.users);
    if (data.users.length < 200) return todos;
  }
}

const cliente = clienteServicio();
const existentes = new Map((await usuariosAuth(cliente)).map((u) => [u.email, u]));
let env = existsSync(RUTA_ENV) ? readFileSync(RUTA_ENV, 'utf8') : '';

for (const { prefijo, email, rol } of CUENTAS) {
  let usuario = existentes.get(email);
  let clave = null;
  let accion = 'existente';

  if (!usuario) {
    clave = nuevaClave();
    const { data, error } = await cliente.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (error) throw new Error(`No se pudo crear ${email}: ${error.message}`);
    usuario = data.user;
    accion = 'creada';
  } else if (reset) {
    clave = nuevaClave();
    const { error } = await cliente.auth.admin.updateUserById(usuario.id, { password: clave });
    if (error) throw new Error(`No se pudo reiniciar la contraseña de ${email}: ${error.message}`);
    accion = 'contraseña regenerada';
  }

  // El trigger de la BD crea el perfil como LECTOR; aquí se corrige el rol.
  const { data: filas, error } = await cliente.from('usuario').update({ rol }).eq('auth_id', usuario.id).select('id');
  if (error) throw new Error(`No se pudo fijar el rol de ${email}: ${error.message}`);
  const aviso = filas.length ? '' : ' (AVISO: sin perfil en inv.usuario, revisa el trigger)';

  env = fijar(env, `${prefijo}_EMAIL`, email);
  if (clave) env = fijar(env, `${prefijo}_PASSWORD`, clave);
  else if (!new RegExp(`^${prefijo}_PASSWORD=.+`, 'm').test(env))
    console.warn(`  ${email}: no hay ${prefijo}_PASSWORD en .env; ejecuta con --reset para generarla`);
  console.log(`${email} -> ${rol}: ${accion}${aviso}`);
}

writeFileSync(RUTA_ENV, env);
console.log('backend/.env actualizado (las contraseñas no se muestran).');
