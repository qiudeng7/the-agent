<!--
  @component TaskDetail
  @description 员工端任务详情组件
  @layer view-component
-->
<template>
  <div class="task-detail">
    <div class="task-header">
      <h2 class="task-title">{{ task.title }}</h2>
      <div class="task-tags">
        <span v-if="task.category" class="tag category">{{ task.category }}</span>
        <span class="tag status" :class="statusClass">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Description -->
    <div v-if="task.description" class="task-description">
      <h3 class="label">描述</h3>
      <div class="description-content">
        <p>{{ task.description }}</p>
      </div>
    </div>

    <!-- Meta Information - Horizontal Layout -->
    <div class="task-meta">
      <div class="meta-row">
        <span class="meta-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
        <span class="meta-label">创建</span>
        <span class="meta-value">{{ formatDate(task.createdAt) }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </span>
        <span class="meta-label">更新</span>
        <span class="meta-value">{{ formatDate(task.updatedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task, TaskStatus } from '@/services/types'

interface Props {
  task: Task
}

const props = defineProps<Props>()

const statusLabels: Record<TaskStatus, string> = {
  todo: '待处理',
  in_progress: '进行中',
  in_review: '审核中',
  done: '已完成',
  cancelled: '已取消'
}

const statusClasses: Record<TaskStatus, string> = {
  todo: 'warning',
  in_progress: 'info',
  in_review: 'secondary',
  done: 'success',
  cancelled: 'muted'
}

const statusLabel = computed(() => statusLabels[props.task.status])
const statusClass = computed(() => statusClasses[props.task.status])

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.task-detail {
  padding: 20px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.task-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-title {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.task-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
}

.tag.category {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.tag.status.warning {
  background: #f59e0b/10;
  color: #f59e0b;
}

.tag.status.info {
  background: #3b82f6/10;
  color: #3b82f6;
}

.tag.status.secondary {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.tag.status.success {
  background: #10b981/10;
  color: #10b981;
}

.tag.status.muted {
  background: var(--color-muted-foreground)/10;
  color: var(--color-muted-foreground);
}

.task-description {
  margin-top: 12px;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  margin-bottom: 6px;
}

.description-content {
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  padding: 12px;
}

.description-content p {
  font-size: 0.8rem;
  color: var(--color-foreground);
  white-space: pre-wrap;
  line-height: 1.5;
}

.task-meta {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-icon {
  color: var(--color-muted-foreground);
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
}

.meta-value {
  font-size: 0.75rem;
  color: var(--color-foreground);
}
</style>