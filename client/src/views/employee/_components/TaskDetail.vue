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
        <span v-if="task.tag" class="tag tag-label">{{ task.tag }}</span>
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

    <!-- Meta Information -->
    <div class="task-meta">
      <div class="meta-item">
        <span class="meta-label">创建时间</span>
        <span class="meta-value">{{ formatDate(task.createdAt) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">更新时间</span>
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
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.task-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.task-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.tag.category {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.tag.tag-label {
  background: var(--color-muted);
  color: var(--color-muted-foreground);
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
  margin-top: 16px;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  margin-bottom: 8px;
}

.description-content {
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  padding: 16px;
}

.description-content p {
  font-size: 0.875rem;
  color: var(--color-foreground);
  white-space: pre-wrap;
  line-height: 1.6;
}

.task-meta {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
}

.meta-value {
  font-size: 0.875rem;
  color: var(--color-foreground);
}
</style>