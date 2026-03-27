/**
 * @module composables/useStorage
 * @description 存储持久化 composable。
 *              通过 inject 获取存储依赖。
 * @layer composables
 */
import { ref, watch, inject, type Ref } from 'vue'
import { STORAGE_KEY, type IStorage } from '@/di/interfaces'

export interface UseStorageOptions<T> {
  /** 是否在变化时自动保存，默认 true */
  autoSave?: boolean
  /** 深度监听，默认 true */
  deep?: boolean
  /** 序列化函数，默认 JSON.stringify */
  serialize?: (value: T) => string
  /** 反序列化函数，默认 JSON.parse */
  deserialize?: (value: string) => T
  /** 默认值 */
  defaultValue?: T
}

/**
 * 响应式存储
 * @param key 存储键名
 * @param options 配置选项
 */
export function useStorage<T>(
  key: string,
  options: UseStorageOptions<T> = {},
): {
  data: Ref<T | undefined>
  save: () => void
  load: () => void
  remove: () => void
} {
  const storage = inject<IStorage>(STORAGE_KEY)!
  const {
    autoSave = true,
    deep = true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue,
  } = options

  const data = ref<T | undefined>(defaultValue) as Ref<T | undefined>

  function load() {
    const stored = storage.getItem(key)
    if (stored !== null) {
      try {
        data.value = deserialize(stored)
      } catch (error) {
        console.error(`[useStorage] Failed to load "${key}":`, error)
      }
    }
  }

  function save() {
    if (data.value !== undefined) {
      try {
        storage.setItem(key, serialize(data.value))
      } catch (error) {
        console.error(`[useStorage] Failed to save "${key}":`, error)
      }
    }
  }

  function remove() {
    storage.removeItem(key)
  }

  load()

  if (autoSave) {
    watch(data, save, { deep })
  }

  return { data, save, load, remove }
}