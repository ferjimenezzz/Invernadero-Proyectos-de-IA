// Lógica pura del suscriptor: validación y procesamiento con dependencias inyectadas.
export const MAX_BYTES = 16 * 1024;
export const MAX_TEXTO = 2000;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Devuelve { payload, motivo }. Siempre hay payload: lo inválido también se envía a la BD
// para que quede registrado el error (la BD nunca lo guarda como lectura válida).
export function validar(mensaje) {
  const bytes = Buffer.byteLength(mensaje);
  const texto = mensaje.toString();
  if (bytes > MAX_BYTES) return { payload: texto.slice(0, MAX_TEXTO), motivo: `mensaje de ${bytes} bytes (máx ${MAX_BYTES})` };

  let parseado;
  try {
    parseado = JSON.parse(texto);
  } catch {
    return { payload: texto.slice(0, MAX_TEXTO), motivo: 'JSON no interpretable' };
  }
  if (!esObjeto(parseado)) return { payload: parseado, motivo: 'el JSON no es un objeto' };
  if (typeof parseado.nodo_id !== 'string' || !parseado.nodo_id) return { payload: parseado, motivo: 'falta nodo_id (texto)' };
  if (!esObjeto(parseado.sensores)) return { payload: parseado, motivo: 'falta sensores (objeto)' };
  return { payload: parseado, motivo: null };
}

export const hora = (d = new Date()) => d.toTimeString().slice(0, 8);

// ingestar(registro) -> id o lanza si falla; reloj() -> Date; log(texto)
export function crearProcesador({ ingestar, buffer, reloj = () => new Date(), log = console.log }) {
  const linea = (t) => log(`[${hora(reloj())}] ${t}`);

  return {
    async procesar(topic, mensaje) {
      const recibido_en = reloj().toISOString(); // se toma de inmediato: es la hora de la lectura
      const { payload, motivo } = validar(mensaje);
      if (motivo) linea(`INVALIDO motivo=${motivo} topic=${topic}`);
      const r = await buffer.enviarOAgregar({ payload, topic, recibido_en }, ingestar);
      if (r.enBuffer) linea(`SIN CONEXION → búfer (${buffer.pendientes} pendientes)${r.error ? ` causa=${r.error.message}` : ''}`);
      else if (!motivo) linea(`OK paquete=${r.id} nodo=${payload.nodo_id}`);
      else linea(`REGISTRADO paquete=${r.id} (con error de formato)`);
      return r;
    },

    // Llamado cada 15 s y al volver la conexión.
    async reenviar() {
      if (buffer.pendientes === 0) return 0;
      const { enviados, corruptos } = await buffer.vaciar(ingestar);
      if (corruptos) linea(`CORRUPTOS ${corruptos} líneas movidas a pendientes.corruptos.jsonl`);
      if (enviados) linea(`REENVIADOS ${enviados} (${buffer.pendientes} pendientes)`);
      return enviados;
    },
  };
}
