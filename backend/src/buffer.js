// Búfer sin conexión: un archivo JSONL de pendientes, en orden de llegada.
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export function crearBuffer(ruta) {
  const corruptos = join(dirname(ruta), 'pendientes.corruptos.jsonl');
  let cola = Promise.resolve(); // serializa escrituras y envíos para no perder el orden
  let pendientes = null; // se calcula en iniciar()

  const enCola = (fn) => {
    const r = cola.then(fn);
    cola = r.catch(() => {});
    return r;
  };
  const leerLineas = async () => {
    try {
      return (await readFile(ruta, 'utf8')).split('\n').filter((l) => l.trim());
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  };
  const reescribir = async (lineas) => {
    const tmp = `${ruta}.tmp`;
    await writeFile(tmp, lineas.map((l) => l + '\n').join(''));
    await rename(tmp, ruta); // atómico: o queda el archivo viejo o el nuevo
  };

  return {
    get pendientes() { return pendientes ?? 0; },

    async iniciar() {
      await mkdir(dirname(ruta), { recursive: true });
      pendientes = (await leerLineas()).length;
      return pendientes;
    },

    // Si ya hay pendientes el mensaje va detrás de ellos (conserva el orden); si no, se intenta
    // enviar y solo si falla se guarda. Devuelve { id } o { enBuffer, error }.
    async enviarOAgregar(registro, ingestar) {
      return enCola(async () => {
        const guardar = async (error) => {
          await appendFile(ruta, JSON.stringify(registro) + '\n');
          pendientes++;
          return { enBuffer: true, error };
        };
        if (pendientes > 0) return guardar();
        try {
          return { id: await ingestar(registro) };
        } catch (e) {
          return guardar(e);
        }
      });
    },

    // Reenvía en orden con el recibido_en original; se detiene en el primer fallo.
    vaciar: (ingestar) => enCola(async () => {
      const lineas = await leerLineas();
      let i = 0;
      let enviados = 0;
      const malas = [];
      for (; i < lineas.length; i++) {
        let registro;
        try {
          registro = JSON.parse(lineas[i]);
          if (!registro || typeof registro.recibido_en !== 'string' || !registro.topic) throw new Error('forma');
        } catch {
          malas.push(lineas[i]);
          continue;
        }
        try {
          await ingestar(registro);
          enviados++;
        } catch {
          break;
        }
      }
      if (i === 0) return { enviados: 0, corruptos: 0 };
      // primero se guardan los corruptos (nunca se pierden) y luego se reescribe el resto
      if (malas.length) await appendFile(corruptos, malas.map((l) => l + '\n').join(''));
      await reescribir(lineas.slice(i));
      pendientes = lineas.length - i;
      return { enviados, corruptos: malas.length };
    }),
  };
}
