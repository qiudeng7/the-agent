/**
 * @module main
 * @description Vue 应用入口，初始化 Pinia 状态管理和 Vue Router 路由，
 *              挂载应用到 #app 元素，并在挂载完成后淡出启动 loading 动画。
 *
 * 启动流程：
 * 1. 初始化依赖注入（Electron 环境的依赖实现）
 * 2. 创建 Vue 应用和 Pinia store
 * 3. 挂载应用
 *
 * @layer bootstrap
 */
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initDependencies, createElectronDependencies } from './di'
import './assets/main.css'

// 初始化依赖注入（必须在 Pinia store 使用之前）
initDependencies(createElectronDependencies())

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Vue 挂载完成后移除 loading
nextTick(() => {
  const loading = document.getElementById('app-loading')
  if (loading) {
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 300)
  }
})
