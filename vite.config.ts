import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
          },
        },
      },
      {
        entry: 'electron/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#electron': path.resolve(__dirname, './electron'),
      '#agent': path.resolve(__dirname, './agent'),
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
