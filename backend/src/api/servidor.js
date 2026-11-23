// Pone a escuchar el adaptador REST. Sin .env no falla al arrancar: responde 503 solo a las
// peticiones que necesitan Supabase (así "/" y el ping de la app siguen vivos).
import { crearApp } from './app.js';
import { crearDatos } from './datos.js';

const puerto = Number(process.env.PORT) || 3000;

crearApp({ datos: crearDatos() }).listen(puerto, '0.0.0.0', () => {
  console.log(`[api] adaptador REST escuchando en 0.0.0.0:${puerto}`);
});
