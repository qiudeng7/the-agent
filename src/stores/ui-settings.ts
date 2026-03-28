/**
 * @module stores/ui-settings
 * @description UI 设置状态管理。
 *              管理主题、语言、思考折叠状态等界面相关设置。
 *              设置同步到云端，本地作为缓存。
 * @layer state
 */
import { ref, computed, inject } from 'vue'
import { SYSTEM_SERVICE_KEY, STORAGE_KEY, type ISystemService, type IStorage } from '@/di/interfaces'
import { emitter } from '@/events'
import * as backend from '@/services/backend'

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

  async function setLanguage(lang: Language) {
    language.value = lang
    await saveToServer()
  }

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme
    await saveToServer()
  }

  function setCollapseThinking(value: boolean) {
    collapseThinking.value = value
    storage.setItem('collapseThinking', String(value))
  }

  async function saveToServer() {
    try {
      // UI settings 和 model settings 共用一个 API
      // 这里只更新 UI 部分，需要和 model-settings 配合
      emitter.emit('settings:changed')
    } catch (err) {
      console.error('[UISettings] Failed to save:', err)
    }
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