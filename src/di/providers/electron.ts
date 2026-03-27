/**
 * @module di/providers/electron
 * @description Electron 环境的依赖实现。
 *              将 Electron IPC API 适配为 DI 接口。
 *
 * @layer di
 */

import type { IAgentTransport, IStorage, ISystemService, IThemeDetector, ILanguageDetector } from '../interfaces'

/**
 * 创建 Electron Agent 传输实现
 */
export function createElectronAgentTransport(): IAgentTransport {
  return {
    async run(options) {
      await window.electronAPI.agentRun(options)
    },

    async abort(taskId) {
      await window.electronAPI.agentAbort(taskId)
    },

    onEvent(handler) {
      return window.electronAPI.onAgentEvent(handler)
    },
  }
}

/**
 * 创建 localStorage 存储实现
 */
export function createLocalStorageProvider(): IStorage {
  return {
    getItem(key: string) {
      return localStorage.getItem(key)
    },

    setItem(key: string, value: string) {
      localStorage.setItem(key, value)
    },

    removeItem(key: string) {
      localStorage.removeItem(key)
    },
  }
}

/**
 * 创建浏览器主题检测实现
 */
export function createBrowserThemeDetector(): IThemeDetector {
  let callbacks: Array<(isDark: boolean) => void> = []

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  mediaQuery.addEventListener('change', (e) => {
    callbacks.forEach(cb => cb(e.matches))
  })

  return {
    get isDark() {
      return mediaQuery.matches
    },

    onChange(callback) {
      callbacks.push(callback)
      return () => {
        callbacks = callbacks.filter(cb => cb !== callback)
      }
    },
  }
}

/**
 * 创建浏览器语言检测实现
 */
export function createBrowserLanguageDetector(): ILanguageDetector {
  return {
    getLanguage() {
      return navigator.language
    },
  }
}

/**
 * 创建 Electron 系统服务实现
 */
export function createElectronSystemService(): ISystemService {
  const theme = createBrowserThemeDetector()
  const language = createBrowserLanguageDetector()

  return {
    async getAppVersion() {
      return window.electronAPI.getAppVersion()
    },

    async getPlatform() {
      return window.electronAPI.getPlatform()
    },

    theme,
    language,
  }
}

/**
 * 初始化 Electron 环境的所有依赖
 */
export function createElectronDependencies() {
  return {
    agentTransport: createElectronAgentTransport(),
    storage: createLocalStorageProvider(),
    systemService: createElectronSystemService(),
  }
}