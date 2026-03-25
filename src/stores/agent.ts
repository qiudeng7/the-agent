/**
 * @module stores/agent
 * @description Agent 任务状态管理（Pinia store）。
 *              管理异步任务生命周期：pending → running → completed / failed。
 *              当前为基础结构，待后续接入实际 AI 任务调度与执行逻辑。
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AgentTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: number
  completedAt?: number
}

export const useAgentStore = defineStore('agent', () => {
  // State
  const tasks = ref<AgentTask[]>([])
  const isRunning = ref(false)
  const currentTask = ref<AgentTask | null>(null)

  // Getters
  const completedCount = computed(() =>
    tasks.value.filter(t => t.status === 'completed').length
  )

  const runningTask = computed(() =>
    tasks.value.find(t => t.status === 'running')
  )

  // Actions
  function addTask(name: string) {
    const task: AgentTask = {
      id: Date.now().toString(),
      name,
      status: 'pending',
      createdAt: Date.now(),
    }
    tasks.value.push(task)
    return task
  }

  function startTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'running'
      isRunning.value = true
      currentTask.value = task
    }
  }

  function completeTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'completed'
      task.completedAt = Date.now()
      isRunning.value = false
      currentTask.value = null
    }
  }

  function failTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'failed'
      isRunning.value = false
      currentTask.value = null
    }
  }

  function removeTask(taskId: string) {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  return {
    tasks,
    isRunning,
    currentTask,
    completedCount,
    runningTask,
    addTask,
    startTask,
    completeTask,
    failTask,
    removeTask,
  }
})
