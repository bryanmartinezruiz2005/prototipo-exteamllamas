// ---------------------------------------------------------------------------
// Rutas del módulo registros (se monta en /api/registros desde app.js).
// ---------------------------------------------------------------------------
import { Router } from 'express';

import { getListarRegistros, postCrearRegistro } from './registros.controller.js';

export const registrosRouter = Router();

registrosRouter.get('/', getListarRegistros);
registrosRouter.post('/', postCrearRegistro);
