<!--
  @component BaseButton
  @description 通用按钮组件
  @layer base
-->
<template>
  <button
    :class="['btn', `btn-${variant}`, `btn-${size}`, { 'btn-loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
  >
    <svg v-if="loading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
    </svg>
    <slot v-else name="icon" />
    <span><slot /></span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button'
})
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-gentle);
  font-family: var(--font-body);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.btn-sm {
  padding: 6px 14px;
  font-size: 0.8rem;
}

.btn-md {
  padding: 10px 20px;
  font-size: 0.875rem;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 0.95rem;
}

/* Variants */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: var(--shadow-lift);
}

.btn-secondary {
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-muted);
}

.btn-danger {
  background: var(--color-destructive);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  box-shadow: 0 4px 12px var(--color-destructive)/30;
}

/* Loading */
.btn-loading {
  cursor: wait;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>