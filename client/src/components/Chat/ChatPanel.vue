<!--
  @component ChatPanel
  @description 核心聊天面板组件。
               整合消息列表、输入区域、AskUserQuestion Dialog。
               支持自定义提交逻辑和空状态展示。
  @layer component
-->
<template>
  <div class="chat-panel">
    <!-- Messages -->
    <MessageList
      ref="messageListRef"
      :messages="messages"
      :is-generating="isGenerating"
      :streaming-content-blocks="streamingContentBlocks"
      :collapse-thinking="settingsStore.collapseThinking"
      :empty-title="emptyTitle"
      :empty-desc="emptyDesc"
      :thinking-collapsed="isStreamingThinkingCollapsed"
      :is-tool-expanded="isToolExpanded"
      :get-tool-active-tab="getToolActiveTab"
      :get-tool-status="getToolStatus"
      :get-tool-result="getToolResult"
      :on-toggle-thinking="toggleStreamingThinking"
      :on-toggle-tool-expand="toggleToolExpand"
      :on-set-tool-active-tab="setToolActiveTab"
    />

    <!-- Input -->
    <div class="chat-input-wrapper">
      <ChatInput
        :initial-model="initialModel"
        :is-generating="isGenerating"
        @submit="handleSubmit"
        @stop="handleStop"
        @model-change="emit('modelChange', $event)"
      />
    </div>

    <!-- AskUserQuestion Dialog -->
    <AskUserQuestionDialog
      :visible="showAskDialog"
      :questions="askQuestions"
      @submit="handleAskSubmit"
      @cancel="handleAskCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'
import AskUserQuestionDialog from './AskUserQuestionDialog.vue'
import { useSettingsStore } from '@/stores/settings'
import { useChatState } from '@/composables/useChatState'
import { useAskQuestion } from '@/composables/useAskQuestion'
import type { Message } from '@/stores/chat'
import type { ContentBlock, PermissionMode } from '#claude/types'

// ── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  /** 消息列表 */
  messages: Message[]
  /** 是否正在生成 */
  isGenerating: boolean
  /** 流式内容块（不含 tool_result，用于渲染） */
  streamingContentBlocks: ContentBlock[]
  /** 所有内容块（含 tool_result，用于获取工具结果） */
  allContentBlocks?: ContentBlock[]
  /** 空状态标题 */
  emptyTitle?: string
  /** 空状态描述 */
  emptyDesc?: string
  /** 输入框初始模型 */
  initialModel?: string
  /** 自定义提交处理 */
  onSubmit?: (input: string, options: { model: string; permissionMode: PermissionMode }) => Promise<void>
  /** 自定义停止处理 */
  onStop?: () => void
}>(), {
  emptyTitle: '开始对话',
  emptyDesc: '在下方输入你的问题，AI 会为你解答',
})

const emit = defineEmits<{
  /** 模型切换 */
  modelChange: [modelId: string]
}>()

// ── Stores ────────────────────────────────────────────────────────────────────
const settingsStore = useSettingsStore()

// ── Refs ──────────────────────────────────────────────────────────────────────
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

// ── Composables ───────────────────────────────────────────────────────────────
const streamingContentBlocksComputed = computed(() => props.streamingContentBlocks)
const allContentBlocksComputed = computed(() => props.allContentBlocks ?? props.streamingContentBlocks)

const {
  isStreamingThinkingCollapsed,
  toggleStreamingThinking,
  isToolExpanded,
  getToolActiveTab,
  setToolActiveTab,
  getToolResult,
  getToolStatus,
  toggleToolExpand,
} = useChatState({
  streamingContentBlocks: streamingContentBlocksComputed,
  allContentBlocks: allContentBlocksComputed,
})

const {
  showAskDialog,
  askQuestions,
  handleAskSubmit,
  handleAskCancel,
  setupAskQuestionListener,
} = useAskQuestion()

// ── 滚动控制 ──────────────────────────────────────────────────────────────────
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value?.messagesContainerRef) {
      messageListRef.value.messagesContainerRef.scrollTop = messageListRef.value.messagesContainerRef.scrollHeight
    }
  })
}

// 监听消息数量变化
watch(() => props.messages.length, () => {
  scrollToBottom()
})

// 监听生成状态变化
watch(() => props.isGenerating, (generating, wasGenerating) => {
  if (wasGenerating && !generating) {
    scrollToBottom()
  }
})

// ── 事件处理 ──────────────────────────────────────────────────────────────────
async function handleSubmit(input: string, options: { model: string; permissionMode: PermissionMode }) {
  if (props.onSubmit) {
    await props.onSubmit(input, options)
  }
}

function handleStop() {
  if (props.onStop) {
    props.onStop()
  }
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
let cleanupAskQuestion: (() => void) | null = null

onMounted(() => {
  cleanupAskQuestion = setupAskQuestionListener()
  scrollToBottom()
})

onUnmounted(() => {
  cleanupAskQuestion?.()
})
</script>

<style scoped>
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Chat Input Wrapper */
.chat-input-wrapper {
  padding: 16px;
  border-top: 1px solid var(--color-border);
}
</style>