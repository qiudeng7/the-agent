<!--
  @component Chat (view)
  @description 对话页面，路由：/chat/:id。
               展示当前会话的消息列表，底部挂载 ChatInput。
               使用 MessageItem 组件渲染已完成消息，流式消息单独处理。
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
        <!-- 已完成消息 -->
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :collapse-thinking="settingsStore.collapseThinking"
        />

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
            <!-- 流式内容块 -->
            <template v-for="(block, idx) in streamingContentBlocks" :key="`streaming-${idx}`">
              <ThinkingBlock
                v-if="block.type === 'thinking'"
                :block="block"
                :collapsed="isStreamingThinkingCollapsed"
                :is-streaming="true"
                @toggle="isStreamingThinkingCollapsed = !isStreamingThinkingCollapsed"
              />
              <ToolBlock
                v-else-if="block.type === 'tool_use'"
                :block="block"
                :expanded="isToolExpanded(block.id)"
                :active-tab="getToolActiveTab(block.id)"
                :status="getToolStatus(block.id)"
                :result="getToolResult(block.id)"
                @toggle-expand="toggleToolExpand(block.id)"
                @set-active-tab="setToolActiveTab(block.id, $event)"
              />
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
import MessageItem from '@/components/Chat/MessageItem.vue'
import ThinkingBlock from '@/components/Chat/ThinkingBlock.vue'
import ToolBlock from '@/components/Chat/ToolBlock.vue'
import { useChatStore } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import { useChatSubmit } from '@/composables'
import type { ContentBlock, ToolResultContent, PermissionMode } from '#claude/types'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const agentStore = useAgentStore()
const settingsStore = useSettingsStore()

// ── 路由参数 ──────────────────────────────────────────────────────────────────
const sessionId = computed(() => route.params.id as string)
const session = computed(() => chatStore.sessions.find(s => s.id === sessionId.value))
const messages = computed(() => session.value?.messages ?? [])

// ── 消息列表容器 ──────────────────────────────────────────────────────────────
const messagesContainerRef = ref<HTMLElement | null>(null)

// ── 会话模型 ──────────────────────────────────────────────────────────────────
const sessionModel = ref<string>('')

// ── 使用 composable ───────────────────────────────────────────────────────────
const { isGenerating, handleSubmit: submitMessage, initSessionModel, handleModelChange } = useChatSubmit({
  sessionId,
  sessionModel,
})

// ── 流式消息状态 ──────────────────────────────────────────────────────────────
const isStreamingThinkingCollapsed = ref(settingsStore.collapseThinking)

/** 当前 session 是否正在生成 */
const isCurrentSessionGenerating = computed(() => {
  return agentStore.isGenerating && agentStore.currentSessionId === sessionId.value
})

/** 流式内容块 */
const streamingContentBlocks = computed(() => {
  if (!isCurrentSessionGenerating.value) return []
  return agentStore.currentContent.filter(b => b.type !== 'tool_result')
})

// ── 工具 UI 状态（流式消息）───────────────────────────────────────────────────
const expandedTools = ref<Record<string, boolean>>({})
const toolActiveTab = ref<Record<string, 'input' | 'result'>>({})

function toggleToolExpand(toolId: string): void {
  expandedTools.value[toolId] = !expandedTools.value[toolId]
}

function isToolExpanded(toolId: string): boolean {
  return expandedTools.value[toolId] ?? false
}

function getToolActiveTab(toolId: string): 'input' | 'result' {
  return toolActiveTab.value[toolId] || 'input'
}

function setToolActiveTab(toolId: string, tab: 'input' | 'result'): void {
  toolActiveTab.value[toolId] = tab
}

function getToolResult(toolUseId: string): ToolResultContent | undefined {
  return agentStore.currentContent.find(
    b => b.type === 'tool_result' && b.toolUseId === toolUseId,
  ) as ToolResultContent | undefined
}

function getToolStatus(toolUseId: string): 'running' | 'done' | 'error' {
  const result = getToolResult(toolUseId)
  if (!result) return 'running'
  if (result.isError) return 'error'
  return 'done'
}

// ── 滚动控制 ──────────────────────────────────────────────────────────────────
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

// ── 事件处理 ──────────────────────────────────────────────────────────────────
async function handleSubmit(input: string, options: { model: string; permissionMode: PermissionMode }) {
  await submitMessage(input, options)
}

function handleStop() {
  agentStore.abort()
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
watch(sessionId, async (id) => {
  if (id) {
    await chatStore.loadSessionMessages(id)
    initSessionModel()
    scrollToBottom()
  }
}, { immediate: true })

watch(messages, (newMessages, oldMessages) => {
  if (newMessages.length !== oldMessages?.length) {
    scrollToBottom()
  }
}, { deep: true })

watch(isGenerating, (generating, wasGenerating) => {
  if (wasGenerating && !generating) {
    scrollToBottom()
  }
})

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

/* Streaming Message */
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

.message-avatar {
  flex-shrink: 0;
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

.message-text {
  padding: 14px 18px;
  border-radius: var(--radius-xl);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.6;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
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