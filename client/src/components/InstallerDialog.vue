<!--
  @component InstallerDialog
  @description Claude Code 安装进度对话框，显示安装日志和结果。
  @layer component
-->
<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2>{{ status === 'success' ? '安装成功' : '正在安装 Claude Code' }}</h2>
        </div>

        <div class="dialog-body">
          <!-- 成功状态 -->
          <div v-if="status === 'success'" class="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <p class="success-text">Claude Code 已成功安装</p>
          </div>

          <!-- 安装中/失败状态 -->
          <template v-else>
            <textarea
              ref="logTextarea"
              class="log-area"
              :value="logs"
              readonly
              placeholder="安装日志将显示在这里..."
            />

            <!-- 失败提示 -->
            <div v-if="status === 'failed'" class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>安装失败，请联系管理员反映问题</span>
            </div>
          </template>
        </div>

        <div class="dialog-footer">
          <button
            class="btn btn-primary"
            :disabled="status === 'installing'"
            @click="$emit('close')"
          >
            {{ status === 'installing' ? '安装中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { InstallerProgressEvent } from '#claude-installer/types'

const props = defineProps<{
  /** 是否显示对话框 */
  visible: boolean
  /** 安装事件 */
  events: InstallerProgressEvent[]
}>()

const emit = defineEmits<{
  /** 关闭对话框 */
  close: []
}>()

const logTextarea = ref<HTMLTextAreaElement | null>(null)

type InstallStatus = 'installing' | 'success' | 'failed'

const status = ref<InstallStatus>('installing')
const logs = ref('')

// 监听事件变化，更新日志和状态
watch(() => props.events, (events) => {
  // 生成日志文本
  const logLines: string[] = []
  let currentStatus: InstallStatus = 'installing'

  for (const event of events) {
    switch (event.type) {
      case 'check:start':
        logLines.push('正在检测 Claude Code 安装状态...')
        break
      case 'check:found':
        logLines.push(`已在 ${event.path} 找到 Claude Code`)
        currentStatus = 'success'
        break
      case 'check:not-found':
        logLines.push('未找到 Claude Code，开始安装...')
        break
      case 'log':
        logLines.push(event.message)
        break
      case 'install:success':
        logLines.push(`安装成功！路径: ${event.path}`)
        logLines.push(`安装方式: ${event.method}`)
        currentStatus = 'success'
        break
      case 'install:failed':
        logLines.push(`安装失败: ${event.error}`)
        currentStatus = 'failed'
        break
    }
  }

  logs.value = logLines.join('\n')
  status.value = currentStatus

  // 自动滚动到底部
  nextTick(() => {
    if (logTextarea.value) {
      logTextarea.value.scrollTop = logTextarea.value.scrollHeight
    }
  })
}, { deep: true, immediate: true })
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: var(--color-background);
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.success-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  color: #22c55e;
}

.success-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-foreground);
  margin: 0;
}

.log-area {
  width: 100%;
  min-height: 200px;
  max-height: 300px;
  padding: 12px;
  font-family: monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-foreground);
  resize: none;
  overflow-y: auto;
}

.log-area:focus {
  outline: none;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #dc2626;
  font-size: 0.875rem;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 32px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--color-primary-foreground);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>