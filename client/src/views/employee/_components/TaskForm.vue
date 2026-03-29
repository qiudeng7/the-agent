<!--
  @component TaskForm
  @description 员工端任务表单组件
  @layer view-component
-->
<template>
  <div class="task-form">
    <form @submit.prevent="emit('submit')">
      <div class="form-fields">
        <div v-for="field in fields" :key="field.name" class="form-field">
          <label class="field-label">
            {{ field.label }}
            <span v-if="field.required" class="required">*</span>
          </label>

          <!-- Text input -->
          <input
            v-if="field.type === 'text'"
            v-model="localData[field.name]"
            type="text"
            :placeholder="field.placeholder"
            :required="field.required"
            :disabled="disabled || loading"
            class="input"
            @input="handleChange(field)"
          />

          <!-- Number input -->
          <input
            v-else-if="field.type === 'number'"
            v-model.number="localData[field.name]"
            type="number"
            :placeholder="field.placeholder"
            :required="field.required"
            :disabled="disabled || loading"
            class="input"
            @input="handleChange(field)"
          />

          <!-- Textarea -->
          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="localData[field.name]"
            :placeholder="field.placeholder"
            :required="field.required"
            :disabled="disabled || loading"
            rows="4"
            class="textarea"
            @input="handleChange(field)"
          />

          <!-- Select -->
          <select
            v-else-if="field.type === 'select'"
            v-model="localData[field.name]"
            :required="field.required"
            :disabled="disabled || loading"
            class="select"
            @change="handleChange(field)"
          >
            <option value="" disabled>{{ field.placeholder || '请选择...' }}</option>
            <option v-for="option in field.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!-- Boolean/Checkbox -->
          <div v-else-if="field.type === 'boolean'" class="checkbox-wrapper">
            <input
              v-model="localData[field.name]"
              type="checkbox"
              :disabled="disabled || loading"
              class="checkbox"
              @change="handleChange(field)"
            />
            <span class="checkbox-label">{{ field.label }}</span>
          </div>

          <!-- Date input -->
          <input
            v-else-if="field.type === 'date'"
            v-model="localData[field.name]"
            type="date"
            :required="field.required"
            :disabled="disabled || loading"
            class="input"
            @input="handleChange(field)"
          />
        </div>
      </div>

      <!-- Submit button -->
      <div class="form-actions">
        <button
          type="submit"
          :disabled="disabled || loading"
          class="submit-btn"
        >
          <svg v-if="loading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
          </svg>
          {{ loading ? '提交中...' : '提交任务' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '@/services/types'

interface Props {
  fields: FormField[]
  modelValue: Record<string, any>
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'submit'): void
  (e: 'fieldChange', field: FormField, value: any): void
}>()

const localData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function handleChange(field: FormField) {
  emit('fieldChange', field, localData.value[field.name])
}
</script>

<style scoped>
.task-form {
  padding: 20px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.required {
  color: var(--color-destructive);
  margin-left: 2px;
}

.input {
  height: 40px;
  padding: 0 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary)/20;
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.textarea {
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  color: var(--color-foreground);
  resize: none;
  transition: var(--transition-gentle);
}

.textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary)/20;
}

.textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select {
  height: 40px;
  padding: 0 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.8rem;
  color: var(--color-foreground);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary)/20;
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  accent-color: var(--color-primary);
  cursor: pointer;
}

.checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 0.8rem;
  color: var(--color-foreground);
}

.form-actions {
  margin-top: 16px;
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

.submit-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary)/20;
}

.submit-btn:disabled {
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>