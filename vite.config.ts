import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// 各模块 alias（按构建目标分离）
const r = (p: string) => path.resolve(__dirname, p)

/** renderer（src/）专用 alias，由顶层 Vite 处理 */
const rendererAlias = {
  '@': r('./src'),
  'vue': 'vue/dist/vue.esm-bundler.js',
}

/** main process（electron/ + agent/）专用 alias，由 vite-plugin-electron 子构建处理 */
const mainAlias = {
  '#electron': r('./electron'),
  '#agent': r('./agent'),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main/index.ts',
        vite: {
          resolve: { alias: mainAlias },
          build: { outDir: 'dist-electron/main' },
        },
      },
      {
        entry: 'electron/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          resolve: { alias: mainAlias },
          build: { outDir: 'dist-electron/preload' },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: rendererAlias,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
