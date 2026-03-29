<!--
  @component TaskQueue
  @description 任务队列组件，显示任务列表和进度
  @layer view-component
-->
<template>
  <div class="task-queue">
    <div class="queue-header">
      <h3>任务队列</h3>
      <span class="task-count">{{ tasks.length }} 个任务</span>
    </div>

    <div class="queue-list">
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        class="queue-item"
        :class="{ active: task.id === selectedTaskId }"
        @click="emit('select', task)"
      >
        <div class="item-index">{{ index + 1 }}</div>
        <div class="item-content">
          <div class="item-title">{{ task.title }}</div>
          <div class="item-status">
            <span class="status-tag" :class="statusClass(task.status)">
              {{ statusLabel(task.status) }}
            </span>
          </div>
        </div>
        <div class="item-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getTaskProgress(task.id) + '%' }"
              :class="{ complete: getTaskProgress(task.id) === 100 }"
            />
          </div>
          <span class="progress-text">{{ getTaskProgress(task.id) }}%</span>
        </div>
      </div>

      <div v-if="loading" class="queue-loading">
        <svg class="spin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
        </svg>
        <span>加载中...</span>
      </div>

      <div v-if="!loading && tasks.length === 0" class="queue-empty">
        暂无任务
      </div>

      <!-- 加载更多 -->
      <button
        v-if="hasMore && !loading"
        class="load-more"
        @click="emit('load-more')"
      >
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Task, TaskStatus } from '@/services/types'

interface Props {
  tasks: Task[]
  selectedTaskId: number | null
  taskProgress: Record<number, number>
  loading?: boolean
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: false
})

const emit = defineEmits<{
  (e: 'select', task: Task): void
  (e: 'load-more'): void
}>()

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

function statusLabel(status: TaskStatus) {
  return statusLabels[status]
}

function statusClass(status: TaskStatus) {
  return statusClasses[status]
}

function getTaskProgress(taskId: number): number {
  return props.taskProgress[taskId] ?? 0
}
</script>

<style scoped>
.task-queue {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.queue-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.queue-header h3 {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.task-count {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.queue-item {
  padding: 12px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.queue-item:hover {
  background: var(--color-muted)/30;
}

.queue-item.active {
  background: var(--color-primary)/10;
}

.item-index {
  width: 24px;
  height: 24px;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
}

.queue-item.active .item-index {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin-top: 4px;
}

.status-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 600;
}

.status-tag.warning {
  background: #f59e0b/10;
  color: #f59e0b;
}

.status-tag.info {
  background: #3b82f6/10;
  color: #3b82f6;
}

.status-tag.secondary {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.status-tag.success {
  background: #10b981/10;
  color: #10b981;
}

.status-tag.muted {
  background: var(--color-muted-foreground)/10;
  color: var(--color-muted-foreground);
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.progress-bar {
  width: 40px;
  height: 4px;
  background: var(--color-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-fill.complete {
  background: #10b981;
}

.progress-text {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  width: 28px;
  text-align: right;
}

.queue-loading,
.queue-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--color-muted-foreground);
  font-size: 0.8rem;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.load-more {
  width: 100%;
  padding: 10px;
  background: var(--color-muted)/30;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
  margin-top: 4px;
}

.load-more:hover {
  background: var(--color-muted)/50;
  color: var(--color-foreground);
}
</style>