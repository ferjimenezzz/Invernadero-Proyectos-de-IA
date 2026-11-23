// Broker MQTT local (aedes) para simular sin Mosquitto.
import net from 'node:net';
import { Aedes } from 'aedes';
import { env } from '../src/supabase.js';

const hora = () => new Date().toTimeString().slice(0, 8);
const puerto = Number(new URL(env('MQTT_URL', 'mqtt://localhost:1883')).port) || 1883;

const broker = await Aedes.createBroker();
let publicados = 0;
broker.on('client', (c) => console.log(`[${hora()}] conectado ${c.id}`));
broker.on('clientDisconnect', (c) => console.log(`[${hora()}] desconectado ${c.id}`));
broker.on('publish', (p, c) => {
  if (c && !p.topic.startsWith('$SYS')) console.log(`[${hora()}] publicados=${++publicados} topic=${p.topic}`);
});

const servidor = net.createServer(broker.handle);
servidor.listen(puerto, () => console.log(`[${hora()}] broker MQTT en el puerto ${puerto}`));

const cerrar = () => servidor.close(() => broker.close(() => process.exit(0)));
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
