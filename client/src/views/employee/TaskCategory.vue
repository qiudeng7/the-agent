<!--
  @component EmployeeTaskCategory
  @description 员工端任务执行页面，根据任务类型显示表单或简单提交按钮
  @layer view
-->
<template>
  <div class="task-category">
    <!-- Page Header -->
    <header class="page-header">
      <h1>{{ taskTypeConfig?.name }}</h1>
      <p v-if="taskTypeConfig?.description" class="subtitle">{{ taskTypeConfig.description }}</p>
    </header>

    <!-- Loading -->
    <div v-if="loading && !currentTask" class="loading-state">
      <svg class="spin-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
      </svg>
      <p>加载中...</p>
    </div>

    <!-- All Completed -->
    <TaskCompletionMessage
      v-else-if="allCompleted"
      :task-type-name="taskTypeConfig?.name || ''"
      @refresh="loadCurrentTask"
      @back-to-list="backToList"
    />

    <!-- Task and Form -->
    <div v-else-if="currentTask" class="task-content">
      <!-- Success Message -->
      <div v-if="submitted" class="success-message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p>任务已完成！正在加载下一个任务...</p>
      </div>

      <!-- Task Detail -->
      <TaskDetail :task="currentTask" />

      <!-- Task Form -->
      <TaskForm
        v-if="taskTypeConfig?.requiresForm"
        :fields="taskTypeConfig?.formFields || []"
        v-model="formData"
        :disabled="submitted"
        :loading="loading || submitted"
        @submit="handleSubmit"
      />

      <!-- Simple Submit Button -->
      <div v-else class="simple-submit">
        <button
          @click="handleSubmit"
          :disabled="loading || submitted"
          class="submit-btn"
        >
          <svg v-if="submitted || loading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
          </svg>
          {{ submitted ? '已完成' : '完成任务' }}
        </button>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!taskTypeConfig" class="not-found">
      <h2>任务类型不存在</h2>
      <p>请返回任务列表选择有效的任务类型</p>
      <button @click="backToList" class="back-btn">返回列表</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { EMPLOYEE_TASK_TYPES } from '@/config/employee-task-types'
import type { Task, TaskListParams } from '@/services/types'
import TaskDetail from './_components/TaskDetail.vue'
import TaskForm from './_components/TaskForm.vue'
import TaskCompletionMessage from './_components/TaskCompletionMessage.vue'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const category = computed(() => route.params.category as string)
const taskTypeConfig = computed(() => EMPLOYEE_TASK_TYPES.find(t => t.category === category.value))

const currentTask = ref<Task | null>(null)
const formData = ref<Record<string, any>>({})
const loading = ref(false)
const submitted = ref(false)
const allCompleted = ref(false)

// 加载当前任务
async function loadCurrentTask() {
  if (!category.value) return

  loading.value = true
  try {
    const filters: TaskListParams = {
      category: category.value,
      status: 'todo',
      page: 1,
      pageSize: 1
    }

    await taskStore.fetchTasks(filters)

    if (taskStore.tasks.length > 0 && taskStore.tasks[0]) {
      currentTask.value = taskStore.tasks[0]
      initializeFormData()
    } else {
      allCompleted.value = true
      currentTask.value = null
    }
  } catch (error: any) {
    console.error('Failed to load task:', error)
    alert(error.message || '加载任务失败')
  } finally {
    loading.value = false
  }
}

// 初始化表单数据
function initializeFormData() {
  const config = taskTypeConfig.value
  if (!config?.formFields) return

  formData.value = {}
  config.formFields.forEach((field) => {
    formData.value[field.name] = field.defaultValue ?? getDefaultValueByType(field.type)
  })
}

function getDefaultValueByType(type: string) {
  switch (type) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'date':
      return new Date().toISOString().split('T')[0]
    default:
      return ''
  }
}

// 提交表单
async function handleSubmit() {
  if (!currentTask.value) return

  loading.value = true
  try {
    // 1. 构建结果数据
    const resultData = {
      type: category.value,
      submittedAt: new Date().toISOString(),
      fields: formData.value
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

    // 3. 标记为已提交
    submitted.value = true

    // 4. 延迟后加载下一个任务
    setTimeout(async () => {
      submitted.value = false
      await loadCurrentTask()
    }, 1500)
  } catch (error: any) {
    console.error('Submit failed:', error)
    alert(error.message || '提交失败，请重试')
  } finally {
    loading.value = false
  }
}

// 返回列表
function backToList() {
  router.push('/employee/tasks')
}

onMounted(() => {
  loadCurrentTask()
})
</script>

<style scoped>
.task-category {
  flex: 1;
  padding: 40px;
  max-width: 1000px;
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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
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

.task-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #10b981/10;
  border: 1px solid #10b981/20;
  border-radius: var(--radius-lg);
  color: #10b981;
}

.success-message p {
  font-size: 0.875rem;
  font-weight: 500;
}

.simple-submit {
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.submit-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
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

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
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