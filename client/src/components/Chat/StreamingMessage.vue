<!--
  @component StreamingMessage
  @description 流式消息组件，展示正在生成的 AI 消息。
               包含思考块、工具调用、文本内容的流式渲染。
  @layer component
-->
<template>
  <div class="message assistant streaming">
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
      <template v-for="(block, idx) in contentBlocks" :key="`streaming-${idx}`">
        <ThinkingBlock
          v-if="block.type === 'thinking'"
          :block="block"
          :collapsed="thinkingCollapsed"
          :is-streaming="true"
          @toggle="onToggleThinking"
        />
        <ToolBlock
          v-else-if="block.type === 'tool_use'"
          :block="block"
          :expanded="isToolExpanded(block.id)"
          :active-tab="getToolActiveTab(block.id)"
          :status="getToolStatus(block.id)"
          :result="getToolResult(block.id)"
          @toggle-expand="onToggleToolExpand(block.id)"
          @set-active-tab="onSetToolActiveTab(block.id, $event)"
        />
        <div v-else-if="block.type === 'text'" class="message-text">
          <MarkdownRenderer :content="block.text" />
        </div>
      </template>

      <!-- 无内容时显示打字指示器 -->
      <div v-if="contentBlocks.length === 0" class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from './MarkdownRenderer.vue'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolBlock from './ToolBlock.vue'
import type { ContentBlock, ToolResultContent } from '#claude/types'

defineProps<{
  /** 流式内容块 */
  contentBlocks: ContentBlock[]
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
</style>