// ---------------------------------------------------------------------------
// Configuración de Express. No abre puertos: eso lo hace server.js.
// Mantener aquí solo el "ensamblado" de la app facilita tests en el futuro.
// ---------------------------------------------------------------------------
import cors from 'cors';
import express from 'express';

import { verificarConexion } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { registrosRouter } from './modules/registros/registros.routes.js';

export function crearApp() {
  const app = express();

  // La PWA correrá en otro origen/puerto (Vite: 5173), por eso CORS abierto.
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

  // 404 y manejo global de errores (en ese orden)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
