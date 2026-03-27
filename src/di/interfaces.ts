/**
 * @module di/interfaces
 * @description 依赖注入接口定义。
 *              定义 stores 需要的外部依赖抽象，
 *              使 stores 与具体实现解耦。
 *
 * 设计原则：
 * - 接口只描述 stores 真正需要的依赖
 * - 接口应尽量小（接口隔离）
 * - 方便测试时 mock
 *
 * @layer di
 */

import type { AgentEvent, AgentRunOptions } from '#agent/types'

// ─────────────────────────────────────────────────────────────────────────────
// Agent 传输接口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent 任务传输接口
 * 用于 agent store 与后端通信
 */
export interface IAgentTransport {
  /** 发起 agent 任务 */
  run(options: Omit<AgentRunOptions, 'toolExecutor'>): Promise<void>
  /** 取消指定任务 */
  abort(taskId: string): Promise<void>
  /** 订阅流式事件，返回取消订阅函数 */
  onEvent(handler: (event: AgentEvent) => void): () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// 存储接口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 键值存储接口
 * 用于 settings store 持久化
 */
export interface IStorage {
  /** 读取数据 */
  getItem(key: string): string | null
  /** 存储数据 */
  setItem(key: string, value: string): void
  /** 删除数据 */
  removeItem(key: string): void
}

// ─────────────────────────────────────────────────────────────────────────────
// 系统服务接口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 系统主题检测接口
 */
export interface IThemeDetector {
  /** 当前是否为深色模式 */
  isDark: boolean
  /** 监听系统主题变化 */
  onChange(callback: (isDark: boolean) => void): () => void
}

/**
 * 系统语言检测接口
 */
export interface ILanguageDetector {
  /** 获取系统语言 */
  getLanguage(): string
}

/**
 * 系统服务接口（合并）
 */
export interface ISystemService {
  /** 获取应用版本 */
  getAppVersion(): Promise<string>
  /** 获取平台信息 */
  getPlatform(): Promise<string>
  /** 主题检测 */
  theme: IThemeDetector
  /** 语言检测 */
  language: ILanguageDetector
}

// ─────────────────────────────────────────────────────────────────────────────
// 依赖注入容器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * stores 需要的所有外部依赖
 */
export interface IStoreDependencies {
  /** Agent 传输 */
  agentTransport: IAgentTransport
  /** 存储服务 */
  storage: IStorage
  /** 系统服务 */
  systemService: ISystemService
}

/**
 * Store 注入的依赖（部分可选）
 */
export type StoreInject = Partial<IStoreDependencies>