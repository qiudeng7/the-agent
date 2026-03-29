<!--
  @component ToolBlock
  @description 工具调用块组件，展示 AI 调用的工具及其结果。
               支持展开/折叠，Tab 切换查看参数和结果。
  @layer component
-->
<template>
  <div class="tool-block" :class="{ expanded, error: status === 'error' }">
    <div class="tool-header" @click="$emit('toggleExpand')">
      <div class="tool-header-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <span class="tool-name">{{ name }}</span>
        <span v-if="inputSummary" class="tool-summary">{{ inputSummary }}</span>
        <span class="tool-status" :class="status">{{ statusText }}</span>
      </div>
      <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <div class="tool-detail" v-show="expanded">
      <!-- Tab 切换 -->
      <div class="tool-tabs">
        <button
          class="tool-tab"
          :class="{ active: activeTab === 'input' }"
          @click.stop="$emit('setActiveTab', 'input')"
        >
          参数
        </button>
        <button
          v-if="result"
          class="tool-tab"
          :class="{ active: activeTab === 'result' }"
          @click.stop="$emit('setActiveTab', 'result')"
        >
          结果
        </button>
      </div>
      <!-- Tab 内容 -->
      <div class="tool-tab-content">
        <pre v-if="activeTab === 'input'">{{ inputDetail }}</pre>
        <pre v-else-if="result">{{ result }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ToolUseContent, ToolResultContent } from '#claude/types'

const props = defineProps<{
  /** 工具调用内容块 */
  block: ToolUseContent
  /** 是否展开 */
  expanded: boolean
  /** 激活的 Tab */
  activeTab: 'input' | 'result'
  /** 执行状态 */
  status: 'pending' | 'running' | 'done' | 'error'
  /** 工具结果（可选） */
  result?: ToolResultContent
}>()

defineEmits<{
  /** 切换展开状态 */
  toggleExpand: []
  /** 设置激活的 Tab */
  setActiveTab: [tab: 'input' | 'result']
}>()

/** 工具名称 */
const name = computed(() => props.block.name)

/** 输入参数 */
const input = computed(() => props.block.input)

/** 输入参数缩略显示 */
const inputSummary = computed(() => {
  const keys = Object.keys(input.value)
  if (keys.length === 0) return ''

  const firstKey = keys[0]
  const value = input.value[firstKey]

  if (typeof value === 'string') {
    return value.length > 50 ? value.slice(0, 50) + '...' : value
  }

  return `${keys.length} 个参数`
})

/** 输入参数详情 */
const inputDetail = computed(() => JSON.stringify(input.value, null, 2))

/** 状态文本 */
const statusText = computed(() => {
  switch (props.status) {
    case 'pending': return '等待中'
    case 'running': return '执行中...'
    case 'done': return '已完成'
    case 'error': return '失败'
  }
})
</script>

<style scoped>
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
</style>