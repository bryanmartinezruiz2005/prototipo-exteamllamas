import { useEffect, useState } from 'react';

/** Devuelve true si el navegador reporta conexión a la red. */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const ponerOnline = () => setOnline(true);
    const ponerOffline = () => setOnline(false);

    window.addEventListener('online', ponerOnline);
    window.addEventListener('offline', ponerOffline);

    return () => {
      window.removeEventListener('online', ponerOnline);
      window.removeEventListener('offline', ponerOffline);
    };
  }, []);

  return online;
}
