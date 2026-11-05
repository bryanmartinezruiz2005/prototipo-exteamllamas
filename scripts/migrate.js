/**
 * scripts/migrate.js
 * Ejecuta pendientes en migrations/*.sql (en orden alfabético) sobre la BD
 * indicada en DATABASE_URL y luego VERIFICA que las tablas existan con sus
 * restricciones (PK, FK, CHECK, UNIQUE).
 *
 * Uso:
 *   npm run db:migrate
 *
 * - Es idempotente: registra cada archivo aplicado en schema_migrations.
 * - Cada archivo se corre en su propia transacción.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

const OBJETIVOS = ["usuarios", "clientes", "sucursales", "extintores"];

async function crearTablaControl(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nombre_archivo VARCHAR(255) PRIMARY KEY,
      ejecutado_en   TIMESTAMP    NOT NULL DEFAULT LOCALTIMESTAMP
    )
  `);
}

async function migracionesAplicadas(client) {
  const { rows } = await client.query(
    "SELECT nombre_archivo FROM schema_migrations"
  );
  return new Set(rows.map((r) => r.nombre_archivo));
}

async function ejecutarMigracion(client, archivo) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), "utf8");
  try {
    // Cada archivo .sql gestiona su propia transacción (BEGIN ... COMMIT).
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (nombre_archivo) VALUES ($1) ON CONFLICT DO NOTHING",
      [archivo]
    );
  } catch (err) {
    // Cierra una transacción que haya quedado abortada a medias.
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

async function verificarEsquema(client) {
  console.log("\n== VERIFICACIÓN DE ESQUEMA ==");
  const { rows: tablas } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)
     ORDER BY table_name`,
    [OBJETIVOS]
  );
  const encontradas = new Set(tablas.map((r) => r.table_name));

  for (const t of OBJETIVOS) {
    if (!encontradas.has(t)) {
      console.log(`  ❌ ${t}: NO existe`);
      continue;
    }
    const { rowCount: cols } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [t]
    );
    const { rowCount: restricciones } = await client.query(
      `SELECT 1 FROM pg_constraint
       WHERE conrelid = $1::regclass`,
      [`public.${t}`]
    );
    console.log(`  ✅ ${t}: ${cols} columnas, ${restricciones} restricciones (PK/FK/CHECK/UNIQUE)`);
  }

  const { rows: vistas } = await client.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.views
     WHERE table_schema = 'public'`
  );
  console.log(`\n  (vistas en public: ${vistas[0].n})`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Falta DATABASE_URL en .env");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log("🔌 Conectando a:", process.env.DATABASE_URL.replace(/:[^:@/]*@/, ":***@"));
    await client.query("SELECT 1");

    await crearTablaControl(client);
    const aplicadas = await migracionesAplicadas(client);

    const archivos = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (archivos.length === 0) {
      console.log("⚠️  No hay archivos .sql en migrations/");
      return;
    }

    let ejecutadas = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) {
        console.log(`⏭️  ${archivo}: ya aplicada`);
        continue;
      }
      console.log(`▶️  Ejecutando ${archivo} ...`);
      await ejecutarMigracion(client, archivo);
      console.log(`✅ ${archivo}: aplicada`);
      ejecutadas++;
    }

    console.log(`\nResumen: ${ejecutadas} aplicada(s), ${archivos.length - ejecutadas} omitida(s).`);
    await verificarEsquema(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Error en migración:", err.message);
  process.exit(1);
});
