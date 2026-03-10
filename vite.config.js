import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true, // Permet l'accès depuis d'autres appareils (mobile)
    port: 5173,
  },
  plugins: [
    react()
  ],
})
