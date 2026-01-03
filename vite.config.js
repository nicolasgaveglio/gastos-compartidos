import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Para GitHub Pages, el base debe ser el nombre del repositorio
  // Cambia 'gastos-compartidos' por el nombre exacto de tu repo si es diferente
  base: '/gastos-compartidos/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
    open: true,
  },
});