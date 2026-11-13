// ---------------------------------------------------------------------------
// Configuración centralizada de variables de entorno.
//
// - Local: carga backend/.env (dotenv) y aplica valores por defecto aptos
//   para desarrollo (postgres/postgres como respaldo).
// - Railway/producción: la plataforma inyecta las variables (PORT,
//   DATABASE_URL...) directamente en el entorno; dotenv NO sobreescribe
//   las variables que ya están definidas, así que prevalece la de la
//   plataforma.
// ---------------------------------------------------------------------------
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Ruta a backend/.env sin importar desde dónde se ejecute el proceso
const RUTA_ENV = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.env',
);
dotenv.config({ path: RUTA_ENV });

const DEFECTOS = {
  NODE_ENV: 'development',
  PORT: 3001,
  PGHOST: 'localhost',
  PGPORT: 5432,
  PGUSER: 'postgres',
  PGPASSWORD: 'postgres',
  PGDATABASE: 'offline_first_db',
};

function leerTexto(variable, defecto) {
  const valor = process.env[variable];
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : defecto;
}

function leerEntero(variable, defecto) {
  const valor = Number.parseInt(process.env[variable] ?? '', 10);
  return Number.isInteger(valor) && valor > 0 ? valor : defecto;
}

const nodeEnv = leerTexto('NODE_ENV', DEFECTOS.NODE_ENV);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: leerEntero('PORT', DEFECTOS.PORT),
  // Conexión completa inyectada por proveedores (Railway: DATABASE_URL).
  // Si existe, tiene prioridad sobre las variables PG*.
  databaseUrl: leerTexto('DATABASE_URL', null),
  db: {
    host: leerTexto('PGHOST', DEFECTOS.PGHOST),
    port: leerEntero('PGPORT', DEFECTOS.PGPORT),
    user: leerTexto('PGUSER', DEFECTOS.PGUSER),
    password: leerTexto('PGPASSWORD', DEFECTOS.PGPASSWORD),
    database: leerTexto('PGDATABASE', DEFECTOS.PGDATABASE),
  },
};

/** Devuelve la configuración apta para logs (sin exponer la contraseña). */
export function resumenEnv() {
  return {
    nodeEnv: env.nodeEnv,
    port: env.port,
    db: env.databaseUrl
      ? { origen: 'DATABASE_URL (inyectado por la plataforma)', password: '***' }
      : { ...env.db, password: '***' },
  };
}
