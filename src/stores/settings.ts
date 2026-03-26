/**
 * @module stores/settings
 * @description 应用设置状态管理（Pinia store）。
 *              管理语言（language）、主题（theme）、自定义模型列表（models）。
 *              - 持久化到 localStorage，key: 'app-settings'
 *              - onMounted 时注册 prefers-color-scheme 媒体查询监听，实时响应系统主题切换
 *              - currentLanguage / currentTheme 为解析后的实际值（排除 'system' 占位）
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'

export type Language = 'system' | 'zh' | 'ja' | 'en'
export type Theme = 'system' | 'light' | 'dark'

export interface ModelOption {
  id: string
  name: string
}

const STORAGE_KEY = 'app-settings'

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
]

export const useSettingsStore = defineStore('settings', () => {
  // State
  const language = ref<Language>('system')
  const theme = ref<Theme>('system')
  const isSystemDark = ref(false)
  /** 用户自定义的模型列表 */
  const models = ref<ModelOption[]>([...DEFAULT_MODELS])
  /** 默认选中的模型 ID */
  const defaultModel = ref<string>('claude-sonnet-4-6')

  // Detect system color scheme
  function detectSystemColorScheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      isSystemDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  // Detect system language
  function getSystemLanguage(): Language {
    if (typeof window === 'undefined') return 'en'

    const sysLang = navigator.language.toLowerCase()
    if (sysLang.startsWith('zh')) return 'zh'
    if (sysLang.startsWith('ja')) return 'ja'
    return 'en'
  }

  // Get current language (resolved)
  const currentLanguage = computed(() => {
    if (language.value !== 'system') return language.value
    const sysLang = getSystemLanguage()
    // Only return zh, ja, en - default to en for other languages
    if (sysLang === 'zh' || sysLang === 'ja' || sysLang === 'en') {
      return sysLang
    }
    return 'en'
  })

  // Get current theme (resolved)
  const currentTheme = computed(() => {
    if (theme.value !== 'system') return theme.value
    return isSystemDark.value ? 'dark' : 'light'
  })

  // Save to localStorage
  function saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        language: language.value,
        theme: theme.value,
        models: models.value,
        defaultModel: defaultModel.value,
      }))
    }
  }

  // Load from localStorage
  function loadSettings() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const settings = JSON.parse(saved)
          if (['system', 'zh', 'ja', 'en'].includes(settings.language)) {
            language.value = settings.language
          }
          if (['system', 'light', 'dark'].includes(settings.theme)) {
            theme.value = settings.theme
          }
          if (Array.isArray(settings.models) && settings.models.length > 0) {
            models.value = settings.models
          }
          if (typeof settings.defaultModel === 'string') {
            defaultModel.value = settings.defaultModel
          }
        } catch (e) {
          console.error('Failed to load settings:', e)
        }
      }
    }
  }

  // Set language
  function setLanguage(lang: Language) {
    language.value = lang
    saveSettings()
  }

  // Set theme
  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    saveSettings()
  }

  // Add a custom model
  function addModel(model: ModelOption) {
    if (!models.value.find(m => m.id === model.id)) {
      models.value.push(model)
      saveSettings()
    }
  }

  // Remove a model by id
  function removeModel(modelId: string) {
    const index = models.value.findIndex(m => m.id === modelId)
    if (index !== -1) {
      models.value.splice(index, 1)
      // If removed model was default, reset to first model
      if (defaultModel.value === modelId && models.value.length > 0) {
        defaultModel.value = models.value[0].id
      }
      saveSettings()
    }
  }

  // Set default model
  function setDefaultModel(modelId: string) {
    if (models.value.find(m => m.id === modelId)) {
      defaultModel.value = modelId
      saveSettings()
    }
  }

  // Reset models to default
  function resetModels() {
    models.value = [...DEFAULT_MODELS]
    defaultModel.value = 'claude-sonnet-4-6'
    saveSettings()
  }

  // 监听变化自动持久化
  watch([language, theme, models, defaultModel], saveSettings, { deep: true })

  // Watch for system color scheme changes
  onMounted(() => {
    detectSystemColorScheme()
    loadSettings()

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        isSystemDark.value = e.matches
      }
      mediaQuery.addEventListener('change', handleChange)

      // Cleanup
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  })

  return {
    language,
    theme,
    isSystemDark,
    currentLanguage,
    currentTheme,
    models,
    defaultModel,
    setLanguage,
    setTheme,
    addModel,
    removeModel,
    setDefaultModel,
    resetModels,
    loadSettings,
  }
})
