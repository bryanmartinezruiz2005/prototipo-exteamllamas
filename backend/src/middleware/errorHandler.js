// ---------------------------------------------------------------------------
// Manejador global de errores (siempre el último app.use de app.js).
// Traduce errores conocidos a respuestas JSON consistentes:
//   { "ok": false, "error": "mensaje" }
// ---------------------------------------------------------------------------
import { ApiError } from '../shared/errors.js';

export function errorHandler(error, req, res, next) {
  // Si la respuesta ya salió, delegamos en el manejo por defecto de Express.
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let mensaje = 'Error interno del servidor';

  if (error instanceof ApiError) {
    status = error.status;
    mensaje = error.message;
  } else if (error?.type === 'entity.parse.failed') {
    // Cuerpo con JSON inválido
    status = 400;
    mensaje = 'El cuerpo de la petición no es un JSON válido.';
  } else if (error?.code === '23505') {
    // unique_violation de PostgreSQL
    status = 409;
    mensaje = 'El registro ya existe (restricción única violada).';
  }

  if (status >= 500) {
    console.error('[error] No controlado:', error);
  }

  res.status(status).json({ ok: false, error: mensaje });
}
