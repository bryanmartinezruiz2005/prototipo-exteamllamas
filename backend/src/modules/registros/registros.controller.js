// ---------------------------------------------------------------------------
// Capa HTTP del módulo registros: transforma req/res en llamadas al servicio
// y delega los errores en el middleware errorHandler.
// ---------------------------------------------------------------------------
import { ApiError } from '../../shared/errors.js';
import { crearRegistro, listarRegistros } from './registros.service.js';

/** POST /api/registros */
export async function postCrearRegistro(req, res, next) {
  try {
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
      // express.json() deja req.body undefined si no llegó body
      throw new ApiError(400, 'Se esperaba un cuerpo JSON con el campo "contenido".');
    }

    const { registro, yaExistia } = await crearRegistro(req.body);
    // 201 = creado ahora | 200 = ya existía (reintento idempotente de la PWA)
    res.status(yaExistia ? 200 : 201).json({ ok: true, duplicado: yaExistia, registro });
  } catch (error) {
    next(error);
  }
}

/** GET /api/registros?estado=pendiente&limite=20 */
export async function getListarRegistros(req, res, next) {
  try {
    const { estado, limite } = req.query;
    const registros = await listarRegistros({ estado, limite });

    res.json({ ok: true, total: registros.length, registros });
  } catch (error) {
    next(error);
  }
}
