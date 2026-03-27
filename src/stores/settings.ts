/**
 * @module stores/settings
 * @description 应用设置状态管理（Pinia store）。
 *              管理语言（language）、主题（theme）、自定义模型列表（models）。
 *              - 持久化到注入的 storage，key: 'app-settings'
 *              - 使用注入的 systemService 检测系统主题和语言
 *              - currentLanguage / currentTheme 为解析后的实际值（排除 'system' 占位）
 *
 * 依赖注入：
 * - storage: IStorage - 存储服务
 * - systemService: ISystemService - 系统服务（主题/语言检测）
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getStorage, getSystemService } from '@/di'

export type Language = 'system' | 'zh' | 'ja' | 'en'
export type Theme = 'system' | 'light' | 'dark'

/** 内置模型定义 */
export interface BundleModel {
  id: string
  name: string
  description: string
  baseURL: string
  apiKey: string
}

/** 自定义模型项 */
export interface CustomModelItem {
  id: string
  description: string
}

/** 自定义模型配置（一个配置可包含多个模型） */
export interface CustomModelConfig {
  id: string
  name: string
  apiKey: string
  baseURL: string
  models: CustomModelItem[]
}

/** 可用模型信息 */
export interface AvailableModel {
  id: string
  name: string
  description: string
  type: 'bundle' | 'custom'
}

/** 内置模型列表 */
export const BUNDLE_MODELS: BundleModel[] = [
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Claude Code',
    baseURL: 'https://api.claudecode.net.cn/api/claudecode',
    apiKey: 'sk-ant-api03-ZHcf-bBtRYKZNjYcIkTX4QW8LooK5brn0kOiuRjqJ2bOVsaBDmCMd6zDLT5acW69UL2ozvH5PXTL4r8NNkUWNQ',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Claude Code',
    baseURL: 'https://api.claudecode.net.cn/api/claudecode',
    apiKey: 'sk-ant-api03-ZHcf-bBtRYKZNjYcIkTX4QW8LooK5brn0kOiuRjqJ2bOVsaBDmCMd6zDLT5acW69UL2ozvH5PXTL4r8NNkUWNQ',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Claude Code',
    baseURL: 'https://api.claudecode.net.cn/api/claudecode',
    apiKey: 'sk-ant-api03-ZHcf-bBtRYKZNjYcIkTX4QW8LooK5brn0kOiuRjqJ2bOVsaBDmCMd6zDLT5acW69UL2ozvH5PXTL4r8NNkUWNQ',
  },
  {
    id: 'qwen3.5-plus',
    name: 'Qwen3.5-Plus',
    description: '通义千问',
    baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    apiKey: 'sk-sp-f09b783d6c824e2fab15646a07f9e179',
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    description: '智谱 AI',
    baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    apiKey: 'sk-sp-f09b783d6c824e2fab15646a07f9e179',
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi-K2.5',
    description: '月之暗面',
    baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    apiKey: 'sk-sp-f09b783d6c824e2fab15646a07f9e179',
  },
  {
    id: 'MiniMax-M2.5',
    name: 'MiniMax-M2.5',
    description: 'MiniMax',
    baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    apiKey: 'sk-sp-f09b783d6c824e2fab15646a07f9e179',
  },
]

const STORAGE_KEY = 'app-settings'

