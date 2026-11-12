// ---------------------------------------------------------------------------
// Reglas de negocio y validación de la entidad registro.
// El controlador solo hace de puente HTTP <-> servicio.
// ---------------------------------------------------------------------------
import { ApiError } from '../../shared/errors.js';
import * as repositorio from './registros.repository.js';

/** Estados válidos: deben coincidir con el CHECK de la tabla. */
export const ESTADOS_REGISTRO = ['pendiente', 'procesado', 'error'];

const LIMITE_CONTENIDO = 2000; // caracteres
const LIMITE_LISTADO = 100;    // máximo de filas por petición
const DEFECTO_LISTADO = 50;

// UUID v4 (RFC 4122): lo genera la PWA con crypto.randomUUID()
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Crea un registro validando la entrada. */
export async function crearRegistro(entrada = {}) {
  const contenido =
    typeof entrada.contenido === 'string' ? entrada.contenido.trim() : '';
  const estado = entrada.estado ?? 'pendiente';
  const operation_uuid =
    typeof entrada.operation_uuid === 'string' ? entrada.operation_uuid.trim() : '';

  if (contenido === '') {
    throw new ApiError(400, 'El campo "contenido" es obligatorio y no puede estar vacío.');
  }
  if (contenido.length > LIMITE_CONTENIDO) {
    throw new ApiError(400, `El campo "contenido" no puede superar ${LIMITE_CONTENIDO} caracteres.`);
  }
  if (!ESTADOS_REGISTRO.includes(estado)) {
    throw new ApiError(400, `Estado inválido. Valores permitidos: ${ESTADOS_REGISTRO.join(', ')}.`);
  }
  if (operation_uuid !== '' && !UUID_V4_REGEX.test(operation_uuid)) {
    throw new ApiError(400, 'El campo "operation_uuid" debe ser un UUID v4 válido.');
  }

  return repositorio.crear({
    operation_uuid: operation_uuid || null,
    contenido,
    estado,
  });
}

/** Lista registros aplicando filtros validados. */
export async function listarRegistros({ estado, limite } = {}) {
  const filtros = {};

  if (estado !== undefined && estado !== '') {
    if (!ESTADOS_REGISTRO.includes(estado)) {
      throw new ApiError(400, `Estado inválido. Valores permitidos: ${ESTADOS_REGISTRO.join(', ')}.`);
    }
    filtros.estado = estado;
  }

  const numeroLimite = Number(limite);
  filtros.limite =
    Number.isInteger(numeroLimite) && numeroLimite > 0
      ? Math.min(numeroLimite, LIMITE_LISTADO)
      : DEFECTO_LISTADO;

  return repositorio.listar(filtros);
}
