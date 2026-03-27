<!--
  @component Chat (view)
  @description 对话页面，路由：/chat/:id。
               展示当前会话的消息列表（用户消息右对齐 + 蓝绿气泡，AI 消息左对齐 + 灰色气泡）。
               空状态时显示引导提示（"开始对话"）。
               底部挂载 ChatInput，提交后通过 agentStore.runAgent() 调用 AI。
               支持富内容展示（thinking / tool_use / tool_result）。
  @layer view
-->
<template>
  <div class="chat-view">
    <!-- Messages -->
    <div class="messages-container">
      <div v-if="messages.length === 0" class="messages-empty">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 class="empty-title">开始对话</h2>
          <p class="empty-desc">在下方输入你的问题，AI 会为你解答</p>
        </div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            <div v-if="message.role === 'user'" class="user-avatar">
              <span>U</span>
            </div>
            <div v-else class="ai-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div class="message-content">
            <template v-for="(block, idx) in getMessageBlocks(message)" :key="idx">
              <div v-if="block.type === 'thinking'" class="thinking-block" :class="{ collapsed: isThinkingCollapsed(message.id, idx) }">
                <div class="thinking-header" @click="toggleThinking(message.id, idx)">
                  <div class="thinking-header-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <span>思考过程</span>
                  </div>
                  <div class="thinking-header-right">
                    <span class="thinking-stats">
                      {{ formatThinkingStats(block) }}
                    </span>
                    <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
                <div class="thinking-content" v-show="!isThinkingCollapsed(message.id, idx)">
                  <p class="thinking-text">{{ block.thinking }}</p>
                </div>
              </div>
              <div v-else-if="block.type === 'tool_use'" class="tool-block">
                <div class="tool-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <span>{{ block.name }}</span>
                </div>
              </div>
              <div v-else-if="block.type === 'tool_result'" class="tool-result-block">
                <pre>{{ block.content }}</pre>
              </div>
              <div v-else-if="block.type === 'text'" class="message-text">
              <MarkdownRenderer :content="block.text" />
            </div>
            </template>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>

        <!-- 流式生成中的 assistant 消息 -->
        <div v-if="isGenerating" class="message assistant streaming">
          <div class="message-avatar">
            <div class="ai-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div class="message-content">
            <div v-if="streamingThinking" class="thinking-block" :class="{ collapsed: isStreamingThinkingCollapsed }">
              <div class="thinking-header" @click="isStreamingThinkingCollapsed = !isStreamingThinkingCollapsed">
                <div class="thinking-header-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>思考中...</span>
                </div>
                <div class="thinking-header-right">
                  <span class="thinking-stats">
                    {{ streamingThinking.length }} 字
                  </span>
                  <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
              <div class="thinking-content" v-show="!isStreamingThinkingCollapsed">
                <p class="thinking-text">{{ streamingThinking }}</p>
              </div>
            </div>
            <div v-if="streamingText" class="message-text">
              <MarkdownRenderer :content="streamingText" />
            </div>
            <div v-if="!streamingText && !streamingThinking" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="chat-input-wrapper">
      <ChatInput
        :initial-model="sessionModel"
        @submit="handleSubmit"
        @model-change="handleModelChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatInput from '@/components/Chat/ChatInput.vue'
import MarkdownRenderer from '@/components/Chat/MarkdownRenderer.vue'
import { useChatStore, type Message } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import type { ContentBlock } from '#agent/types'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const agentStore = useAgentStore()
const settingsStore = useSettingsStore()

const sessionId = computed(() => route.params.id as string)
const session = computed(() => chatStore.sessions.find(s => s.id === sessionId.value))
const messages = computed(() => session.value?.messages ?? [])

/** 会话当前模型（优先从会话获取，其次从最后消息推断，最后使用默认模型） */
const sessionModel = ref<string>('')

/** 流式思考是否折叠 */
const isStreamingThinkingCollapsed = ref(settingsStore.collapseThinking)

/** 流式内容（来自 agentStore） */
const streamingText = computed(() => agentStore.currentText)
const streamingThinking = computed(() => agentStore.currentThinking)
const isGenerating = computed(() => agentStore.isGenerating)

