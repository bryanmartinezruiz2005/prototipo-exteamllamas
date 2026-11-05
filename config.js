/**
 * config.js
 * Configuración centralizada de ExteamLlamas API.
 * Lee todas las variables desde .env (dotenv) y expone un único objeto `config`.
 */
require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// ---------------------------------------------------------------------------
// 1. Secretos (falla rápido si faltan)
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Falta la variable JWT_SECRET en .env (autenticación JWT).");
}
if (JWT_SECRET.length < 32) {
  if (isProduction) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres en producción.");
  }
  console.warn("⚠️  JWT_SECRET con menos de 32 caracteres (solo aceptable en desarrollo).");
}

// ---------------------------------------------------------------------------
// 2. Orígenes CORS (separados por coma en .env)
// ---------------------------------------------------------------------------
const rawOrigins = process.env.CORS_ORIGIN || "*";
const corsOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (isProduction && corsOrigins.includes("*")) {
  console.warn(
    "⚠️  CORS_ORIGIN='*' en producción. Usa orígenes específicos (ej: https://app.exteam.cl)."
  );
}

// ---------------------------------------------------------------------------
// 3. Config exportada
// ---------------------------------------------------------------------------
module.exports = {
  env: NODE_ENV,
  isProduction,

  app: {
    name: "ExteamLlamas API",
    version: require("./package.json").version,
    port: parseInt(process.env.PORT, 10) || 3000,
  },

  security: {
    // Helmet: cabeceras de protección HTTP
    helmet: {
      xPoweredBy: false, // elimina X-Powered-By
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      // 'cross-origin' permite que el frontend (otro origen) cargue
      // recursos servidos por la API (p. ej. el logo de la empresa).
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
      noSniff: true,
      hsts: { maxAge: 15552000, includeSubDomains: true }, // 180 días
    },

    // CORS: orígenes permitidos para el frontend
    cors: {
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-Request-Id"],
      credentials: false, // auth por JWT en header → no se necesitan cookies
      maxAge: 600, // preflight cacheado 10 min
    },
  },

  auth: {
    jwt: {
      secret: JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      algorithm: "HS256",
    },
    // Roles válidos (deben coincidir con el CHECK de la tabla usuarios)
    roles: ["ADMIN", "GERENTE", "TECNICO_TERRENO", "OPERADOR_TALLER"],
    // Coste de hashing para futuros registros de usuarios (bcrypt)
    bcryptRounds: 12,
  },

  company: {
    nombre: "ExteamLlamas",
    // ===== DATOS DE LA EMPRESA — PENDIENTE DE COMPLETAR =====
    // logo:      "[LOGO_EMPRESA_AQUI]",
    // rut:       "[RUT_EMPRESA_AQUI]",
    // direccion: "[DIRECCION_EMPRESA_AQUI]",
    // telefono:  "[TELEFONO_EMPRESA_AQUI]",
    // email:     "[EMAIL_EMPRESA_AQUI]",
    // sitioWeb:  "[SITIO_WEB_EMPRESA_AQUI]",
  },
};
