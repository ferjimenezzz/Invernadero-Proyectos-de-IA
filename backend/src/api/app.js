// Express sin efectos de red: crearApp({ datos }) devuelve la app; servidor.js la pone a escuchar.
import express from 'express';
import { ErrorApi } from './formato.js';
import { rutasMovil } from './movil.js';
import { rutasWeb } from './web.js';

export function crearApp({ datos, ahora = () => new Date() }) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  // Sin Bearer actúa la cuenta de equipo; con Bearer, ese usuario (RLS por usuario).
  app.use((req, res, next) => {
    const h = req.get('Authorization');
    if (h === undefined) req.ctx = {};
    else {
      const m = /^Bearer\s+(\S+)$/i.exec(h);
      if (!m) return next(new ErrorApi(401, 'Authorization debe ser Bearer <token>'));
      req.ctx = { token: m[1] };
    }
    next();
  });

  app.get('/', (req, res) => res.json({ ok: true })); // la app móvil hace ping aquí (también HEAD)
  app.use('/api/v1', rutasWeb({ datos, ahora }));
  app.use(rutasMovil({ datos, ahora }));

  app.use((req, res, next) => next(new ErrorApi(404, 'Ruta no encontrada')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let estado = err.estado;
    if (!estado && err.status >= 400 && err.status < 500) estado = err.status; // body-parser: JSON roto, cuerpo grande
    if (!estado) {
      estado = 500;
      console.error('[api] error no controlado:', err?.message); // sin stack ni secretos hacia el cliente
    } else if (estado === 500 && err.causa) console.error('[api] error de Supabase:', err.causa);
    const mensaje = err.estado ? err.message : estado === 500 ? 'Error interno' : estado === 413 ? 'Cuerpo demasiado grande' : 'Solicitud inválida';
    res.status(estado).json({ status: 'error', message: mensaje });
  });

  return app;
}
