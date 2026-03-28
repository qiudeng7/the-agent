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
    <div class="messages-container" ref="messagesContainerRef">
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
            <template v-for="(block, idx) in getMessageContentBlocks(message)" :key="idx">
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
              <div v-else-if="block.type === 'tool_use'" class="tool-block" :class="{ expanded: isToolExpanded(block.id), error: getMessageToolStatus(message, block.id) === 'error' }">
                <div class="tool-header" @click="toggleToolExpand(block.id)">
                  <div class="tool-header-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <span class="tool-name">{{ block.name }}</span>
                    <span v-if="getToolInputSummary(block.input)" class="tool-summary">{{ getToolInputSummary(block.input) }}</span>
                    <span class="tool-status" :class="getMessageToolStatus(message, block.id)">{{ getToolStatusText(getMessageToolStatus(message, block.id)) }}</span>
                  </div>
                  <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div class="tool-detail" v-show="isToolExpanded(block.id)">
                  <!-- Tab 切换 -->
                  <div class="tool-tabs">
                    <button
                      class="tool-tab"
                      :class="{ active: getToolActiveTab(block.id) === 'input' }"
                      @click.stop="setToolActiveTab(block.id, 'input')"
                    >
                      参数
                    </button>
                    <button
                      v-if="getMessageToolResult(message, block.id)"
                      class="tool-tab"
                      :class="{ active: getToolActiveTab(block.id) === 'result' }"
                      @click.stop="setToolActiveTab(block.id, 'result')"
                    >
                      结果
                    </button>
                  </div>
                  <!-- Tab 内容 -->
                  <div class="tool-tab-content">
                    <pre v-if="getToolActiveTab(block.id) === 'input'">{{ formatToolInputDetail(block.input) }}</pre>
                    <pre v-else-if="getMessageToolResult(message, block.id)">{{ getMessageToolResult(message, block.id)!.content }}</pre>
                  </div>
                </div>
              </div>
              <div v-else-if="block.type === 'text'" class="message-text">
              <MarkdownRenderer :content="block.text" />
            </div>
            </template>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>

        <!-- 流式生成中的 assistant 消息 -->
        <div v-if="isCurrentSessionGenerating" class="message assistant streaming">
          <div class="message-avatar">
            <div class="ai-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div class="message-content">
            <!-- 按原始顺序显示所有内容块 -->
            <template v-for="(block, idx) in streamingContentBlocks" :key="`streaming-${idx}`">
              <!-- thinking 块 -->
              <div v-if="block.type === 'thinking'" class="thinking-block" :class="{ collapsed: isStreamingThinkingCollapsed }">
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
                      {{ block.thinking.length }} 字
                    </span>
                    <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
                <div class="thinking-content" v-show="!isStreamingThinkingCollapsed">
                  <p class="thinking-text">{{ block.thinking }}</p>
                </div>
              </div>

              <!-- tool_use 块（包含对应的 tool_result） -->
              <div v-else-if="block.type === 'tool_use'" class="tool-block" :class="{ expanded: isToolExpanded(block.id), error: getToolStatus(block.id) === 'error' }">
                <div class="tool-header" @click="toggleToolExpand(block.id)">
                  <div class="tool-header-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <span class="tool-name">{{ block.name }}</span>
                    <span v-if="getToolInputSummary(block.input)" class="tool-summary">{{ getToolInputSummary(block.input) }}</span>
                    <span class="tool-status" :class="getToolStatus(block.id)">{{ getToolStatusText(getToolStatus(block.id)) }}</span>
                  </div>
                  <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div class="tool-detail" v-show="isToolExpanded(block.id)">
                  <!-- Tab 切换 -->
                  <div class="tool-tabs">
                    <button
                      class="tool-tab"
                      :class="{ active: getToolActiveTab(block.id) === 'input' }"
                      @click.stop="setToolActiveTab(block.id, 'input')"
                    >
                      参数
                    </button>
                    <button
                      v-if="getToolResult(block.id)"
                      class="tool-tab"
                      :class="{ active: getToolActiveTab(block.id) === 'result' }"
                      @click.stop="setToolActiveTab(block.id, 'result')"
                    >
                      结果
                    </button>
                  </div>
                  <!-- Tab 内容 -->
                  <div class="tool-tab-content">
                    <pre v-if="getToolActiveTab(block.id) === 'input'">{{ formatToolInputDetail(block.input) }}</pre>
                    <pre v-else-if="getToolResult(block.id)">{{ getToolResult(block.id)!.content }}</pre>
                  </div>
                </div>
              </div>

              <!-- text 块 -->
              <div v-else-if="block.type === 'text'" class="message-text">
                <MarkdownRenderer :content="block.text" />
              </div>
            </template>

            <!-- 无内容时显示打字指示器 -->
            <div v-if="streamingContentBlocks.length === 0" class="typing-indicator">
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
        :is-generating="isGenerating"
        @submit="handleSubmit"
        @stop="handleStop"
        @model-change="handleModelChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatInput from '@/components/Chat/ChatInput.vue'
