// ---------------------------------------------------------------------------
// Configuración centralizada de variables de entorno (.env).
// Carga dotenv y aplica valores por defecto aptos para desarrollo local,
// de modo que el prototipo arranque sin tocar nada si PostgreSQL usa
// credenciales estándar (postgres/postgres).
// ---------------------------------------------------------------------------
import 'dotenv/config';

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
    db: { ...env.db, password: '***' },
  };
}