export const useSettingsStore = defineStore('settings', () => {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const storage = getStorage()
  const systemService = getSystemService()

  // State
  const language = ref<Language>('system')
  const theme = ref<Theme>('system')
  const isSystemDark = ref(false)
  /** 用户自定义模型配置列表 */
  const customModelConfigs = ref<CustomModelConfig[]>([])
  /** 已启用的模型 ID 列表（包括 bundle 和 custom） */
  const enabledModels = ref<string[]>([])
  /** 默认选中的模型 ID */
  const defaultModel = ref<string>('')
  /** API Key（兼容旧版本） */
  const apiKey = ref<string>('')
  /** API Base URL（兼容旧版本） */
  const baseURL = ref<string>('')

  /** 所有可用模型 */
  const availableModels = computed<AvailableModel[]>(() => {
    const models: AvailableModel[] = []

    // Bundle 模型
    for (const m of BUNDLE_MODELS) {
      models.push({
        id: m.id,
        name: m.name,
        description: m.description,
        type: 'bundle',
      })
    }

    // Custom 模型（展开所有配置中的模型）
    for (const config of customModelConfigs.value) {
      for (const m of config.models) {
        models.push({
          id: m.id,
          name: m.id,
          description: m.description,
          type: 'custom',
        })
      }
    }

    return models
  })

  /** 已启用的可用模型 */
  const enabledAvailableModels = computed<AvailableModel[]>(() => {
    return availableModels.value.filter(m => enabledModels.value.includes(m.id))
  })

  /** 获取模型的 API 配置 */
  function getModelConfig(modelId: string): { apiKey?: string; baseURL?: string } {
    // 检查 bundle 模型
    const bundleModel = BUNDLE_MODELS.find(m => m.id === modelId)
    if (bundleModel) {
      return { apiKey: bundleModel.apiKey, baseURL: bundleModel.baseURL }
    }

    // 检查 custom 模型
    for (const config of customModelConfigs.value) {
      const model = config.models.find(m => m.id === modelId)
      if (model) {
        return { apiKey: config.apiKey, baseURL: config.baseURL }
      }
    }

    // 兼容旧版本
    return { apiKey: apiKey.value || undefined, baseURL: baseURL.value || undefined }
  }

  // Detect system color scheme
  function detectSystemColorScheme() {
    isSystemDark.value = systemService.theme.isDark
  }

  // Detect system language
  function getSystemLanguage(): Language {
    const sysLang = systemService.language.getLanguage().toLowerCase()
    if (sysLang.startsWith('zh')) return 'zh'
    if (sysLang.startsWith('ja')) return 'ja'
    return 'en'
  }

  // Get current language (resolved)
  const currentLanguage = computed(() => {
    if (language.value !== 'system') return language.value
    const sysLang = getSystemLanguage()
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

  // Save to storage
  function saveSettings() {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      language: language.value,
      theme: theme.value,
      customModelConfigs: customModelConfigs.value,
      enabledModels: enabledModels.value,
      defaultModel: defaultModel.value,
      apiKey: apiKey.value,
      baseURL: baseURL.value,
    }))
  }

  // Load from storage
  function loadSettings() {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (['system', 'zh', 'ja', 'en'].includes(settings.language)) {
          language.value = settings.language
        }
        if (['system', 'light', 'dark'].includes(settings.theme)) {
          theme.value = settings.theme
        }
        if (Array.isArray(settings.customModelConfigs)) {
          customModelConfigs.value = settings.customModelConfigs
        }
        if (Array.isArray(settings.enabledModels)) {
          enabledModels.value = settings.enabledModels
        }
        // 兼容旧版本字段
        if (Array.isArray(settings.enabledPublicModels)) {
          enabledModels.value = [...new Set([...enabledModels.value, ...settings.enabledPublicModels])]
        }
        if (typeof settings.defaultModel === 'string') {
          defaultModel.value = settings.defaultModel
        }
        if (typeof settings.apiKey === 'string') {
          apiKey.value = settings.apiKey
        }
        if (typeof settings.baseURL === 'string') {
          baseURL.value = settings.baseURL
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
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

  // Toggle model enabled state
  function toggleModel(modelId: string) {
    const index = enabledModels.value.indexOf(modelId)
    if (index !== -1) {
      enabledModels.value.splice(index, 1)
      if (defaultModel.value === modelId) {
        defaultModel.value = enabledAvailableModels.value[0]?.id || ''
      }
    } else {
      enabledModels.value.push(modelId)
    }
    saveSettings()
  }

  // Add custom model config
  function addCustomModelConfig(config: CustomModelConfig) {
    customModelConfigs.value.push(config)
    // 默认启用新添加的模型
    for (const m of config.models) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
    saveSettings()
  }

  // Remove custom model config
  function removeCustomModelConfig(configId: string) {
    const index = customModelConfigs.value.findIndex(c => c.id === configId)
    if (index !== -1) {
      const config = customModelConfigs.value[index]
      // 移除相关的启用状态
      for (const m of config.models) {
        const enabledIndex = enabledModels.value.indexOf(m.id)
        if (enabledIndex !== -1) {
          enabledModels.value.splice(enabledIndex, 1)
        }
        if (defaultModel.value === m.id) {
          defaultModel.value = enabledAvailableModels.value[0]?.id || ''
        }
      }
      customModelConfigs.value.splice(index, 1)
      saveSettings()
    }
  }

  // Update custom model config
  function updateCustomModelConfig(config: CustomModelConfig) {
    const index = customModelConfigs.value.findIndex(c => c.id === config.id)
    if (index !== -1) {
      customModelConfigs.value[index] = config
      saveSettings()
    }
  }

  // Set default model
  function setDefaultModel(modelId: string) {
    if (availableModels.value.find(m => m.id === modelId)) {
      defaultModel.value = modelId
      saveSettings()
    }
  }

  // 初始化默认设置
  function initializeDefaults() {
    // 默认启用所有 bundle 模型
    for (const m of BUNDLE_MODELS) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
    // 默认模型使用第一个 bundle 模型
    if (!defaultModel.value && BUNDLE_MODELS.length > 0) {
      defaultModel.value = BUNDLE_MODELS[0].id
    }
    saveSettings()
  }

  // 监听变化自动持久化
  watch([language, theme, customModelConfigs, enabledModels, defaultModel, apiKey, baseURL], saveSettings, { deep: true })

  // 监听系统主题变化
  let unsubscribeTheme: (() => void) | null = null

  onMounted(() => {
    detectSystemColorScheme()
    loadSettings()
    initializeDefaults()

    // 使用注入的主题服务监听变化
    unsubscribeTheme = systemService.theme.onChange((isDark) => {
      isSystemDark.value = isDark
    })
  })

  onUnmounted(() => {
    if (unsubscribeTheme) {
      unsubscribeTheme()
    }
  })

  return {
    language,
    theme,
    isSystemDark,
    currentLanguage,
    currentTheme,
    customModelConfigs,
    enabledModels,
    availableModels,
    enabledAvailableModels,
    defaultModel,
    apiKey,
    baseURL,
    getModelConfig,
    setLanguage,
    setTheme,
    toggleModel,
    addCustomModelConfig,
    removeCustomModelConfig,
    updateCustomModelConfig,
    setDefaultModel,
    loadSettings,
  }
})