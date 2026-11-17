// Rutas en español que consume la app móvil (Expo). Respuestas listas para mostrar.
import { Router } from 'express';
import os from 'node:os';
import {
  ErrorApi, actividadDeBorrador, actividadMovil, comandoDeMovil, detalleSensor, invernaderoMovil,
  medicionesActual, notificacionAlerta, nodoRed, perfilMovil, resumenActividades, resumenActuadores,
  sensorMovil, serieMovil, valorActual,
} from './formato.js';

const HORA = 3_600_000;
const VARIABLES = { temperatura: 'temperatura_aire', humedad: 'humedad_aire', luz: 'iluminancia' };
const RANGOS = { '1h': [HORA, '5 minutes'], '6h': [6 * HORA, '30 minutes'], '24h': [24 * HORA, '1 hour'], '7d': [168 * HORA, '6 hours'] };
const ID = /^[A-Za-z0-9_-]{1,40}$/;

const esObjeto = (b) => b && typeof b === 'object' && !Array.isArray(b);
const cuerpo = (req) => {
  if (!esObjeto(req.body)) throw new ErrorApi(400, 'Se esperaba un cuerpo JSON');
  return req.body;
};
const texto = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const buscar = (mapa, clave) => (typeof clave === 'string' && Object.hasOwn(mapa, clave) ? mapa[clave] : undefined);

