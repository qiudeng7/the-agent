/**
 * @module stores/settings
 * @description 应用设置状态管理（Pinia store）。
 *              设置数据同步到云端，本地作为缓存。
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, inject } from 'vue'
import { SYSTEM_SERVICE_KEY, type ISystemService } from '@/di/interfaces'
import * as backend from '@/services/backend'

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

export const useSettingsStore = defineStore('settings', () => {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const systemService = inject<ISystemService>(SYSTEM_SERVICE_KEY)!

  // State
  const language = ref<Language>('system')
  const theme = ref<Theme>('system')
  const isSystemDark = ref(false)
  const customModelConfigs = ref<CustomModelConfig[]>([])
  const enabledModels = ref<string[]>([])
  const defaultModel = ref<string>('')
  /** API Key（兼容旧版本） */
  const apiKey = ref<string>('')
  /** API Base URL（兼容旧版本） */
  const baseURL = ref<string>('')
  /** 思考内容是否折叠（默认折叠） */
  const collapseThinking = ref<boolean>(true)
  const isLoading = ref(false)

  // ── Getters ──────────────────────────────────────────────────────────────────

  const availableModels = computed<AvailableModel[]>(() => {
    const models: AvailableModel[] = []

    for (const m of BUNDLE_MODELS) {
      models.push({
        id: m.id,
        name: m.name,
        description: m.description,
        type: 'bundle',
      })
    }

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

  const enabledAvailableModels = computed<AvailableModel[]>(() => {
    return availableModels.value.filter(m => enabledModels.value.includes(m.id))
  })

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

// ── API Actions ──────────────────────────────────────────────────────────────

  /**
   * 从服务器获取设置（登录后调用）
   */
  async function fetch() {
    try {
      isLoading.value = true
      const settings = await backend.fetchSettings()

      language.value = settings.language as Language
      theme.value = settings.theme as Theme
      customModelConfigs.value = settings.customModelConfigs as CustomModelConfig[] ?? []
      enabledModels.value = settings.enabledModels ?? []
      defaultModel.value = settings.defaultModel ?? ''
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存设置到服务器
   */
  async function saveToServer() {
    try {
      await backend.updateSettings({
        language: language.value,
        theme: theme.value,
        customModelConfigs: customModelConfigs.value,
        enabledModels: enabledModels.value,
        defaultModel: defaultModel.value,
      })
    } catch (err) {
      console.error('[Settings] Failed to save:', err)
    }
  }

  /**
   * 清空本地缓存（登出时调用）
   */
  function clear() {
    language.value = 'system'
    theme.value = 'system'
    customModelConfigs.value = []
    enabledModels.value = []
    defaultModel.value = ''
  }

  // ── Local Actions ────────────────────────────────────────────────────────────

  function getModelConfig(modelId: string): { apiKey?: string; baseURL?: string } {
    const bundleModel = BUNDLE_MODELS.find(m => m.id === modelId)
    if (bundleModel) {
      return { apiKey: bundleModel.apiKey, baseURL: bundleModel.baseURL }
    }

    for (const config of customModelConfigs.value) {
      const model = config.models.find(m => m.id === modelId)
      if (model) {
        return { apiKey: config.apiKey, baseURL: config.baseURL }
      }
    }

    return {}
  }

  function detectSystemColorScheme() {
    isSystemDark.value = systemService.theme.isDark
  }

  function getSystemLanguage(): Language {
    const sysLang = systemService.language.getLanguage().toLowerCase()
    if (sysLang.startsWith('zh')) return 'zh'
    if (sysLang.startsWith('ja')) return 'ja'
    return 'en'
  }

  async function setLanguage(lang: Language) {
    language.value = lang
    await saveToServer()
  }

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme
    await saveToServer()
  }

  async function toggleModel(modelId: string) {
    const index = enabledModels.value.indexOf(modelId)
    if (index !== -1) {
      enabledModels.value.splice(index, 1)
      if (defaultModel.value === modelId) {
        defaultModel.value = enabledAvailableModels.value[0]?.id || ''
      }
    } else {
      enabledModels.value.push(modelId)
    }
    await saveToServer()
  }

  async function addCustomModelConfig(config: CustomModelConfig) {
    customModelConfigs.value.push(config)
    for (const m of config.models) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
    await saveToServer()
  }

  async function removeCustomModelConfig(configId: string) {
    const index = customModelConfigs.value.findIndex(c => c.id === configId)
    if (index !== -1) {
      const config = customModelConfigs.value[index]
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
      await saveToServer()
    }
  }

  async function updateCustomModelConfig(config: CustomModelConfig) {
    const index = customModelConfigs.value.findIndex(c => c.id === config.id)
    if (index !== -1) {
      customModelConfigs.value[index] = config
      await saveToServer()
    }
  }

  async function setDefaultModel(modelId: string) {
    if (availableModels.value.find(m => m.id === modelId)) {
      defaultModel.value = modelId
      await saveToServer()
    }
  }

  /** 设置思考内容折叠状态（本地存储） */
  function setCollapseThinking(value: boolean) {
    collapseThinking.value = value
    localStorage.setItem('collapseThinking', String(value))
  }

  // 初始化默认设置
  function initializeDefaults() {
    for (const m of BUNDLE_MODELS) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
    if (!defaultModel.value && BUNDLE_MODELS.length > 0) {
      defaultModel.value = BUNDLE_MODELS[0].id
    }
    // 加载本地存储的思考折叠状态
    const savedCollapse = localStorage.getItem('collapseThinking')
    if (savedCollapse !== null) {
      collapseThinking.value = savedCollapse === 'true'
    }
  }

  // 监听系统主题变化
  let unsubscribeTheme: (() => void) | null = null

  function startWatching() {
    detectSystemColorScheme()
    initializeDefaults()

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
    currentLanguage,
    currentTheme,
    customModelConfigs,
    enabledModels,
    availableModels,
    enabledAvailableModels,
    defaultModel,
    apiKey,
    baseURL,
    collapseThinking,
    isLoading,
    getModelConfig,
    // API Actions
    fetch,
    clear,
    // Local Actions
    setLanguage,
    setTheme,
    toggleModel,
    addCustomModelConfig,
    removeCustomModelConfig,
    updateCustomModelConfig,
    setDefaultModel,
    setCollapseThinking,
    startWatching,
    stopWatching,
  }
})