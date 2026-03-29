<!--
  @component TaskCompletionMessage
  @description 员工端任务完成提示组件
  @layer view-component
-->
<template>
  <div class="completion-message">
    <div class="completion-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>

    <h3 class="completion-title">所有任务已完成</h3>
    <p class="completion-desc">暂无待处理的 {{ taskTypeName }} 任务</p>

    <div class="completion-actions">
      <button @click="emit('refresh')" class="action-btn primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        刷新
      </button>

      <button @click="emit('backToList')" class="action-btn secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y1="6"/>
          <line x1="8" y1="12" x2="21" y1="12"/>
          <line x1="8" y1="18" x2="21" y1="18"/>
          <line x1="3" y1="6" x2="3.01" y1="6"/>
          <line x1="3" y1="12" x2="3.01" y1="12"/>
          <line x1="3" y1="18" x2="3.01" y1="18"/>
        </svg>
        返回列表
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  taskTypeName: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'backToList'): void
}>()
</script>

<style scoped>
.completion-message {
  padding: 32px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.completion-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: #10b981/10;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
}

.completion-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.completion-desc {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
  margin-bottom: 24px;
}

.completion-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.action-btn.primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
}

.action-btn.primary:hover {
  box-shadow: var(--shadow-lift);
}

.action-btn.secondary {
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.action-btn.secondary:hover {
  background: var(--color-muted)/30;
}
</style>