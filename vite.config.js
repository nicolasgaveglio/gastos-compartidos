import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/GASTOS-COMPARTIDOS/', // ⬅️ Reemplaza con el nombre de tu repo
})