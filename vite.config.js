import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { pdfjsAssetsPlugin } from './scripts/pdfjs-assets-plugin.mjs'

export default defineConfig({
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
