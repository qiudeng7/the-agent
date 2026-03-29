<!--
  @component EmployeeTasks
  @description 员工端任务列表页面，显示分配给当前用户的任务
  @layer view
-->
<template>
  <div class="employee-tasks">
    <!-- Left Sidebar: Task Types + Filters -->
    <aside class="sidebar">
      <!-- Task Types -->
      <div class="task-types">
        <h2 class="sidebar-title">任务类型</h2>
        <div class="types-list">
          <router-link
            v-for="taskType in EMPLOYEE_TASK_TYPES"
            :key="taskType.category"
            :to="taskType.route"
            class="type-item"
          >
            <div class="type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="taskType.icon"/>
              </svg>
            </div>
            <div class="type-info">
              <span class="type-name">{{ taskType.name }}</span>
              <span v-if="taskType.description" class="type-desc">{{ taskType.description }}</span>
            </div>
            <svg class="type-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <h2 class="sidebar-title">筛选条件</h2>
        <div class="filters-form">
          <div class="filter-group">
            <label class="filter-label">状态</label>
            <select
              v-model="filters.status"
              @change="loadTasks"
              class="filter-select"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value || undefined">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">搜索</label>
            <input
              v-model="filters.search"
              @keyup.enter="loadTasks"
              type="text"
              placeholder="搜索标题..."
              class="filter-input"
            />
          </div>
          <button @click="loadTasks" class="search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            搜索
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content: Task List -->
    <main class="main-content">
      <header class="content-header">
        <h1>我的任务</h1>
        <p class="subtitle">共 {{ taskStore.total }} 个任务</p>
      </header>

      <!-- Task List Card -->
      <div class="task-list-card">
        <!-- Loading -->
        <div v-if="taskStore.loading" class="loading-state">
          <svg class="spin-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
          </svg>
          <p>加载中...</p>
        </div>

        <!-- Empty -->
        <div v-else-if="taskStore.tasks.length === 0" class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <p>暂无任务</p>
        </div>

        <!-- Task List -->
        <div v-else class="task-list">
          <div
            v-for="task in taskStore.tasks"
            :key="task.id"
            @click="openDetailModal(task)"
            class="task-row"
          >
            <div class="task-main">
              <h3 class="task-title">{{ task.title }}</h3>
              <p v-if="task.description" class="task-desc">{{ task.description }}</p>
            </div>
            <div class="task-side">
              <span class="task-status" :class="statusClass(task.status)">
                {{ getStatusLabel(task.status) }}
              </span>
              <span v-if="task.category" class="task-category">{{ task.category }}</span>
            </div>
            <div class="task-meta">
              <span class="task-date">{{ formatDate(task.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Task Detail Modal -->
    <div v-if="showDetailModal && selectedTask" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ selectedTask.title }}</h3>
          <button class="modal-close" @click="closeDetailModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="detail-label">状态</span>
            <span class="task-status" :class="statusClass(selectedTask.status)">
              {{ getStatusLabel(selectedTask.status) }}
            </span>
          </div>
          <div v-if="selectedTask.category" class="detail-row">
            <span class="detail-label">分类</span>
            <span class="detail-value">{{ selectedTask.category }}</span>
          </div>
          <div v-if="selectedTask.tag" class="detail-row">
            <span class="detail-label">标签</span>
            <span class="detail-value">{{ selectedTask.tag }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建时间</span>
            <span class="detail-value">{{ formatDate(selectedTask.createdAt) }}</span>
          </div>
          <div v-if="selectedTask.description" class="detail-description">
            <span class="detail-label">描述</span>
            <p class="description-text">{{ selectedTask.description }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="close-btn" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { EMPLOYEE_TASK_TYPES } from '@/config/employee-task-types'
import type { Task, TaskStatus, TaskListParams } from '@/services/types'

const taskStore = useTaskStore()

const filters = reactive<TaskListParams>({
  page: 1,
  pageSize: 10,
  status: undefined,
  search: ''
})

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'in_review', label: '审核中' },
  { value: 'done', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const selectedTask = ref<Task | null>(null)
const showDetailModal = ref(false)

async function loadTasks() {
  await taskStore.fetchTasks(filters)
}

function openDetailModal(task: Task) {
  selectedTask.value = task
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedTask.value = null
}

function getStatusLabel(status: TaskStatus) {
  return statusOptions.find(s => s.value === status)?.label || status
}

function statusClass(status: TaskStatus) {
  const classes: Record<TaskStatus, string> = {
    todo: 'warning',
    in_progress: 'info',
    in_review: 'secondary',
    done: 'success',
    cancelled: 'muted'
  }
  return classes[status] || 'muted'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.employee-tasks {
  flex: 1;
  padding: 32px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .employee-tasks {
    grid-template-columns: 1fr;
  }
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-title {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  margin-bottom: 12px;
}

/* Task Types */
.task-types {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.types-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: var(--transition-gentle);
}

.type-item:hover {
  background: var(--color-primary)/10;
}

.type-icon {
  width: 36px;
  height: 36px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.type-desc {
  display: block;
  font-size: 0.7rem;
  color: var(--color-muted-foreground);
  margin-top: 2px;
}

.type-arrow {
  color: var(--color-muted-foreground);
  opacity: 0;
  transition: var(--transition-gentle);
}

.type-item:hover .type-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* Filters */
.filters-section {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.filters-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
}

.filter-select,
.filter-input {
  height: 36px;
  padding: 0 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary)/20;
}

.search-btn {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.search-btn:hover {
  box-shadow: var(--shadow-lift);
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.content-header h1 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-foreground);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
}

/* Task List Card */
.task-list-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-muted-foreground);
}

.loading-state p,
.empty-state p {
  margin-top: 16px;
  font-size: 0.875rem;
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Task List (Table-like rows) */
.task-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border)/50;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.task-row:last-child {
  border-bottom: none;
}

.task-row:hover {
  background: var(--color-muted)/30;
}

.task-main {
  min-width: 0;
}

.task-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 4px;
}

.task-desc {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-status {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
}

.task-status.warning {
  background: #f59e0b/10;
  color: #f59e0b;
}

.task-status.info {
  background: #3b82f6/10;
  color: #3b82f6;
}

.task-status.secondary {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.task-status.success {
  background: #10b981/10;
  color: #10b981;
}

.task-status.muted {
  background: var(--color-muted-foreground)/10;
  color: var(--color-muted-foreground);
}

.task-category {
  padding: 4px 10px;
  background: var(--color-muted)/50;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.task-meta {
  text-align: right;
}

.task-date {
  font-size: 0.7rem;
  color: var(--color-muted-foreground);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background)/80;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lift);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-muted);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.modal-close:hover {
  background: var(--color-muted-foreground)/20;
  color: var(--color-foreground);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  width: 70px;
}

.detail-value {
  font-size: 0.8rem;
  color: var(--color-foreground);
}

.detail-description {
  margin-top: 8px;
}

.description-text {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  color: var(--color-foreground);
  white-space: pre-wrap;
  line-height: 1.5;
}

.modal-footer {
  padding: 12px 20px;
  background: var(--color-muted)/30;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  padding: 8px 20px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.close-btn:hover {
  box-shadow: var(--shadow-lift);
}
</style>