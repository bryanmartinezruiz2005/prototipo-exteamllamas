// ---------------------------------------------------------------------------
// Respuesta 404 para rutas no definidas.
// ---------------------------------------------------------------------------
export function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
