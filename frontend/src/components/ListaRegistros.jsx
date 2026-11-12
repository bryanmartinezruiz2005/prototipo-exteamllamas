/** Badge de estado: distingue registros pendientes de sincronizados. */
function etiquetaEstado(registro) {
  if (registro.sincronizado) {
    return { texto: 'Sincronizado', clases: 'bg-emerald-50 text-emerald-700' };
  }
  if (registro.estado === 'error') {
    return { texto: 'Error de sync', clases: 'bg-red-50 text-red-700' };
  }
  return { texto: 'Pendiente', clases: 'bg-amber-50 text-amber-700' };
}

/** Lista visual de los registros locales (más recientes primero). */
export default function ListaRegistros({ registros }) {
  if (!registros || registros.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Todavía no hay registros locales. Agrega uno con el formulario de arriba.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {registros.map((registro) => {
        const etiqueta = etiquetaEstado(registro);

        return (
          <li key={registro.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="break-words text-slate-800">{registro.contenido}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(registro.creado_offline_en).toLocaleString()} · uuid{' '}
                {registro.operation_uuid.slice(0, 8)}…
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${etiqueta.clases}`}
            >
              {etiqueta.texto}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