/** 格式化时间戳 */
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 从消息提取 ContentBlock 数组 */
function getMessageBlocks(message: Message): ContentBlock[] {
  if (typeof message.content === 'string') {
    return [{ type: 'text', text: message.content }]
  }
  return message.content
}

/** 判断思考块是否折叠 */
function isThinkingCollapsed(messageId: string, blockIdx: number): boolean {
  const key = `${messageId}-${blockIdx}`
  return chatStore.isThinkingCollapsed(key, settingsStore.collapseThinking)
}

/** 切换思考块的折叠状态 */
function toggleThinking(messageId: string, blockIdx: number): void {
  const key = `${messageId}-${blockIdx}`
  chatStore.toggleThinking(key, settingsStore.collapseThinking)
}

/** 格式化思考统计信息（时间 + 字数） */
function formatThinkingStats(block: ContentBlock): string {
  if (block.type !== 'thinking') return ''
  const parts: string[] = []

  // 字数
  const charCount = block.thinking.length
  parts.push(`${charCount} 字`)

  // 耗时（如果有）
  if (block.durationMs) {
    const duration = block.durationMs
    if (duration < 1000) {
      parts.push(`${duration} ms`)
    } else {
      parts.push(`${(duration / 1000).toFixed(1)} s`)
    }
  }

  return parts.join(' · ')
}

async function handleSubmit(input: string, options: { deepThink: boolean; webSearch: boolean; model: string }) {
  if (!sessionId.value || isGenerating.value) return

  await agentStore.runAgent(sessionId.value, input, {
    model: options.model || settingsStore.defaultModel,
    // deepThink / webSearch 可扩展为 thinking 参数或工具
  })
}

/** 模型切换时更新会话状态 */
function handleModelChange(modelId: string) {
  sessionModel.value = modelId
  if (sessionId.value) {
    chatStore.setSessionModel(sessionId.value, modelId)
  }
}

/** 初始化会话模型 */
function initSessionModel() {
  if (sessionId.value) {
    const model = chatStore.getSessionModel(sessionId.value)
    sessionModel.value = model || settingsStore.defaultModel || settingsStore.enabledAvailableModels[0]?.id || ''
  }
}

// 监听会话 ID 变化，重新初始化模型
watch(sessionId, () => {
  initSessionModel()
}, { immediate: true })

// 处理来自首页"推荐问题"点击的初始消息
onMounted(() => {
  initSessionModel()
  const q = route.query.q
  const model = route.query.model
  if (q && typeof q === 'string') {
    handleSubmit(q, {
      deepThink: false,
      webSearch: false,
      model: typeof model === 'string' ? model : sessionModel.value,
    })
    router.replace({ name: 'chat', params: { id: sessionId.value } })
  }
})
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.messages-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.empty-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.empty-desc {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-muted-foreground);
}

/* Messages List */
.messages-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message {
  display: flex;
  gap: 16px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-foreground);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 14px 18px;
  border-radius: var(--radius-xl);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.message.assistant .message-text {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
}

.message.user .message-text {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.message-time {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  padding: 0 4px;
}

/* Thinking Block */
.thinking-block {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: 8px;
  font-size: 0.875rem;
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-muted-foreground);
  font-weight: 500;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.thinking-header:hover {
  background: var(--color-background);
}

.thinking-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thinking-stats {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.collapse-icon {
  transition: transform 0.2s;
}

.thinking-block.collapsed .collapse-icon {
  transform: rotate(-90deg);
}

.thinking-content {
  padding: 0 16px 12px 16px;
}

.thinking-text {
  color: var(--color-muted-foreground);
  font-style: italic;
  white-space: pre-wrap;
  line-height: 1.5;
  margin: 0;
}

/* Tool Block */
.tool-block {
  background: var(--color-secondary)/10;
  border: 1px solid var(--color-secondary)/30;
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-secondary);
  font-weight: 500;
}

.tool-result-block {
  background: var(--color-muted);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 8px;
  font-family: monospace;
  font-size: 0.8125rem;
  overflow-x: auto;
}

.tool-result-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--color-muted-foreground);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Chat Input Wrapper */
.chat-input-wrapper {
  padding-top: 16px;
}
</style>
