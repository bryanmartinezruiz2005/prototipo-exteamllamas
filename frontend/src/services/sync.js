// ---------------------------------------------------------------------------
// Sincronización de la cola local hacia el backend.
//
// - FIFO: se envían en orden de creación (id local ascendente).
// - Idempotente: cada registro lleva su operation_uuid; si el servidor ya lo
//   tiene (reintento), responde 200 y el cliente igualmente lo marca OK.
// - Si la red se cae a mitad de la cola, se corta el envío: el resto queda
//   pendiente para el próximo intento.
// ---------------------------------------------------------------------------
import { db, obtenerPendientes } from '../db/dexie.js';

// URL base del backend:
// - Desarrollo (Vite en :5173): backend en el mismo equipo, puerto 3001.
//   Se usa window.location.hostname para que también funcione desde el
//   teléfono con la IP local (localhost apuntaría al propio dispositivo).
// - Producción (Railway, un solo servicio): la PWA se sirve desde el mismo
//   origen que la API, así que basta la ruta relativa /api (HTTPS del
//   proveedor incluido).
// - VITE_API_URL permite forzar otra URL (p. ej. si algún día el frontend
//   se separa en un servicio propio).
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? `http://${window.location.hostname || 'localhost'}:3001/api`
    : '/api');

// Evita que dos disparos simultáneos (evento "online" + clic) lancen
// dos sincronizaciones a la vez.
let sincronizacionEnCurso = false;

export async function sincronizarAhora() {
  if (sincronizacionEnCurso) {
    return { sincronizados: 0, fallidos: 0, pendientes: 0, enCurso: true };
  }

  sincronizacionEnCurso = true;

  try {
    const pendientes = await obtenerPendientes(); // FIFO: id local ascendente
    let sincronizados = 0;
    let fallidos = 0;

    for (const registro of pendientes) {
      try {
        const respuesta = await fetch(`${API_URL}/registros`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation_uuid: registro.operation_uuid,
            contenido: registro.contenido,
          }),
        });

        if (!respuesta.ok) {
          throw new Error(`el servidor respondió HTTP ${respuesta.status}`);
        }

        await db.registros.update(registro.id, {
          sincronizado: true,
          estado: 'sincronizado',
        });
        sincronizados += 1;
      } catch (error) {
        // Sin red cortamos la cola: lo demás sigue pendiente (sin marcar error).
        if (!navigator.onLine) break;

        await db.registros.update(registro.id, { estado: 'error' });
        fallidos += 1;
        console.warn(`[sync] Falló "${registro.contenido}":`, error.message);
      }
    }

    return { sincronizados, fallidos, pendientes: pendientes.length, enCurso: false };
  } finally {
    sincronizacionEnCurso = false;
  }
}
