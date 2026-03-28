/**
 * @module di/electron
 * @description Electron 环境的依赖实现。
 *
 * @layer di
 */

import type { IAgentTransportClient, IStorage, ISystemService, IThemeDetector, ILanguageDetector } from './interfaces'

/** Electron Agent 传输（渲染进程端） */
export function createElectronAgentTransport(): IAgentTransportClient {
  return {
    run: (options) => window.electronAPI.agentRun(options),
    abort: (taskId) => window.electronAPI.agentAbort(taskId),
    onEvent: (handler) => window.electronAPI.onAgentEvent(handler),
  }
}

/** localStorage 存储 */
export function createLocalStorage(): IStorage {
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  }
}

/** 浏览器主题检测 */
export function createThemeDetector(): IThemeDetector {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const callbacks = new Set<(isDark: boolean) => void>()

  mediaQuery.addEventListener('change', (e) => {
    callbacks.forEach(cb => cb(e.matches))
  })

  return {
    get isDark() { return mediaQuery.matches },
    onChange: (callback) => {
      callbacks.add(callback)
      return () => callbacks.delete(callback)
    },
  }
}

/** 浏览器语言检测 */
export function createLanguageDetector(): ILanguageDetector {
  return {
    getLanguage: () => navigator.language,
  }
}

/** Electron 系统服务 */
export function createElectronSystemService(): ISystemService {
  return {
    getAppVersion: () => window.electronAPI.getAppVersion(),
    getPlatform: () => window.electronAPI.getPlatform(),
    theme: createThemeDetector(),
    language: createLanguageDetector(),
  }
}

/** 创建 Electron 环境的所有依赖 */
export function createElectronDependencies() {
  return {
    agentTransport: createElectronAgentTransport(),
    storage: createLocalStorage(),
    systemService: createElectronSystemService(),
  }
}