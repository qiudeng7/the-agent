<!--
  @component Settings (view)
  @description 设置页面，路由：/settings。
               展示并编辑以下配置分区：
               - 应用信息：版本号 / 平台（通过 electronAPI IPC 异步获取）
               - 语言设置：直接绑定 settingsStore.language，实时生效
               - 外观设置：直接绑定 settingsStore.theme，实时切换深色/亮色
               - 通用设置：开机自启 / 最小化托盘（本地 ref，待接入 electron 逻辑）
               - Agent 设置：API Key / 模型选择（本地 ref，待持久化）
  @layer view
-->
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
            <span class="setting-desc">配置你的 Anthropic API 密钥</span>
          </div>
          <input
            type="password"
            v-model="settingsStore.apiKey"
            placeholder="sk-ant-..."
            class="api-input"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">API Base URL</span>
            <span class="setting-desc">可选，用于代理或自托管服务（留空使用默认）</span>
          </div>
          <input
            type="text"
            v-model="settingsStore.baseURL"
            placeholder="https://api.anthropic.com"
            class="api-input"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">默认模型</span>
            <span class="setting-desc">新建对话时默认使用的模型</span>
          </div>
          <select v-model="settingsStore.defaultModel" class="select">
            <option v-for="model in settingsStore.models" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>

        <div class="setting-item models-section">
          <div class="setting-info">
            <span class="setting-label">模型列表</span>
            <span class="setting-desc">自定义可选的模型（输入 ID 和显示名称）</span>
          </div>
        </div>

        <div class="models-list">
          <div v-for="model in settingsStore.models" :key="model.id" class="model-item">
            <div class="model-info">
              <span class="model-id">{{ model.id }}</span>
              <span class="model-name">{{ model.name }}</span>
            </div>
            <button
              class="remove-btn"
              @click="settingsStore.removeModel(model.id)"
              :disabled="settingsStore.models.length <= 1"
              title="删除此模型"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="add-model-form">
          <input
            v-model="newModelId"
            placeholder="模型 ID (如 claude-opus-4-6)"
            class="model-input"
          />
          <input
            v-model="newModelName"
            placeholder="显示名称 (如 Claude Opus 4.6)"
            class="model-input"
          />
          <button
            class="add-model-btn"
            @click="handleAddModel"
            :disabled="!newModelId.trim() || !newModelName.trim()"
          >
            添加
          </button>
        </div>

        <div class="setting-item">
          <button class="reset-btn" @click="settingsStore.resetModels">
            重置为默认模型列表
          </button>
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
const newModelId = ref('')
const newModelName = ref('')

const languageLabels: Record<string, string> = {
  zh: '中文',
  ja: '日本語',
  en: 'English',
}

function getLanguageLabel(lang: string): string {
  if (lang === 'system') return '跟随系统'
  return languageLabels[lang] || 'English'
}

function handleAddModel() {
  const id = newModelId.value.trim()
  const name = newModelName.value.trim()
  if (id && name) {
    settingsStore.addModel({ id, name })
    newModelId.value = ''
    newModelName.value = ''
  }
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

/* Models Section */
.models-section {
  border-bottom: none;
  padding-bottom: 8px;
}

.models-list {
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.model-item:last-child {
  border-bottom: none;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-id {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--color-foreground);
}

.model-name {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: var(--transition-gentle);
}

.remove-btn:hover:not(:disabled) {
  background: var(--color-destructive)/10;
  color: var(--color-destructive);
}

.remove-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.add-model-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.model-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 0.9rem;
}

.model-input::placeholder {
  color: var(--color-muted-foreground);
}

.model-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

.add-model-btn {
  padding: 10px 20px;
  border: none;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: var(--transition-gentle);
}

.add-model-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.add-model-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
  transition: var(--transition-gentle);
}

.reset-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}
</style>
