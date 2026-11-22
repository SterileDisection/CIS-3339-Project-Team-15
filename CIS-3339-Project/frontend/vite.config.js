import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// Sprint 3 (D2):
// - the '@' alias is built with fileURLToPath instead of require('path') + __dirname, which only
//   worked by accident in an ES module config; this works the same on Windows, macOS and Linux
// - base '/' makes every asset path absolute, so a nested route such as /clientdetails/123 still
//   loads /assets/... after a refresh (a relative base would look for /clientdetails/assets/...)
// - `npm run dev` and `npm run serve` (the production build) both use port 5173, so the single
//   CORS_ORIGIN=http://localhost:5173 in backend/.env works for both
export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
