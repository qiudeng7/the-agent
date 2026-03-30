<!--
  @component BaseTable
  @description 通用表格组件
  @layer base
-->
<template>
  <div class="table-wrapper">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
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
    <div v-else-if="data.length === 0" class="empty-state">
      <slot name="empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        </svg>
        <p>暂无数据</p>
      </slot>
    </div>

    <!-- Table -->
    <table v-else class="data-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :class="{ 'actions-col': col.key === 'actions' }">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="rowKey ? row[rowKey] : index">
          <td v-for="col in columns" :key="col.key" :class="{ 'actions-cell': col.key === 'actions' }">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              <span class="cell-value" :title="formatValue(row[col.key])">
                {{ formatValue(row[col.key]) }}
              </span>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  label: string
}

interface Props {
  columns: Column[]
  data: any[]
  rowKey?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

function formatValue(value: any): string {
  if (value === null) return 'NULL'
  if (value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
}

.loading-state,
.empty-state {
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

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>