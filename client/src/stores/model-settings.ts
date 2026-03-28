/**
 * @module stores/model-settings
 * @description 模型设置状态管理。
 *              管理模型配置、启用列表、默认模型、权限模式等 Agent 相关设置。
 *              只管理状态，数据同步由聚合层 (settings.ts) 处理。
 * @layer state
 */
import { ref, computed } from 'vue'
import type { PermissionMode } from '#claude/types'

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

/** 自定义模型配置 */
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

/**
 * 内置模型配置。
 *
 * 注意：API Key 目前硬编码在此，这与后端配置一致，前后端使用相同的配置无区别。
 * TODO: 后续实现收费模型转发服务时，应移除硬编码，
 *       改为从后端 API 动态获取或通过用户配置。
 */
export const BUNDLE_MODELS: BundleModel[] = [
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

/**
 * 创建 Model Settings Store 模块
 */
export function createModelSettingsModule() {
  // ── State ──────────────────────────────────────────────────────────────────
  const customModelConfigs = ref<CustomModelConfig[]>([])
  const enabledModels = ref<string[]>([])
  const defaultModel = ref<string>('')
  const isLoading = ref(false)
  const permissionMode = ref<PermissionMode>('default')

  // ── Getters ────────────────────────────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────────

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
  }

  function addCustomModelConfig(config: CustomModelConfig) {
    customModelConfigs.value.push(config)
    for (const m of config.models) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
  }

  function removeCustomModelConfig(configId: string) {
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
    }
  }

  function updateCustomModelConfig(config: CustomModelConfig) {
    const index = customModelConfigs.value.findIndex(c => c.id === config.id)
    if (index !== -1) {
      customModelConfigs.value[index] = config
    }
  }

  function setDefaultModel(modelId: string) {
    if (availableModels.value.find(m => m.id === modelId)) {
      defaultModel.value = modelId
    }
  }

  function setPermissionMode(mode: PermissionMode) {
    permissionMode.value = mode
  }

  function clear() {
    customModelConfigs.value = []
    enabledModels.value = []
    defaultModel.value = ''
    permissionMode.value = 'default'
  }

  function initializeDefaults() {
    for (const m of BUNDLE_MODELS) {
      if (!enabledModels.value.includes(m.id)) {
        enabledModels.value.push(m.id)
      }
    }
    if (!defaultModel.value && BUNDLE_MODELS.length > 0) {
      defaultModel.value = BUNDLE_MODELS[0].id
    }
  }

  return {
    customModelConfigs,
    enabledModels,
    defaultModel,
    isLoading,
    permissionMode,
    availableModels,
    enabledAvailableModels,
    getModelConfig,
    toggleModel,
    addCustomModelConfig,
    removeCustomModelConfig,
    updateCustomModelConfig,
    setDefaultModel,
    setPermissionMode,
    clear,
    initializeDefaults,
  }
}

export type ModelSettingsModule = ReturnType<typeof createModelSettingsModule>