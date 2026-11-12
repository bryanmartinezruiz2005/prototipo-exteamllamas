/** Indicador visual del estado de red (Online / Offline). */
export default function EstadoRed({ online }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'
        }`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
