<!--
  @component MessageList
  @description 消息列表组件，展示已完成消息和流式消息。
               支持自定义空状态展示。
  @layer component
-->
<template>
  <div class="messages-container" ref="messagesContainerRef">
    <!-- 空状态 -->
    <div v-if="messages.length === 0 && !isGenerating" class="messages-empty">
      <slot name="empty-state">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 class="empty-title">{{ emptyTitle }}</h2>
          <p class="empty-desc">{{ emptyDesc }}</p>
        </div>
      </slot>
    </div>

    <!-- 消息列表 -->
    <div v-else class="messages-list">
      <!-- 已完成消息 -->
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :collapse-thinking="collapseThinking"
      />

      <!-- 流式生成中的 assistant 消息 -->
      <StreamingMessage
        v-if="isGenerating"
        :content-blocks="streamingContentBlocks"
        :thinking-collapsed="thinkingCollapsed"
        :is-tool-expanded="isToolExpanded"
        :get-tool-active-tab="getToolActiveTab"
        :get-tool-status="getToolStatus"
        :get-tool-result="getToolResult"
        :on-toggle-thinking="onToggleThinking"
        :on-toggle-tool-expand="onToggleToolExpand"
        :on-set-tool-active-tab="onSetToolActiveTab"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MessageItem from './MessageItem.vue'
import StreamingMessage from './StreamingMessage.vue'
import type { Message } from '@/stores/chat'
import type { ContentBlock, ToolResultContent } from '#claude/types'

defineProps<{
  /** 消息列表 */
  messages: Message[]
  /** 是否正在生成 */
  isGenerating: boolean
  /** 流式内容块 */
  streamingContentBlocks: ContentBlock[]
  /** 思考块默认折叠 */
  collapseThinking: boolean
  /** 空状态标题 */
  emptyTitle: string
  /** 空状态描述 */
  emptyDesc: string
  /** 思考块是否折叠 */
  thinkingCollapsed: boolean
  /** 判断工具是否展开 */
  isToolExpanded: (toolId: string) => boolean
  /** 获取工具激活的 tab */
  getToolActiveTab: (toolId: string) => 'input' | 'result'
  /** 获取工具状态 */
  getToolStatus: (toolUseId: string) => 'running' | 'done' | 'error'
  /** 获取工具结果 */
  getToolResult: (toolUseId: string) => ToolResultContent | undefined
  /** 切换思考块折叠状态 */
  onToggleThinking: () => void
  /** 切换工具展开状态 */
  onToggleToolExpand: (toolId: string) => void
  /** 设置工具激活的 tab */
  onSetToolActiveTab: (toolId: string, tab: 'input' | 'result') => void
}>()

// 暴露 messagesContainerRef 供父组件使用
const messagesContainerRef = ref<HTMLElement | null>(null)

defineExpose({
  messagesContainerRef,
})
</script>

<style scoped>
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
</style>