import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // base: '/esmioptica-dados/',
  server: {
    host: true,
    port: 5173,
    open: true,
    cors: true,
    strictPort: false,
  },
  preview: {
    port: 4173,
    open: true,
  },
  define: {
    'process.env': process.env
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
