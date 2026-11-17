// Genera docs/diccionario_datos.md desde el catálogo de invernadero_test (entregable E1).
// Requiere haber corrido antes: npm run test:bd
// Sale con código 1 si alguna tabla o columna no tiene COMMENT.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BD_PRUEBAS, conexion, psql } from './psql.js';

const SEP = '\t';
const consulta = `
SELECT c.relname,
       CASE c.relkind WHEN 'v' THEN 'vista' ELSE 'tabla' END,
       coalesce(obj_description(c.oid, 'pg_class'), ''),
       a.attname,
       format_type(a.atttypid, a.atttypmod),
       CASE WHEN a.attnotnull THEN 'NO' ELSE 'SÍ' END,
       coalesce((SELECT string_agg(CASE k.contype
                          WHEN 'p' THEN 'PK'
                          WHEN 'u' THEN 'UQ'
                          ELSE 'FK → ' || k.confrelid::regclass || '(' ||
                               (SELECT r.attname FROM pg_attribute r
                                 WHERE r.attrelid = k.confrelid
                                   AND r.attnum = k.confkey[array_position(k.conkey, a.attnum)]) || ')'
                        END, ', ' ORDER BY k.contype DESC)
                   FROM pg_constraint k
                  WHERE k.conrelid = c.oid AND k.contype IN ('p','u','f') AND a.attnum = ANY (k.conkey)), ''),
       coalesce(col_description(c.oid, a.attnum), '')
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'inv'
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
 WHERE c.relkind IN ('r','v')
 ORDER BY c.relkind, c.relname, a.attnum`;

const r = psql(conexion({ db: BD_PRUEBAS }), ['-A', '-t', '-F', SEP, '-c', consulta]);
if (!r.ok) {
  console.error(r.stderr.trim() || 'No se pudo leer el catálogo');
  process.exit(1);
}

const celda = (t) => t.replaceAll('|', '\\|').replaceAll('\n', ' ');
const objetos = new Map();
for (const linea of r.stdout.split(/\r?\n/).filter(Boolean)) {
  const [rel, clase, comentario, col, tipo, nulo, clave, desc] = linea.split(SEP);
  if (!objetos.has(rel)) objetos.set(rel, { clase, comentario, columnas: [] });
  objetos.get(rel).columnas.push({ col, tipo, nulo, clave, desc });
}

const faltan = [];
const md = [
  '# Diccionario de datos · esquema `inv`',
  '',
  `Generado por \`npm run diccionario\` desde los COMMENT de \`bd/invernadero_bd.sql\` (BD \`${BD_PRUEBAS}\`). No editar a mano.`,
  'Fechas y horas en `timestamptz` (UTC); convertir a America/Mexico_City al consultar.',
  '',
];
for (const titulo of ['tabla', 'vista']) {
  md.push(`## ${titulo === 'tabla' ? 'Tablas' : 'Vistas'}`, '');
  for (const [rel, o] of objetos) {
    if (o.clase !== titulo) continue;
    if (titulo === 'tabla' && !o.comentario) faltan.push(`inv.${rel}`);
    md.push(`### inv.${rel}`, '', o.comentario || '_(sin descripción)_', '');
    if (titulo === 'tabla') {
      md.push('| Columna | Tipo | Nulo | Clave | Descripción |', '|---|---|---|---|---|');
      for (const c of o.columnas) {
        if (!c.desc) faltan.push(`inv.${rel}.${c.col}`);
        md.push(`| ${c.col} | ${c.tipo} | ${c.nulo} | ${c.clave} | ${celda(c.desc)} |`);
      }
    } else {
      md.push('| Columna | Tipo |', '|---|---|');
      for (const c of o.columnas) md.push(`| ${c.col} | ${c.tipo} |`);
    }
    md.push('');
  }
}

const destino = fileURLToPath(new URL('../docs/diccionario_datos.md', import.meta.url));
writeFileSync(destino, md.join('\n'));
console.log(`Escrito docs/diccionario_datos.md (${objetos.size} tablas y vistas)`);
if (faltan.length) {
  console.error(`Sin COMMENT (${faltan.length}):\n  ${faltan.join('\n  ')}`);
  process.exit(1);
}
