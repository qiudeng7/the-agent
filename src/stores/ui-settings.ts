/**
 * @module stores/ui-settings
 * @description UI 设置状态管理。
 *              管理主题、语言、思考折叠状态等界面相关设置。
 *              只管理状态，数据同步由聚合层 (settings.ts) 处理。
 * @layer state
 */
import { ref, computed, inject } from 'vue'
import { SYSTEM_SERVICE_KEY, STORAGE_KEY, type ISystemService, type IStorage } from '@/di/interfaces'

export type Language = 'system' | 'zh' | 'ja' | 'en'
export type Theme = 'system' | 'light' | 'dark'

/**
 * 创建 UI Settings Store 模块
 */
export function createUISettingsModule() {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const systemService = inject<ISystemService>(SYSTEM_SERVICE_KEY)!
  const storage = inject<IStorage>(STORAGE_KEY)!

  // ── State ──────────────────────────────────────────────────────────────────
  const language = ref<Language>('system')
  const theme = ref<Theme>('system')
  const isSystemDark = ref(false)
  const collapseThinking = ref<boolean>(true)

  // ── Getters ────────────────────────────────────────────────────────────────
  const currentLanguage = computed(() => {
    if (language.value !== 'system') return language.value
    const sysLang = getSystemLanguage()
    if (sysLang === 'zh' || sysLang === 'ja' || sysLang === 'en') {
      return sysLang
    }
    return 'en'
  })

  const currentTheme = computed(() => {
    if (theme.value !== 'system') return theme.value
    return isSystemDark.value ? 'dark' : 'light'
  })

  // ── 系统检测 ──────────────────────────────────────────────────────────────

  function detectSystemColorScheme() {
    isSystemDark.value = systemService.theme.isDark
  }

  function getSystemLanguage(): Language {
    const sysLang = systemService.language.getLanguage().toLowerCase()
    if (sysLang.startsWith('zh')) return 'zh'
    if (sysLang.startsWith('ja')) return 'ja'
    return 'en'
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function setLanguage(lang: Language) {
    language.value = lang
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
  }

  function setCollapseThinking(value: boolean) {
    collapseThinking.value = value
    storage.setItem('collapseThinking', String(value))
  }

  function clear() {
    language.value = 'system'
    theme.value = 'system'
    collapseThinking.value = true
  }

  function loadFromServerData(data: { language: string; theme: string }) {
    language.value = data.language as Language
    theme.value = data.theme as Theme
  }

  function loadCollapseThinkingFromStorage() {
    const saved = storage.getItem('collapseThinking')
    if (saved !== null) {
      collapseThinking.value = saved === 'true'
    }
  }

  let unsubscribeTheme: (() => void) | null = null

  function startWatching() {
    detectSystemColorScheme()
    loadCollapseThinkingFromStorage()
    unsubscribeTheme = systemService.theme.onChange((isDark) => {
      isSystemDark.value = isDark
    })
  }

  function stopWatching() {
    if (unsubscribeTheme) {
      unsubscribeTheme()
      unsubscribeTheme = null
    }
  }

  return {
    language,
    theme,
    isSystemDark,
    collapseThinking,
    currentLanguage,
    currentTheme,
    setLanguage,
    setTheme,
    setCollapseThinking,
    clear,
    loadFromServerData,
    startWatching,
    stopWatching,
    detectSystemColorScheme,
  }
}

export type UISettingsModule = ReturnType<typeof createUISettingsModule>