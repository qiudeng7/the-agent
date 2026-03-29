<!--
  @component EmployeeTaskCategory
  @description 员工端任务执行页面
    - 左侧固定：任务队列（不受侧栏收起影响）
    - 右侧：任务详情 Tab + Agent Tab
    - 支持任务进度追踪
  @layer view
-->
<template>
  <div class="task-category" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- Fixed Task Queue -->
    <aside class="task-queue-panel" :style="{ left: queueLeft }">
      <TaskQueue
        :tasks="tasks"
        :selected-task-id="currentTask?.id ?? null"
        :task-progress="taskProgressMap"
        :loading="loadingTasks"
        :has-more="hasMoreTasks"
        @select="selectTask"
        @load-more="loadMoreTasks"
      />
    </aside>

    <!-- Main Content -->
    <div class="task-content">
      <!-- Page Header -->
      <header class="page-header">
        <h1>{{ taskTypeConfig?.name }}</h1>
        <p v-if="taskTypeConfig?.description" class="subtitle">{{ taskTypeConfig.description }}</p>
      </header>

      <!-- Loading State -->
      <div v-if="initialLoading" class="loading-state">
        <svg class="spin-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
        </svg>
        <p>加载中...</p>
      </div>

      <!-- All Completed -->
      <TaskCompletionMessage
        v-else-if="allCompleted"
        :task-type-name="taskTypeConfig?.name || ''"
        @refresh="loadTasks"
        @back-to-list="backToList"
      />

      <!-- Task Content with Tabs -->
      <template v-else-if="currentTask">
        <!-- Success Message -->
        <div v-if="justSubmitted" class="success-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>任务已完成！</p>
        </div>

        <!-- Tabs -->
        <div class="tabs-container">
          <div class="tabs-header">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'detail' }"
              @click="activeTab = 'detail'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              任务详情
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'agent' }"
              @click="activeTab = 'agent'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Agent
            </button>
          </div>

          <div class="tabs-content">
            <!-- Detail Tab -->
            <div v-show="activeTab === 'detail'" class="tab-panel">
              <!-- Task Detail -->
              <TaskDetail :task="currentTask" />

              <!-- Task Form with Progress -->
              <div class="form-section">
                <div class="form-header">
                  <h3>完成任务</h3>
                  <div class="progress-indicator">
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{ width: progress + '%' }"
                        :class="{ complete: progress === 100 }"
                      />
                    </div>
                    <span class="progress-label">{{ progress }}%</span>
                  </div>
                </div>

                <TaskForm
                  v-if="taskTypeConfig?.requiresForm"
                  :fields="taskTypeConfig?.formFields || []"
                  v-model="currentFormData"
                  :disabled="submitting"
                  :loading="submitting"
                  @submit="handleSubmit"
                  @field-change="handleFieldChange"
                />

                <!-- Simple Submit Button -->
                <div v-else class="simple-submit">
                  <button
                    @click="handleSubmit"
                    :disabled="submitting"
                    class="submit-btn"
                  >
                    <svg v-if="submitting" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
                    </svg>
                    {{ submitting ? '提交中...' : '完成任务' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Agent Tab -->
            <div v-show="activeTab === 'agent'" class="tab-panel agent-panel">
              <TaskAgentTab :task="currentTask" />
            </div>
          </div>
        </div>
      </template>

      <!-- Not Found -->
      <div v-else class="no-task-selected">
        <p>请从左侧选择一个任务</p>
      </div>

      <!-- Task Type Not Found -->
      <div v-if="!taskTypeConfig && !initialLoading" class="not-found">
        <h2>任务类型不存在</h2>
        <p>请返回任务列表选择有效的任务类型</p>
        <button @click="backToList" class="back-btn">返回列表</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { EMPLOYEE_TASK_TYPES } from '@/config/employee-task-types'
import { useTaskProgress } from '@/composables/useTaskProgress'
import type { Task, TaskListParams, FormField } from '@/services/types'
import TaskQueue from './_components/TaskQueue.vue'
import TaskDetail from './_components/TaskDetail.vue'
import TaskForm from './_components/TaskForm.vue'
import TaskAgentTab from './_components/TaskAgentTab.vue'
import TaskCompletionMessage from './_components/TaskCompletionMessage.vue'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

// 注入侧栏状态
const sidebarCollapsed = inject<ComputedRef<boolean>>('employeeSidebarCollapsed')

// 计算任务队列的 left 位置
const queueLeft = computed(() => {
  if (sidebarCollapsed?.value) {
    return '0px'
  }
  return '220px'
})

const category = computed(() => route.params.category as string)
const taskTypeConfig = computed(() => EMPLOYEE_TASK_TYPES.find(t => t.category === category.value))

// Tab 状态
const activeTab = ref<'detail' | 'agent'>('detail')

// 任务列表状态
const tasks = ref<Task[]>([])
const currentTask = ref<Task | null>(null)
const initialLoading = ref(true)
const loadingTasks = ref(false)
const hasMoreTasks = ref(false)
const allCompleted = ref(false)

// 分页参数
const pageSize = 10
let currentPage = 1

// 表单进度追踪
const taskProgressMap = ref<Record<number, number>>({})
const taskFormStates = ref<Record<number, Record<string, any>>>({})

// 进度控制器（针对当前任务）
const fields = computed(() => taskTypeConfig.value?.formFields || [])
const {
  formData: currentFormData,
  progress,
  initialize: initProgress,
  updateField,
  markSubmitted,
  reset: resetProgress
} = useTaskProgress(fields.value)

// 提交状态
const submitting = ref(false)
const justSubmitted = ref(false)

// 加载任务列表
async function loadTasks(page: number = 1, append: boolean = false) {
  if (!category.value) return

  loadingTasks.value = true
  try {
    const filters: TaskListParams = {
      category: category.value,
      status: 'todo',
      page,
      pageSize
    }

    await taskStore.fetchTasks(filters)
    const newTasks = taskStore.tasks

    if (append) {
      tasks.value = [...tasks.value, ...newTasks]
    } else {
      tasks.value = newTasks
    }

    hasMoreTasks.value = newTasks.length === pageSize
    currentPage = page

    // 初始化进度
    newTasks.forEach(task => {
      if (taskProgressMap.value[task.id] === undefined) {
        taskProgressMap.value[task.id] = 0
      }
    })

    // 默认选中第一个任务
    if (!currentTask.value && tasks.value.length > 0) {
      selectTask(tasks.value[0])
    }

    // 检查是否全部完成
    if (tasks.value.length === 0 && page === 1) {
      allCompleted.value = true
    }
  } catch (error: any) {
    console.error('Failed to load tasks:', error)
    alert(error.message || '加载任务失败')
  } finally {
    loadingTasks.value = false
    initialLoading.value = false
  }
}

// 加载更多
function loadMoreTasks() {
  loadTasks(currentPage + 1, true)
}

// 选择任务
function selectTask(task: Task) {
  // 保存当前任务的表单状态
  if (currentTask.value) {
    taskFormStates.value[currentTask.value.id] = { ...currentFormData.value }
    taskProgressMap.value[currentTask.value.id] = progress.value
  }

  currentTask.value = task

  // 恢复新任务的表单状态
  if (taskFormStates.value[task.id]) {
    currentFormData.value = { ...taskFormStates.value[task.id] }
  } else {
    initProgress()
  }

  // 重置 tab
  activeTab.value = 'detail'
}

// 处理字段变化
function handleFieldChange(field: FormField, value: any) {
  updateField(field.name, value)

  // 更新进度映射
  if (currentTask.value) {
    taskProgressMap.value[currentTask.value.id] = progress.value
  }
}

// 提交表单
async function handleSubmit() {
  if (!currentTask.value) return

  submitting.value = true
  try {
    // 1. 构建结果数据
    const resultData = {
      type: category.value,
      submittedAt: new Date().toISOString(),
      fields: currentFormData.value
    }

    // 2. 更新任务状态
    const resultString = JSON.stringify(resultData, null, 2)
    const newDescription = currentTask.value.description
      ? `${currentTask.value.description}\n\n### 执行结果\n${resultString}`
      : resultString

    await taskStore.updateTask(currentTask.value.id, {
      status: 'done',
      description: newDescription
    })

    // 3. 标记进度为 100%
    markSubmitted()
    taskProgressMap.value[currentTask.value.id] = 100
    justSubmitted.value = true

    // 4. 延迟后移除任务并切换到下一个
    setTimeout(() => {
      // 从列表移除已完成任务
      const index = tasks.value.findIndex(t => t.id === currentTask.value?.id)
      if (index !== -1) {
        tasks.value.splice(index, 1)
      }

      // 清理状态
      delete taskFormStates.value[currentTask.value?.id as number]
      justSubmitted.value = false

      // 切换到下一个任务
      if (tasks.value.length > 0) {
        const nextIndex = Math.min(index, tasks.value.length - 1)
        selectTask(tasks.value[nextIndex])
      } else {
        // 没有更多任务，加载更多或显示完成页
        if (hasMoreTasks.value) {
          loadTasks(currentPage, false)
        } else {
          allCompleted.value = true
          currentTask.value = null
        }
      }
    }, 1000)
  } catch (error: any) {
    console.error('Submit failed:', error)
    alert(error.message || '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 返回列表
function backToList() {
  router.push('/employee/tasks')
}

// 监听路由变化
watch(category, () => {
  if (category.value && taskTypeConfig.value) {
    // 重置状态
    tasks.value = []
    currentTask.value = null
    taskProgressMap.value = {}
    taskFormStates.value = {}
    allCompleted.value = false
    initialLoading.value = true
    currentPage = 1
    activeTab.value = 'detail'

    loadTasks()
  }
}, { immediate: true })
</script>

<style scoped>
.task-category {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Fixed Task Queue */
.task-queue-panel {
  position: fixed;
  top: 32px;
  bottom: 0;
  width: 280px;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  z-index: 5;
  transition: left 0.2s ease;
  display: flex;
  flex-direction: column;
}

/* Main Content - with left margin for queue */
.task-content {
  flex: 1;
  margin-left: 280px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  align-content: flex-start;
}

.task-content > * {
  flex-shrink: 0;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-header h1 {
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

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
}

.loading-state p {
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

.success-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #10b981/10;
  border: 1px solid #10b981/20;
  border-radius: var(--radius-lg);
  color: #10b981;
}

.success-message p {
  font-size: 0.8rem;
  font-weight: 500;
}

/* Tabs */
.tabs-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.tabs-header {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-muted)/30;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.tab-btn:hover {
  color: var(--color-foreground);
}

.tab-btn.active {
  background: var(--color-background);
  color: var(--color-foreground);
  box-shadow: var(--shadow-sm);
}

.tabs-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-panel {
  min-height: 400px;
}

/* Form Section with Progress */
.form-section {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.form-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-header h3 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 80px;
  height: 6px;
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

.progress-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  min-width: 32px;
}

/* Simple Submit */
.simple-submit {
  padding: 20px;
}

.submit-btn {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.submit-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-lift);
}

.submit-btn:disabled {
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  cursor: not-allowed;
}

/* No Task Selected */
.no-task-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
  font-size: 0.875rem;
}

/* Not Found */
.not-found {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.not-found h2 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.not-found p {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
  margin-bottom: 24px;
}

.back-btn {
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

.back-btn:hover {
  box-shadow: var(--shadow-lift);
}
</style>