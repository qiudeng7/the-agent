<template>
  <div class="home">
    <header class="header">
      <h1>🤖 The Agent</h1>
      <p class="subtitle">Electron + Vite + Vue Agent Application</p>
    </header>

    <main class="main">
      <div class="card">
        <h2>新建任务</h2>
        <div class="task-input">
          <input
            v-model="newTaskName"
            type="text"
            placeholder="输入任务名称..."
            @keyup.enter="createTask"
          />
          <button @click="createTask" :disabled="!newTaskName.trim()">
            创建
          </button>
        </div>
      </div>

      <div class="card">
        <h2>任务列表</h2>
        <div v-if="tasks.length === 0" class="empty-state">
          暂无任务，创建一个开始吧
        </div>
        <ul v-else class="task-list">
          <li
            v-for="task in tasks"
            :key="task.id"
            :class="['task-item', task.status]"
          >
            <div class="task-info">
              <span class="task-name">{{ task.name }}</span>
              <span class="task-status">{{ statusText(task.status) }}</span>
            </div>
            <div class="task-actions">
              <button
                v-if="task.status === 'pending'"
                @click="startTask(task.id)"
                :disabled="isRunning"
              >
                运行
              </button>
              <button
                v-if="task.status === 'running'"
                @click="completeTask(task.id)"
              >
                完成
              </button>
              <button
                v-if="task.status === 'running'"
                @click="failTask(task.id)"
                class="danger"
              >
                失败
              </button>
              <button
                @click="removeTask(task.id)"
                class="danger"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="card stats">
        <div class="stat">
          <span class="stat-value">{{ tasks.length }}</span>
          <span class="stat-label">总任务数</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ completedCount }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ runningTask ? 'Yes' : 'No' }}</span>
          <span class="stat-label">运行中</span>
        </div>
      </div>
    </main>

    <nav class="navbar">
      <router-link to="/" class="nav-link active">首页</router-link>
      <router-link to="/settings" class="nav-link">设置</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore, type AgentTask } from '@/stores/agent'

const store = useAgentStore()
const newTaskName = ref('')

const tasks = computed(() => store.tasks)
const isRunning = computed(() => store.isRunning)
const completedCount = computed(() => store.completedCount)
const runningTask = computed(() => store.runningTask)

const createTask = () => {
  if (newTaskName.value.trim()) {
    store.addTask(newTaskName.value.trim())
    newTaskName.value = ''
  }
}

const startTask = (id: string) => store.startTask(id)
const completeTask = (id: string) => store.completeTask(id)
const failTask = (id: string) => store.failTask(id)
const removeTask = (id: string) => store.removeTask(id)

const statusText = (status: AgentTask['status']) => {
  const map = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '已失败',
  }
  return map[status]
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  color: #4a9eff;
  margin-bottom: 8px;
}

.subtitle {
  color: #888;
  font-size: 1rem;
}

.main {
  flex: 1;
  overflow-y: auto;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.card {
  background: #16213e;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #4a9eff;
}

.task-input {
  display: flex;
  gap: 10px;
}

.task-input input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: #0f3460;
  color: #fff;
  font-size: 1rem;
}

.task-input input::placeholder {
  color: #666;
}

.task-input button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #4a9eff;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.task-input button:hover:not(:disabled) {
  background: #3a8eef;
}

.task-input button:disabled {
  background: #333;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px;
}

.task-list {
  list-style: none;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #0f3460;
}

.task-item.pending {
  border-left: 4px solid #ffa500;
}

.task-item.running {
  border-left: 4px solid #4a9eff;
}

.task-item.completed {
  border-left: 4px solid #4caf50;
}

.task-item.failed {
  border-left: 4px solid #f44336;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-weight: 500;
}

.task-status {
  font-size: 0.85rem;
  color: #888;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.task-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4a9eff;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.task-actions button:hover:not(:disabled) {
  background: #3a8eef;
}

.task-actions button:disabled {
  background: #333;
  cursor: not-allowed;
}

.task-actions button.danger {
  background: #e74c3c;
}

.task-actions button.danger:hover:not(:disabled) {
  background: #c0392b;
}

.stats {
  display: flex;
  justify-content: space-around;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #4a9eff;
}

.stat-label {
  font-size: 0.9rem;
  color: #888;
}

.navbar {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background: #16213e;
  border-radius: 12px;
  margin-top: auto;
}

.nav-link {
  color: #888;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: #0f3460;
}

.nav-link.active {
  color: #fff;
  background: #4a9eff;
}
</style>
