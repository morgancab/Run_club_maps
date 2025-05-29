import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Optimisations pour le SEO et les performances
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Optimiser le chunking pour un meilleur cache
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
        },
      },
    },
    // Optimiser les assets
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    sourcemap: false, // Désactiver en production pour réduire la taille
  },
  // Optimisations pour le développement
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
  },
  // Configuration pour le SEO
  define: {
    __APP_VERSION__: JSON.stringify(process.env['npm_package_version'] || '1.0.0'),
  },
})
