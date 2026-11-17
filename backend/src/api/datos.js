// Todas las consultas a Supabase del adaptador. Cada método recibe `ctx` ({ token }):
// con Bearer actúa como ese usuario (RLS por usuario); sin él, con la cuenta de equipo (APP_EMAIL).
import { clienteCuenta, clientePublico, env } from '../supabase.js';
import { ErrorApi } from './formato.js';

let cuenta; // promesa del cliente de equipo, creada al primer uso y reutilizada

const cliente = async ({ token } = {}) => {
  if (token) return clientePublico(token);
  cuenta ??= clienteCuenta(env('APP_EMAIL'), env('APP_PASSWORD')).catch((e) => {
    cuenta = undefined; // no cachear el fallo: se reintenta en la siguiente petición
    throw e;
  });
  return cuenta;
};

/** Errores de supabase-js / PostgREST -> ErrorApi (nunca se filtran detalles internos). */
export function aError(e, status) {
  if (e instanceof ErrorApi) return e;
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? '');
  if (/^Falta /.test(msg) || /No se pudo iniciar sesión como/.test(msg)) return new ErrorApi(503, 'Backend sin configurar o cuenta de equipo no disponible');
  if (status === 401 || code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(msg)) return new ErrorApi(401, 'Token inválido o vencido');
  if (code === '42501') return new ErrorApi(403, 'Sin permiso para esta operación');
  if (code === 'P0002' || code === 'PGRST116') return new ErrorApi(404, 'Recurso no encontrado');
  if (/^(22|23)/.test(code) || code.startsWith('PGRST1')) return new ErrorApi(400, 'Datos inválidos para la base de datos');
  if (/fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|timed? ?out|EAI_AGAIN/i.test(msg)) return new ErrorApi(503, 'Supabase no disponible');
  const err = new ErrorApi(500, 'Error interno');
  err.causa = `${code} ${msg}`.trim(); // solo para el log del servidor
  return err;
}

async function q(ctx, f, conCuenta = false) {
  try {
    const r = await f(await cliente(ctx));
    if (r.error) throw aError(r.error, r.status);
    return conCuenta ? r : r.data;
  } catch (e) {
    throw aError(e);
  }
}

const iso = (d) => new Date(d).toISOString();

export function crearDatos() {
  return {
    async login(email, password) {
      try {
        const pub = clientePublico();
        const { data, error } = await pub.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.status === 400 || error.status === 401 || error.status === 422) throw new ErrorApi(401, 'Credenciales inválidas');
          throw aError(error);
        }
        const token = data.session.access_token;
        const usuario = await q({ token }, (c) => c.from('usuario').select('id,nombre,rol').eq('auth_id', data.user.id).maybeSingle());
        return { token, usuario };
      } catch (e) {
        throw aError(e);
      }
    },

    ultimas: (ctx) => q(ctx, (c) => c.from('v_ultima_medicion').select('*').order('codigo')),

    historico: (ctx, { nodo, variable, desde, hasta, intervalo }) =>
      q(ctx, (c) => c.rpc('fn_historico', { p_nodo: nodo, p_variable: variable, p_desde: iso(desde), p_hasta: iso(hasta), p_intervalo: intervalo })),

    async estadistica(ctx, codigo, desde, hasta) {
      const r = await q(ctx, (c) => c.rpc('fn_estadistica', { p_codigo: codigo, p_desde: iso(desde), p_hasta: iso(hasta) }));
      return (Array.isArray(r) ? r[0] : r) ?? null;
    },

    /** { invernadero, cultivo } del (único) invernadero. */
    async invernadero(ctx) {
      const invernadero = await q(ctx, (c) => c.from('invernadero').select('*').order('id').limit(1).maybeSingle());
      if (!invernadero) throw new ErrorApi(404, 'Invernadero no encontrado');
      const cultivo = await q(ctx, (c) => c.from('cultivo').select('*').eq('id', invernadero.cultivo_id).maybeSingle());
      return { invernadero, cultivo };
    },

    estadoNodos: (ctx) => q(ctx, (c) => c.from('v_estado_nodo').select('*').order('codigo')),

    upsertUmbral: (ctx, fila) => q(ctx, (c) => c.from('umbral').upsert(fila, { onConflict: 'cultivo_id,variable_id' })),

    /** Reglas activas con el nombre de su actuador (dos consultas simples, sin depender de FKs embebidas). */
    async reglas(ctx) {
      const [reglas, acts] = await Promise.all([
        q(ctx, (c) => c.from('regla_automatizacion').select('id,nombre,estado_disparador,actuador_id,accion,duracion_s,prioridad').eq('activa', true).order('prioridad')),
        q(ctx, (c) => c.from('actuador').select('id,nombre')),
      ]);
      const nombre = new Map(acts.map((a) => [a.id, a.nombre]));
      return reglas.map((r) => ({ ...r, actuador: nombre.get(r.actuador_id) ?? null }));
    },

    actuadores: (ctx) => q(ctx, (c) => c.from('actuador').select('*').order('id')),

    comandos: (ctx) =>
      q(ctx, (c) => c.from('comando_actuador').select('id,actuador_id,accion,duracion_s,valor,estado,creado_en').order('creado_en', { ascending: false }).limit(100)),

    prediccion: async (ctx) =>
      (await q(ctx, (c) => c.from('prediccion_ia').select('detalle,generado_en').eq('tipo', 'RECOMENDACION').order('generado_en', { ascending: false }).limit(1)))[0] ?? null,

    crearComando: (ctx, fila) =>
      q(ctx, (c) => c.from('comando_actuador').insert({ ...fila, origen: 'MANUAL' }).select('id,estado').single()),

    detenerTodo: (ctx, motivo) => q(ctx, (c) => c.rpc('fn_detener_todo', { p_motivo: motivo })),

    calibrar: (ctx, codigo, calibracion) => q(ctx, (c) => c.rpc('fn_calibrar_sensor', { p_codigo: codigo, p_calibracion: calibracion })),

    async alertas(ctx) {
      const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const [abiertas, resueltas] = await Promise.all([
        q(ctx, (c) => c.from('v_alertas_activas').select('*').order('ultima_vez_en', { ascending: false }).limit(100)),
        q(ctx, (c) =>
          c.from('alerta').select('id,sensor_id,estado,categoria,mensaje,abierta_en,ultima_vez_en,ocurrencias,resuelta_en,reconocida_en')
            .not('resuelta_en', 'is', null).gte('resuelta_en', desde).order('resuelta_en', { ascending: false }).limit(100)),
      ]);
      return { abiertas, resueltas };
    },

    actividades: (ctx) => q(ctx, (c) => c.from('actividad').select('*').order('programada_en', { ascending: false }).limit(100)),

    crearActividad: (ctx, fila) => q(ctx, (c) => c.from('actividad').insert(fila)),

    async bitacora(ctx, { device, tipo, pagina, porPagina }) {
      const r = await q(ctx, (c) => {
        let s = c.from('v_bitacora').select('*', { count: 'exact' });
        if (device) s = s.eq('dispositivo', device);
        if (tipo) s = s.eq('tipo', tipo);
        const desde = (pagina - 1) * porPagina;
        return s.order('ocurrido_en', { ascending: false }).range(desde, desde + porPagina - 1);
      }, true);
      return { filas: r.data, total: r.count ?? r.data.length };
    },
  };
}
