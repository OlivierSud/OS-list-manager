import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true, // Permet l'accès depuis d'autres appareils (mobile)
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'OS List Manager',
        short_name: 'OS Lists',
        description: 'Manage your tasks and shopping lists with Google Sheets sync.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'https://img.icons8.com/color/192/checklist--v1.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://img.icons8.com/color/512/checklist--v1.png',
            sizes: "512x512",
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
