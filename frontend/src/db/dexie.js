// ---------------------------------------------------------------------------
// Base de datos local (IndexedDB) con Dexie.js.
//
// Base:  PrototipoOfflineDB
// Tabla: registros
//   - id                 clave local autoincremental (++id)
//   - operation_uuid     UUID v4 único: garantiza idempotencia en la sincronía
//   - contenido          texto del registro
//   - estado             estado LOCAL de sincronización: pendiente | error | sincronizado
//   - creado_offline_en  ISO string con la fecha de creación en el cliente
//   - sincronizado       booleano; la cola FIFO se arma con !sincronizado
//
// Nota: "sincronizado" NO se indexa porque IndexedDB no admite booleanos como
// clave de índice; se filtra en memoria (volumen bajo en el prototipo).
// ---------------------------------------------------------------------------
import Dexie from 'dexie';

export const db = new Dexie('PrototipoOfflineDB');

db.version(1).stores({
  registros: '++id, operation_uuid, estado, creado_offline_en',
});

/**
 * UUID v4 único por registro.
 * Nota: crypto.randomUUID() solo existe en contextos seguros (HTTPS o
 * localhost); al abrir la app por http://<IP-local> no está disponible.
 * En ese caso se genera el mismo UUID v4 con getRandomValues, que sí está
 * permitido sin HTTPS (el backend valida el formato v4).
 */
export function generarOperationUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Guarda un registro en la cola local. Funciona sin red. */
export async function agregarRegistroLocal(contenido) {
  const registro = {
    operation_uuid: generarOperationUuid(),
    contenido,
    estado: 'pendiente',
    creado_offline_en: new Date().toISOString(),
    sincronizado: false,
  };

  await db.registros.add(registro);
  return registro;
}

/** Devuelve los registros aún no sincronizados en orden FIFO (id ascendente). */
export async function obtenerPendientes() {
  const todos = await db.registros.orderBy('id').toArray();
  return todos.filter((registro) => !registro.sincronizado);
}
