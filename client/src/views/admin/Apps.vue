<!--
  @component AdminApps
  @description 管理端应用管理页面，数据库表管理功能
  @layer view
-->
<template>
  <div class="admin-apps">
    <!-- Page Header -->
    <header class="page-header">
      <h1>应用管理</h1>
      <p class="subtitle">查看和管理数据库表</p>
    </header>

    <!-- Tables List -->
    <div class="tables-card">
      <h2 class="section-title">数据库表</h2>
      <div class="tables-grid">
        <button
          v-for="table in tables"
          :key="table.name"
          @click="selectTable(table.name)"
          class="table-btn"
          :class="{ active: selectedTable === table.name }"
        >
          <div class="table-icon" :class="{ active: selectedTable === table.name }">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <component :is="getIconComponent(table.icon)" />
            </svg>
          </div>
          <div class="table-info">
            <span class="table-name" :class="{ active: selectedTable === table.name }">{{ table.displayName }}</span>
            <span class="table-id">{{ table.name }}</span>
          </div>
          <svg class="table-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Table Data -->
    <div class="data-card">
      <div class="data-header">
        <div class="data-title">
          <h3>{{ tables.find(t => t.name === selectedTable)?.displayName }}</h3>
          <span class="record-count">{{ tableData.length }} 条记录</span>
        </div>
        <div class="data-actions">
          <button @click="openCreateModal" class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>添加</span>
          </button>
          <button @click="fetchTableData(selectedTable)" class="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && tableData.length === 0" class="loading-state">
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

      <!-- Error -->
      <div v-else-if="error" class="error-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div class="error-text">
          <h4>加载失败</h4>
          <p>{{ error }}</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="tableData.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        </svg>
        <p>暂无数据</p>
      </div>

      <!-- Data Table -->
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column">{{ column }}</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableData" :key="index">
              <td v-for="column in columns" :key="column">
                <span class="cell-value" :title="formatValue(row[column])">
                  {{ formatValue(row[column]) }}
                </span>
              </td>
              <td class="actions-cell">
                <button @click="openEditModal(row)" class="action-btn edit" title="编辑">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="openDeleteModal(row)" class="action-btn delete" title="删除">
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
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>添加记录</h2>
        </div>
        <div class="modal-body">
          <div v-for="field in editableFields" :key="field.name" class="form-item">
            <label class="form-label">{{ field.name }}</label>
            <select v-if="field.type === 'role'" v-model="formData[field.name]" class="form-select">
              <option value="">请选择</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
            <input
              v-else-if="field.type === 'status'"
              v-model="formData[field.name]"
              type="text"
              class="form-input"
              placeholder="todo, in_progress, in_review, done, cancelled"
            >
            <input v-else v-model="formData[field.name]" :type="field.type" class="form-input">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showCreateModal = false">取消</button>
          <button type="button" class="btn-primary" @click="createRecord">创建</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>编辑记录</h2>
        </div>
        <div class="modal-body">
          <div v-for="field in editableFields" :key="field.name" class="form-item">
            <label class="form-label">{{ field.name }}</label>
            <select v-if="field.type === 'role'" v-model="formData[field.name]" class="form-select">
              <option value="">请选择</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
            <input
              v-else-if="field.type === 'status'"
              v-model="formData[field.name]"
              type="text"
              class="form-input"
              placeholder="todo, in_progress, in_review, done, cancelled"
            >
            <input v-else v-model="formData[field.name]" :type="field.type" class="form-input">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showEditModal = false">取消</button>
          <button type="button" class="btn-primary" @click="updateRecord">保存</button>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content modal-delete">
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="warning-text">
              <h3>确认删除</h3>
              <p>确定要删除这条记录吗？此操作无法撤销。</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showDeleteModal = false">取消</button>
          <button type="button" class="btn-danger" @click="deleteRecord">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import * as backend from '@/services/backend'

// 表格列表及其字段定义
const tables = ref([
  {
    name: 'users',
    displayName: '用户',
    icon: 'people',
    fields: [
      { name: 'email', type: 'email', required: true },
      { name: 'password', type: 'password', required: true },
      { name: 'role', type: 'role', required: false }
    ]
  },
  {
    name: 'tasks',
    displayName: '任务',
    icon: 'task',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text', required: false },
      { name: 'status', type: 'status', required: false },
      { name: 'category', type: 'text', required: false },
      { name: 'tag', type: 'text', required: false },
      { name: 'createdByUserId', type: 'number', required: true },
      { name: 'assignedToUserId', type: 'number', required: false }
    ]
  },
  {
    name: 'k8s_clusters',
    displayName: 'K8s 集群',
    icon: 'cloud',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'endpoint', type: 'text', required: true },
      { name: 'token', type: 'text', required: false }
    ]
  },
  {
    name: 'k8s_nodes',
    displayName: 'K8s 节点',
    icon: 'dns',
    fields: [
      { name: 'clusterId', type: 'number', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'text', required: false }
    ]
  }
])

const selectedTable = ref('users')
const tableData = ref<any[]>([])
const loading = ref(false)
const error = ref('')

// 模态框状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingRow = ref<any>(null)
const deletingRow = ref<any>(null)

// 表单数据
const formData = ref<any>({})

