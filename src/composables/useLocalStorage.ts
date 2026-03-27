/**
 * @module composables/useLocalStorage
 * @description localStorage 持久化 composable。
 *              提供响应式的本地存储读写能力。
 *              只依赖 Vue，与项目其他部分解耦。
 * @layer composables
 */
import { ref, watch, type Ref, type WatchSource } from 'vue'

export interface UseLocalStorageOptions<T> {
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
 * localStorage 响应式存储
 * @param key 存储键名
 * @param options 配置选项
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {},
): {
  data: Ref<T | undefined>
  save: () => void
  load: () => void
  remove: () => void
} {
  const {
    autoSave = true,
    deep = true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue,
  } = options

  const data = ref<T | undefined>(defaultValue) as Ref<T | undefined>

  /**
   * 从 localStorage 加载数据
   */
  function load() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        data.value = deserialize(stored)
      }
    } catch (error) {
      console.error(`[useLocalStorage] Failed to load "${key}":`, error)
    }
  }

  /**
   * 保存数据到 localStorage
   */
  function save() {
    if (typeof window === 'undefined') return

    try {
      if (data.value !== undefined) {
        localStorage.setItem(key, serialize(data.value))
      }
    } catch (error) {
      console.error(`[useLocalStorage] Failed to save "${key}":`, error)
    }
  }

  /**
   * 从 localStorage 删除数据
   */
  function remove() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }

  // 初始化时加载
  load()

  // 自动保存
  if (autoSave) {
    watch(data, save, { deep })
  }

  return {
    data,
    save,
    load,
    remove,
  }
}

/**
 * 多个 localStorage key 的批量管理
 */
export function useLocalStorageBatch<T extends Record<string, unknown>>(
  keys: T,
): {
  data: Ref<Partial<T>>
  saveAll: () => void
  loadAll: () => void
  clearAll: () => void
} {
  const data = ref<Partial<T>>({}) as Ref<Partial<T>>

  function loadAll() {
    if (typeof window === 'undefined') return

    for (const key of Object.keys(keys)) {
      try {
        const stored = localStorage.getItem(key)
        if (stored !== null) {
          (data.value as Record<string, unknown>)[key] = JSON.parse(stored)
        }
      } catch (error) {
        console.error(`[useLocalStorageBatch] Failed to load "${key}":`, error)
      }
    }
  }

  function saveAll() {
    if (typeof window === 'undefined') return

    for (const [key, value] of Object.entries(data.value)) {
      try {
        if (value !== undefined) {
          localStorage.setItem(key, JSON.stringify(value))
        }
      } catch (error) {
        console.error(`[useLocalStorageBatch] Failed to save "${key}":`, error)
      }
    }
  }

  function clearAll() {
    if (typeof window === 'undefined') return

    for (const key of Object.keys(keys)) {
      localStorage.removeItem(key)
    }
  }

  return {
    data,
    saveAll,
    loadAll,
    clearAll,
  }
}

/**
 * 持久化一个 ref 到 localStorage
 * @param key 存储键名
 * @param source 响应式源
 */
export function usePersistToLocalStorage<T>(
  key: string,
  source: WatchSource<T>,
) {
  // 加载初始值
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null && typeof source === 'object' && 'value' in source) {
        (source as Ref<T>).value = JSON.parse(stored)
      }
    } catch {
      // ignore
    }
  }

  // 监听变化保存
  watch(
    source,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`[usePersistToLocalStorage] Failed to save "${key}":`, error)
      }
    },
    { deep: true },
  )
}