<!--
  @component MessageItem
  @description 消息项组件，展示单条消息（用户或 AI）。
               支持富内容展示（thinking、tool_use、text）。
  @layer component
-->
<template>
  <div :class="['message', message.role]">
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
      <template v-for="(block, idx) in contentBlocks" :key="idx">
        <ThinkingBlock
          v-if="block.type === 'thinking'"
          :block="block"
          :collapsed="isThinkingCollapsed(message.id, idx)"
          @toggle="toggleThinking(message.id, idx)"
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
      <span class="message-time">{{ formatTime(message.timestamp) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolBlock from './ToolBlock.vue'
import type { ContentBlock, ThinkingContent, ToolUseContent, ToolResultContent } from '#claude/types'
import type { Message } from '@/stores/chat'

const props = defineProps<{
  /** 消息数据 */
  message: Message
  /** 思考块默认折叠 */
  collapseThinking: boolean
}>()

// ── 工具 UI 状态（组件内独立管理）───────────────────────────────────────────────

/** 展开的工具详情 ID */
const expandedTools = ref<Record<string, boolean>>({})

/** 工具详情激活的 tab */
const toolActiveTab = ref<Record<string, 'input' | 'result'>>({})

/** 思考块折叠状态 */
const thinkingCollapsed = ref<Record<string, boolean>>({})

// ── 内容块处理 ─────────────────────────────────────────────────────────────────

/** 获取消息内容块 */
const contentBlocks = computed<ContentBlock[]>(() => {
  if (typeof props.message.content === 'string') {
    return [{ type: 'text', text: props.message.content }]
  }
  // 过滤掉 tool_result，它们会配对到 tool_use 中显示
  return props.message.content.filter(b => b.type !== 'tool_result')
})

// ── 思考块状态管理 ─────────────────────────────────────────────────────────────

function isThinkingCollapsed(messageId: string, blockIdx: number): boolean {
  const key = `${messageId}-${blockIdx}`
  const current = thinkingCollapsed.value[key]
  if (current === undefined) {
    return props.collapseThinking
  }
  return !current
}

function toggleThinking(messageId: string, blockIdx: number): void {
  const key = `${messageId}-${blockIdx}`
  const current = thinkingCollapsed.value[key]
  if (current === undefined) {
    thinkingCollapsed.value[key] = props.collapseThinking ? true : false
  } else {
    thinkingCollapsed.value[key] = !current
  }
}

// ── 工具状态管理 ───────────────────────────────────────────────────────────────

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

/** 获取 tool_use 对应的 tool_result */
function getToolResult(toolUseId: string): ToolResultContent | undefined {
  if (typeof props.message.content === 'string') return undefined
  return props.message.content.find(
    b => b.type === 'tool_result' && b.toolUseId === toolUseId,
  ) as ToolResultContent | undefined
}

/** 获取工具执行状态 */
function getToolStatus(toolUseId: string): 'running' | 'done' | 'error' {
  const result = getToolResult(toolUseId)
  if (!result) return 'running'
  // 占位符（空 content）表示正在执行
  if (result.content === '') return 'running'
  if (result.isError) return 'error'
  return 'done'
}

// ── 时间格式化 ────────────────────────────────────────────────────────────────

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
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
</style>