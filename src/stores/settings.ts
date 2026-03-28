/**
 * @module stores/settings
 * @description 应用设置状态管理（Pinia store）。
 *              聚合 UI 设置和模型设置模块。
 *              通过 watch 监听子模块状态变化，统一同步到云端。
 *
 * 模块拆分：
 * - ui-settings.ts: 主题、语言、思考折叠状态
 * - model-settings.ts: 模型配置、启用列表、默认模型
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { emitter } from '@/events'
import * as backend from '@/services/backend'
import { createUISettingsModule, type Language, type Theme } from './ui-settings'
import { createModelSettingsModule, type BundleModel, type CustomModelConfig, type AvailableModel, BUNDLE_MODELS } from './model-settings'

// 重导出类型
export type { Language, Theme }
export type { BundleModel, CustomModelConfig, AvailableModel }
export { BUNDLE_MODELS }

export const useSettingsStore = defineStore('settings', () => {
  // ── 模块实例 ──────────────────────────────────────────────────────────────
  const ui = createUISettingsModule()
  const model = createModelSettingsModule()

  // ── 聚合 Getters ──────────────────────────────────────────────────────────
  const language = ui.language
  const theme = ui.theme
  const isSystemDark = ui.isSystemDark
  const currentLanguage = ui.currentLanguage
  const currentTheme = ui.currentTheme
  const collapseThinking = ui.collapseThinking

  const customModelConfigs = model.customModelConfigs
  const enabledModels = model.enabledModels
  const defaultModel = model.defaultModel
  const availableModels = model.availableModels
  const enabledAvailableModels = model.enabledAvailableModels
  const isLoading = model.isLoading

  // 兼容旧版本
  const apiKey = ref('')
  const baseURL = ref('')

  // ── 状态同步控制 ────────────────────────────────────────────────────────────

  /** 是否已完成初始加载（避免加载时触发保存） */
  const isInitialized = ref(false)
  /** 防抖保存定时器 */
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  /** 保存错误状态 */
  const saveError = ref<string | null>(null)
  /** 是否正在保存 */
  const isSaving = ref(false)

  // ── 聚合 Actions ──────────────────────────────────────────────────────────

  async function fetch() {
    try {
      isLoading.value = true
      const settings = await backend.fetchSettings()

      // 分发到各模块
      ui.loadFromServerData({
        language: settings.language,
        theme: settings.theme,
      })

      model.customModelConfigs.value = (settings.customModelConfigs as CustomModelConfig[]) ?? []
      model.enabledModels.value = settings.enabledModels ?? []
      model.defaultModel.value = settings.defaultModel ?? ''

      // 如果服务器没有数据，初始化默认值
      if (model.enabledModels.value.length === 0) {
        model.initializeDefaults()
      }

      emitter.emit('settings:loaded')
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  /** 防抖保存（500ms 后执行，避免频繁请求） */
  function debouncedSave() {
    if (!isInitialized.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveToServer()
    }, 500)
  }

  async function saveToServer() {
    try {
      isSaving.value = true
      saveError.value = null
      await backend.updateSettings({
        language: language.value,
        theme: theme.value,
        customModelConfigs: customModelConfigs.value,
        enabledModels: enabledModels.value,
        defaultModel: defaultModel.value,
      })
      emitter.emit('settings:changed')
    } catch (err) {
      console.error('[Settings] Failed to save:', err)
      saveError.value = err instanceof Error ? err.message : '保存失败'
    } finally {
      isSaving.value = false
    }
  }

  /** 重试保存 */
  async function retrySave() {
    if (saveError.value) {
      await saveToServer()
    }
  }

  function clear() {
    ui.clear()
    model.clear()
    isInitialized.value = false
  }

  function startWatching() {
    ui.startWatching()

    // 监听状态变化，自动同步到服务器
    watch(
      [language, theme, customModelConfigs, enabledModels, defaultModel],
      () => debouncedSave(),
      { deep: true },
    )
  }

  function setupEventListeners() {
    emitter.on('auth:login-success', fetch)
    emitter.on('auth:logout', clear)
  }

  function teardownEventListeners() {
    emitter.off('auth:login-success', fetch)
    emitter.off('auth:logout', clear)
  }

  // 代理方法
  const setLanguage = ui.setLanguage
  const setTheme = ui.setTheme
  const setCollapseThinking = ui.setCollapseThinking
  const getModelConfig = model.getModelConfig
  const toggleModel = model.toggleModel
  const addCustomModelConfig = model.addCustomModelConfig
  const removeCustomModelConfig = model.removeCustomModelConfig
  const updateCustomModelConfig = model.updateCustomModelConfig
  const setDefaultModel = model.setDefaultModel

  return {
    // UI 设置
    language,
    theme,
    isSystemDark,
    currentLanguage,
    currentTheme,
    collapseThinking,
    setLanguage,
    setTheme,
    setCollapseThinking,

    // 模型设置
    customModelConfigs,
    enabledModels,
    availableModels,
    enabledAvailableModels,
    defaultModel,
    isLoading,
    getModelConfig,
    toggleModel,
    addCustomModelConfig,
    removeCustomModelConfig,
    updateCustomModelConfig,
    setDefaultModel,

    // 兼容旧版本
    apiKey,
    baseURL,

    // 同步状态
    saveError,
    isSaving,
    retrySave,

    // 生命周期
    fetch,
    saveToServer,
    clear,
    startWatching,
    setupEventListeners,
    teardownEventListeners,
  }
})