export function rutasMovil({ datos, ahora }) {
  const r = Router();
  const sensorOr404 = async (ctx, id) => {
    const filas = await datos.ultimas(ctx);
    const row = ID.test(id) ? filas.find((x) => x.codigo === id) : undefined;
    if (!row) throw new ErrorApi(404, 'Dispositivo no encontrado');
    return { row, filas };
  };

  r.post('/auth/login', async (req, res) => {
    const { email, password } = cuerpo(req);
    if (!texto(email, 254) || !texto(password, 256)) throw new ErrorApi(400, 'email y password son obligatorios');
    const { token, usuario } = await datos.login(email, password);
    res.json(perfilMovil(usuario, email, token));
  });

  r.get('/mediciones/actual', async (req, res) => {
    res.json(medicionesActual(await datos.ultimas(req.ctx), ahora()));
  });

  r.get('/mediciones/historico', async (req, res) => {
    const variable = buscar(VARIABLES, req.query.variable);
    const rango = buscar(RANGOS, req.query.rango);
    if (!variable || !rango) throw new ErrorApi(400, 'variable (temperatura|humedad|luz) y rango (1h|6h|24h|7d) son obligatorios');
    const filas = await datos.ultimas(req.ctx);
    const row = filas.find((x) => x.variable === variable);
    if (!row) throw new ErrorApi(404, 'No hay sensor para esa variable');
    const hasta = ahora().getTime();
    const desde = hasta - rango[0];
    const hist = await datos.historico(req.ctx, { nodo: row.nodo, variable, desde, hasta, intervalo: rango[1] });
    res.json(serieMovil({ variable: req.query.variable, row, filas: hist, desde, hasta, rango: req.query.rango }));
  });

  r.get('/dispositivos', async (req, res) => {
    const t = ahora();
    res.json((await datos.ultimas(req.ctx)).map((x) => sensorMovil(x, t)));
  });

  r.get('/dispositivos/:id/detalle', async (req, res) => {
    const { row } = await sensorOr404(req.ctx, req.params.id);
    const t = ahora();
    const hasta = t.getTime();
    const desde = hasta - 24 * HORA;
    const [stats, hist, reglas, inv, nodos] = await Promise.all([
      datos.estadistica(req.ctx, row.codigo, desde, hasta),
      datos.historico(req.ctx, { nodo: row.nodo, variable: row.variable, desde, hasta, intervalo: '1 hour' }),
      datos.reglas(req.ctx),
      datos.invernadero(req.ctx),
      datos.estadoNodos(req.ctx),
    ]);
    res.json(detalleSensor({
      row, stats, reglas, cultivo: inv.cultivo, ahora: t, desde, hasta,
      historico: row.indice == null ? hist : hist.filter((h) => h.indice === row.indice),
      firmware: nodos.find((n) => n.codigo === row.nodo)?.firmware_version,
    }));
  });

  r.post('/dispositivos/:id/calibrar', async (req, res) => {
    const { row } = await sensorOr404(req.ctx, req.params.id);
    await datos.calibrar(req.ctx, row.codigo, { solicitud_calibracion: ahora().toISOString() });
    res.status(204).end();
  });

  r.put('/umbrales/:sensorId', async (req, res) => {
    const { min, max } = cuerpo(req);
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!num(min) || !num(max) || min >= max) throw new ErrorApi(400, 'min y max deben ser números con min < max');
    const { row } = await sensorOr404(req.ctx, req.params.sensorId);
    if ((row.rango_min != null && min < Number(row.rango_min)) || (row.rango_max != null && max > Number(row.rango_max)))
      throw new ErrorApi(400, `Los umbrales deben estar entre ${row.rango_min} y ${row.rango_max} ${row.unidad ?? ''}`.trim());
    const { invernadero } = await datos.invernadero(req.ctx);
    await datos.upsertUmbral(req.ctx, { cultivo_id: invernadero.cultivo_id, variable_id: row.variable_id, min_optimo: min, max_optimo: max });
    res.status(204).end();
  });

  r.get('/actuadores', async (req, res) => {
    const [actuadores, comandos, reglas, filas, prediccion] = await Promise.all([
      datos.actuadores(req.ctx), datos.comandos(req.ctx), datos.reglas(req.ctx), datos.ultimas(req.ctx), datos.prediccion(req.ctx),
    ]);
    const t = ahora();
    res.json(resumenActuadores({
      actuadores, comandos, reglas, prediccion, ahora: t.getTime(), temperatura: valorActual(filas, 'temperatura_aire', t),
    }));
  });

  // Rutas fijas antes que /actuadores/:id.
  r.post('/actuadores/detener-todo', async (req, res) => {
    await datos.detenerTodo(req.ctx, 'Parada de emergencia desde la app móvil');
    res.status(204).end();
  });

  r.post('/actuadores/riego-manual', async (req, res) => {
    const { activo } = cuerpo(req);
    if (typeof activo !== 'boolean') throw new ErrorApi(400, 'activo debe ser booleano');
    const bomba = (await datos.actuadores(req.ctx)).find((a) => a.tipo === 'BOMBA');
    if (!bomba) throw new ErrorApi(404, 'No hay bomba de riego registrada');
    await datos.crearComando(req.ctx, { actuador_id: bomba.id, accion: activo ? 'ENCENDER' : 'APAGAR', motivo: 'Riego manual desde la app móvil' });
    res.status(204).end();
  });

  r.patch('/actuadores/:id', async (req, res) => {
    const cmd = comandoDeMovil(cuerpo(req));
    if (!cmd) throw new ErrorApi(400, 'Envía exactamente uno: encendido (boolean), pwm (0-100) o nivel (off|low|high)');
    const act = (await datos.actuadores(req.ctx)).find((a) => a.codigo === req.params.id);
    if (!act) throw new ErrorApi(404, 'Actuador no encontrado');
    await datos.crearComando(req.ctx, { actuador_id: act.id, ...cmd, motivo: 'Control manual desde la app móvil' });
    res.status(204).end();
  });

  r.get('/alertas', async (req, res) => {
    const [{ abiertas, resueltas }, filas] = await Promise.all([datos.alertas(req.ctx), datos.ultimas(req.ctx)]);
    const porSensor = new Map();
    for (const f of filas) if (!porSensor.has(f.sensor_id)) porSensor.set(f.sensor_id, f);
    const t = ahora();
    const de = (a, resuelta) => {
      const s = porSensor.get(a.sensor_id);
      return notificacionAlerta({ sensor: s?.sensor, ...a }, { codigoSensor: s?.codigo, resuelta }, t);
    };
    res.json([...abiertas.map((a) => de(a, false)), ...resueltas.map((a) => de(a, true))]);
  });

  r.get('/actividades', async (req, res) => {
    const filas = await datos.actividades(req.ctx);
    const t = ahora();
    res.json({ summary: resumenActividades(filas, t), items: filas.map((a) => actividadMovil(a, t)) });
  });

  r.post('/actividades', async (req, res) => {
    const { fila, error } = actividadDeBorrador(req.body);
    if (error) throw new ErrorApi(400, error);
    await datos.crearActividad(req.ctx, fila);
    res.status(204).end();
  });

  r.get('/invernaderos/actual', async (req, res) => {
    const [inv, nodos] = await Promise.all([datos.invernadero(req.ctx), datos.estadoNodos(req.ctx)]);
    res.json(invernaderoMovil(inv, nodos));
  });

  r.get('/red/estado', async (req, res) => {
    const t0 = Date.now();
    let nodos = [];
    let nube = true;
    try {
      nodos = await datos.estadoNodos(req.ctx); // consulta mínima: su tiempo es la latencia
    } catch (e) {
      if (e.estado === 401 || e.estado === 403) throw e;
      nube = false;
    }
    const latencyMs = nube ? Date.now() - t0 : 0;
    const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address ?? '127.0.0.1';
    const t = ahora();
    res.json({
      mode: 'real',
      synced: nodos.length > 0 && nodos.every((n) => n.en_linea),
      gateway: {
        band: 'WiFi 2.4 GHz',
        apiUrl: `${req.protocol}://${req.get('host')}`,
        ip,
        mac: 'N/D',
        port: String(req.socket.localPort ?? ''),
        portOpen: true,
        latencyMs,
      },
      nodes: nodos.map((n) => nodoRed(n, t)),
      cloudSync: nube,
    });
  });

  return r;
}
