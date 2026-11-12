// ---------------------------------------------------------------------------
// Aplica los scripts .sql de esta carpeta en orden alfabético.
// Uso: npm run db:migrate
// Los scripts deben ser idempotentes (IF NOT EXISTS) para poder re-ejecutarlos.
// ---------------------------------------------------------------------------
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../src/config/db.js';

const directorioScripts = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const archivos = (await readdir(directorioScripts))
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

  if (archivos.length === 0) {
    console.log('[migrate] No se encontraron scripts .sql para aplicar.');
    return;
  }

  for (const archivo of archivos) {
    const ruta = path.join(directorioScripts, archivo);
    const sql = await readFile(ruta, 'utf8');

    console.log(`[migrate] Aplicando ${archivo}...`);
    await pool.query(sql);
  }

  console.log(`[migrate] ${archivos.length} script(s) aplicado(s) correctamente.`);
}

main()
  .catch((error) => {
    console.error('[migrate] Error al aplicar los scripts:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
