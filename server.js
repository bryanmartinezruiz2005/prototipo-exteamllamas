/**
 * server.js
 * Punto de entrada del backend de ExteamLlamas.
 * Express + CORS + Helmet + conexión PostgreSQL (Supabase).
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { testConnection } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middlewares globales ----------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json());
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
