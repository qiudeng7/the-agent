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

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">折叠思考内容</span>
            <span class="setting-desc">默认折叠 AI 的思考过程，点击可展开查看详情</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settingsStore.collapseThinking" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="card">
        <h2>Agent 设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">默认模型</span>
            <span class="setting-desc">新建对话时默认使用的模型</span>
          </div>
          <select v-model="settingsStore.defaultModel" class="select" :disabled="settingsStore.enabledAvailableModels.length === 0">
            <option v-if="settingsStore.enabledAvailableModels.length === 0" value="" disabled>请先启用模型</option>
            <option v-for="model in settingsStore.enabledAvailableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>

        <!-- 内置模型 -->
        <div class="model-section">
          <h3 class="section-title">内置模型</h3>
          <div class="models-list" v-if="BUNDLE_MODELS.length > 0">
            <div v-for="model in BUNDLE_MODELS" :key="model.id" class="model-item">
              <div class="model-info">
                <span class="model-name">{{ model.name }}</span>
                <span class="model-desc">{{ model.description }}</span>
              </div>
              <label class="toggle toggle-sm">
                <input
                  type="checkbox"
                  :checked="settingsStore.enabledModels.includes(model.id)"
                  @change="settingsStore.toggleModel(model.id)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div v-else class="models-empty">
            <p>暂无可用的内置模型</p>
          </div>
        </div>

        <!-- 自定义模型 -->
        <div class="model-section">
          <div class="section-header">
            <h3 class="section-title">自定义模型</h3>
            <button class="add-config-btn" @click="openAddModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              添加配置
            </button>
          </div>

          <div class="models-list" v-if="allCustomModels.length > 0">
            <div v-for="item in allCustomModels" :key="item.model.id" class="model-item">
              <div class="model-info">
                <span class="model-name">{{ item.model.id }}</span>
                <span class="model-desc">{{ item.model.description || item.config.name }}</span>
              </div>
              <div class="model-actions">
                <label class="toggle toggle-sm">
                  <input
                    type="checkbox"
                    :checked="settingsStore.enabledModels.includes(item.model.id)"
                    @change="settingsStore.toggleModel(item.model.id)"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <button class="edit-btn" @click="openEditModal(item.config)" title="编辑配置">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="models-empty">
            <p>暂无自定义模型，点击上方按钮添加</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 添加/编辑配置弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingConfig ? '编辑配置' : '添加配置' }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>配置名称</label>
            <input v-model="modalForm.name" placeholder="如：我的 OpenAI 配置" class="form-input" />
          </div>

          <div class="form-group">
            <label>API Base URL</label>
            <input v-model="modalForm.baseURL" placeholder="https://api.openai.com/v1" class="form-input" />
          </div>

          <div class="form-group">
            <label>API Key</label>
            <input v-model="modalForm.apiKey" type="password" placeholder="sk-..." class="form-input" />
          </div>

          <div class="form-group">
            <div class="models-header">
              <label>模型列表</label>
              <button class="add-model-btn" @click="addModalModel" type="button">
                + 添加模型
              </button>
            </div>
            <div class="modal-models-list">
              <div v-for="(model, index) in modalForm.models" :key="index" class="modal-model-item">
                <input v-model="model.id" placeholder="模型 ID" class="form-input model-id-input" />
                <input v-model="model.description" placeholder="描述" class="form-input model-desc-input" />
                <button class="remove-model-btn" @click="removeModalModel(index)" type="button">✕</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button
            class="btn btn-primary"
            @click="saveConfig"
            :disabled="!isModalValid"
          >
            {{ editingConfig ? '保存' : '添加' }}
          </button>
          <button
            v-if="editingConfig"
            class="btn btn-danger"
            @click="deleteConfig"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <nav class="navbar">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/settings" class="nav-link active">设置</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore, BUNDLE_MODELS, type CustomModelConfig, type CustomModelItem } from '@/stores/settings'

const settingsStore = useSettingsStore()

const appVersion = ref('1.0.0')
const platform = ref('unknown')
const autoStart = ref(false)
const minimizeToTray = ref(false)

