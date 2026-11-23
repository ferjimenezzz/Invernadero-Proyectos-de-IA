// Pruebas del adaptador REST sin red: crearApp con un `datos` falso y fetch contra un puerto efímero.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Contraseña de prueba generada al vuelo: el login de estas pruebas es falso y no hay ninguna cuenta real.
const CLAVE = randomUUID();
import { crearApp } from '../src/api/app.js';
import { ErrorApi, bandaConfort, comandoDeMovil, cuando, etiquetasX, hora12, puntoRocio, relativo, telemetriaWeb, vpd, medicionesActual, actividadDeBorrador, resumenActuadores } from '../src/api/formato.js';
import { aError, filtrosBitacora } from '../src/api/datos.js';

const AHORA = new Date('2026-11-17T18:00:00Z'); // 12:00 en Ciudad de México
const hace = (s) => new Date(AHORA - s * 1000).toISOString();

const fila = (o) => ({
  nodo: 'invernadero_albahaca_01', sensor_id: 1, variable_id: 1, sensor: 'DHT22', modelo: 'DHT22', pines: 'GPIO4', indice: 1, zona: null,
  unidad: '°C', rango_min: -40, rango_max: 80, valor: 24.2, valido: true, estado: 'OK', categoria: 'NORMAL', estado_descripcion: 'Lectura normal',
  accion_sugerida: null, tomado_en: hace(60), evaluacion: 'OPTIMO', min_optimo: 20, max_optimo: 26, min_critico: 10, max_critico: 35,
  tendencia: [23.5, 23.8, 24, 24.2], ...o,
});
const FILAS = [
  fila({ codigo: 'SENS-ENV-01', variable: 'temperatura_aire', variable_nombre: 'Temperatura del aire' }),
  fila({ codigo: 'SENS-HUM-01', variable: 'humedad_aire', variable_nombre: 'Humedad del aire', unidad: '%', valor: 62, sensor_id: 2, variable_id: 2, min_optimo: 50, max_optimo: 70 }),
  fila({ codigo: 'SENS-LUX-01', variable: 'iluminancia', variable_nombre: 'Iluminancia', unidad: 'lux', valor: 18500, sensor_id: 3, variable_id: 3, tendencia: [18000], min_optimo: null, max_optimo: null, min_critico: null, max_critico: null, evaluacion: 'SIN_UMBRAL' }),
  fila({ codigo: 'SENS-TEMP-S01', variable: 'temperatura_suelo', variable_nombre: 'Temperatura del suelo', valor: 22.1, sensor_id: 4, variable_id: 4 }),
  fila({ codigo: 'SENS-SOIL-01', variable: 'humedad_suelo', variable_nombre: 'Humedad del suelo', unidad: '%', valor: 60, zona: 'Zona 1', sensor_id: 5, variable_id: 5, rango_min: 0, rango_max: 100 }),
  fila({ codigo: 'SENS-SOIL-02', variable: 'humedad_suelo', variable_nombre: 'Humedad del suelo', unidad: '%', valor: 70, zona: 'Zona 2', sensor_id: 6, variable_id: 5, categoria: 'ALERTA', evaluacion: 'FUERA_DE_OPTIMO', rango_min: 0, rango_max: 100 }),
  fila({ codigo: 'SENS-SOIL-03', variable: 'humedad_suelo', variable_nombre: 'Humedad del suelo', unidad: '%', valor: 0, valido: false, zona: 'Zona 3', sensor_id: 7, variable_id: 5, categoria: 'ERROR_HW', evaluacion: 'SIN_DATO_VALIDO' }),
  // HC-SR04: dos variables del mismo sensor; la distancia (menor id) no tiene umbral, el nivel sí.
  fila({ codigo: 'SENS-DIST-01', variable: 'distancia_agua', variable_nombre: 'Distancia al agua', unidad: 'cm', valor: 12, sensor_id: 8, variable_id: 4, zona: 'Tanque principal', min_optimo: null, max_optimo: null, min_critico: null, max_critico: null, evaluacion: 'SIN_UMBRAL' }),
  fila({ codigo: 'SENS-TANK-01', variable: 'nivel_tanque', variable_nombre: 'Nivel del tanque', unidad: '%', valor: null, valido: null, tomado_en: null, categoria: 'DESCONOCIDO', evaluacion: 'SIN_LECTURA', tendencia: [], sensor_id: 8, variable_id: 6, zona: 'Tanque principal' }),
];
const ACTUADORES = [
  { id: 1, codigo: 'ACT-BOMBA-01', nombre: 'Bomba de riego', tipo: 'BOMBA', encendido: false, valor: 0, actualizado_en: hace(600) },
  { id: 2, codigo: 'ACT-LUZ-01', nombre: 'Lámpara LED', tipo: 'ILUMINACION', encendido: true, valor: 75, actualizado_en: hace(600) },
  { id: 3, codigo: 'ACT-VENT-01', nombre: 'Extractor', tipo: 'VENTILADOR', encendido: false, valor: 0, actualizado_en: hace(600) },
  { id: 4, codigo: 'ACT-MALLA-01', nombre: 'Malla', tipo: 'MALLA_SOMBRA', encendido: false, valor: 0, actualizado_en: hace(600) },
];

