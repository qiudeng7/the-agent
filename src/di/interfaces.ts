/**
 * @module di/interfaces
 * @description 依赖注入接口定义。
 *              Stores 声明这些接口作为外部依赖，
 *              具体实现由 main.ts 通过 provide 注入。
 *
 * @layer di
 */

import type { AgentEvent, AgentRunOptions } from '#agent/types'

/** Agent 传输接口 */
export interface IAgentTransport {
  run(options: Omit<AgentRunOptions, 'toolExecutor'>): Promise<void>
  abort(taskId: string): Promise<void>
  onEvent(handler: (event: AgentEvent) => void): () => void
}

/** 存储接口 */
export interface IStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** 主题检测接口 */
export interface IThemeDetector {
  isDark: boolean
  onChange(callback: (isDark: boolean) => void): () => void
}

/** 语言检测接口 */
export interface ILanguageDetector {
  getLanguage(): string
}

/** 系统服务接口 */
export interface ISystemService {
  getAppVersion(): Promise<string>
  getPlatform(): Promise<string>
  theme: IThemeDetector
  language: ILanguageDetector
}

/** Vue provide/inject 的 key */
export const AGENT_TRANSPORT_KEY = Symbol('agentTransport')
export const STORAGE_KEY = Symbol('storage')
export const SYSTEM_SERVICE_KEY = Symbol('systemService')