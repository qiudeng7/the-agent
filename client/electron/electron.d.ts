/**
 * @module electron/electron.d.ts
 * @description Electron IPC API 全局类型声明。
 *              定义 IElectronAPI 接口，并通过 declare global 扩展 Window 类型，
 *              使渲染进程 TypeScript 代码可以安全访问 window.electronAPI。
 * @layer types
 */

import type { ClaudeRunOptions, ClaudeEvent } from '#claude/types'

export interface IElectronAPI {
  // ── 系统 API ────────────────────────────────────────────────────────────
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] } | null>
  closeWindow: () => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>

  // ── Agent API ───────────────────────────────────────────────────────────
  /** 发起 agent 任务 */
  agentRun: (options: ClaudeRunOptions) => Promise<void>
  /** 取消指定任务 */
  agentAbort: (taskId: string) => Promise<void>
  /** 订阅流式事件，返回取消订阅函数 */
  onAgentEvent: (handler: (event: ClaudeEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

export {}
