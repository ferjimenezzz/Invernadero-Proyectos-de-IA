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
    if (!num(seco) || !num(mojado) || !num(offset)) throw new ErrorApi(400, 'raw_dry_point, raw_wet_point y offset_linear deben ser números');
    const data = await datos.calibrar(req.ctx, codigo, { aire_crudo: seco, agua_crudo: mojado, offset });
    res.json(ok({ data }));
  });

  r.get('/audit/logs', async (req, res) => {
    const { device_id: device, severity = 'all', page = '1', per_page: pp = '50' } = req.query;
    if (typeof severity !== 'string' || !SEVERIDADES.includes(severity)) throw new ErrorApi(400, `severity debe ser: ${SEVERIDADES.join(', ')}`);
    if (device !== undefined && (typeof device !== 'string' || device.length > 60)) throw new ErrorApi(400, 'device_id inválido');
    const pagina = Number(page);
    const porPagina = Number(pp);
    if (typeof page !== 'string' || typeof pp !== 'string' || !entero(pagina, 1) || !entero(porPagina, 1)) throw new ErrorApi(400, 'page y per_page deben ser enteros positivos');
    // zone_id se acepta pero no filtra: hay un único invernadero y v_bitacora no tiene zona.
    const lim = Math.min(porPagina, 200);
    const { filas, total } = await datos.bitacora(req.ctx, { device, tipo: severity === 'all' ? undefined : severity, pagina, porPagina: lim });
    res.json(ok({ page: pagina, per_page: lim, total, data: filas.map(filaBitacora) }));
  });

  return r;
}
