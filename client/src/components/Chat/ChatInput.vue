<!--
  @component ChatInput
  @description 聊天输入区域，被首页（Home）和对话页（Chat）复用。
               包含：
               - 自动伸缩 textarea（最高 200px，Enter 提交，Shift+Enter 换行）
               - 工具栏：模型选择器 + 权限模式选择器（左侧）+ 提交/停止按钮（右侧）
  @emits submit(input, { model, permissionMode }) - 用户提交消息时触发
  @emits stop - 用户点击停止按钮时触发
  @layer component
-->
<template>
  <div class="chat-input-container">
    <div class="chat-input-wrapper">
      <!-- Input Box -->
      <div class="input-box">
        <textarea
          ref="textareaRef"
          v-model="input"
          placeholder="有问题，尽管问，Shift+Enter 换行"
          class="input-field"
          name="message"
          aria-label="输入消息"
          @keydown.enter.exact="handleKeyDown"
          @input="autoResize"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          rows="1"
        />
      </div>

      <!-- Tools Bar -->
      <div class="tools-bar">
        <div class="tools-left">
          <!-- Model Selector -->
          <template v-if="settingsStore.enabledAvailableModels.length > 0">
            <select v-model="selectedModel" class="model-select" name="model" aria-label="选择模型">
              <option v-for="model in settingsStore.enabledAvailableModels" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>
          </template>
          <template v-else>
            <router-link to="/settings" class="no-model-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              请先在设置中启用模型
            </router-link>
          </template>

          <!-- Permission Mode Selector -->
          <select v-model="selectedPermissionMode" class="permission-select" name="permissionMode" aria-label="权限模式">
            <option value="default">默认</option>
            <option value="auto">自动</option>
            <option value="acceptEdits">自动编辑</option>
            <option value="bypassPermissions">跳过权限</option>
            <option value="plan">规划模式</option>
          </select>
        </div>

        <div class="tools-right">
          <!-- Stop Button (shown when generating) -->
          <button v-if="isGenerating" class="stop-btn" @click="stop" title="停止生成">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
          <!-- Submit Button (shown when not generating) -->
          <button v-else class="submit-btn" @click="submit" :disabled="!input.trim() || settingsStore.enabledAvailableModels.length === 0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <p class="disclaimer">内容由 AI 生成，仅供参考</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAutoResize } from '@/composables'
import type { PermissionMode } from '#claude/types'

const settingsStore = useSettingsStore()

const props = defineProps<{
  /** 初始模型 ID（从会话恢复） */
  initialModel?: string
  /** 是否正在生成 */
  isGenerating?: boolean
}>()

const emit = defineEmits<{
  submit: [input: string, options: { model: string; permissionMode: PermissionMode }]
  /** 模型切换时触发 */
  modelChange: [modelId: string]
  /** 停止生成 */
  stop: []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const input = ref('')
const selectedModel = ref('')
const selectedPermissionMode = ref<PermissionMode>('default')
/** 是否正在使用输入法组合输入 */
const isComposing = ref(false)

// 使用 composable
const { resize: autoResize, reset: resetTextarea } = useAutoResize(textareaRef, { maxHeight: 200 })

// 初始化 selectedModel：优先使用 initialModel，其次默认模型，最后第一个可用模型
function initSelectedModel() {
  const available = settingsStore.enabledAvailableModels
  if (props.initialModel && available.some(m => m.id === props.initialModel)) {
    selectedModel.value = props.initialModel
  } else if (settingsStore.defaultModel && available.some(m => m.id === settingsStore.defaultModel)) {
    selectedModel.value = settingsStore.defaultModel
  } else if (available.length > 0) {
    selectedModel.value = available[0].id
  }
}

// 初始化 selectedPermissionMode：从 settingsStore 读取
function initSelectedPermissionMode() {
  selectedPermissionMode.value = settingsStore.permissionMode || 'default'
}

// 初始化
initSelectedModel()
initSelectedPermissionMode()

// 监听 initialModel 变化（切换会话时），仅在 initialModel 有效时更新
watch(() => props.initialModel, (newModel) => {
  const available = settingsStore.enabledAvailableModels
  // 只有当 initialModel 有值且在可用列表中时才更新
  if (newModel && available.some(m => m.id === newModel)) {
    selectedModel.value = newModel
  }
})

// 监听 selectedModel 变化，通知父组件
watch(selectedModel, (newModel) => {
  if (newModel) {
    emit('modelChange', newModel)
  }
})

function submit() {
  if (input.value.trim() && settingsStore.enabledAvailableModels.length > 0 && selectedModel.value) {
    emit('submit', input.value.trim(), {
      model: selectedModel.value,
      permissionMode: selectedPermissionMode.value,
    })
    input.value = ''
    resetTextarea()
  }
}

function stop() {
  emit('stop')
}

/** 处理 Enter 键按下，考虑输入法状态 */
function handleKeyDown(event: KeyboardEvent) {
  // 如果正在使用输入法组合输入，不处理
  if (isComposing.value) return

  // 阻止默认换行行为，执行提交
  event.preventDefault()
  submit()
}

// 监听输入内容变化自动调整高度
watch(input, autoResize)

// 暴露 selectedModel 供父组件读取
defineExpose({
  selectedModel,
})
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 32px;
}

.chat-input-wrapper {
  position: relative;
}

/* Input Box */
.input-box {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: var(--transition-gentle);
}

.input-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

.input-field {
  width: 100%;
  padding: 16px 20px;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-foreground);
  resize: none;
  max-height: 200px;
  line-height: 1.5;
}

.input-field::placeholder {
  color: var(--color-muted-foreground);
}

.input-field:focus {
  outline: none;
}

/* Tools Bar */
.tools-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.tools-left,
.tools-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Model Select */
.model-select {
  appearance: none;
  padding: 8px 32px 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2378786C' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 12px center;
  background-size: 12px;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.model-select:hover {
  border-color: var(--color-primary);
}

.model-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

.no-model-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  font-size: 0.8125rem;
  text-decoration: none;
  transition: var(--transition-gentle);
}

.no-model-hint:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Permission Select */
.permission-select {
  appearance: none;
  padding: 8px 32px 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2378786C' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 12px center;
  background-size: 12px;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.permission-select:hover {
  border-color: var(--color-primary);
  color: var(--color-foreground);
}

.permission-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

/* Submit Button */
.submit-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  color: var(--color-primary-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-gentle);
  box-shadow: var(--shadow-soft);
}

.submit-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: var(--shadow-lift);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stop Button */
.stop-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--color-destructive);
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-gentle);
  box-shadow: var(--shadow-soft);
}

.stop-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lift);
}

/* Disclaimer */
.disclaimer {
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  margin-top: 16px;
}
</style>