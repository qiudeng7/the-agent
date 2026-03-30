<!--
  @component BaseStatusBadge
  @description 状态徽章组件
  @layer base
-->
<template>
  <span class="status-badge" :class="badgeClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type StatusType = 'task' | 'user'

interface Props {
  status: string
  type?: StatusType
}

const props = withDefaults(defineProps<Props>(), {
  type: 'task'
})

// 任务状态映射
const taskStatusMap: Record<string, { label: string; class: string }> = {
  todo: { label: '待办', class: 'warning' },
  in_progress: { label: '进行中', class: 'info' },
  in_review: { label: '审核中', class: 'secondary' },
  done: { label: '已完成', class: 'success' },
  cancelled: { label: '已取消', class: 'muted' }
}

// 用户角色映射
const userRoleMap: Record<string, { label: string; class: string }> = {
  admin: { label: 'Admin', class: 'primary' },
  employee: { label: 'Employee', class: 'secondary' }
}

const statusMap = computed(() => {
  return props.type === 'task' ? taskStatusMap : userRoleMap
})

const label = computed(() => {
  return statusMap.value[props.status]?.label ?? props.status
})

const badgeClass = computed(() => {
  return statusMap.value[props.status]?.class ?? 'muted'
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
}

/* Status classes */
.warning {
  background: #f59e0b/10;
  color: #f59e0b;
}

.info {
  background: #3b82f6/10;
  color: #3b82f6;
}

.secondary {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.success {
  background: #10b981/10;
  color: #10b981;
}

.muted {
  background: var(--color-muted-foreground)/10;
  color: var(--color-muted-foreground);
}

.primary {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}
</style>