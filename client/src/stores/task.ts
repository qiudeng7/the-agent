/**
 * @module stores/task
 * @description 任务状态管理（Pinia store）。
 *              管理任务列表、当前任务、统计数据。
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as backend from '@/services/backend'
import type { Task, TaskListParams, TaskStats } from '@/services/types'

export const useTaskStore = defineStore('task', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const stats = ref<TaskStats | null>(null)
  const loading = ref(false)
  const total = ref(0)

  // ── Getters ────────────────────────────────────────────────────────────────

  /** 任务总数 */
  const taskCount = computed(() => tasks.value.length)

  /** 是否有当前任务 */
  const hasCurrentTask = computed(() => currentTask.value !== null)

  /** 按状态分组的任务 */
  const tasksByStatus = computed(() => {
    const result: Record<string, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    }
    for (const task of tasks.value) {
      const status = task.status || 'pending'
      if (result[status]) {
        result[status].push(task)
      }
    }
    return result
  })

  /** 按类别分组的任务 */
  const tasksByCategory = computed(() => {
    const result: Record<string, Task[]> = {}
    for (const task of tasks.value) {
      const category = task.category || 'default'
      if (!result[category]) {
        result[category] = []
      }
      result[category].push(task)
    }
    return result
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  /** 获取任务列表 */
  async function fetchTasks(params: TaskListParams = {}) {
    loading.value = true
    try {
      const response = await backend.fetchTasks(params)

      if (!response.success) {
        throw new Error('获取任务列表失败')
      }

      if (!response.data) throw new Error('Invalid response')

      tasks.value = response.data.tasks
      total.value = response.data.total

      return response.data
    } finally {
      loading.value = false
    }
  }

  /** 获取单个任务 */
  async function fetchTask(id: number) {
    loading.value = true
    try {
      const response = await backend.fetchTask(id)

      if (!response.success) {
        throw new Error('获取任务详情失败')
      }

      if (!response.data) throw new Error('Invalid response')

      currentTask.value = response.data.task

      return response.data.task
    } finally {
      loading.value = false
    }
  }

  /** 创建任务 */
  async function createTask(taskData: {
    title: string
    category?: string
    tag?: string
    description?: string
    assignedToUserId?: string
  }) {
    try {
      const response = await backend.createTask(taskData)

      if (!response.success) {
        throw new Error('创建任务失败')
      }

      if (!response.data) throw new Error('Invalid response')

      tasks.value.unshift(response.data.task)

      return response.data.task
    } finally {
      // 不改变 loading，因为列表页面有自己的 loading
    }
  }

  /** 更新任务 */
  async function updateTask(
    id: number,
    taskData: {
      title?: string
      category?: string
      tag?: string
      description?: string
      status?: string
      assignedToUserId?: string | null
    },
  ) {
    try {
      const response = await backend.updateTask(id, taskData)

      if (!response.success) {
        throw new Error('更新任务失败')
      }

      if (!response.data) throw new Error('Invalid response')

      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = response.data.task
      }
      if (currentTask.value?.id === id) {
        currentTask.value = response.data.task
      }

      return response.data.task
    } finally {
      // 不改变 loading
    }
  }

  /** 删除任务 */
  async function deleteTask(id: number) {
    try {
      const response = await backend.deleteTask(id)

      if (!response.success) {
        throw new Error('删除任务失败')
      }

      tasks.value = tasks.value.filter(t => t.id !== id)
      if (currentTask.value?.id === id) {
        currentTask.value = null
      }
    } finally {
      // 不改变 loading
    }
  }

  /** 获取任务统计 */
  async function fetchStats() {
    try {
      const response = await backend.fetchTaskStats()

      if (!response.success) {
        throw new Error('获取统计数据失败')
      }

      if (!response.data) throw new Error('Invalid response')

      stats.value = response.data

      return response.data
    } finally {
      // 不改变 loading
    }
  }

  return {
    // State
    tasks,
    currentTask,
    stats,
    loading,
    total,
    // Getters
    taskCount,
    hasCurrentTask,
    tasksByStatus,
    tasksByCategory,
    // Actions
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    fetchStats,
  }
})