// Publica mensajes con el formato exacto del firmware (sin timestamp, humedad_pct, nivel_pct, id numérico).
// Uso: node scripts/simular.js [--validos 12] [--invalidos] [--intervalo 1000] [--nodo codigo]
import { fileURLToPath } from 'node:url';
import mqtt from 'mqtt';
import { env } from '../src/supabase.js';

// Valores conocidos: el mensaje i trae suelo 1 = 40+i %, temperatura ambiente = 20+i/10 °C.
export function generarMensajes(n = 12, { invalidos = false, nodo = 'invernadero_albahaca_01' } = {}) {
  const mensajes = [];
  for (let i = 0; i < n; i++) {
    mensajes.push(JSON.stringify({
      nodo_id: nodo,
      cultivo: 'albahaca',
      sensores: {
        ambiente: { tipo: 'DHT22', temperatura_c: 20 + i / 10, humedad_pct: 60, estado: 'OPTIMO' },
        luz: { tipo: 'BH1750', luxes: 14500, estado: 'ILUMINACION_ADECUADA' },
        suelo_profundidad: { tipo: 'DS18B20', temperatura_c: 19.5, estado: 'TEMPERATURA_OPTIMA' },
        tanque_agua: { tipo: 'HC-SR04', distancia_cm: 12, nivel_pct: 80, estado: 'NIVEL_SEGURO' },
        suelo_superficie: [
          { id: 1, pin: 32, humedad_pct: 40 + i, estado: 'OPTIMO' },
          { id: 2, pin: 33, humedad_pct: 48, estado: 'OPTIMO' },
          { id: 3, pin: 34, humedad_pct: 15, estado: 'RIEGO_NECESARIO' },
        ],
      },
    }));
  }
  if (invalidos) {
    mensajes.push('esto no es json {{{');
    mensajes.push(JSON.stringify({ nodo_id: nodo, cultivo: 'albahaca' })); // sin "sensores"
    mensajes.push(JSON.stringify({ // valores fuera de rango / sensor desconectado
      nodo_id: nodo,
      sensores: {
        suelo_profundidad: { tipo: 'DS18B20', temperatura_c: -127, estado: 'ERROR_DS18B20_DESCONECTADO' },
        suelo_superficie: [{ id: 1, pin: 32, humedad_pct: 40, estado: 'OPTIMO' }],
      },
    }));
  }
  return mensajes;
}

async function main() {
  const { values: a } = (await import('node:util')).parseArgs({
    options: {
      validos: { type: 'string', default: '12' },
      invalidos: { type: 'boolean', default: false },
      intervalo: { type: 'string', default: '1000' },
      nodo: { type: 'string', default: 'invernadero_albahaca_01' },
    },
  });
  const mensajes = generarMensajes(Number(a.validos), { invalidos: a.invalidos, nodo: a.nodo });
  const topic = env('MQTT_TOPIC_TELEMETRIA', 'invernadero/albahaca_01/telemetria');
  const mq = await mqtt.connectAsync(env('MQTT_URL', 'mqtt://localhost:1883'), {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
  });
  for (const [i, m] of mensajes.entries()) {
    await mq.publishAsync(topic, m, { qos: 1 });
    console.log(`[${new Date().toTimeString().slice(0, 8)}] enviado ${i + 1}/${mensajes.length}`);
    if (i < mensajes.length - 1) await new Promise((r) => setTimeout(r, Number(a.intervalo)));
  }
  await mq.endAsync();
  console.log(`Resumen: ${a.validos} válidos${a.invalidos ? ' + 3 inválidos' : ''} publicados en ${topic}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
