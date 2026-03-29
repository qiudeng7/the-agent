<!--
  @component EmployeeTasks
  @description 员工端任务列表页面，显示分配给当前用户的任务
  @layer view
-->
<template>
  <div class="employee-tasks">
    <!-- Page Header -->
    <header class="page-header">
      <h1>我的任务</h1>
      <p class="subtitle">查看和执行分配给你的任务</p>
    </header>

    <!-- Task Types Grid -->
    <div class="task-types">
      <h2 class="section-title">任务类型</h2>
      <div class="types-grid">
        <router-link
          v-for="taskType in EMPLOYEE_TASK_TYPES"
          :key="taskType.category"
          :to="taskType.route"
          class="type-card"
        >
          <div class="type-inner">
            <div class="type-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="taskType.icon"/>
              </svg>
            </div>
            <div class="type-content">
              <h3>{{ taskType.name }}</h3>
              <p v-if="taskType.description">{{ taskType.description }}</p>
            </div>
            <div class="type-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <h2 class="section-title">所有任务</h2>
      <div class="filters-card">
        <div class="filters-grid">
          <div class="filter-item">
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
          <div class="filter-item">
            <label class="filter-label">搜索</label>
            <input
              v-model="filters.search"
              @keyup.enter="loadTasks"
              type="text"
              placeholder="搜索标题或描述"
              class="filter-input"
            />
          </div>
          <div class="filter-item">
            <button @click="loadTasks" class="search-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              搜索
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Task List -->
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

      <!-- Task Grid -->
      <div v-else class="task-grid">
        <div
          v-for="task in taskStore.tasks"
          :key="task.id"
          @click="openDetailModal(task)"
          class="task-card"
        >
          <div class="task-card-header">
            <h3 class="task-card-title">{{ task.title }}</h3>
            <span class="task-status" :class="statusClass(task.status)">
              {{ getStatusLabel(task.status) }}
            </span>
          </div>
          <p v-if="task.description" class="task-card-desc">{{ task.description }}</p>
          <div class="task-card-footer">
            <span v-if="task.category" class="task-category">{{ task.category }}</span>
            <span class="task-date">{{ task.createdAt }}</span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <p class="pagination-info">共 {{ taskStore.total }} 个任务</p>
      </div>
    </div>

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
          <div class="detail-item">
            <span class="detail-label">状态：</span>
            <span class="task-status" :class="statusClass(selectedTask.status)">
              {{ getStatusLabel(selectedTask.status) }}
            </span>
          </div>
          <div v-if="selectedTask.category" class="detail-item">
            <span class="detail-label">分类：</span>
            <span class="detail-value">{{ selectedTask.category }}</span>
          </div>
          <div v-if="selectedTask.tag" class="detail-item">
            <span class="detail-label">标签：</span>
            <span class="detail-value">{{ selectedTask.tag }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">创建时间：</span>
            <span class="detail-value">{{ selectedTask.createdAt }}</span>
          </div>
          <div v-if="selectedTask.description" class="detail-description">
            <span class="detail-label">描述：</span>
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

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.employee-tasks {
  flex: 1;
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-header h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-foreground);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-muted-foreground);
}

.section-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-foreground);
}

/* Task Types */
.task-types {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.type-card {
  display: block;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: var(--transition-gentle);
}

.type-card:hover {
  box-shadow: var(--shadow-lift);
}

.type-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.type-icon {
  width: 48px;
  height: 48px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
}

.type-content {
  flex: 1;
  min-width: 0;
}

.type-content h3 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 4px;
}

.type-content p {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  line-height: 1.4;
}

.type-arrow {
  color: var(--color-primary);
  opacity: 0;
  transition: var(--transition-gentle);
}

.type-card:hover .type-arrow {
  opacity: 1;
  transform: translateX(4px);
}

/* Filters */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filters-card {
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
}

@media (max-width: 640px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.filter-select,
.filter-input {
  height: 44px;
  padding: 0 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/20;
}

.search-btn {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.search-btn:hover {
  box-shadow: var(--shadow-lift);
}

/* Task List */
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

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 24px;
}

.task-card {
  padding: 20px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.task-card:hover {
  box-shadow: var(--shadow-lift);
  transform: translateY(-2px);
}

.task-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.task-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-foreground);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-status {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
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

.task-card-desc {
  font-size: 0.8rem;
  color: var(--color-muted-foreground);
  line-height: 1.5;
  margin-bottom: 12px;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-border)/50;
}

.task-category {
  padding: 4px 10px;
  background: var(--color-muted)/50;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.task-date {
  font-size: 0.7rem;
  color: var(--color-muted-foreground);
}

.pagination {
  padding: 16px 24px;
  background: var(--color-muted)/30;
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  font-size: 0.875rem;
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
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.modal-close {
  width: 36px;
  height: 36px;
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  width: 80px;
}

.detail-value {
  font-size: 0.875rem;
  color: var(--color-foreground);
}

.detail-description {
  margin-top: 8px;
}

.description-text {
  margin-top: 8px;
  padding: 16px;
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  color: var(--color-foreground);
  white-space: pre-wrap;
  line-height: 1.6;
}

.modal-footer {
  padding: 16px 24px;
  background: var(--color-muted)/30;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  padding: 10px 24px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.close-btn:hover {
  box-shadow: var(--shadow-lift);
}
</style>