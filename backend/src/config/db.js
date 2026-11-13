// ---------------------------------------------------------------------------
// Pool de conexiones a PostgreSQL.
// - Local: variables PG* (desde backend/.env).
// - Railway: DATABASE_URL inyectado por la plataforma (conexión SSL).
//
// Se comparte entre todos los módulos; nunca se crean conexiones nuevas
// por petición.
// ---------------------------------------------------------------------------
import pg from 'pg';

import { env } from './env.js';

const { Pool } = pg;

const OPCIONES_POOL = {
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
};

if (env.databaseUrl) {
  Object.assign(OPCIONES_POOL, {
    connectionString: env.databaseUrl,
    // Los proveedores gestionados usan un certificado que no siempre está
    // en el almacén de confianza del sistema; aceptable para el prototipo.
    ssl: { rejectUnauthorized: false },
  });
} else {
  Object.assign(OPCIONES_POOL, {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
  });
}

export const pool = new Pool(OPCIONES_POOL);

// Un error aquí no debe tumbar el proceso (lo reportamos y seguimos).
pool.on('error', (error) => {
  console.error('[db] Error inesperado en el pool de conexiones:', error.message);
});

/** Ejecuta una consulta parametrizada ($1, $2, ...). */
export async function consultar(texto, parametros) {
  return pool.query(texto, parametros);
}

/** Comprueba la conexión con la base de datos (usado por /api/health). */
export async function verificarConexion() {
  const { rows } = await pool.query('SELECT NOW() AS ahora');
  return rows[0];
}

/** Cierra el pool (usado al apagar el servidor). */
export async function cerrarPool() {
  await pool.end();
}
