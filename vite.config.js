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
        id: 'os-list-manager-v1',
        name: 'OS List Manager',
        short_name: 'Mes Listes',
        description: 'Gérez vos listes de tâches synchronisées avec Supabase.',
        theme_color: '#eb7600',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: './index.html',
        scope: './',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        stats: 'stats.html'
      }
    }
  }
})