// 弹窗状态
const showModal = ref(false)
const editingConfig = ref<CustomModelConfig | null>(null)
const modalForm = ref<{
  name: string
  baseURL: string
  apiKey: string
  models: CustomModelItem[]
}>({
  name: '',
  baseURL: '',
  apiKey: '',
  models: [{ id: '', description: '' }],
})

// 展开所有自定义模型用于显示
const allCustomModels = computed(() => {
  const result: { config: CustomModelConfig; model: CustomModelItem }[] = []
  for (const config of settingsStore.customModelConfigs) {
    for (const model of config.models) {
      result.push({ config, model })
    }
  }
  return result
})

const isModalValid = computed(() => {
  return (
    modalForm.value.name.trim() &&
    modalForm.value.baseURL.trim() &&
    modalForm.value.apiKey.trim() &&
    modalForm.value.models.some(m => m.id.trim())
  )
})

const languageLabels: Record<string, string> = {
  zh: '中文',
  ja: '日本語',
  en: 'English',
}

function getLanguageLabel(lang: string): string {
  if (lang === 'system') return '跟随系统'
  return languageLabels[lang] || 'English'
}

function openAddModal() {
  editingConfig.value = null
  modalForm.value = {
    name: '',
    baseURL: '',
    apiKey: '',
    models: [{ id: '', description: '' }],
  }
  showModal.value = true
}

function openEditModal(config: CustomModelConfig) {
  editingConfig.value = config
  modalForm.value = {
    name: config.name,
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    models: [...config.models.map(m => ({ ...m }))],
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingConfig.value = null
}

function addModalModel() {
  modalForm.value.models.push({ id: '', description: '' })
}

function removeModalModel(index: number) {
  if (modalForm.value.models.length > 1) {
    modalForm.value.models.splice(index, 1)
  }
}

function saveConfig() {
  const models = modalForm.value.models.filter(m => m.id.trim())

  if (editingConfig.value) {
    settingsStore.updateCustomModelConfig({
      id: editingConfig.value.id,
      name: modalForm.value.name.trim(),
      baseURL: modalForm.value.baseURL.trim(),
      apiKey: modalForm.value.apiKey.trim(),
      models,
    })
  } else {
    settingsStore.addCustomModelConfig({
      id: Date.now().toString(),
      name: modalForm.value.name.trim(),
      baseURL: modalForm.value.baseURL.trim(),
      apiKey: modalForm.value.apiKey.trim(),
      models,
    })
  }

  closeModal()
}

function deleteConfig() {
  if (editingConfig.value) {
    settingsStore.removeCustomModelConfig(editingConfig.value.id)
    closeModal()
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

/* Small Toggle */
.toggle-sm {
  width: 44px;
  height: 24px;
}

.toggle-sm .toggle-slider:before {
  height: 18px;
  width: 18px;
}

.toggle-sm input:checked + .toggle-slider:before {
  transform: translateX(20px);
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

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* Model Section */
.model-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.models-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.models-empty {
  padding: 20px;
  text-align: center;
  color: var(--color-muted-foreground);
  font-size: 0.9rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
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

.model-name {
  font-size: 0.875rem;
  color: var(--color-foreground);
  font-weight: 500;
}

.model-desc {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-gentle);
}

.edit-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.add-config-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 0.85rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.add-config-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-background);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lift);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 1.1rem;
  color: var(--color-foreground);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  border-radius: var(--radius-md);
  font-size: 1rem;
}

.modal-close:hover {
  background: var(--color-muted);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-foreground);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-muted);
  color: var(--color-foreground);
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.models-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.add-model-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.add-model-btn:hover {
  background: var(--color-primary)/10;
}

.modal-models-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-model-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-id-input {
  flex: 1;
}

.model-desc-input {
  flex: 1.5;
}

.remove-model-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  border-radius: var(--radius-md);
}

.remove-model-btn:hover {
  background: var(--color-destructive)/10;
  color: var(--color-destructive);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-muted);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-background);
}

.btn-danger {
  background: var(--color-destructive);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}
</style>