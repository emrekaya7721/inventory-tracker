import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    allowedHosts: ['inventory-tracker.local'],
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})