const llamadas = [];
const registrar = (n) => (...a) => (llamadas.push([n, ...a]), undefined);
const datos = {
  login: async (email, pass) => {
    if (pass !== CLAVE) throw new ErrorApi(401, 'Credenciales inválidas');
    return { token: 'tok123', usuario: { id: 7, nombre: 'Equipo App', rol: 'OPERADOR' } };
  },
  ultimas: async () => FILAS,
  historico: async () => [60, 50, 40, 30].map((m, i) => ({ sensor: 'DHT22', indice: 1, periodo: hace(m * 60), promedio: 23 + i * 0.5, minimo: 22, maximo: 25, lecturas: 10 })),
  estadistica: async () => ({ minimo: 21, minimo_en: hace(7200), promedio: 23.5, maximo: 26, maximo_en: hace(3600), lecturas: 100 }),
  invernadero: async () => ({
    invernadero: { id: 1, nombre: 'Invernadero de albahaca', largo_cm: 100, ancho_cm: 60, area_m2: 0.6, cultivo_id: 9 },
    cultivo: { id: 9, nombre_comun: 'Albahaca', nombre_cientifico: 'Ocimum basilicum' },
  }),
  estadoNodos: async () => [{ codigo: 'invernadero_albahaca_01', ultima_conexion: hace(30), en_linea: true, firmware_version: '1.2.0' }],
  upsertUmbral: registrar('upsertUmbral'),
  reglas: async () => [{ id: 1, nombre: 'Riego si suelo seco', estado_disparador: 'SECO', actuador_id: 1, accion: 'ENCENDER', actuador: 'Bomba de riego' }],
  actuadores: async () => ACTUADORES,
  comandos: async () => [{ id: 10, actuador_id: 1, accion: 'ENCENDER', duracion_s: 300, valor: null, estado: 'PENDIENTE', creado_en: hace(60) }],
  prediccion: async () => null,
  crearComando: async (ctx, f) => (llamadas.push(['crearComando', f]), { id: 99, estado: 'PENDIENTE' }),
  detenerTodo: registrar('detenerTodo'),
  calibrar: async (ctx, codigo, c) => (llamadas.push(['calibrar', codigo, c]), codigo === 'NOPE' ? Promise.reject(new ErrorApi(404, 'x')) : { ok: true }),
  alertas: async () => ({
    abiertas: [{ id: 1, sensor: 'DHT22', sensor_id: 6, estado: 'ALTO', categoria: 'ALERTA', mensaje: 'Humedad alta', accion_sugerida: 'Ventilar', abierta_en: hace(900), ultima_vez_en: hace(60), ocurrencias: 3, reconocida: false }],
    resueltas: [{ id: 2, sensor_id: 8, estado: 'ERROR', categoria: 'ERROR_HW', mensaje: 'Sensor sin señal', abierta_en: hace(7200), ultima_vez_en: hace(6000), ocurrencias: 1, resuelta_en: hace(3600), reconocida_en: null }],
  }),
  actividades: async () => [{ id: 1, tipo: 'RIEGO', cantero: 'c1', programada_en: hace(3600), responsable: { initials: 'CM', name: 'Carlos M.', role: 'Estudiante' }, descripcion: 'Regar el cantero uno', observaciones: null, estado: 'EN_PROCESO', fotos: [] }],
  crearActividad: registrar('crearActividad'),
  bitacora: async (ctx, f) => (llamadas.push(['bitacora', f]), { total: 120, filas: [{ ocurrido_en: hace(60), tipo: 'manual', dispositivo: 'ACT-BOMBA-01', detalle: 'ENCENDER', disparador: 'MANUAL', estado: 'CONFIRMADO' }] }),
};

