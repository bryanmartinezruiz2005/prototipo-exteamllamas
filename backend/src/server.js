// ---------------------------------------------------------------------------
// Punto de entrada: crea la app, abre el puerto y gestiona el apagado limpio.
// Uso: npm run dev (recarga automática) | npm start
// ---------------------------------------------------------------------------
import { crearApp } from './app.js';
import { cerrarPool } from './config/db.js';
import { env, resumenEnv } from './config/env.js';

const app = crearApp();

const servidor = app.listen(env.port, () => {
  console.log(`[server] Escuchando en http://localhost:${env.port}`);
  console.log(`[server] Configuración: ${JSON.stringify(resumenEnv())}`);
});

/** Apaga el servidor y cierra la base de datos sin cortar conexiones activas. */
async function apagar(señal) {
  console.log(`[server] ${señal} recibido, cerrando servidor y conexiones...`);

  servidor.close(async () => {
    await cerrarPool();
    console.log('[server] Apagado limpio.');
    process.exit(0);
  });

  // Red de seguridad si algo queda colgado
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
