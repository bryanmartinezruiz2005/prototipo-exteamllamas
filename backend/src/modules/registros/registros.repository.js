// ---------------------------------------------------------------------------
// Acceso a datos de la tabla registros_prueba.
// Toda consulta usa parámetros parametrizados ($1, $2, ...) para evitar
// inyección SQL. Ninguna regla de negocio vive aquí.
// ---------------------------------------------------------------------------
import { consultar } from '../../config/db.js';

const COLUMNAS = 'id, operation_uuid, contenido, estado, creado_en';

/**
 * Inserta un registro y devuelve { registro, yaExistia }.
 * Si operation_uuid ya existe en el servidor (reintento de la PWA), no se
 * duplica: se devuelve el registro existente con yaExistia = true para que
 * el cliente lo marque como sincronizado.
 */
export async function crear({ operation_uuid, contenido, estado }) {
  const { rows } = await consultar(
    `INSERT INTO registros_prueba (operation_uuid, contenido, estado)
          VALUES ($1, $2, $3)
     ON CONFLICT (operation_uuid) WHERE operation_uuid IS NOT NULL DO NOTHING
     RETURNING ${COLUMNAS}`,
    [operation_uuid ?? null, contenido, estado],
  );

  if (rows.length > 0) {
    return { registro: rows[0], yaExistia: false };
  }

  // Conflicto de idempotencia: recuperamos el registro que ya existía
  const existente = await consultar(
    `SELECT ${COLUMNAS}
       FROM registros_prueba
      WHERE operation_uuid = $1`,
    [operation_uuid],
  );

  return { registro: existente.rows[0], yaExistia: true };
}

/** Lista registros (opcionalmente filtrados por estado), más recientes primero. */
export async function listar({ estado, limite = 50 } = {}) {
  const condiciones = [];
  const parametros = [];

  if (estado) {
    parametros.push(estado);
    condiciones.push(`estado = $${parametros.length}`);
  }

  parametros.push(limite);
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await consultar(
    `SELECT ${COLUMNAS}
       FROM registros_prueba
       ${where}
      ORDER BY creado_en DESC
      LIMIT $${parametros.length}`,
    parametros,
  );

  return rows;
}
