import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@nirikshan/shared': path.resolve(import.meta.dirname, '../shared/types'),
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    proxy: {
      // Backend (server/) listens on PORT from server/.env, defaulting to 5000.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
