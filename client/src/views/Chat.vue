<!--
  @component Chat (view)
  @description 对话页面，路由：/chat/:id。
               使用 ChatPanel 组件展示聊天界面。
  @layer view
-->
<template>
  <ChatPanel
    :messages="messages"
    :is-generating="isCurrentSessionGenerating"
    :streaming-content-blocks="streamingContentBlocks"
    :all-content-blocks="allContentBlocks"
    :initial-model="sessionModel"
    :on-submit="handleSubmit"
    :on-stop="handleStop"
    @model-change="handleModelChange"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatPanel from '@/components/Chat/ChatPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import { useChatSubmit } from '@/composables'
import type { PermissionMode } from '#claude/types'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const agentStore = useAgentStore()
const settingsStore = useSettingsStore()

// ── 路由参数 ──────────────────────────────────────────────────────────────────
const sessionId = computed(() => route.params.id as string)
const session = computed(() => chatStore.sessions.find(s => s.id === sessionId.value))
const messages = computed(() => session.value?.messages ?? [])

// ── 会话模型 ──────────────────────────────────────────────────────────────────
const sessionModel = ref<string>('')

// ── 使用 composable ───────────────────────────────────────────────────────────
const { handleSubmit: submitMessage, initSessionModel, handleModelChange } = useChatSubmit({
  sessionId,
  sessionModel,
})

// ── 流式消息状态 ──────────────────────────────────────────────────────────────
/** 当前 session 是否正在生成 */
const isCurrentSessionGenerating = computed(() => {
  return agentStore.isGenerating && agentStore.currentSessionId === sessionId.value
})

/** 流式内容块（不含 tool_result，用于渲染） */
const streamingContentBlocks = computed(() => {
  if (!isCurrentSessionGenerating.value) return []
  return agentStore.currentContent.filter(b => b.type !== 'tool_result')
})

/** 所有内容块（含 tool_result，用于获取工具结果） */
const allContentBlocks = computed(() => {
  if (!isCurrentSessionGenerating.value) return []
  return agentStore.currentContent
})

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
  }
}, { immediate: true })

onMounted(async () => {
  const id = sessionId.value
  if (id) {
    await chatStore.loadSessionMessages(id)
  }
  initSessionModel()
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
/* ChatPanel 自带样式，这里不需要额外样式 */
</style>