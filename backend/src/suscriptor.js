// Suscriptor MQTT → Supabase. Arranca al importarse (index.js lo importa).
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mqtt from 'mqtt';
import { clienteServicio, env } from './supabase.js';
import { crearBuffer } from './buffer.js';
import { crearProcesador, hora } from './ingesta.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const aviso = (t) => console.log(`[${hora()}] ${t}`);

const topicTelemetria = env('MQTT_TOPIC_TELEMETRIA', 'invernadero/albahaca/invernadero_albahaca_01/telemetria');
const cliente = clienteServicio(); // falla con mensaje claro si falta SUPABASE_URL / llave

async function ingestar({ payload, topic, recibido_en }) {
  const { data, error } = await cliente
    .rpc('fn_ingestar_paquete', { p_payload: payload, p_topic: topic, p_recibido_en: recibido_en })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error(error.message);
  return data;
}

const buffer = crearBuffer(resolve(RAIZ, env('BUFFER_PATH', './buffer/pendientes.jsonl')));
const pendientesIniciales = await buffer.iniciar();
if (pendientesIniciales) aviso(`búfer con ${pendientesIniciales} pendientes de una sesión anterior`);

const proc = crearProcesador({ ingestar, buffer });
const reenviar = () => proc.reenviar().catch((e) => aviso(`ERROR reenvío: ${e.message}`));

const mq = mqtt.connect(env('MQTT_URL', 'mqtt://localhost:1883'), {
  clientId: `suscriptor_bd_${process.pid}_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 2000,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
});

mq.on('connect', () => {
  aviso(`MQTT conectado, suscrito a ${topicTelemetria}`);
  mq.subscribe(topicTelemetria, { qos: 1 }, (e) => e && aviso(`ERROR suscripción: ${e.message}`));
  reenviar(); // "conexión de vuelta": intenta vaciar el búfer sin esperar al reloj
});
mq.on('reconnect', () => aviso('MQTT reconectando...'));
mq.on('error', (e) => aviso(`ERROR MQTT: ${e.message}`));
mq.on('message', (topic, mensaje) =>
  proc.procesar(topic, mensaje).catch((e) => aviso(`ERROR procesando mensaje: ${e.message}`)));

const temporizador = setInterval(reenviar, 15_000);

let cerrando = false;
async function cerrar() {
  if (cerrando) return;
  cerrando = true;
  clearInterval(temporizador);
  aviso('Cerrando suscriptor...');
  await mq.endAsync();
  process.exit(0);
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