let servidor, base;
before(async () => {
  servidor = crearApp({ datos, ahora: () => AHORA }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

async function pedir(metodo, ruta, cuerpo, cabeceras = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }), ...cabeceras },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  return { status: res.status, texto, json: texto ? JSON.parse(texto) : undefined, res };
}

/* ── comprobadores de forma según app móvil/src/types ── */
const tipo = (v, t, ruta) => assert.equal(typeof v, t, `${ruta} debe ser ${t}`);
const en = (v, lista, ruta) => assert.ok(lista.includes(v), `${ruta}=${v} no está en ${lista}`);
const NIVELES = ['normal', 'warning', 'critical'];
const icono = (v, ruta) => assert.ok(typeof v === 'string' && v.length > 0, `${ruta} icono`);
const campos = (o, lista, ruta) => lista.forEach((k) => assert.ok(o[k] !== undefined, `${ruta}.${k} falta`));

function sensor(s) {
  campos(s, ['id', 'name', 'location', 'icon', 'online', 'status', 'readingLabel', 'value', 'unit', 'trend', 'trendLabel', 'lastSeen', 'hardware'], 'Sensor');
  en(s.status, NIVELES, 'status');
  tipo(s.online, 'boolean', 'online');
  assert.ok(Array.isArray(s.trend) && s.trend.every((n) => typeof n === 'number') && s.trend.length !== 1, 'trend 0 o >=2 puntos');
  icono(s.trendLabel.icon); tipo(s.trendLabel.text, 'string', 'trendLabel.text');
  icono(s.hardware.icon); tipo(s.hardware.text, 'string', 'hardware.text');
}
function puntos(p) {
  assert.ok(p.length !== 1, 'la gráfica no admite 1 punto');
  p.forEach((x) => { tipo(x.label, 'string', 'label'); tipo(x.value, 'number', 'value'); });
}
function actuador(a) {
  campos(a, ['kind', 'id', 'name', 'icon', 'iconBg', 'on', 'statusText', 'toggleIcon', 'rule'], 'Actuator');
  en(a.iconBg, ['primary', 'lime', 'dark'], 'iconBg');
  en(a.kind, ['pump', 'light', 'fan'], 'kind');
  if (a.kind === 'pump') tipo(a.remaining, 'string', 'remaining');
  if (a.kind === 'light') tipo(a.pwm, 'number', 'pwm');
  if (a.kind === 'fan') { en(a.level, ['off', 'low', 'high'], 'level'); tipo(a.tempBadge, 'string', 'tempBadge'); }
  icono(a.rule.icon); tipo(a.rule.text, 'string', 'rule.text');
}
function notificacion(n) {
  campos(n, ['id', 'kind', 'tag', 'icon', 'title', 'body', 'time', 'read', 'footer'], 'AppNotification');
  en(n.kind, ['advertencia', 'red', 'critica', 'actividad'], 'kind');
  (n.actions ?? []).forEach((a) => en(a.action, ['programarRiego', 'verSensor', 'verBitacora', 'completar'], 'action'));
}
function actividad(a) {
  campos(a, ['id', 'type', 'icon', 'location', 'when', 'status', 'title', 'description', 'assignee'], 'Activity');
  en(a.status, ['pendiente', 'enProceso', 'completada'], 'status');
  en(a.type, ['riego', 'inspeccion', 'medicion', 'fertilizacion', 'mantenimiento'], 'type');
  campos(a.assignee, ['initials', 'name', 'role'], 'assignee');
}