import MarkdownRenderer from '@/components/Chat/MarkdownRenderer.vue'
import { useChatStore, type Message } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import type { ContentBlock, PermissionMode } from '#claude/types'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const agentStore = useAgentStore()
const settingsStore = useSettingsStore()

const sessionId = computed(() => route.params.id as string)
const session = computed(() => chatStore.sessions.find(s => s.id === sessionId.value))
const messages = computed(() => session.value?.messages ?? [])

/** 消息列表容器引用 */
const messagesContainerRef = ref<HTMLElement | null>(null)

/** 展开的工具详情 ID 集合 */
const expandedTools = ref<Set<string>>(new Set())

/** 工具详情激活的 tab */
const toolActiveTab = ref<Record<string, 'input' | 'result'>>({})

/** 会话当前模型（优先从会话获取，其次从最后消息推断，最后使用默认模型） */
const sessionModel = ref<string>('')

/** 流式思考是否折叠 */
const isStreamingThinkingCollapsed = ref(settingsStore.collapseThinking)

/** 当前 session 是否正在生成（检查 session ID 匹配） */
const isCurrentSessionGenerating = computed(() => {
  return agentStore.isGenerating && agentStore.currentSessionId === sessionId.value
})

/** 流式内容（来自 agentStore，仅当前 session） */
const streamingText = computed(() => {
  if (!isCurrentSessionGenerating.value) return ''
  return agentStore.currentText
})

const streamingThinking = computed(() => {
  if (!isCurrentSessionGenerating.value) return ''
  return agentStore.currentThinking
})

/** 流式内容块（按原始顺序，排除 tool_result 单独显示） */
const streamingContentBlocks = computed(() => {
  if (!isCurrentSessionGenerating.value) return []
  // 过滤掉 tool_result，它们会配对到 tool_use 中显示
  return agentStore.currentContent.filter(b => b.type !== 'tool_result')
})

/** 获取 tool_use 对应的 tool_result */
function getToolResult(toolUseId: string): ContentBlock | undefined {
  return agentStore.currentContent.find(b => b.type === 'tool_result' && b.toolUseId === toolUseId)
}

/** 获取工具执行状态 */
function getToolStatus(toolUseId: string): 'pending' | 'running' | 'done' | 'error' {
  const result = getToolResult(toolUseId)
  if (!result) return 'running'
  if (result.isError) return 'error'
  return 'done'
}

/** 获取工具状态显示文本 */
function getToolStatusText(status: 'pending' | 'running' | 'done' | 'error'): string {
  switch (status) {
    case 'pending': return '等待中'
    case 'running': return '执行中...'
    case 'done': return '已完成'
    case 'error': return '失败'
  }
}

const isGenerating = computed(() => agentStore.isGenerating)

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

/** 切换工具详情展开状态 */
function toggleToolExpand(toolId: string) {
  if (expandedTools.value.has(toolId)) {
    expandedTools.value.delete(toolId)
  } else {
    expandedTools.value.add(toolId)
  }
}

/** 判断工具是否展开 */
function isToolExpanded(toolId: string): boolean {
  return expandedTools.value.has(toolId)
}

/** 获取工具激活的 tab */
function getToolActiveTab(toolId: string): 'input' | 'result' {
  return toolActiveTab.value[toolId] || 'input'
}

/** 设置工具激活的 tab */
function setToolActiveTab(toolId: string, tab: 'input' | 'result') {
  toolActiveTab.value[toolId] = tab
}

/** 获取工具输入的缩略显示 */
function getToolInputSummary(input: Record<string, unknown>): string {
  const keys = Object.keys(input)
  if (keys.length === 0) return ''

  // 常见工具的简化显示
  const firstKey = keys[0]
  const value = input[firstKey]

  if (typeof value === 'string') {
    // 截断长字符串
    return value.length > 50 ? value.slice(0, 50) + '...' : value
  }

  return `${keys.length} 个参数`
}

/** 格式化工具输入详情 */
function formatToolInputDetail(input: Record<string, unknown>): string {
  return JSON.stringify(input, null, 2)
}

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

/** 获取已完成消息中的 tool_result（用于配对显示） */
function getMessageToolResult(message: Message, toolUseId: string): ContentBlock | undefined {
  const blocks = getMessageBlocks(message)
  return blocks.find(b => b.type === 'tool_result' && b.toolUseId === toolUseId)
}

/** 获取已完成消息中工具的状态 */
function getMessageToolStatus(message: Message, toolUseId: string): 'running' | 'done' | 'error' {
  const result = getMessageToolResult(message, toolUseId)
  if (!result) return 'running'
  if (result.isError) return 'error'
  return 'done'
}

