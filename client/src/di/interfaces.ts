/**
 * @module di/interfaces
 * @description 依赖注入接口定义。
 *              Stores 声明这些接口作为外部依赖，
 *              具体实现由 main.ts 通过 provide 注入。
 *
 *              与 IAgentTransportServer 的区别：
 *              - Server（主进程）：监听 onRun/onAbort，发送 send
 *              - Client（渲染进程）：调用 run/abort，监听 onEvent
 *
 * @layer di
 */

import type { ClaudeRunOptions, ClaudeEvent } from '#claude/types'

/** Agent 传输接口（渲染进程端） */
export interface IAgentTransportClient {
  /**
   * 发起 Agent 任务
   * @param options 运行选项，包含 prompt、model 等
   */
  run(options: ClaudeRunOptions): Promise<void>
  /**
   * 取消任务
   * @param taskId 任务 ID
   */
  abort(taskId: string): Promise<void>
  /**
   * 订阅 Agent 事件流
   * @param handler 事件处理函数
   * @returns 取消订阅函数
   */
  onEvent(handler: (event: ClaudeEvent) => void): () => void
}

/** 存储接口 */
export interface IStorage {
  /** 获取存储值 */
  getItem(key: string): string | null
  /** 设置存储值 */
  setItem(key: string, value: string): void
  /** 删除存储值 */
  removeItem(key: string): void
}

/** 主题检测接口 */
export interface IThemeDetector {
  /** 当前是否为深色模式 */
  isDark: boolean
  /**
   * 监听主题变化
   * @param callback 主题变化回调
   * @returns 取消监听函数
   */
  onChange(callback: (isDark: boolean) => void): () => void
}

/** 语言检测接口 */
export interface ILanguageDetector {
  /** 获取当前系统语言 */
  getLanguage(): string
}

/** 系统服务接口 */
export interface ISystemService {
  /** 获取应用版本号 */
  getAppVersion(): Promise<string>
  /** 获取运行平台（darwin/win32/linux 等） */
  getPlatform(): Promise<string>
  /** 主题检测器 */
  theme: IThemeDetector
  /** 语言检测器 */
  language: ILanguageDetector
}

/** Vue provide/inject 的 key */
export const AGENT_TRANSPORT_KEY = Symbol('agentTransportClient')
export const STORAGE_KEY = Symbol('storage')
export const SYSTEM_SERVICE_KEY = Symbol('systemService')