import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import BotonSincronizar from './components/BotonSincronizar.jsx';
import EstadoRed from './components/EstadoRed.jsx';
import FormularioRegistro from './components/FormularioRegistro.jsx';
import ListaRegistros from './components/ListaRegistros.jsx';
import { db } from './db/dexie.js';
import { useOnline } from './hooks/useOnline.js';
import { sincronizarAhora } from './services/sync.js';

export default function App() {
  const online = useOnline();

  // Lista reactiva desde IndexedDB: cada cambio en Dexie re-renderiza la UI.
  const registros = useLiveQuery(() => db.registros.orderBy('id').reverse().toArray(), []);

  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);

  const pendientes = registros?.filter((registro) => !registro.sincronizado).length ?? 0;

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const resultado = await sincronizarAhora();
      if (resultado.enCurso) return; // otra sincronización ya estaba en marcha

      const partes = [];
      if (resultado.sincronizados > 0) partes.push(`${resultado.sincronizados} sincronizado(s)`);
      if (resultado.fallidos > 0) partes.push(`${resultado.fallidos} con error`);

      setUltimoResultado(
        partes.length > 0
          ? `Última sincronización: ${partes.join(' · ')}.`
          : 'No había registros pendientes.',
      );
    } finally {
      setSincronizando(false);
    }
  }, []);

  // Disparo automático: al abrir la app (si hay red) y al recuperar conexión.
  useEffect(() => {
    if (online) {
      void sincronizar();
    }
  }, [online, sincronizar]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Prototipo Offline-First
            </h1>
            <p className="text-xs text-slate-500">Etapa 2 · PWA + Dexie.js (IndexedDB)</p>
          </div>
          <EstadoRed online={online} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <FormularioRegistro />

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sincronización
          </h2>
          <div className="mt-3">
            <BotonSincronizar
              online={online}
              sincronizando={sincronizando}
              pendientes={pendientes}
              ultimoResultado={ultimoResultado}
              onSincronizar={sincronizar}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Registros locales
            </h2>
            <span className="text-xs text-slate-400">
              {registros?.length ?? 0} en IndexedDB
            </span>
          </div>
          <ListaRegistros registros={registros} />
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-slate-400">
        {import.meta.env.DEV
          ? 'Backend: http://localhost:3001 · Frontend: http://localhost:5173'
          : 'Prototipo offline-first · datos en IndexedDB con sincronización FIFO e idempotente'}
      </footer>
    </div>
  );
}
