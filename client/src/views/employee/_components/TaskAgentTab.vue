<!--
  @component TaskAgentTab
  @description 任务专属 Agent 聊天界面。
               使用 ChatPanel 组件，支持延迟创建 session。
  @layer view-component
-->
<template>
  <ChatPanel
    class="task-agent-panel"
    :messages="messages"
    :is-generating="isGenerating"
    :streaming-content-blocks="streamingContentBlocks"
    :initial-model="sessionModel"
    empty-title="任务助手"
    empty-desc="询问关于此任务的任何问题"
    :on-submit="handleSubmit"
    :on-stop="handleStop"
    @model-change="handleModelChange"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ChatPanel from '@/components/Chat/ChatPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import type { PermissionMode, AgentMessage } from '#claude/types'
import type { Task } from '@/services/types'

interface Props {
  task: Task
}

const props = defineProps<Props>()

const chatStore = useChatStore()
const agentStore = useAgentStore()
const settingsStore = useSettingsStore()

// ── Session 相关 ──────────────────────────────────────────────────────────────
const sessionId = ref<string | null>(null)
const sessionCreated = ref(false)

// ── 会话模型 ──────────────────────────────────────────────────────────────────
const sessionModel = ref<string>('')

// ── 消息列表 ───────────────────────────────────────────────────────────────────
const messages = computed(() => {
  if (!sessionId.value) return []
  const session = chatStore.sessions.find(s => s.id === sessionId.value)
  return session?.messages ?? []
})

// ── 是否正在生成 ──────────────────────────────────────────────────────────────
const isGenerating = computed(() => {
  return agentStore.isGenerating && agentStore.currentSessionId === sessionId.value
})

// ── 流式内容块 ────────────────────────────────────────────────────────────────
const streamingContentBlocks = computed(() => {
  if (!isGenerating.value) return []
  return agentStore.currentContent.filter(b => b.type !== 'tool_result')
})

// ── 初始化模型 ────────────────────────────────────────────────────────────────
function initSessionModel() {
  sessionModel.value = settingsStore.defaultModel || 'Qwen3.5-Plus'
}

// ── 模型变更处理 ──────────────────────────────────────────────────────────────
function handleModelChange(modelId: string) {
  sessionModel.value = modelId
}

// ── 提交消息 ──────────────────────────────────────────────────────────────────
async function handleSubmit(input: string, options: { model: string; permissionMode: PermissionMode }) {
  // 如果还没有 session，先创建
  if (!sessionId.value) {
    const session = await chatStore.createSession(
      `任务 #${props.task.id} - ${props.task.title}`,
      options.model,
      props.task.id
    )
    sessionId.value = session.id
    sessionCreated.value = true
  }

  // 构建历史消息（从 messages 中提取）
  const historyMessages: AgentMessage[] = messages.value.map(m => ({
    role: m.role,
    content: m.content,
  }))

  // 使用 agentStore.runAgent 发送消息
  await agentStore.runAgent(
    sessionId.value,
    input,
    historyMessages,
    {
      model: options.model,
      permissionMode: options.permissionMode,
    }
  )
}

// ── 停止生成 ──────────────────────────────────────────────────────────────────
function handleStop() {
  agentStore.abort()
}

// ── 监听 task 变化，查找已有 session ──────────────────────────────────────────
watch(() => props.task.id, async (id) => {
  if (id) {
    // 查找是否已有绑定此任务的 session
    const existingSession = chatStore.sessions.find(s => s.taskId === id)
    if (existingSession) {
      sessionId.value = existingSession.id
      sessionCreated.value = true
      await chatStore.loadSessionMessages(existingSession.id)
    } else {
      sessionId.value = null
      sessionCreated.value = false
    }
    initSessionModel()
  }
}, { immediate: true })

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  initSessionModel()
})
</script>

<style scoped>
.task-agent-panel {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}
</style>