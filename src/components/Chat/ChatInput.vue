<template>
  <div class="chat-input-container">
    <div class="chat-input-wrapper">
      <!-- Model Selector -->
      <div class="model-selector">
        <select v-model="selectedModel" class="model-select" name="model" aria-label="选择模型">
          <option value="default">默认模型</option>
          <option value="deepseek">DeepSeek</option>
          <option value="gpt4">GPT-4</option>
          <option value="claude">Claude</option>
        </select>
      </div>

      <!-- Input Area -->
      <div class="input-box">
        <textarea
          ref="textareaRef"
          v-model="input"
          placeholder="有问题，尽管问，shift+enter 换行"
          class="input-field"
          name="message"
          aria-label="输入消息"
          @keydown.shift.enter.prevent="submit"
          @input="autoResize"
          rows="1"
        />
      </div>

      <!-- Tools Bar -->
      <div class="tools-bar">
        <div class="tools-left">
          <label class="tool-toggle" :class="{ active: deepThink }">
            <input type="checkbox" v-model="deepThink" class="toggle-checkbox" name="deepThink" />
            <span class="toggle-slider"></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
              <path d="M12 6v2M12 16v2M8 12h2M14 12h2"/>
            </svg>
            <span class="tool-label">深度思考</span>
          </label>

          <label class="tool-toggle" :class="{ active: webSearch }">
            <input type="checkbox" v-model="webSearch" class="toggle-checkbox" name="webSearch" />
            <span class="toggle-slider"></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span class="tool-label">联网搜索</span>
          </label>

          <button class="tools-more" @click="showMoreTools = !showMoreTools">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
            <span>工具</span>
          </button>
        </div>

        <div class="tools-right">
          <button class="add-btn" title="添加内容">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>

          <button class="submit-btn" @click="submit" :disabled="!input.trim()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- More Tools Panel -->
      <div v-if="showMoreTools" class="tools-panel">
        <div class="tools-grid">
          <button class="tool-item">
            <div class="tool-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <span>上传文件</span>
          </button>
          <button class="tool-item">
            <div class="tool-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <span>上传图片</span>
          </button>
          <button class="tool-item">
            <div class="tool-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <span>导出对话</span>
          </button>
          <button class="tool-item">
            <div class="tool-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <span>设置</span>
          </button>
        </div>
      </div>
    </div>

    <p class="disclaimer">内容由 AI 生成，仅供参考</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  submit: [input: string, options: { deepThink: boolean; webSearch: boolean; model: string }]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const input = ref('')
const selectedModel = ref('default')
const deepThink = ref(false)
const webSearch = ref(false)
const showMoreTools = ref(false)

function autoResize() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }
}

function submit() {
  if (input.value.trim()) {
    emit('submit', input.value.trim(), {
      deepThink: deepThink.value,
      webSearch: webSearch.value,
      model: selectedModel.value,
    })
    input.value = ''
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  }
}

watch(input, autoResize)
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

/* Model Selector */
.model-selector {
  margin-bottom: 12px;
}

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

/* Tool Toggle */
.tool-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition-gentle);
  color: var(--color-muted-foreground);
  font-size: 0.8125rem;
  font-weight: 500;
}

.tool-toggle:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.tool-toggle.active {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  width: 36px;
  height: 20px;
  background: var(--color-muted);
  border-radius: var(--radius-full);
  position: relative;
  transition: var(--transition-gentle);
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-soft);
  transition: var(--transition-gentle);
}

.tool-toggle.active .toggle-slider {
  background: var(--color-primary);
}

.tool-toggle.active .toggle-slider::after {
  transform: translateX(16px);
}

.tool-label {
  font-family: var(--font-body);
}

/* Tools More Button */
.tools-more {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition-gentle);
  color: var(--color-muted-foreground);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
}

.tools-more:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
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

/* Add Button */
.add-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--radius-full);
  color: var(--color-muted-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-gentle);
}

.add-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

/* Tools Panel */
.tools-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-float);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
  color: var(--color-foreground);
  font-family: var(--font-body);
  font-size: 0.8125rem;
}

.tool-item:hover {
  background: var(--color-muted);
}

.tool-icon {
  width: 48px;
  height: 48px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  transition: var(--transition-gentle);
}

.tool-item:hover .tool-icon {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* Disclaimer */
.disclaimer {
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  margin-top: 16px;
}
</style>
