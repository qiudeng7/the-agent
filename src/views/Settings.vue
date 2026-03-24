<template>
  <div class="settings">
    <header class="header">
      <h1>⚙️ 设置</h1>
    </header>

    <main class="main">
      <div class="card">
        <h2>应用信息</h2>
        <div class="info-item">
          <span class="label">版本:</span>
          <span class="value">{{ appVersion }}</span>
        </div>
        <div class="info-item">
          <span class="label">平台:</span>
          <span class="value">{{ platform }}</span>
        </div>
        <div class="info-item">
          <span class="label">Electron API:</span>
          <span class="value">{{ hasElectronAPI ? '已就绪' : '未就绪' }}</span>
        </div>
      </div>

      <div class="card">
        <h2>通用设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">开机自启</span>
            <span class="setting-desc">应用程序在系统启动时自动运行</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="autoStart" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">最小化到托盘</span>
            <span class="setting-desc">关闭主窗口时最小化到系统托盘</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="minimizeToTray" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">深色模式</span>
            <span class="setting-desc">使用深色主题</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="darkMode" checked disabled />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="card">
        <h2>Agent 设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">API Key</span>
            <span class="setting-desc">配置你的 AI 服务 API 密钥</span>
          </div>
          <input
            type="password"
            v-model="apiKey"
            placeholder="sk-..."
            class="api-input"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">模型</span>
            <span class="setting-desc">选择使用的 AI 模型</span>
          </div>
          <select v-model="selectedModel" class="select">
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
            <option value="claude-sonnet">Claude Sonnet</option>
          </select>
        </div>
      </div>
    </main>

    <nav class="navbar">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/settings" class="nav-link active">设置</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const appVersion = ref('1.0.0')
const platform = ref('unknown')
const hasElectronAPI = ref(false)
const autoStart = ref(false)
const minimizeToTray = ref(false)
const darkMode = ref(true)
const apiKey = ref('')
const selectedModel = ref('gpt-4')

onMounted(async () => {
  if (window.electronAPI) {
    hasElectronAPI.value = true
    try {
      appVersion.value = await window.electronAPI.getAppVersion()
      platform.value = await window.electronAPI.getPlatform()
    } catch (e) {
      console.error('Failed to get electron info:', e)
    }
  }
})
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  color: #4a9eff;
}

.main {
  flex: 1;
  overflow-y: auto;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.card {
  background: #16213e;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #4a9eff;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #0f3460;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #888;
}

.value {
  color: #fff;
  font-weight: 500;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #0f3460;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-weight: 500;
  color: #fff;
}

.setting-desc {
  font-size: 0.85rem;
  color: #666;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #0f3460;
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: #4a9eff;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-input {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #0f3460;
  color: #fff;
  font-size: 0.95rem;
  width: 200px;
}

.api-input::placeholder {
  color: #666;
}

.select {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #0f3460;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
}

.navbar {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background: #16213e;
  border-radius: 12px;
  margin-top: auto;
}

.nav-link {
  color: #888;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: #0f3460;
}

.nav-link.active {
  color: #fff;
  background: #4a9eff;
}
</style>
