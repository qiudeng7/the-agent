/**
 * @module composables/useTaskProgress
 * @description 任务进度控制器
 *
 * 根据表单填写完成度计算任务进度：
 * - 只计算用户手动修改过的字段
 * - 有默认值的字段如果用户没改过不算入进度
 * - 提交成功后显示 100%
 *
 * @layer composables
 */
import { ref, computed, watch } from 'vue'
import type { FormField } from '@/services/types'

export function useTaskProgress(fields: FormField[]) {
  // 原始默认值
  const defaultValues = computed(() => {
    const defaults: Record<string, any> = {}
    fields.forEach(field => {
      defaults[field.name] = field.defaultValue ?? getEmptyValue(field.type)
    })
    return defaults
  })

  // 用户修改过的字段
  const touchedFields = ref<Set<string>>(new Set())

  // 表单数据
  const formData = ref<Record<string, any>>({})

  // 是否已提交成功
  const submitted = ref(false)

  // 初始化表单数据
  function initialize() {
    const data: Record<string, any> = {}
    fields.forEach(field => {
      data[field.name] = field.defaultValue ?? getEmptyValue(field.type)
    })
    formData.value = data
    touchedFields.value = new Set()
    submitted.value = false
  }

  // 更新字段值
  function updateField(name: string, value: any) {
    const oldValue = formData.value[name]
    const defaultValue = defaultValues.value[name]

    formData.value[name] = value

    // 判断是否是用户手动修改
    if (value !== oldValue) {
      // 如果值和默认值不同，标记为 touched
      if (value !== defaultValue) {
        touchedFields.value.add(name)
      } else {
        // 如果值改回默认值，移除 touched
        touchedFields.value.delete(name)
      }
    }
  }

  // 计算进度百分比
  const progress = computed(() => {
    if (submitted.value) return 100

    const requiredFields = fields.filter(f => f.required)
    if (requiredFields.length === 0) return 0

    let completed = 0
    requiredFields.forEach(field => {
      const value = formData.value[field.name]
      if (touchedFields.value.has(field.name) && isValidValue(value, field)) {
        completed++
      }
    })

    return Math.round((completed / requiredFields.length) * 100)
  })

  // 标记为已提交
  function markSubmitted() {
    submitted.value = true
  }

  // 重置
  function reset() {
    initialize()
  }

  return {
    formData,
    touchedFields,
    submitted,
    progress,
    initialize,
    updateField,
    markSubmitted,
    reset
  }
}

// 获取空值
function getEmptyValue(type: FormField['type']): any {
  switch (type) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'date':
      return ''
    default:
      return ''
  }
}

// 检查值是否有效
function isValidValue(value: any, field: FormField): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (field.type === 'number' && (isNaN(value) || value === 0 && field.defaultValue !== 0)) {
    // 数字类型，如果为 0 且默认值不是 0，可能需要用户填写
    return field.defaultValue === 0 ? true : value !== 0
  }
  return true
}