describe('rutas móviles', () => {
  test('GET y HEAD / responden 200 y CORS', async () => {
    const g = await pedir('GET', '/');
    assert.equal(g.status, 200);
    assert.deepEqual(g.json, { ok: true });
    assert.equal(g.res.headers.get('access-control-allow-origin'), '*');
    assert.equal((await pedir('HEAD', '/')).status, 200);
    const o = await pedir('OPTIONS', '/actuadores');
    assert.equal(o.status, 204);
    assert.match(o.res.headers.get('access-control-allow-methods'), /PATCH/);
  });

  test('login: perfil con token, 400 y 401', async () => {
    const ok = await pedir('POST', '/auth/login', { email: 'a@b.c', password: CLAVE });
    assert.equal(ok.status, 200);
    campos(ok.json, ['id', 'name', 'role', 'faculty', 'stats', 'token'], 'UserProfile');
    assert.equal(ok.json.id, '7');
    assert.equal(ok.json.role, 'Operador');
    assert.equal((await pedir('POST', '/auth/login', { email: 'a@b.c' })).status, 400);
    assert.equal((await pedir('POST', '/auth/login', '{roto')).status, 400);
    assert.equal((await pedir('POST', '/auth/login', { email: 'a@b.c', password: `${CLAVE}-mal` })).status, 401);
  });

  test('Authorization mal formado -> 401', async () => {
    assert.equal((await pedir('GET', '/dispositivos', undefined, { Authorization: 'Basic xx' })).status, 401);
    assert.equal((await pedir('GET', '/dispositivos', undefined, { Authorization: 'Bearer abc' })).status, 200);
  });

  test('mediciones/actual: solo válidos, promedio de suelo, null si falla', async () => {
    const { json } = await pedir('GET', '/mediciones/actual');
    assert.deepEqual(json, { temp: 24.2, 'hum-aire': 62, 'hum-suelo': 65, luz: 18500 }); // zona 3 inválida no cuenta
  });

  test('mediciones/historico: serie válida y 400', async () => {
    const { status, json } = await pedir('GET', '/mediciones/historico?variable=temperatura&rango=6h');
    assert.equal(status, 200);
    campos(json, ['variable', 'unit', 'comfortMin', 'comfortMax', 'xLabels', 'points', 'sensorName'], 'ChartSeries');
    assert.equal(json.comfortMin, 20);
    assert.equal(json.xLabels.length, 4);
    puntos(json.points);
    const luz = (await pedir('GET', '/mediciones/historico?variable=luz&rango=1h')).json; // sin umbral: banda = rango de datos
    assert.ok(luz.comfortMin <= luz.comfortMax && luz.points.length >= 2);
    for (const q of ['', '?variable=x&rango=1h', '?variable=luz&rango=2h', '?variable=__proto__&rango=1h'])
      assert.equal((await pedir('GET', '/mediciones/historico' + q)).status, 400, q);
  });

  test('dispositivos: un Sensor por fila, sin lectura -> "--" y offline', async () => {
    const { json } = await pedir('GET', '/dispositivos');
    assert.equal(json.length, FILAS.length);
    json.forEach(sensor);
    const lux = json.find((s) => s.id === 'SENS-LUX-01');
    assert.equal(lux.value, '18,500');
    assert.deepEqual(lux.trend, []);
    const tanque = json.find((s) => s.id === 'SENS-TANK-01');
    assert.equal(tanque.value, '--');
    assert.equal(tanque.online, false);
    assert.equal(json.find((s) => s.id === 'SENS-SOIL-02').status, 'warning');
    assert.equal(json.find((s) => s.id === 'SENS-SOIL-01').location, 'Zona 1'); // sin "Zona Zona 1"
    assert.equal(json.find((s) => s.id === 'SENS-SOIL-03').status, 'critical');
  });

  test('dispositivos/:id/detalle y 404', async () => {
    const { status, json } = await pedir('GET', '/dispositivos/SENS-ENV-01/detalle');
    assert.equal(status, 200);
    campos(json, ['id', 'module', 'title', 'icon', 'value', 'unit', 'status', 'statusLabel', 'lastTransmission', 'signal', 'battery', 'firmware', 'stats', 'history', 'crop', 'rules', 'thresholdEditor'], 'SensorDetail');
    assert.equal(json.stats.length, 3);
    puntos(json.history.points);
    tipo(json.history.threshold, 'number', 'threshold');
    json.rules.forEach((r) => { en(r.tone, ['warning', 'success', 'danger'], 'tone'); icono(r.icon); });
    json.thresholdEditor.automations.forEach((a) => campos(a, ['id', 'icon', 'title', 'description'], 'Automation'));
    assert.equal(json.firmware, 'FW v1.2.0');
    assert.equal(json.crop.scientific, 'Ocimum basilicum');
    assert.equal((await pedir('GET', '/dispositivos/NOPE/detalle')).status, 404);
  });

  test('calibrar: 204 y 404', async () => {
    const ok = await pedir('POST', '/dispositivos/SENS-ENV-01/calibrar');
    assert.equal(ok.status, 204);
    assert.equal(ok.texto, '');
    assert.equal((await pedir('POST', '/dispositivos/NOPE/calibrar')).status, 404);
  });

  test('umbrales: 204, 400 (tipos, min>=max, fuera de rango) y 404', async () => {
    llamadas.length = 0;
    assert.equal((await pedir('PUT', '/umbrales/SENS-HUM-01', { min: 55, max: 75 })).status, 204);
    assert.deepEqual(llamadas.find((l) => l[0] === 'upsertUmbral').at(-1), { cultivo_id: 9, variable_id: 2, min_optimo: 55, max_optimo: 75 });
    for (const b of [{ min: '5', max: 9 }, { min: 9, max: 9 }, { min: 0, max: 101 }, {}])
      assert.equal((await pedir('PUT', '/umbrales/SENS-SOIL-01', b)).status, 400, JSON.stringify(b));
    assert.equal((await pedir('PUT', '/umbrales/NOPE', { min: 1, max: 2 })).status, 404);
  });

  test('actuadores: omite tipos no soportados y refleja el comando pendiente', async () => {
    const { json } = await pedir('GET', '/actuadores');
    campos(json, ['linked', 'totalPower', 'actuators', 'insight'], 'ActuatorsOverview');
    assert.equal(json.linked, 3);
    json.actuators.forEach(actuador);
    const bomba = json.actuators.find((a) => a.id === 'ACT-BOMBA-01');
    assert.equal(bomba.on, true); // comando ENCENDER pendiente más nuevo que el estado
    assert.match(bomba.statusText, /confirmación/);
    assert.match(bomba.remaining, /^\d\d:\d\d$/);
    assert.notEqual(bomba.remaining, '--:--');
    assert.equal(json.actuators.find((a) => a.kind === 'fan').tempBadge, '24.2°C');
  });

  test('PATCH actuadores: comandos, 400 y 404', async () => {
    llamadas.length = 0;
    for (const [b, esperado] of [
      [{ encendido: true }, { accion: 'ENCENDER' }], [{ encendido: false }, { accion: 'APAGAR' }],
      [{ pwm: 40 }, { accion: 'ENCENDER', valor: 40 }], [{ pwm: 0 }, { accion: 'APAGAR' }],
      [{ nivel: 'off' }, { accion: 'APAGAR' }], [{ nivel: 'low' }, { accion: 'ENCENDER', valor: 50 }], [{ nivel: 'high' }, { accion: 'ENCENDER', valor: 100 }],
    ]) {
      llamadas.length = 0;
      const r = await pedir('PATCH', '/actuadores/ACT-LUZ-01', b);
      assert.equal(r.status, 204, JSON.stringify(b));
      assert.equal(r.texto, '');
      assert.deepEqual(llamadas[0][1], { actuador_id: 2, ...esperado, motivo: 'Control manual desde la app móvil' });
    }
    for (const b of [{}, { encendido: true, pwm: 1 }, { pwm: 101 }, { pwm: 1.5 }, { nivel: 'x' }, { encendido: 'si' }, { otro: 1 }])
      assert.equal((await pedir('PATCH', '/actuadores/ACT-LUZ-01', b)).status, 400, JSON.stringify(b));
    assert.equal((await pedir('PATCH', '/actuadores/NOPE', { encendido: true })).status, 404);
  });

  test('detener-todo y riego-manual -> 204', async () => {
    assert.equal((await pedir('POST', '/actuadores/detener-todo')).status, 204);
    llamadas.length = 0;
    assert.equal((await pedir('POST', '/actuadores/riego-manual', { activo: true })).status, 204);
    assert.equal(llamadas[0][1].actuador_id, 1);
    assert.equal((await pedir('POST', '/actuadores/riego-manual', { activo: 'x' })).status, 400);
  });

  test('alertas: activas y resueltas con tags y acciones válidas', async () => {
    const { json } = await pedir('GET', '/alertas');
    assert.equal(json.length, 2);
    json.forEach(notificacion);
    assert.equal(json[0].tag, 'ADVERTENCIA • ACTIVA');
    assert.equal(json[0].sensorId, 'SENS-SOIL-02');
    assert.equal(json[0].title, 'DHT22 • Alto'); // código del estado legible, no crudo
    assert.equal(json[1].sensorId, 'SENS-TANK-01'); // del HC-SR04 gana la variable con umbral, no SENS-DIST-01
    assert.equal(json[1].kind, 'critica');
    assert.equal(json[1].tag, 'CRÍTICA • RESUELTA');
    assert.equal(json[1].read, true);
  });

  test('actividades: GET con enums de la app y POST validado', async () => {
    const { json } = await pedir('GET', '/actividades');
    campos(json.summary, ['title', 'compliance', 'text'], 'ActivitySummary');
    json.items.forEach(actividad);
    assert.equal(json.items[0].status, 'enProceso');
    assert.equal(json.items[0].location, 'CANTERO 1');

    const ok = { type: 'riego', bedId: 'c1', date: AHORA.toISOString(), responsible: { initials: 'CM', name: 'Carlos', role: 'Estudiante' }, description: 'Riego manual de prueba', observations: '', photos: [] };
    llamadas.length = 0;
    const r = await pedir('POST', '/actividades', ok);
    assert.equal(r.status, 204);
    assert.equal(llamadas[0][2].tipo, 'RIEGO');
    for (const mal of [{ ...ok, type: 'x' }, { ...ok, bedId: '' }, { ...ok, date: 'ayer' }, { ...ok, responsible: null }, { ...ok, description: 'corto' }])
      assert.equal((await pedir('POST', '/actividades', mal)).status, 400);
  });

  test('invernaderos/actual y red/estado', async () => {
    const g = (await pedir('GET', '/invernaderos/actual')).json;
    campos(g, ['project', 'surface', 'species', 'network'], 'GreenhouseInfo');
    assert.equal(g.species[0].scientific, 'Ocimum basilicum');
    const n = (await pedir('GET', '/red/estado')).json;
    campos(n, ['mode', 'synced', 'gateway', 'nodes', 'cloudSync'], 'NetworkStatus');
    campos(n.gateway, ['band', 'apiUrl', 'ip', 'mac', 'port', 'portOpen', 'latencyMs'], 'gateway');
    assert.equal(n.mode, 'real');
    assert.equal(n.synced, true);
    assert.equal(n.gateway.apiUrl, base);
    n.nodes.forEach((x) => { icono(x.icon); en(x.badgeTone, ['success', 'lime'], 'badgeTone'); tipo(x.healthy, 'boolean', 'healthy'); });
  });

  test('ruta desconocida -> 404 JSON', async () => {
    const r = await pedir('GET', '/nada');
    assert.equal(r.status, 404);
    assert.equal(r.json.status, 'error');
  });
});

