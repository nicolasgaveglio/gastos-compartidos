import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: 'https://github.com/nicolasgaveglio/gastos-compartidos', // ⬅️ Reemplaza con el nombre de tu repo
})