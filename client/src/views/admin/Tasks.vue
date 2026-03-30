<!--
  @component AdminTasks
  @description 管理端任务管理页面，包含筛选、列表、创建/编辑/删除功能
  @layer view
-->
<template>
  <div class="admin-tasks">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1>任务管理</h1>
        <p class="subtitle">创建、编辑和管理所有任务</p>
      </div>
      <button class="btn-primary" @click="showCreateModal = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>新建任务</span>
      </button>
    </header>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <div class="filter-item">
          <label class="filter-label">状态</label>
          <select v-model="filters.status" @change="loadTasks" class="filter-select">
            <option value="">全部状态</option>
            <option value="todo">待办</option>
            <option value="in_progress">进行中</option>
            <option value="in_review">审核中</option>
            <option value="done">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="filter-label">分类</label>
          <input
            v-model="filters.category"
            @keyup.enter="loadTasks"
            type="text"
            placeholder="输入分类"
            class="filter-input"
          >
        </div>
        <div class="filter-item">
          <label class="filter-label">搜索</label>
          <input
            v-model="filters.search"
            @keyup.enter="loadTasks"
            type="text"
            placeholder="搜索标题或描述"
            class="filter-input"
          >
        </div>
        <div class="filter-item filter-button">
          <button @click="loadTasks" class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>搜索</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="list-card">
      <!-- Loading -->
      <div v-if="taskStore.loading" class="loading-state">
        <svg class="spin-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        <p>加载中...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="taskStore.tasks.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <p>暂无任务</p>
      </div>

      <!-- Table -->
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>分类</th>
              <th>创建时间</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in taskStore.tasks" :key="task.id">
              <td class="title-cell">
                <div class="task-title">{{ task.title }}</div>
                <div v-if="task.description" class="task-desc">{{ task.description }}</div>
              </td>
              <td>
                <BaseStatusBadge :status="task.status" />
              </td>
              <td>
                <span v-if="task.category" class="category-tag">{{ task.category }}</span>
                <span v-else class="empty-text">-</span>
              </td>
              <td class="date-cell">{{ formatDate(task.createdAt) }}</td>
              <td class="actions-cell">
                <button @click="openEditModal(task)" class="action-btn edit" title="编辑">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="handleDeleteTask(task.id)" class="action-btn delete" title="删除">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Info -->
      <div class="pagination-footer">
        <span class="total-info">共 {{ taskStore.total }} 条任务</span>
      </div>
    </div>

    <!-- Create Task Modal -->
    <BaseModal :show="showCreateModal" title="新建任务" @close="showCreateModal = false">
      <div class="form-item">
        <label class="form-label required">标题</label>
        <input v-model="newTask.title" required type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">分类</label>
        <input v-model="newTask.category" type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">标签</label>
        <input v-model="newTask.tag" type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">分配给</label>
        <select v-model="newTask.assignedToUserId" class="form-select">
          <option :value="null">未分配</option>
          <option v-for="employee in employees" :key="employee.id" :value="employee.id">
            {{ employee.email }} ({{ employee.role === 'admin' ? 'Admin' : 'Employee' }})
          </option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-label">描述</label>
        <textarea v-model="newTask.description" rows="3" class="form-textarea"></textarea>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">取消</BaseButton>
        <BaseButton type="submit" @click="handleCreateTask">创建</BaseButton>
      </template>
    </BaseModal>

    <!-- Edit Task Modal -->
    <BaseModal :show="showEditModal && selectedTask !== null" title="编辑任务" @close="showEditModal = false">
      <div class="form-item">
        <label class="form-label">标题</label>
        <input v-model="selectedTask.title" type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">分类</label>
        <input v-model="selectedTask.category" type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">标签</label>
        <input v-model="selectedTask.tag" type="text" class="form-input">
      </div>
      <div class="form-item">
        <label class="form-label">分配给</label>
        <select v-model="selectedTask.assignedToUserId" class="form-select">
          <option :value="null">未分配</option>
          <option v-for="employee in employees" :key="employee.id" :value="employee.id">
            {{ employee.email }} ({{ employee.role === 'admin' ? 'Admin' : 'Employee' }})
          </option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-label">状态</label>
        <select v-model="selectedTask.status" class="form-select">
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="in_review">审核中</option>
          <option value="done">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-label">描述</label>
        <textarea v-model="selectedTask.description" rows="3" class="form-textarea"></textarea>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">取消</BaseButton>
        <BaseButton @click="handleUpdateTask">保存</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useAuthStore } from '@/stores/auth'
