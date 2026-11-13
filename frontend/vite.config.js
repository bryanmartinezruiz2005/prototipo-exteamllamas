import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Puerto fijo para que coincida con la configuración CORS del backend.
    // Solo se expone en local (localhost); para acceder desde el teléfono
    // hay que agregar host: true.
    port: 5173,
  },
});