describe('contrato web /api/v1', () => {
  test('telemetry/live con EC y CO2 nulos', async () => {
    const { status, json } = await pedir('GET', '/api/v1/telemetry/live');
    assert.equal(status, 200);
    assert.equal(json.status, 'success');
    assert.equal(json.zone_id, 1);
    assert.equal(json.data.hum_soil_pct, 65);
    assert.equal(json.data.radiation_lux, 18500);
    assert.equal(json.data.ec_ms_cm, null);
    assert.equal(json.data.co2_ppm, null);
    assert.ok(json.data.vpd_kpa > 0 && json.data.dew_point_c < json.data.temp_air_c);
  });

  test('actuators/command: traducción, 201, 400 y 404 con códigos válidos', async () => {
    for (const [b, esperado] of [
      [{ action: 'START', parameters: { duration_minutes: 5 } }, { accion: 'ENCENDER', duracion_s: 300 }],
      [{ action: 'STOP' }, { accion: 'APAGAR' }],
      [{ action: 'SET_POWER', parameters: { power_pct: 80 } }, { accion: 'ENCENDER', valor: 80 }],
      [{ action: 'SET_SPEED', parameters: { speed: 'Media' } }, { accion: 'ENCENDER', valor: 66 }],
      [{ action: 'SET_SPEED', parameters: { speed: 'OFF' } }, { accion: 'APAGAR' }],
    ]) {
      llamadas.length = 0;
      const r = await pedir('POST', '/api/v1/actuators/command', { actuator_code: 'ACT-BOMBA-01', ...b });
      assert.equal(r.status, 201, JSON.stringify(b));
      assert.deepEqual(r.json.data, { command_id: 99, estado: 'PENDIENTE' });
      assert.deepEqual(llamadas[0][1], { actuador_id: 1, ...esperado, motivo: 'Comando desde la web' });
    }
    for (const b of [{ action: 'X' }, { action: 'SET_POWER', parameters: { power_pct: 101 } }, { action: 'SET_SPEED', parameters: { speed: 'Turbo' } }, { action: 'START', parameters: { duration_minutes: -1 } }])
      assert.equal((await pedir('POST', '/api/v1/actuators/command', { actuator_code: 'ACT-BOMBA-01', ...b })).status, 400);
    const r = await pedir('POST', '/api/v1/actuators/command', { actuator_code: 'NOPE', action: 'START' });
    assert.equal(r.status, 404);
    assert.equal(r.json.status, 'error');
    assert.match(r.json.message, /ACT-BOMBA-01/);
  });

  test('sensors/calibration: 200, 400 y traducción', async () => {
    llamadas.length = 0;
    const r = await pedir('PUT', '/api/v1/sensors/calibration', { sensor_code: 'SENS-SOIL-01', raw_dry_point: 3140, raw_wet_point: 1280, offset_linear: 1.5 });
    assert.equal(r.status, 200);
    assert.equal(r.json.status, 'success');
    assert.deepEqual(llamadas[0].slice(1), ['SENS-SOIL-01', { aire_crudo: 3140, agua_crudo: 1280, offset: 1.5 }]);
    for (const [seco, mojado] of [['a', 1], [5000, 1280], [3140.5, 1280], [1280, 3140], [1280, 1280]])
      assert.equal((await pedir('PUT', '/api/v1/sensors/calibration', { sensor_code: 'SENS-SOIL-01', raw_dry_point: seco, raw_wet_point: mojado })).status, 400, `${seco}/${mojado}`);
    assert.equal((await pedir('PUT', '/api/v1/sensors/calibration', { sensor_code: 'NOPE', raw_dry_point: 3000, raw_wet_point: 1000 })).status, 404);
  });

  test('audit/logs: paginación, filtros y 400', async () => {
    llamadas.length = 0;
    const r = await pedir('GET', '/api/v1/audit/logs?severity=manual&device_id=ACT-BOMBA-01&page=2&per_page=500');
    assert.equal(r.status, 200);
    assert.equal(r.json.per_page, 200);
    assert.equal(r.json.page, 2);
    assert.equal(r.json.total, 120);
    assert.deepEqual(Object.keys(r.json.data[0]), ['timestamp', 'device', 'event_type', 'parameter_value', 'trigger', 'state']);
    assert.deepEqual(llamadas[0][1], { device: 'ACT-BOMBA-01', tipos: ['manual'], desde: undefined, hasta: undefined, pagina: 2, porPagina: 200 });
    llamadas.length = 0;
    await pedir('GET', '/api/v1/audit/logs?severity=manual,auto,alert&from=2026-11-17T00:00:00Z&to=2026-11-18T00:00:00Z');
    assert.deepEqual(llamadas[0][1], {
      device: undefined, tipos: ['manual', 'auto', 'alert'], desde: Date.parse('2026-11-17T00:00:00Z'), hasta: Date.parse('2026-11-18T00:00:00Z'), pagina: 1, porPagina: 50,
    });
    for (const q of ['severity=x', 'severity=manual,x', 'severity=', 'page=0', 'per_page=abc', 'page=1.5', 'from=ayer', 'from=2026-11-18&to=2026-11-17'])
      assert.equal((await pedir('GET', '/api/v1/audit/logs?' + q)).status, 400, q);
  });
});

