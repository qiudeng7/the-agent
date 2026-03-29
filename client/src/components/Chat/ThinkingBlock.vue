<!--
  @component ThinkingBlock
  @description 思考内容块组件，展示 AI 的思考过程。
               支持折叠/展开，显示字数和耗时统计。
  @layer component
-->
<template>
  <div class="thinking-block" :class="{ collapsed }">
    <div class="thinking-header" @click="$emit('toggle')">
      <div class="thinking-header-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>{{ isStreaming ? '思考中...' : '思考过程' }}</span>
      </div>
      <div class="thinking-header-right">
        <span class="thinking-stats">{{ statsText }}</span>
        <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
    <div class="thinking-content" v-show="!collapsed">
      <p class="thinking-text">{{ thinking }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ThinkingContent } from '#claude/types'

const props = defineProps<{
  /** 思考内容块 */
  block: ThinkingContent
  /** 是否折叠 */
  collapsed: boolean
  /** 是否流式生成中 */
  isStreaming?: boolean
}>()

defineEmits<{
  /** 切换折叠状态 */
  toggle: []
}>()

/** 思考内容 */
const thinking = computed(() => props.block.thinking)

/** 统计信息文本 */
const statsText = computed(() => {
  const parts: string[] = []

  // 字数
  const charCount = props.block.thinking.length
  parts.push(`${charCount} 字`)

  // 耗时（仅非流式时显示）
  if (!props.isStreaming && props.block.durationMs) {
    const duration = props.block.durationMs
    if (duration < 1000) {
      parts.push(`${duration} ms`)
    } else {
      parts.push(`${(duration / 1000).toFixed(1)} s`)
    }
  }

  return parts.join(' · ')
})
</script>

<style scoped>
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
</style>