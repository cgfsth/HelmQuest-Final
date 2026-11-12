import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { pdfjsAssetsPlugin } from './scripts/pdfjs-assets-plugin.mjs'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  build: { rollupOptions: { input: { app: fileURLToPath(new URL('./index.html', import.meta.url)), maritimeExperiment: fileURLToPath(new URL('./experiments/maritime.html', import.meta.url)) } } },
  plugins: [vue(), pdfjsAssetsPlugin()],
  server: {
    port: 5174,
    host: 'localhost',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5174
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }
})
