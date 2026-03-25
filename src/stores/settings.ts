import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'

export type Language = 'system' | 'zh' | 'ja' | 'en'
export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'app-settings'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const language = ref<Language>('system')
  const theme = ref<Theme>('system')
  const isSystemDark = ref(false)

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
    setLanguage,
    setTheme,
    loadSettings,
  }
})
