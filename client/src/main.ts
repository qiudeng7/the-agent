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
import { AGENT_TRANSPORT_KEY, SYSTEM_SERVICE_KEY, STORAGE_KEY, UPDATER_KEY } from './di/interfaces'
import { createElectronDependencies } from './di/electron'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useAgentStore } from './stores/agent'
import { useUpdaterStore } from './stores/updater'
import './assets/main.css'

// 创建依赖
const deps = createElectronDependencies()

const app = createApp(App)
const pinia = createPinia()

// 通过 Vue provide 注入依赖
app.provide(AGENT_TRANSPORT_KEY, deps.agentTransport)
app.provide(SYSTEM_SERVICE_KEY, deps.systemService)
app.provide(STORAGE_KEY, deps.storage)
app.provide(UPDATER_KEY, deps.updater)

app.use(pinia)
app.use(router)
app.mount('#app')

// 初始化 stores
const settingsStore = useSettingsStore()
const chatStore = useChatStore()
const agentStore = useAgentStore()
const updaterStore = useUpdaterStore()

// 启动事件监听（store 间解耦通信）
settingsStore.startWatching()
settingsStore.setupEventListeners()
chatStore.setupEventListeners()
agentStore.setupEventListeners()
updaterStore.setupEventListeners()

// Electron 窗口关闭时清理事件监听器
window.addEventListener('beforeunload', () => {
  settingsStore.teardownEventListeners()
  chatStore.teardownEventListeners()
  agentStore.teardownEventListeners()
  updaterStore.teardownEventListeners()
})

// Vue 挂载完成后移除 loading
nextTick(() => {
  const loading = document.getElementById('app-loading')
  if (loading) {
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 300)
  }
})