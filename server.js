/**
 * server.js
 * Punto de entrada del backend de ExteamLlamas.
 * Express + CORS + Helmet + conexión PostgreSQL (Supabase).
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const { testConnection } = require("./db");
const { authenticate, authorize } = require("./middleware/auth");

const app = express();
const PORT = config.app.port;

// Deshabilita la cabecera X-Powered-By (también lo hace helmet con xPoweredBy: false)
app.disable("x-powered-by");

// ---------- Middlewares globales de seguridad ----------
app.use(helmet(config.security.helmet));
app.use(cors(config.security.cors));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------- Rutas básicas ----------
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "ExteamLlamas API",
    status: "running",
  });
});

app.get("/health", async (req, res) => {
  try {
    const db = await testConnection();
    res.json({
      ok: true,
      database: "connected",
      time: db.now,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      database: "disconnected",
      error: error.message,
    });
  }
});

// ---------- Ejemplo de ruta protegida (RBAC) ----------
// Requiere token válido Y rol ADMIN o GERENTE.
app.get(
  "/api/protegida",
  authenticate,
  authorize("ADMIN", "GERENTE"),
  (req, res) => {
    res.json({
      ok: true,
      message: "Acceso concedido",
      user: req.user,
    });
  }
);

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Ruta no encontrada" });
});

// ---------- Manejador de errores ----------
app.use((err, req, res, next) => {
  console.error("❌ Error no controlado:", err);
  res.status(500).json({ ok: false, message: "Error interno del servidor" });
});

// ---------- Arranque del servidor ----------
async function start() {
  try {
    const dbInfo = await testConnection();
    console.log("✅ Conexión a PostgreSQL establecida:", dbInfo.version);
  } catch (error) {
    console.warn(
      "⚠️ No se pudo conectar a la base de datos:",
      error.message
    );
    console.warn(
      "   El servidor iniciará de todos modos; revisa tu archivo .env (DATABASE_URL)."
    );
  }

  app.listen(PORT, () => {
    console.log(`🚀 ExteamLlamas API escuchando en http://localhost:${PORT}`);
  });
}

start();