// 获取图标组件
function getIconComponent(iconName: string) {
  const icons: Record<string, any> = {
    people: h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
    task: h('path', { d: 'M9 11l3 3L22 4' }),
    cloud: h('path', { d: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' }),
    dns: h('path', { d: 'M4 4h16v16H4z' })
  }
  return icons[iconName] || icons.task
}

// 获取表格数据
async function fetchTableData(tableName: string) {
  loading.value = true
  error.value = ''

  try {
    const response = await backend.fetchDatabaseTable(tableName)

    if (!response.success || response.error) {
      throw new Error(response.error || '获取数据失败')
    }

    tableData.value = response.data || []
  } catch (e: any) {
    error.value = e.message || '获取数据失败'
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 切换表格
async function selectTable(tableName: string) {
  selectedTable.value = tableName
  await fetchTableData(tableName)
}

// 格式化值
function formatValue(value: any): string {
  if (value === null) return 'NULL'
  if (value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// 打开创建模态框
function openCreateModal() {
  formData.value = {}
  showCreateModal.value = true
}

// 打开编辑模态框
function openEditModal(row: any) {
  editingRow.value = row
  formData.value = { ...row }
  showEditModal.value = true
}

// 打开删除确认框
function openDeleteModal(row: any) {
  deletingRow.value = row
  showDeleteModal.value = true
}

// 创建记录
async function createRecord() {
  loading.value = true
  try {
    const response = await backend.createDatabaseRecord(selectedTable.value, formData.value)

    if (!response.success || response.error) {
      throw new Error(response.error || '创建失败')
    }

    showCreateModal.value = false
    await fetchTableData(selectedTable.value)
  } catch (e: any) {
    alert(e.message || '创建失败')
  } finally {
    loading.value = false
  }
}

// 更新记录
async function updateRecord() {
  loading.value = true
  try {
    const response = await backend.updateDatabaseRecord(selectedTable.value, editingRow.value.id, formData.value)

    if (!response.success || response.error) {
      throw new Error(response.error || '更新失败')
    }

    showEditModal.value = false
    editingRow.value = null
    await fetchTableData(selectedTable.value)
  } catch (e: any) {
    alert(e.message || '更新失败')
  } finally {
    loading.value = false
  }
}

// 删除记录
async function deleteRecord() {
  loading.value = true
  try {
    const response = await backend.deleteDatabaseRecord(selectedTable.value, deletingRow.value.id)

    if (!response.success || response.error) {
      throw new Error(response.error || '删除失败')
    }

    showDeleteModal.value = false
    deletingRow.value = null
    await fetchTableData(selectedTable.value)
  } catch (e: any) {
    alert(e.message || '删除失败')
  } finally {
    loading.value = false
  }
}

// 获取所有可编辑的字段及其类型
const editableFields = computed(() => {
  // 优先使用预定义的字段
  const tableConfig = tables.value.find(t => t.name === selectedTable.value)
  if (tableConfig && tableConfig.fields) {
    return tableConfig.fields
  }

  // 如果没有预定义，尝试从数据推断
  if (tableData.value.length === 0 || !tableData.value[0]) return []
  const row = tableData.value[0]
  const readonlyFields = ['id', 'createdAt', 'deletedAt', 'updatedAt']

  return Object.keys(row)
    .filter(col => !readonlyFields.includes(col))
    .map(col => {
      const value = row[col]
      let fieldType = 'text'

      if (typeof value === 'number') fieldType = 'number'
      else if (col.includes('password')) fieldType = 'password'
      else if (col.includes('email')) fieldType = 'email'
      else if (col.includes('role')) fieldType = 'role'
      else if (col.includes('status')) fieldType = 'status'

      return { name: col, type: fieldType }
    })
})

// 获取表头
const columns = computed(() => {
  if (tableData.value.length === 0 || !tableData.value[0]) return []
  return Object.keys(tableData.value[0])
})

// 初始加载
onMounted(() => {
  fetchTableData(selectedTable.value)
})
</script>

<style scoped>
.admin-apps {
  flex: 1;
  padding: 40px;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Page Header */
.page-header h1 {
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

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-secondary:hover {
  background: var(--color-muted);
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  background: var(--color-destructive);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.btn-danger:hover {
  box-shadow: 0 4px 12px var(--color-destructive)/30;
}

/* Tables Card */
.tables-card {
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.section-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
  margin-bottom: 16px;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .tables-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.table-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
}

.table-btn:hover {
  background: var(--color-muted)/30;
}

.table-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary)/5;
}

.table-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
}

.table-icon.active {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.table-info {
  flex: 1;
  min-width: 0;
}

.table-name {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-foreground);
}

.table-name.active {
  color: var(--color-primary);
}

.table-id {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.table-arrow {
  color: var(--color-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.table-btn:hover .table-arrow {
  opacity: 1;
}

/* Data Card */
.data-card {
  flex: 1;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
}

.data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.data-title h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.record-count {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
  margin-top: 4px;
}

.data-actions {
  display: flex;
  gap: 12px;
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

.error-state {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
  margin: 24px;
  background: var(--color-destructive)/10;
  border: 1px solid var(--color-destructive)/20;
  border-radius: var(--radius-lg);
  color: var(--color-destructive);
}

.error-text h4 {
  font-weight: 600;
  margin-bottom: 4px;
}

.error-text p {
  font-size: 0.875rem;
  opacity: 0.8;
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
  padding: 12px 16px;
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
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--color-foreground);
  border-bottom: 1px solid var(--color-border)/50;
}

.data-table tr:hover td {
  background: var(--color-muted)/30;
}

.cell-value {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background)/80;
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lift);
}

.modal-header {
  padding: 24px 32px 16px;
}

.modal-header h2 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.modal-body {
  padding: 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.modal-footer {
  padding: 16px 32px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--color-muted)/30;
}

/* Delete Modal */
.modal-delete .modal-body {
  padding: 24px 32px;
}

.delete-warning {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.warning-icon {
  width: 48px;
  height: 48px;
  background: var(--color-destructive)/10;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-destructive);
  flex-shrink: 0;
}

.warning-text h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.warning-text p {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
}
</style>