import * as backend from '@/services/backend'
import type { Task, TaskListParams, User } from '@/services/types'
import { BaseModal, BaseButton, BaseStatusBadge } from '@/components/base'

const taskStore = useTaskStore()
const authStore = useAuthStore()

const filters = reactive<TaskListParams>({
  page: 1,
  pageSize: 10,
  status: undefined,
  category: '',
  search: ''
})

const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedTask = ref<Task | null>(null)
const employees = ref<User[]>([])

const newTask = reactive({
  title: '',
  category: '',
  tag: '',
  description: '',
  assignedToUserId: null as number | null
})

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

async function fetchEmployees() {
  try {
    const response = await backend.fetchDatabaseTable('users')
    if (response.success && response.data) {
      employees.value = response.data.filter((u: any) => u.role === 'employee' || u.role === 'admin')
    }
  } catch (e) {
    console.error('Failed to fetch employees:', e)
  }
}

async function loadTasks() {
  await taskStore.fetchTasks(filters)
}

async function handleCreateTask() {
  try {
    await taskStore.createTask({
      ...newTask,
      createdByUserId: Number(authStore.user?.id) || 0
    })
    showCreateModal.value = false
    Object.assign(newTask, {
      title: '',
      category: '',
      tag: '',
      description: '',
      assignedToUserId: null
    })
    await loadTasks()
  } catch (e: any) {
    alert(e.message || '创建任务失败')
  }
}

async function handleUpdateTask() {
  if (!selectedTask.value) return

  try {
    await taskStore.updateTask(selectedTask.value.id, {
      title: selectedTask.value.title,
      category: selectedTask.value.category,
      tag: selectedTask.value.tag,
      description: selectedTask.value.description,
      status: selectedTask.value.status,
      assignedToUserId: selectedTask.value.assignedToUserId
    })
    showEditModal.value = false
    selectedTask.value = null
    await loadTasks()
  } catch (e: any) {
    alert(e.message || '更新任务失败')
  }
}

async function handleDeleteTask(taskId: number) {
  if (!confirm('确定要删除这个任务吗？')) return

  try {
    await taskStore.deleteTask(taskId)
    await loadTasks()
  } catch (e: any) {
    alert(e.message || '删除任务失败')
  }
}

function openEditModal(task: Task) {
  selectedTask.value = { ...task }
  showEditModal.value = true
}

onMounted(() => {
  fetchEmployees()
  loadTasks()
})
</script>

<style scoped>
.admin-tasks {
  flex: 1;
  padding: 40px;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-content h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-foreground);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-muted-foreground);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.btn-primary:hover {
  box-shadow: var(--shadow-lift);
}

/* Filters Card */
.filters-card {
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-button {
  align-items: flex-end;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.filter-input,
.filter-select {
  height: 44px;
  padding: 0 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  color: var(--color-foreground);
  outline: none;
  transition: border-color 0.2s ease;
}

.filter-input:focus,
.filter-select:focus {
  border-color: var(--color-primary);
}

/* List Card */
.list-card {
  flex: 1;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-muted-foreground);
  padding: 48px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 16px 24px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.data-table th.actions-col {
  text-align: right;
}

.data-table td {
  padding: 16px 24px;
  font-size: 0.875rem;
  color: var(--color-foreground);
  border-bottom: 1px solid var(--color-border)/50;
}

.data-table tr:hover td {
  background: var(--color-muted)/30;
}

.title-cell {
  max-width: 300px;
}

.task-title {
  font-weight: 600;
  color: var(--color-foreground);
}

.task-desc {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-tag {
  display: inline-flex;
  padding: 2px 10px;
  background: var(--color-muted)/50;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.empty-text {
  color: var(--color-muted-foreground);
}

.date-cell {
  color: var(--color-muted-foreground);
}

/* Actions */
.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn.edit {
  color: var(--color-primary);
}

.action-btn.edit:hover {
  background: var(--color-primary)/10;
}

.action-btn.delete {
  color: var(--color-destructive);
}

.action-btn.delete:hover {
  background: var(--color-destructive)/10;
}

/* Pagination Footer */
.pagination-footer {
  padding: 16px 24px;
  background: var(--color-muted)/30;
  border-top: 1px solid var(--color-border);
}

.total-info {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
}

/* Form */
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.form-label.required::after {
  content: '*';
  color: var(--color-destructive);
  margin-left: 4px;
}

.form-input,
.form-select {
  height: 48px;
  padding: 0 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  color: var(--color-foreground);
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--color-primary);
}

.form-textarea {
  padding: 16px 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  color: var(--color-foreground);
  outline: none;
  resize: none;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  border-color: var(--color-primary);
}
</style>