/** 获取已完成消息的内容块（排除单独的 tool_result） */
function getMessageContentBlocks(message: Message): ContentBlock[] {
  const blocks = getMessageBlocks(message)
  // 过滤掉 tool_result，它们会配对到 tool_use 中显示
  return blocks.filter(b => b.type !== 'tool_result')
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

async function handleSubmit(input: string, options: { model: string; permissionMode: PermissionMode }) {
  if (!sessionId.value || isGenerating.value) return

  const modelId = options.model || settingsStore.defaultModel
  const modelConfig = settingsStore.getModelConfig(modelId)

  // 先构建历史消息（在添加用户消息之前，避免重复）
  const sessionMessages = session.value?.messages.map(m => ({
    role: m.role,
    content: m.content,
  })) ?? []

  // 添加用户消息到 chat store（用于前端显示）
  await chatStore.addMessage(sessionId.value, {
    id: Date.now().toString() + '-user',
    role: 'user',
    content: input,
    timestamp: Date.now(),
  })

  // 调用 agent（sessionMessages 不包含刚添加的用户消息，避免 prompt 重复）
  await agentStore.runAgent(
    sessionId.value,
    input,
    sessionMessages,
    {
      model: modelId,
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
      permissionMode: options.permissionMode,
    },
  )

  // 更新会话模型
  if (modelId) {
    chatStore.setSessionModel(sessionId.value, modelId)
  }
}

/** 模型切换时更新会话状态 */
function handleModelChange(modelId: string) {
  sessionModel.value = modelId
  if (sessionId.value) {
    chatStore.setSessionModel(sessionId.value, modelId)
  }
}

/** 停止生成 */
function handleStop() {
  agentStore.abort()
}

/** 初始化会话模型 */
function initSessionModel() {
  if (sessionId.value) {
    const model = chatStore.getSessionModel(sessionId.value)
    sessionModel.value = model || settingsStore.defaultModel || settingsStore.enabledAvailableModels[0]?.id || ''
  }
}

// 监听会话 ID 变化，重新初始化模型并加载消息
watch(sessionId, async (id) => {
  if (id) {
    // 加载消息
    await chatStore.loadSessionMessages(id)
    initSessionModel()
    scrollToBottom()
  }
}, { immediate: true })

// 监听消息变化，滚动到底部（用户消息和最终回复）
watch(messages, (newMessages, oldMessages) => {
  if (newMessages.length !== oldMessages?.length) {
    scrollToBottom()
  }
}, { deep: true })

// 监听生成状态变化，生成完成时滚动
watch(isGenerating, (generating, wasGenerating) => {
  if (wasGenerating && !generating) {
    scrollToBottom()
  }
})

// 处理来自首页"推荐问题"点击的初始消息
onMounted(async () => {
  const id = sessionId.value
  if (id) {
    await chatStore.loadSessionMessages(id)
  }
  initSessionModel()
  scrollToBottom()
  const q = route.query.q
  const model = route.query.model
  if (q && typeof q === 'string') {
    handleSubmit(q, {
      model: typeof model === 'string' ? model : sessionModel.value,
      permissionMode: settingsStore.permissionMode,
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
  margin-bottom: 8px;
  font-size: 0.875rem;
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-secondary);
  font-weight: 500;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.tool-header:hover {
  background: var(--color-secondary)/5;
}

.tool-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tool-name {
  flex-shrink: 0;
}

.tool-summary {
  color: var(--color-muted-foreground);
  font-weight: 400;
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tool Status */
.tool-status {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-left: 4px;
}

.tool-status.running {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.tool-status.done {
  background: var(--color-success)/10;
  color: var(--color-success);
}

.tool-status.error {
  background: var(--color-destructive)/10;
  color: var(--color-destructive);
}

.tool-status.pending {
  background: var(--color-muted);
  color: var(--color-muted-foreground);
}

/* Tool Block Error State */
.tool-block.error {
  border-color: var(--color-destructive)/30;
  background: var(--color-destructive)/5;
}

.tool-block.error .tool-header {
  color: var(--color-destructive);
}

.tool-block .collapse-icon {
  transition: transform 0.2s;
  color: var(--color-muted-foreground);
}

.tool-block.expanded .collapse-icon {
  transform: rotate(180deg);
}

.tool-detail {
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

/* Tool Tabs */
.tool-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
}

.tool-tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
  border-bottom: 2px solid transparent;
}

.tool-tab:hover {
  color: var(--color-foreground);
  background: var(--color-muted);
}

.tool-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Tool Tab Content */
.tool-tab-content {
  padding: 12px 14px;
}

.tool-tab-content pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-foreground);
  max-height: 300px;
  overflow-y: auto;
}

/* Tool Result Block */
.tool-result-block {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: 8px;
  font-size: 0.875rem;
  overflow: hidden;
}

.tool-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.tool-result-header:hover {
  background: var(--color-background);
}

.tool-result-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-result-label {
  color: var(--color-muted-foreground);
  font-weight: 500;
}

.tool-result-error {
  background: var(--color-destructive)/10;
  color: var(--color-destructive);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.tool-result-block .collapse-icon {
  transition: transform 0.2s;
  color: var(--color-muted-foreground);
}

.tool-result-block.expanded .collapse-icon {
  transform: rotate(180deg);
}

.tool-result-content {
  padding: 0 14px 12px 14px;
  border-top: 1px solid var(--color-border);
}

.tool-result-content pre {
  margin: 12px 0 0 0;
  font-family: monospace;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
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
