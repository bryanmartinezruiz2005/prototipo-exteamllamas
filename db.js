/**
 * db.js
 * Configuración de la conexión a PostgreSQL usando el pool de `pg`,
 * compatible con Supabase (cadenas de conexión Connection Pooler o Direct).
 */
require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "❌ No se encontró la variable de entorno DATABASE_URL en el archivo .env"
  );
  process.exit(1);
}

const isSupabaseUrl = DATABASE_URL.includes("supabase.co");
const isLocalOrPooler = /localhost|127\.0\.0\.1|6543/.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Supabase exige SSL; en conexiones locales (o pooler en el puerto 6543)
  // el SSL sin verificación de certificado suele ser suficiente.
  ssl: isLocalOrPooler
    ? undefined
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("⚠️ Error inesperado en el pool de PostgreSQL:", err.message);
});

/**
 * Verifica que la conexión con la base de datos sea exitosa.
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT NOW() AS now, version() AS version");
    return res.rows[0];
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, isSupabaseUrl };
