// Mapeadores puros: filas de la BD -> JSON que esperan las apps. Sin red; el reloj (`ahora`) se recibe.

const TZ = 'America/Mexico_City';
// Una lectura más vieja que esto se considera sin señal (no se muestra como "actual").
export const FRESCURA_MS = 10 * 60_000;

const f = (o) => new Intl.DateTimeFormat('es-MX', { timeZone: TZ, ...o });
const F24 = f({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const F12 = f({ hour: '2-digit', minute: '2-digit', hour12: true });
const FDIA = f({ day: 'numeric', month: 'short' });
const FSEM = f({ weekday: 'short' });
const clave = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

export const hora24 = (d) => F24.format(new Date(d));
export const hora12 = (d) =>
  F12.format(new Date(d)).replace(/\s/g, ' ').replace(/a\. ?m\./i, 'AM').replace(/p\. ?m\./i, 'PM');

export function relativo(d, ahora) {
  const s = Math.max(0, Math.floor((ahora - new Date(d)) / 1000));
  if (s < 60) return `Hace ${s} seg`;
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  const n = Math.floor(s / 86400);
  return `Hace ${n} ${n === 1 ? 'día' : 'días'}`;
}

/** "Hoy, 16:00 hrs" / "Ayer, 09:15 hrs" / "17 nov, 09:15 hrs". */
export function cuando(d, ahora) {
  const fecha = new Date(d);
  const k = clave(fecha);
  const dia = k === clave(ahora) ? 'Hoy' : k === clave(new Date(ahora - 86_400_000)) ? 'Ayer' : FDIA.format(fecha).replace('.', '');
  return `${dia}, ${hora24(fecha)} hrs`;
}

export const num = (v) => (v == null ? null : Number(v));
export const redondear = (v, dec = 1) => (v == null ? null : Math.round(v * 10 ** dec) / 10 ** dec);

export function formatearValor(v, unidad) {
  if (v == null) return '--';
  return unidad === 'lux' || unidad === 'lx' ? Math.round(v).toLocaleString('en-US') : String(redondear(v, 1));
}

/* ── Lecturas ── */

export const lecturaVigente = (r, ahora) =>
  r.valido === true && r.valor != null && r.tomado_en != null && ahora - new Date(r.tomado_en) <= FRESCURA_MS;

/** Valor numérico vigente de una variable (promedio si hay varias zonas) o null; nunca 0 por un sensor caído. */
export function valorActual(filas, variable, ahora) {
  const v = filas.filter((r) => r.variable === variable && lecturaVigente(r, ahora)).map((r) => Number(r.valor));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function medicionesActual(filas, ahora) {
  const g = (variable, dec) => redondear(valorActual(filas, variable, ahora), dec);
  return {
    temp: g('temperatura_aire', 1),
    'hum-aire': g('humedad_aire', 1),
    'hum-suelo': g('humedad_suelo', 1),
    luz: g('iluminancia', 0),
  };
}

// Magnus (a=17.27, b=237.7) como app.js de la web.
export function puntoRocio(t, hr) {
  if (t == null || hr == null || hr <= 0) return null;
  const alfa = (17.27 * t) / (237.7 + t) + Math.log(hr / 100);
  return (237.7 * alfa) / (17.27 - alfa);
}

// Tetens, igual que calculateVPD de app.js.
export function vpd(t, hr) {
  if (t == null || hr == null) return null;
  const vs = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
  return Math.max(0, vs - vs * (hr / 100));
}

export function telemetriaWeb(filas, ahora) {
  const t = valorActual(filas, 'temperatura_aire', ahora);
  const h = valorActual(filas, 'humedad_aire', ahora);
  const lux = valorActual(filas, 'iluminancia', ahora);
  return {
    temp_air_c: redondear(t, 1),
    hum_air_pct: redondear(h, 1),
    hum_soil_pct: redondear(valorActual(filas, 'humedad_suelo', ahora), 1),
    radiation_lux: lux == null ? null : Math.round(lux),
    temp_substrate_c: redondear(valorActual(filas, 'temperatura_suelo', ahora), 1),
    vpd_kpa: redondear(vpd(t, h), 2),
    dew_point_c: redondear(puntoRocio(t, h), 1),
    ec_ms_cm: null, // sin sensor: nunca se inventa
    co2_ppm: null,
  };
}

/* ── Estado de sensores ── */

export function nivel(r) {
  if (r.categoria === 'CRITICO' || r.categoria === 'ERROR_HW') return 'critical';
  if (r.categoria === 'ALERTA') return 'warning';
  if (r.evaluacion === 'CRITICO') return 'critical';
  if (r.evaluacion === 'FUERA_DE_OPTIMO') return 'warning';
  return 'normal';
}

export function etiquetaEstado(r) {
  const n = nivel(r);
  if (n === 'critical') return r.categoria === 'ERROR_HW' ? 'Error de hardware' : 'Crítico';
  if (n === 'warning') return r.evaluacion === 'FUERA_DE_OPTIMO' ? 'Fuera de rango óptimo' : 'Alerta';
  if (r.evaluacion === 'SIN_LECTURA') return 'Sin lectura';
  return r.evaluacion === 'OPTIMO' ? 'Rango óptimo' : 'Normal';
}

const ICONOS = {
  temperatura_aire: 'thermometer-lines',
  humedad_aire: 'water-percent',
  iluminancia: 'white-balance-sunny',
  temperatura_suelo: 'thermometer-water',
  humedad_suelo: 'cup-water',
  nivel_tanque: 'water-outline',
  distancia_agua: 'ruler',
};
export const iconoVariable = (v) => ICONOS[v] ?? 'chip';

function tendencia(r) {
  const t = (r.tendencia ?? []).map(Number);
  if (t.length < 2) return { icon: 'minus', text: 'Sin tendencia' };
  const d = t.at(-1) - t[0];
  const dd = Math.abs(d) >= 100 ? Math.round(d) : redondear(d, 1);
  if (dd === 0) return { icon: 'minus', text: 'Estable' };
  return { icon: dd > 0 ? 'trending-up' : 'trending-down', text: `${dd > 0 ? '+' : ''}${dd} ${r.unidad ?? ''} en ${t.length} lecturas`.replace('  ', ' ') };
}

const nombreSensor = (r) => r.variable_nombre + (r.zona ? ` · Zona ${r.zona}` : '');

export function sensorMovil(r, ahora) {
  const n = nivel(r);
  const valido = r.valido === true && r.valor != null;
  const t = (r.tendencia ?? []).map(Number);
  return {
    id: r.codigo,
    name: nombreSensor(r),
    location: r.zona ? `Zona ${r.zona}` : 'Invernadero',
    icon: iconoVariable(r.variable),
    online: lecturaVigente(r, ahora),
    status: n,
    statusLabel: etiquetaEstado(r),
    readingLabel: String(r.variable_nombre).toUpperCase(),
    value: valido ? formatearValor(Number(r.valor), r.unidad) : '--',
    unit: r.unidad ?? '',
    trend: t.length >= 2 ? t : [], // un solo punto rompe el sparkline
    trendLabel: tendencia(r),
    ...(n !== 'normal' && { alertMessage: r.estado_descripcion ?? r.accion_sugerida ?? etiquetaEstado(r) }),
    lastSeen: r.tomado_en ? `${relativo(r.tomado_en, ahora)} (${hora12(r.tomado_en)})` : 'Sin lecturas',
    hardware: {
      icon: 'chip',
      text: [r.modelo ?? r.sensor, r.pines ? `Pines ${r.pines}` : null].filter(Boolean).join(' • ') || 'N/D',
    },
  };
}

/* ── Gráficas ── */

/** 4 etiquetas distintas (React las usa como key): inicio, 1/3, 2/3 y "Ahora". */
export function etiquetasX(desde, hasta, rango) {
  const fmt = rango === '7d' ? (d) => FSEM.format(d).replace('.', '') : hora24;
  const paso = (hasta - desde) / 3;
  return [0, 1, 2].map((i) => fmt(new Date(desde + paso * i))).concat('Ahora');
}

/** Con menos de 2 puntos la gráfica de la app divide entre 0: se manda vacía. */
export function puntosGrafica(filas, rango) {
  const p = filas
    .filter((r) => r.promedio != null)
    .map((r) => ({
      label: rango === '7d' ? `${FSEM.format(new Date(r.periodo)).replace('.', '')} ${hora24(r.periodo)}` : hora24(r.periodo),
      value: Number(r.promedio),
    }));
  return p.length >= 2 ? p : [];
}

/**
 * Banda de confort: umbral óptimo de la BD. Sin umbral no se inventa uno: la banda
 * abarca el rango de los datos (no distorsiona la escala de LineChart, que exige números).
 */
export function bandaConfort(row, puntos) {
  const v = puntos.map((p) => p.value);
  return {
    min: row?.min_optimo != null ? Number(row.min_optimo) : v.length ? Math.min(...v) : 0,
    max: row?.max_optimo != null ? Number(row.max_optimo) : v.length ? Math.max(...v) : 0,
  };
}

export function serieMovil({ variable, row, filas, desde, hasta, rango }) {
  const points = puntosGrafica(filas, rango);
  const { min, max } = bandaConfort(row, points);
  return {
    variable,
    unit: row?.unidad ?? '',
    comfortMin: min,
    comfortMax: max,
    xLabels: etiquetasX(desde, hasta, rango),
    points,
    sensorName: filas[0]?.sensor ?? row?.variable_nombre ?? variable,
  };
}

/* ── Detalle de sensor ── */

function reglasUmbral(r) {
  const u = r.unidad ?? '';
  const x = (v) => `${redondear(Number(v), 2)} ${u}`.trim();
  const reglas = [];
  if (r.min_critico != null)
    reglas.push({ id: 'low-crit', tone: 'danger', icon: 'alert-octagon-outline', title: 'Crítico bajo', value: `< ${x(r.min_critico)}`, description: 'Por debajo del mínimo crítico del cultivo: requiere acción inmediata.' });
  if (r.min_optimo != null)
    reglas.push({ id: 'low', tone: 'warning', icon: 'alert-outline', title: 'Alerta baja', value: `< ${x(r.min_optimo)}`, description: 'Por debajo del mínimo óptimo del cultivo.' });
  if (r.min_optimo != null && r.max_optimo != null)
    reglas.push({ id: 'ok', tone: 'success', icon: 'leaf', title: 'Rango óptimo de desarrollo', value: `${x(r.min_optimo)} – ${x(r.max_optimo)}`, description: 'Condición ideal para el cultivo.' });
  if (r.max_optimo != null)
    reglas.push({ id: 'high', tone: 'warning', icon: 'chart-bell-curve', title: 'Alerta alta', value: `> ${x(r.max_optimo)}`, description: 'Por encima del máximo óptimo del cultivo.' });
  if (r.max_critico != null)
    reglas.push({ id: 'high-crit', tone: 'danger', icon: 'alert-octagon-outline', title: 'Crítico alto', value: `> ${x(r.max_critico)}`, description: 'Por encima del máximo crítico del cultivo: requiere acción inmediata.' });
  if (!reglas.length)
    reglas.push({ id: 'sin-umbral', tone: 'warning', icon: 'alert-outline', title: 'Sin umbrales definidos', value: 'N/D', description: 'Esta variable no tiene umbrales configurados para el cultivo.' });
  return reglas;
}

export function detalleSensor({ row, stats, historico, reglas, cultivo, firmware, ahora, desde, hasta }) {
  const n = nivel(row);
  const valido = row.valido === true && row.valor != null;
  const unidad = row.unidad ?? '';
  const puntos = puntosGrafica(historico, '24h');
  const banda = bandaConfort(row, puntos);
  const rMin = row.rango_min != null ? Number(row.rango_min) : 0;
  const rMax = row.rango_max != null ? Number(row.rango_max) : 100;
  const span = rMax - rMin;
  const hayStats = stats && Number(stats.lecturas) > 0;
  const st = (label, valor, caption, icon) => ({
    label,
    value: hayStats ? formatearValor(Number(valor), unidad) : '--',
    unit: unidad,
    caption: hayStats ? caption : 'Sin datos',
    icon,
  });
  return {
    id: row.codigo,
    module: `NODO ${String(row.nodo).toUpperCase()}${row.zona ? ` • ZONA ${row.zona}` : ''}`,
    title: nombreSensor(row),
    icon: iconoVariable(row.variable),
    value: valido ? formatearValor(Number(row.valor), unidad) : '--',
    unit: unidad,
    status: n,
    statusLabel: etiquetaEstado(row),
    lastTransmission: row.tomado_en
      ? `Última transmisión: ${cuando(row.tomado_en, ahora)} (${relativo(row.tomado_en, ahora).toLowerCase()})`
      : 'Sin transmisiones registradas',
    signal: 'N/D',
    battery: 'N/D',
    firmware: firmware ? `FW v${firmware}` : 'N/D',
    stats: [
      st('MÍNIMO', stats?.minimo, stats?.minimo_en ? hora12(stats.minimo_en) : '', 'trending-down'),
      st('PROMEDIO', stats?.promedio, 'Periodo 24h', 'chart-line-variant'),
      st('MÁXIMO', stats?.maximo, stats?.maximo_en ? hora12(stats.maximo_en) : '', 'trending-up'),
    ],
    history: {
      title: `Histórico de ${row.variable_nombre}`,
      unit: unidad,
      points: puntos,
      xLabels: etiquetasX(desde, hasta, '24h'),
      comfortMin: banda.min,
      comfortMax: banda.max,
      // El tipo exige número: sin umbral la línea cae en el borde inferior de la banda.
      threshold: row.min_critico != null ? Number(row.min_critico) : banda.min,
    },
    crop: {
      name: 'Umbrales de Cultivo',
      scientific: cultivo?.nombre_cientifico ?? '',
      description: `Reglas agronómicas para ${cultivo?.nombre_comun ?? 'el cultivo'}:`,
    },
    rules: reglasUmbral(row),
    thresholdEditor: {
      title: 'Ajuste de Umbrales',
      subtitle: row.variable_nombre,
      unit: unidad,
      scaleMin: rMin,
      scaleMax: rMax,
      min: row.min_optimo != null ? Number(row.min_optimo) : rMin,
      max: row.max_optimo != null ? Number(row.max_optimo) : rMax,
      step: span >= 1000 ? 100 : span > 100 ? 1 : 0.5,
      automations: reglas.map((g) => ({
        id: String(g.id),
        icon: 'cog-outline',
        title: g.nombre,
        description: `Si ${String(g.estado_disparador).toLowerCase()}: ${String(g.accion).toLowerCase()}${g.actuador ? ` ${g.actuador}` : ''}`,
      })),
    },
  };
}

/* ── Actuadores ── */

const TIPO = {
  BOMBA: { kind: 'pump', icon: 'water-outline', iconBg: 'primary', toggleIcon: 'waves' },
  ILUMINACION: { kind: 'light', icon: 'lightbulb-outline', iconBg: 'lime', toggleIcon: 'white-balance-sunny' },
  VENTILADOR: { kind: 'fan', icon: 'weather-windy', iconBg: 'dark', toggleIcon: 'fan' },
};
const VALIDO = (c) => c.estado !== 'FALLIDO' && c.estado !== 'CANCELADO';

function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function resumenActuadores({ actuadores, comandos, reglas, temperatura, prediccion, ahora }) {
  const lista = actuadores
    .filter((a) => TIPO[a.tipo])
    .map((a) => {
      const meta = TIPO[a.tipo];
      const cmds = comandos.filter((c) => c.actuador_id === a.id && VALIDO(c)); // vienen de más nuevo a más viejo
      const ultimo = cmds[0];
      const reciente = ultimo && new Date(ultimo.creado_en) > new Date(a.actualizado_en ?? 0);
      const on = reciente ? ultimo.accion === 'ENCENDER' : !!a.encendido;
      const valor = reciente && ultimo.valor != null ? Number(ultimo.valor) : a.valor != null ? Number(a.valor) : null;
      const pendiente = reciente && (ultimo.estado === 'PENDIENTE' || ultimo.estado === 'ENVIADO');
      const regla = reglas.find((g) => g.actuador_id === a.id);
      const base = {
        id: a.codigo,
        name: a.nombre,
        icon: meta.icon,
        iconBg: meta.iconBg,
        on,
        toggleIcon: meta.toggleIcon,
        rule: regla
          ? { icon: 'shield-check-outline', text: regla.nombre }
          : { icon: 'cog-outline', text: 'Sin reglas automáticas' },
      };
      const pot = on ? (valor ?? 100) : 0;
      const nota = pendiente ? ' • Esperando confirmación' : '';
      if (meta.kind === 'pump') {
        const fin = ultimo?.accion === 'ENCENDER' && ultimo.duracion_s ? new Date(ultimo.creado_en).getTime() + ultimo.duracion_s * 1000 : 0;
        return { ...base, kind: 'pump', statusText: (on ? 'Activa ahora' : 'Detenida') + nota, remaining: on && fin > ahora ? mmss(fin - ahora) : '--:--' };
      }
      if (meta.kind === 'light')
        return { ...base, kind: 'light', pwm: pot, statusText: (on ? `${pot}% de potencia` : 'Apagadas') + nota };
      const level = !on ? 'off' : pot >= 75 ? 'high' : 'low';
      return {
        ...base,
        kind: 'fan',
        level,
        tempBadge: temperatura == null ? 'N/D' : `${redondear(temperatura, 1)}°C`,
        statusText: (on ? `Velocidad actual: ${level === 'high' ? 'Alta' : 'Baja'}` : 'Apagado') + nota,
      };
    });
  const d = prediccion?.detalle;
  const texto = typeof d === 'string' ? d : (d?.texto ?? d?.mensaje ?? d?.recomendacion ?? null);
  return {
    linked: lista.length,
    totalPower: 'N/D',
    actuators: lista,
    insight: texto
      ? { title: 'Recomendación de IA', text: texto }
      : { title: 'Sin recomendaciones', text: 'El modelo de IA aún no ha generado recomendaciones para el invernadero.' },
  };
}

/** Comando de la BD a partir de lo que pide la app móvil. */
export function comandoDeMovil(body) {
  const claves = Object.keys(body ?? {});
  if (claves.length !== 1) return null;
  const [k] = claves;
  const v = body[k];
  if (k === 'encendido' && typeof v === 'boolean') return { accion: v ? 'ENCENDER' : 'APAGAR' };
  if (k === 'pwm' && Number.isInteger(v) && v >= 0 && v <= 100) return v === 0 ? { accion: 'APAGAR' } : { accion: 'ENCENDER', valor: v };
  if (k === 'nivel' && ['off', 'low', 'high'].includes(v))
    return v === 'off' ? { accion: 'APAGAR' } : { accion: 'ENCENDER', valor: v === 'low' ? 50 : 100 };
  return null;
}

/* ── Alertas ── */

const CRITICAS = ['CRITICO', 'ERROR_HW'];

export function notificacionAlerta(a, { codigoSensor, resuelta }, ahora) {
  const critica = CRITICAS.includes(a.categoria);
  const sensor = a.sensor ?? null;
  const detalle = [];
  if (a.ocurrencias > 1) detalle.push({ icon: 'repeat', text: `${a.ocurrencias} ocurrencias` });
  if (a.accion_sugerida) detalle.push({ icon: 'information-outline', text: a.accion_sugerida });
  const fin = a.resuelta_en ? new Date(a.resuelta_en) : null;
  return {
    id: String(a.id),
    kind: critica ? 'critica' : 'advertencia',
    tag: `${critica ? 'CRÍTICA' : 'ADVERTENCIA'} • ${resuelta ? 'RESUELTA' : 'ACTIVA'}`,
    icon: a.categoria === 'ERROR_HW' ? 'chip' : critica ? 'alert-circle-outline' : 'alert-outline',
    title: `${sensor ?? 'Sistema'} • ${a.estado}`,
    body: codigoSensor ? `\`${codigoSensor}\` ${a.mensaje}` : String(a.mensaje),
    time: resuelta && fin ? hora12(fin) : relativo(a.ultima_vez_en, ahora),
    read: resuelta ? true : !!a.reconocida,
    ...(detalle.length && { detail: detalle }),
    ...(resuelta && fin && { resolution: `Resuelta ${cuando(fin, ahora)}` }),
    ...(!resuelta && codigoSensor && { actions: [{ label: 'Ver sensor', action: 'verSensor' }] }),
    footer: `${cuando(a.abierta_en, ahora)}${sensor ? ` • ${sensor}` : ''}`,
    ...(codigoSensor && { sensorId: codigoSensor }),
  };
}

/* ── Actividades ── */

export const TIPO_ACTIVIDAD = { riego: 'RIEGO', inspeccion: 'INSPECCION', medicion: 'MEDICION', fertilizacion: 'FERTILIZACION', mantenimiento: 'MANTENIMIENTO' };
const TIPO_APP = Object.fromEntries(Object.entries(TIPO_ACTIVIDAD).map(([k, v]) => [v, k]));
const ESTADO_APP = { PENDIENTE: 'pendiente', EN_PROCESO: 'enProceso', COMPLETADA: 'completada' };
const META = {
  riego: ['water-outline', 'Riego'],
  inspeccion: ['magnify', 'Inspección'],
  medicion: ['ruler', 'Medición'],
  fertilizacion: ['flask-outline', 'Fertilización'],
  mantenimiento: ['wrench-outline', 'Mantenimiento'],
};

export function actividadMovil(a, ahora) {
  const type = TIPO_APP[a.tipo] ?? 'inspeccion';
  const [icon, titulo] = META[type];
  const bed = /^c(\d+)$/i.exec(a.cantero ?? '');
  const fotos = Array.isArray(a.fotos) ? a.fotos : [];
  return {
    id: String(a.id),
    type,
    icon,
    location: bed ? `CANTERO ${bed[1]}` : String(a.cantero ?? '').toUpperCase(),
    when: cuando(a.programada_en, ahora),
    status: ESTADO_APP[a.estado] ?? 'pendiente',
    title: `${titulo}: ${String(a.descripcion).slice(0, 60)}`,
    description: a.observaciones || a.descripcion,
    assignee: a.responsable,
    ...(fotos.length && { hasEvidence: true }),
  };
}

export function resumenActividades(filas, ahora) {
  const mes = (d) => clave(new Date(d)).slice(0, 7);
  const delMes = filas.filter((a) => mes(a.programada_en) === mes(ahora));
  const hechas = delMes.filter((a) => a.estado === 'COMPLETADA').length;
  const pct = delMes.length ? Math.round((hechas / delMes.length) * 100) : 0;
  return {
    title: 'Bitácora Universitaria',
    compliance: `${pct}% Cumplimiento`,
    text: `${hechas} ${hechas === 1 ? 'tarea completada' : 'tareas completadas'} este mes`,
  };
}

const texto = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;

/** Valida NewActivityDraft (llega por JSON: `date` es ISO). Devuelve la fila a insertar o un error. */
export function actividadDeBorrador(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'Cuerpo inválido' };
  const tipo = TIPO_ACTIVIDAD[b.type];
  if (!tipo) return { error: 'type inválido' };
  if (!texto(b.bedId) || b.bedId.length > 20) return { error: 'bedId inválido' };
  const fecha = typeof b.date === 'string' ? new Date(b.date) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return { error: 'date debe ser una fecha ISO' };
  const r = b.responsible;
  if (!r || !texto(r.initials) || !texto(r.name) || !texto(r.role)) return { error: 'responsible inválido' };
  if (!texto(b.description, 10)) return { error: 'description debe tener al menos 10 caracteres' };
  if (b.observations != null && typeof b.observations !== 'string') return { error: 'observations inválido' };
  const fotos = Array.isArray(b.photos) ? b.photos.filter((p) => texto(p?.name)).map((p) => ({ name: String(p.name), size: String(p.size ?? '') })) : [];
  return {
    fila: {
      tipo,
      cantero: b.bedId,
      programada_en: fecha.toISOString(),
      responsable: { initials: r.initials, name: r.name, role: r.role, ...(texto(r.color) && { color: r.color }) },
      descripcion: b.description.trim(),
      observaciones: texto(b.observations) ? b.observations.trim() : null,
      estado: 'PENDIENTE',
      fotos,
    },
  };
}

/* ── Perfil, invernadero, red ── */

const ROLES = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  LECTOR: 'Lector',
  AUTOMATIZACION: 'Equipo de Automatización',
  CONECTIVIDAD: 'Equipo de Conectividad',
  HARDWARE: 'Equipo de Hardware',
};

export const perfilMovil = (usuario, email, token) => ({
  id: String(usuario?.id ?? ''),
  name: usuario?.nombre ?? email,
  role: ROLES[usuario?.rol] ?? ROLES.LECTOR,
  faculty: '',
  stats: [],
  token,
});

export const invernaderoMovil = ({ invernadero: i, cultivo: c }, nodos) => ({
  project: i.nombre,
  surface: `${i.largo_cm}×${i.ancho_cm} cm${i.area_m2 != null ? ` • ${i.area_m2} m²` : ''}`,
  species: c ? [{ common: c.nombre_comun, scientific: c.nombre_cientifico }] : [],
  network: `${nodos.length} ${nodos.length === 1 ? 'nodo' : 'nodos'} • ESP32 MQTT`,
});

export function nodoRed(n, ahora) {
  return {
    id: n.codigo,
    name: n.codigo,
    icon: 'chip',
    detail: `Firmware ${n.firmware_version ?? 'N/D'} • ${n.ultima_conexion ? relativo(n.ultima_conexion, ahora) : 'sin conexión registrada'}`,
    badge: n.en_linea ? 'En línea' : 'Sin conexión',
    badgeTone: n.en_linea ? 'success' : 'lime', // el tipo solo admite estos dos tonos
    healthy: !!n.en_linea,
  };
}

export const filaBitacora = (r) => ({
  timestamp: new Date(r.ocurrido_en).toISOString(),
  device: r.dispositivo,
  event_type: r.tipo,
  parameter_value: r.detalle,
  trigger: r.disparador,
  state: r.estado,
});

/** Error con código HTTP; el manejador central de app.js lo responde tal cual. */
export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}
