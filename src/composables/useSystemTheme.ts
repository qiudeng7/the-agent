/**
 * @module composables/useSystemTheme
 * @description 系统主题检测 composable。
 *              监听系统深色/亮色模式变化。
 *              只依赖 Vue，与项目其他部分解耦。
 * @layer composables
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

export interface UseSystemThemeOptions {
  /** 初始值（SSR 场景），默认 'light' */
  initialValue?: ThemeMode
}

/**
 * 系统主题检测
 * @param options 配置选项
 */
export function useSystemTheme(
  options: UseSystemThemeOptions = {},
): {
  isDark: Ref<boolean>
  theme: Ref<ThemeMode>
} {
  const { initialValue = 'light' } = options

  const isDark = ref(false)
  const theme = ref<ThemeMode>(initialValue)

  let mediaQuery: MediaQueryList | null = null

  /**
   * 检测当前系统主题
   */
  function detectTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      isDark.value = initialValue === 'dark'
      theme.value = initialValue
      return
    }

    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.value = isDark.value ? 'dark' : 'light'
  }

  /**
   * 处理主题变化
   */
  function handleChange(event: MediaQueryListEvent) {
    isDark.value = event.matches
    theme.value = event.matches ? 'dark' : 'light'
  }

  onMounted(() => {
    detectTheme()

    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', handleChange)
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleChange)
    }
  })

  return {
    isDark,
    theme,
  }
}

/**
 * 主题切换逻辑
 * 支持跟随系统或手动设置
 */
export function useThemeControl(
  options: {
    /** 存储键名，默认 'theme' */
    storageKey?: string
    /** 默认主题模式，默认 'system' */
    defaultMode?: 'system' | 'light' | 'dark'
  } = {},
): {
  /** 当前实际主题 */
  currentTheme: Ref<ThemeMode>
  /** 用户设置的主题模式 */
  mode: Ref<'system' | 'light' | 'dark'>
  /** 是否为深色模式 */
  isDark: Ref<boolean>
  /** 设置主题模式 */
  setMode: (mode: 'system' | 'light' | 'dark') => void
  /** 切换深色/亮色 */
  toggle: () => void
} {
  const { storageKey = 'theme', defaultMode = 'system' } = options

  const { isDark: systemIsDark, theme: systemTheme } = useSystemTheme()
  const mode = ref<'system' | 'light' | 'dark'>(defaultMode)
  const isDark = ref(false)
  const currentTheme = ref<ThemeMode>('light')

  /**
   * 更新当前主题
   */
  function updateCurrentTheme() {
    if (mode.value === 'system') {
      isDark.value = systemIsDark.value
      currentTheme.value = systemTheme.value
    } else {
      isDark.value = mode.value === 'dark'
      currentTheme.value = mode.value
    }
  }

  /**
   * 设置主题模式
   */
  function setMode(newMode: 'system' | 'light' | 'dark') {
    mode.value = newMode
    saveMode()
    updateCurrentTheme()
  }

  /**
   * 切换深色/亮色
   */
  function toggle() {
    const newMode = isDark.value ? 'light' : 'dark'
    setMode(newMode)
  }

  /**
   * 从 localStorage 加载
   */
  function loadMode() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && ['system', 'light', 'dark'].includes(stored)) {
        mode.value = stored as 'system' | 'light' | 'dark'
      }
    } catch {
      // ignore
    }
  }

  /**
   * 保存到 localStorage
   */
  function saveMode() {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, mode.value)
    } catch {
      // ignore
    }
  }

  onMounted(() => {
    loadMode()
    updateCurrentTheme()
  })

  // 监听系统主题变化
  onMounted(() => {
    if (mode.value === 'system') {
      updateCurrentTheme()
    }
  })

  return {
    currentTheme,
    mode,
    isDark,
    setMode,
    toggle,
  }
}