describe('formato', () => {
  test('fechas en es-MX / Ciudad de México', () => {
    assert.equal(hora12(AHORA), '12:00 PM');
    assert.equal(relativo(hace(30), AHORA), 'Hace 30 seg');
    assert.equal(relativo(hace(720), AHORA), 'Hace 12 min');
    assert.equal(relativo(hace(86400 * 2), AHORA), 'Hace 2 días');
    assert.equal(cuando(hace(3600), AHORA), 'Hoy, 11:00 hrs');
    assert.equal(cuando(hace(86400), AHORA), 'Ayer, 12:00 hrs');
    assert.deepEqual(etiquetasX(AHORA - 3600e3, +AHORA, '1h'), ['11:00', '11:20', '11:40', 'Ahora']);
  });

  test('punto de rocío y VPD (misma fórmula que app.js)', () => {
    assert.equal(Math.round(puntoRocio(24.2, 62) * 10) / 10, 16.4);
    assert.equal(Math.round(vpd(24.2, 62) * 100) / 100, 1.15);
    assert.equal(puntoRocio(null, 50), null);
  });

  test('un sensor caído no es 0 y la telemetría no inventa EC/CO2', () => {
    const t = telemetriaWeb([fila({ variable: 'temperatura_aire', valor: 0, valido: false })], AHORA);
    assert.equal(t.temp_air_c, null);
    assert.equal(t.dew_point_c, null);
    assert.equal(medicionesActual([], AHORA).luz, null);
  });

  test('lectura vieja no cuenta como actual', () => {
    assert.equal(medicionesActual([fila({ variable: 'temperatura_aire', tomado_en: hace(3600) })], AHORA).temp, null);
  });

  test('banda de confort sin umbral usa el rango de los datos', () => {
    assert.deepEqual(bandaConfort({ min_optimo: null }, [{ value: 3 }, { value: 9 }]), { min: 3, max: 9 });
    assert.deepEqual(bandaConfort(null, []), { min: 0, max: 0 });
  });

  test('velocidad del ventilador igual en web y móvil: > 50 % es alta', () => {
    const nivel = (valor) => resumenActuadores({
      actuadores: [{ id: 3, codigo: 'V', nombre: 'Extractor', tipo: 'VENTILADOR', encendido: true, valor, actualizado_en: hace(10) }],
      comandos: [], reglas: [], prediccion: null, temperatura: null, ahora: AHORA.getTime(),
    }).actuators[0].level;
    assert.deepEqual([33, 50, 66, 100].map(nivel), ['low', 'low', 'high', 'high']); // web Baja/Media/Alta y móvil low/high
  });

  test('bitácora: filtros y página sobre el query builder real de supabase-js (sin red)', () => {
    const pasos = [];
    const builder = new Proxy({}, { get: (_, m) => (...a) => (pasos.push([m, ...a]), builder) });
    filtrosBitacora(builder, { device: 'bomba_riego', tipos: ['manual', 'alert'], desde: Date.parse('2026-11-17T00:00:00Z'), hasta: Date.parse('2026-11-18T00:00:00Z'), pagina: 3, porPagina: 50 });
    assert.deepEqual(pasos, [
      ['eq', 'dispositivo', 'bomba_riego'], ['in', 'tipo', ['manual', 'alert']],
      ['gte', 'ocurrido_en', '2026-11-17T00:00:00.000Z'], ['lt', 'ocurrido_en', '2026-11-18T00:00:00.000Z'],
      ['order', 'ocurrido_en', { ascending: false }], ['range', 100, 149],
    ]);
    pasos.length = 0;
    filtrosBitacora(builder, { pagina: 1, porPagina: 50 }); // sin filtros: solo orden y página
    assert.deepEqual(pasos.map((p) => p[0]), ['order', 'range']);
  });

  test('errores de PostgREST: parámetros -> 400, configuración -> 500 con causa para el log', () => {
    assert.equal(aError({ code: 'PGRST100', message: 'parse' }).estado, 400);
    const conf = aError({ code: 'PGRST106', message: 'The schema must be one of the following' });
    assert.equal(conf.estado, 500);
    assert.match(conf.causa, /PGRST106/);
    assert.equal(aError({ code: '42501', message: 'denied' }).estado, 403);
  });

  test('comandoDeMovil exige exactamente un campo válido', () => {
    assert.equal(comandoDeMovil({ encendido: true, pwm: 3 }), null);
    assert.equal(comandoDeMovil(null), null);
    assert.deepEqual(comandoDeMovil({ pwm: 100 }), { accion: 'ENCENDER', valor: 100 });
  });

  test('actividadDeBorrador valida descripción y fecha', () => {
    assert.ok(actividadDeBorrador({}).error);
    assert.ok(actividadDeBorrador(null).error);
  });
});
