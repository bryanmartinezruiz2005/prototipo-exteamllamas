/** Botón de sincronización manual + resumen del último intento. */
export default function BotonSincronizar({
  online,
  sincronizando,
  pendientes,
  ultimoResultado,
  onSincronizar,
}) {
  const deshabilitado = !online || sincronizando || pendientes === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-900">{pendientes}</span>{' '}
          registro(s) pendiente(s) de sincronizar.
        </p>
        {ultimoResultado && <p className="mt-1 text-xs text-slate-500">{ultimoResultado}</p>}
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button
          type="button"
          onClick={onSincronizar}
          disabled={deshabilitado}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
        {!online && (
          <p className="text-xs text-amber-600">
            Sin conexión: se sincronizará automáticamente al volver la red.
          </p>
        )}
      </div>
    </div>
  );
}
