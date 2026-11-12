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

/** UUID v4 único por registro (crypto.randomUUID). */
export function generarOperationUuid() {
  return crypto.randomUUID();
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
