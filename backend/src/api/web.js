// Contrato /api/v1 de la web PHP (app web/config/api-contracts.php). Sobre: {status, timestamp, ...}.
import { Router } from 'express';
import { ErrorApi, filaBitacora, telemetriaWeb } from './formato.js';

const SEVERIDADES = ['all', 'telemetry', 'manual', 'auto', 'alert'];
const VELOCIDAD = { OFF: null, Baja: 33, Media: 66, Alta: 100 };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const entero = (v, min, max = Infinity) => Number.isInteger(v) && v >= min && v <= max;

export function rutasWeb({ datos, ahora }) {
  const r = Router();
  const ok = (extra) => ({ status: 'success', timestamp: ahora().toISOString(), ...extra });
  const obj = (b) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new ErrorApi(400, 'Se esperaba un cuerpo JSON');
    return b;
  };

  r.get('/telemetry/live', async (req, res) => {
    const [filas, inv] = await Promise.all([datos.ultimas(req.ctx), datos.invernadero(req.ctx)]);
    res.json(ok({ zone_id: inv.invernadero.id, data: telemetriaWeb(filas, ahora()) }));
  });

  r.post('/actuators/command', async (req, res) => {
    const { actuator_code: codigo, action, parameters } = obj(req.body);
    const p = parameters ?? {};
    if (typeof codigo !== 'string' || !codigo || typeof p !== 'object' || Array.isArray(p)) throw new ErrorApi(400, 'actuator_code y parameters inválidos');
    if (p.duration_minutes != null && !entero(p.duration_minutes, 1, 1440)) throw new ErrorApi(400, 'duration_minutes debe ser un entero entre 1 y 1440');

    let cmd;
    if (action === 'START') cmd = { accion: 'ENCENDER' };
    else if (action === 'STOP') cmd = { accion: 'APAGAR' };
    else if (action === 'SET_POWER') {
      if (!entero(p.power_pct, 0, 100)) throw new ErrorApi(400, 'power_pct debe ser un entero entre 0 y 100');
      cmd = p.power_pct === 0 ? { accion: 'APAGAR' } : { accion: 'ENCENDER', valor: p.power_pct }; // 0 % = apagar
    } else if (action === 'SET_SPEED') {
      if (typeof p.speed !== 'string' || !Object.hasOwn(VELOCIDAD, p.speed)) throw new ErrorApi(400, 'speed debe ser OFF, Baja, Media o Alta');
      cmd = VELOCIDAD[p.speed] == null ? { accion: 'APAGAR' } : { accion: 'ENCENDER', valor: VELOCIDAD[p.speed] };
    } else throw new ErrorApi(400, 'action debe ser START, STOP, SET_SPEED o SET_POWER');
    if (cmd.accion === 'ENCENDER' && p.duration_minutes != null) cmd.duracion_s = p.duration_minutes * 60;

    const actuadores = await datos.actuadores(req.ctx);
    const act = actuadores.find((a) => a.codigo === codigo);
    if (!act) throw new ErrorApi(404, `Actuador desconocido. Códigos válidos: ${actuadores.map((a) => a.codigo).join(', ')}`);
    const c = await datos.crearComando(req.ctx, { actuador_id: act.id, ...cmd, motivo: 'Comando desde la web' });
    res.status(201).json(ok({ data: { command_id: c.id, estado: c.estado } }));
  });

  r.put('/sensors/calibration', async (req, res) => {
    const { sensor_code: codigo, raw_dry_point: seco, raw_wet_point: mojado, offset_linear: offset = 0 } = obj(req.body);
    if (typeof codigo !== 'string' || !codigo || codigo.length > 40) throw new ErrorApi(400, 'sensor_code inválido');
    if (!entero(seco, 0, 4095) || !entero(mojado, 0, 4095) || !num(offset)) throw new ErrorApi(400, 'raw_dry_point y raw_wet_point deben ser enteros 0–4095 (ADC de 12 bits) y offset_linear un número');
    if (seco <= mojado) throw new ErrorApi(400, 'raw_dry_point (aire) debe ser mayor que raw_wet_point (agua) en el sensor capacitivo');
    // El firmware no lee la base (Hardware, 24 nov): se guarda como propuesta sin pisar las constantes reales.
    const propuesta = { aire_crudo: seco, agua_crudo: mojado, offset, solicitada_en: ahora().toISOString() };
    const data = await datos.calibrar(req.ctx, codigo, { propuesta_calibracion: propuesta });
    res.json(ok({ data }));
  });

  r.get('/audit/logs', async (req, res) => {
    const { device_id: device, severity = 'all', page = '1', per_page: pp = '50', from, to } = req.query;
    // severity admite varios separados por coma (p. ej. manual,auto,alert) para no ahogarse en telemetría.
    const tipos = typeof severity === 'string' ? severity.split(',') : [];
    if (!tipos.length || !tipos.every((t) => SEVERIDADES.includes(t))) throw new ErrorApi(400, `severity debe ser: ${SEVERIDADES.join(', ')} (separados por coma)`);
    if (device !== undefined && (typeof device !== 'string' || device.length > 60)) throw new ErrorApi(400, 'device_id inválido');
    const fecha = (v, nombre) => {
      if (v === undefined) return undefined;
      const t = typeof v === 'string' ? Date.parse(v) : NaN;
      if (Number.isNaN(t)) throw new ErrorApi(400, `${nombre} debe ser una fecha ISO 8601`);
      return t;
    };
    const desde = fecha(from, 'from');
    const hasta = fecha(to, 'to');
    if (desde !== undefined && hasta !== undefined && desde >= hasta) throw new ErrorApi(400, 'from debe ser anterior a to');
    const pagina = Number(page);
    const porPagina = Number(pp);
    if (typeof page !== 'string' || typeof pp !== 'string' || !entero(pagina, 1) || !entero(porPagina, 1)) throw new ErrorApi(400, 'page y per_page deben ser enteros positivos');
    // zone_id se acepta pero no filtra: hay un único invernadero y v_bitacora no tiene zona.
    const lim = Math.min(porPagina, 200);
    const { filas, total } = await datos.bitacora(req.ctx, {
      device, tipos: tipos.includes('all') ? undefined : tipos, desde, hasta, pagina, porPagina: lim,
    });
    res.json(ok({ page: pagina, per_page: lim, total, data: filas.map(filaBitacora) }));
  });

  return r;
}
