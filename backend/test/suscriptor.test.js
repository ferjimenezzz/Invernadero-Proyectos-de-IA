import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Aedes } from 'aedes';
import mqtt from 'mqtt';
import { crearBuffer } from '../src/buffer.js';
import { crearProcesador, validar, MAX_BYTES } from '../src/ingesta.js';
import { generarMensajes } from '../scripts/simular.js';

const T = 'invernadero/albahaca_01/telemetria';
const lineas = async (ruta) => (await readFile(ruta, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((l) => JSON.parse(l));

async function entorno() {
  const dir = await mkdtemp(join(tmpdir(), 'buf-'));
  const ruta = join(dir, 'pendientes.jsonl');
  const buffer = crearBuffer(ruta);
  await buffer.iniciar();
  const estado = { falla: false, enviados: [] };
  let n = 0;
  const ingestar = async (r) => {
    if (estado.falla) throw new Error('sin red');
    estado.enviados.push(r);
    return ++n;
  };
  let t = 0;
  const reloj = () => new Date(Date.UTC(2026, 0, 1, 0, 0, t++));
  const proc = crearProcesador({ ingestar, buffer, reloj, log: () => {} });
  return { dir, ruta, buffer, estado, proc, ingestar, limpiar: () => rm(dir, { recursive: true, force: true }) };
}

test('validar: mensajes del firmware y del ejemplo', () => {
  for (const m of generarMensajes(1)) assert.equal(validar(Buffer.from(m)).motivo, null);
  const ejemplo = { nodo_id: 'x', timestamp: '2026-10-11T10:00:00Z', sensores: { ambiente: { humedad_relativa_pct: 60 } } };
  assert.equal(validar(Buffer.from(JSON.stringify(ejemplo))).motivo, null);
});

test('validar: inválidos conservan evidencia', () => {
  const sinJson = validar(Buffer.from('basura {'));
  assert.equal(sinJson.payload, 'basura {');
  assert.match(sinJson.motivo, /JSON/);
  const sinSensores = validar(Buffer.from('{"nodo_id":"a"}'));
  assert.deepEqual(sinSensores.payload, { nodo_id: 'a' });
  assert.match(sinSensores.motivo, /sensores/);
  assert.match(validar(Buffer.from('[1]')).motivo, /objeto/);
  assert.match(validar(Buffer.from('{"nodo_id":5,"sensores":{}}')).motivo, /nodo_id/);
});

test('validar: >16 KB se trunca a 2000 caracteres', () => {
  const grande = JSON.stringify({ nodo_id: 'a', sensores: {}, relleno: 'x'.repeat(MAX_BYTES) });
  const r = validar(Buffer.from(grande));
  assert.equal(typeof r.payload, 'string');
  assert.equal(r.payload.length, 2000);
  assert.match(r.motivo, /bytes/);
});

test('búfer: sin conexión se guarda y conserva el orden; reenvío con recibido_en original', async () => {
  const e = await entorno();
  try {
    const ok = Buffer.from(generarMensajes(1)[0]);
    await e.proc.procesar(T, ok); // 1 enviado
    e.estado.falla = true;
    await e.proc.procesar(T, ok);
    await e.proc.procesar(T, ok);
    e.estado.falla = false;
    await e.proc.procesar(T, ok); // hay pendientes → va detrás aunque la red ya volvió
    assert.equal(e.estado.enviados.length, 1);
    const guardados = await lineas(e.ruta);
    assert.equal(guardados.length, 3);
    assert.equal(e.buffer.pendientes, 3);

    assert.equal(await e.proc.reenviar(), 3);
    assert.deepEqual(e.estado.enviados.map((r) => r.recibido_en), [`2026-01-01T00:00:00.000Z`, ...guardados.map((r) => r.recibido_en)]);
    assert.deepEqual(await lineas(e.ruta), []);
    assert.equal(e.buffer.pendientes, 0);
  } finally { await e.limpiar(); }
});

test('búfer: fallo parcial conserva el resto; corruptos aparte; reinicio lee el archivo', async () => {
  const e = await entorno();
  try {
    const rec = (i) => ({ payload: { i }, topic: T, recibido_en: `2026-01-01T00:00:0${i}.000Z` });
    await writeFile(e.ruta, [rec(1), rec(2), rec(3)].map((r) => JSON.stringify(r)).join('\n') + '\n{corrupto\n');
    const b = crearBuffer(e.ruta); // "reinicio"
    assert.equal(await b.iniciar(), 4);

    let llamadas = 0;
    const r = await b.vaciar(async (x) => { if (++llamadas === 3) throw new Error('cae'); return x; });
    assert.deepEqual(r, { enviados: 2, corruptos: 0 });
    assert.equal((await readFile(e.ruta, 'utf8')).split('\n').filter(Boolean).length, 2);
    assert.equal(b.pendientes, 2); // rec(3) + línea corrupta aún pendiente

    const r2 = await b.vaciar(async (x) => x);
    assert.deepEqual(r2, { enviados: 1, corruptos: 1 });
    assert.equal(b.pendientes, 0);
    assert.equal((await readFile(join(e.dir, 'pendientes.corruptos.jsonl'), 'utf8')).trim(), '{corrupto');
  } finally { await e.limpiar(); }
});

test('integración: broker aedes + cliente mqtt real + ingestar falso', async () => {
  const e = await entorno();
  const broker = await Aedes.createBroker();
  const servidor = net.createServer(broker.handle);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const url = `mqtt://127.0.0.1:${servidor.address().port}`;
  const sub = await mqtt.connectAsync(url);
  const pub = await mqtt.connectAsync(url);
  try {
    const pendientes = [];
    sub.on('message', (t, m) => pendientes.push(e.proc.procesar(t, m)));
    await sub.subscribeAsync(T, { qos: 1 });
    for (const m of generarMensajes(10, { invalidos: false }).concat('no es json')) await pub.publishAsync(T, m, { qos: 1 });
    await new Promise((r) => setTimeout(r, 300));
    await Promise.all(pendientes);
    assert.equal(e.estado.enviados.length, 11);
    assert.deepEqual(e.estado.enviados.slice(0, 10).map((r) => r.payload.sensores.suelo_superficie[0].humedad_pct), [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]);
    assert.equal(e.estado.enviados[10].payload, 'no es json'); // el inválido va como texto, identificable
  } finally {
    await sub.endAsync(); await pub.endAsync();
    await new Promise((r) => servidor.close(r));
    await new Promise((r) => broker.close(r));
    await e.limpiar();
  }
});
