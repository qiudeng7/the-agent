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
      </div>

      <div class="card">
        <h2>语言设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">显示语言</span>
            <span class="setting-desc">选择应用的显示语言</span>
          </div>
          <select v-model="settingsStore.language" class="select">
            <option value="system">跟随系统</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
        <div class="info-item">
          <span class="label">当前语言：</span>
          <span class="value">{{ getLanguageLabel(settingsStore.currentLanguage) }}</span>
        </div>
      </div>

      <div class="card">
        <h2>外观设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">深色模式</span>
            <span class="setting-desc">选择应用的主题模式</span>
          </div>
          <select v-model="settingsStore.theme" class="select">
            <option value="system">跟随系统</option>
            <option value="dark">深色</option>
            <option value="light">亮色</option>
          </select>
        </div>
        <div class="info-item">
          <span class="label">系统主题：</span>
          <span class="value">{{ settingsStore.isSystemDark ? '深色' : '亮色' }}</span>
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
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const appVersion = ref('1.0.0')
const platform = ref('unknown')
const autoStart = ref(false)
const minimizeToTray = ref(false)
const apiKey = ref('')
const selectedModel = ref('gpt-4')

const languageLabels: Record<string, string> = {
  zh: '中文',
  ja: '日本語',
  en: 'English',
}

function getLanguageLabel(lang: string): string {
  if (lang === 'system') return '跟随系统'
  return languageLabels[lang] || 'English'
}

onMounted(async () => {
  if (window.electronAPI) {
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
  background: var(--color-background);
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2rem;
  color: var(--color-primary);
  font-family: var(--font-heading);
}

.main {
  flex: 1;
  overflow-y: auto;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding-right: 20px;
}

.card {
  background: var(--color-muted);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--color-border);
}

.card h2 {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: var(--color-primary);
  font-family: var(--font-heading);
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--color-muted-foreground);
  font-size: 0.9rem;
}

.value {
  color: var(--color-foreground);
  font-weight: 500;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--color-border);
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
  font-weight: 600;
  color: var(--color-foreground);
}

.setting-desc {
  font-size: 0.85rem;
  color: var(--color-muted-foreground);
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
  background-color: var(--color-border);
  transition: var(--transition-gentle);
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: var(--color-background);
  transition: var(--transition-gentle);
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--color-primary);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 0.95rem;
  width: 200px;
}

.api-input::placeholder {
  color: var(--color-muted-foreground);
}

.api-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

.select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 0.95rem;
  cursor: pointer;
  font-family: var(--font-body);
}

.select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.navbar {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
  margin-top: auto;
  border: 1px solid var(--color-border);
}

.nav-link {
  color: var(--color-muted-foreground);
  text-decoration: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  transition: var(--transition-gentle);
}

.nav-link:hover {
  color: var(--color-foreground);
  background: var(--color-background);
}

.nav-link.active {
  color: var(--color-primary-foreground);
  background: var(--color-primary);
}
</style>
