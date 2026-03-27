/**
 * @module main
 * @description Vue 应用入口。
 *              通过 provide 注入依赖，stores 通过 inject 获取。
 *
 * @layer bootstrap
 */
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { AGENT_TRANSPORT_KEY, SYSTEM_SERVICE_KEY } from './di/interfaces'
import { createElectronDependencies } from './di/electron'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'
import './assets/main.css'

// 创建依赖
const deps = createElectronDependencies()

const app = createApp(App)
const pinia = createPinia()

// 通过 Vue provide 注入依赖
app.provide(AGENT_TRANSPORT_KEY, deps.agentTransport)
app.provide(SYSTEM_SERVICE_KEY, deps.systemService)

app.use(pinia)
app.use(router)
app.mount('#app')

// 初始化 stores
const settingsStore = useSettingsStore()
settingsStore.startWatching()

// Vue 挂载完成后移除 loading
nextTick(() => {
  const loading = document.getElementById('app-loading')
  if (loading) {
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 300)
  }
})