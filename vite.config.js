import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Comenta o quita el base para desarrollo local
  // base: '/gastos-compartidos/',
  server: {
    port: 3000,
    open: true,
  },
});