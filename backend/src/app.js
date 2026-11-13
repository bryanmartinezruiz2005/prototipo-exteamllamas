// ---------------------------------------------------------------------------
// Configuración de Express. No abre puertos: eso lo hace server.js.
// Mantener aquí solo el "ensamblado" de la app facilita tests en el futuro.
//
// En producción (Railway) Express sirve tanto la API como la PWA compilada
// (frontend/dist): un solo servicio, una sola URL, sin CORS.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';

import { verificarConexion } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { registrosRouter } from './modules/registros/registros.routes.js';

// PWA compilada (frontend/dist). En desarrollo no existe: el frontend lo
// sirve Vite en el puerto 5173.
const DIRECTORIO_DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/dist',
);

export function crearApp() {
  const app = express();

  // En desarrollo la PWA corre en otro origen/puerto (Vite: 5173), por eso
  // CORS abierto. En producción las peticiones son del mismo origen.
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health check: valida el proceso y la conexión a PostgreSQL.
  app.get('/api/health', async (req, res) => {
    try {
      const { ahora } = await verificarConexion();
      res.json({ ok: true, db: 'conectado', ahora });
    } catch (error) {
      res.status(503).json({ ok: false, db: 'no disponible', error: error.message });
    }
  });

  // Recurso principal del prototipo
  app.use('/api/registros', registrosRouter);

  // Producción: servir la PWA si fue compilada ( Railway ejecuta el build ).
  const rutaIndex = path.join(DIRECTORIO_DIST, 'index.html');
  if (fs.existsSync(rutaIndex)) {
    app.use(express.static(DIRECTORIO_DIST));

    // Fallback SPA: cualquier GET que no sea /api devuelve index.html,
    // para que el enrutado del cliente funcione al recargar la página.
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(rutaIndex);
      }
      return next();
    });
  }

  // 404 y manejo global de errores (en ese orden)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
