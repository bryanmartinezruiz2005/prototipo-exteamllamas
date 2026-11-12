import { useState } from 'react';

import { agregarRegistroLocal } from '../db/dexie.js';

/**
 * Formulario de alta: guarda el registro en Dexie.js al instante,
 * sin importar si hay red. Sincronizar es otra responsabilidad.
 */
export default function FormularioRegistro() {
  const [contenido, setContenido] = useState('');
  const [guardado, setGuardado] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();

    const texto = contenido.trim();
    if (texto === '') return;

    await agregarRegistroLocal(texto);
    setContenido('');
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 2500);
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <label htmlFor="contenido" className="block text-sm font-medium text-slate-700">
        Nuevo registro
      </label>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="contenido"
          type="text"
          value={contenido}
          onChange={(evento) => setContenido(evento.target.value)}
          placeholder="Escribe algo… se guarda localmente al instante"
          maxLength={2000}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="submit"
          disabled={contenido.trim() === ''}
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Guardar localmente
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {guardado
          ? '✓ Guardado en IndexedDB (PrototipoOfflineDB). Se sincronizará cuando haya red.'
          : 'Funciona igual con o sin conexión a internet.'}
      </p>
    </form>
  );
}
