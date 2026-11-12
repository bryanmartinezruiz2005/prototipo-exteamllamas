// ---------------------------------------------------------------------------
// Error de API con código HTTP asociado.
// Lo lanzan servicios/controllers y lo traduce errorHandler.js en JSON.
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}
