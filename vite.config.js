import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  base: '/esmioptica-dados/',
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
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env': Object.keys(env).reduce((acc, key) => {
      if (key.startsWith('REACT_APP_')) {
        acc[key] = JSON.stringify(env[key]);
      }
      return acc;
    }, {})
  }
}})
