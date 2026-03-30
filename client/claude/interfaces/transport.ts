/**
 * @module claude/interfaces/transport
 * @description IClaudeTransportServer — Claude Agent 与外部通信的抽象层（主进程端）。
 *
 *              将 Claude Agent 执行逻辑与宿主环境的通信机制完全解耦：
 *              - Electron 宿主：通过 ipcMain.handle + webContents.send 实现
 *              - HTTP Server 宿主：通过 SSE（Server-Sent Events）或 WebSocket 实现
 *
 *              执行层（ClaudeRunner）只依赖此接口，切换宿主时不需要改 runner 代码。
 *
 *              与 IAgentTransportClient 的区别：
 *              - Server（主进程）：监听 onRun/onAbort，发送 send
 *              - Client（渲染进程）：调用 run/abort，监听 onEvent
 */

import type { ClaudeEvent, ClaudeRunOptions, AskUserQuestionAnswerPayload, AskUserQuestionItem } from '../types'
import type { InstallerProgressEvent } from '#claude-installer/types'

/** AskUserQuestion 请求 */
export interface AskUserQuestionRequest {
  taskId: string
  toolUseId: string
  questions: AskUserQuestionItem[]
}

/** AskUserQuestion 响应 */
export interface AskUserQuestionResponse {
  answers: Record<string, string>
  annotations?: Record<string, { notes?: string; preview?: string }>
}

export interface IClaudeTransportServer {
  /**
   * 向外部（渲染进程 / HTTP 客户端）推送一个流式事件。
   * 调用者保证在 onRun 的 handler 返回前，send 始终可用。
   */
  send(event: ClaudeEvent): void

  /**
   * 向外部推送进度消息（用于初始化过程中的进度反馈）。
   */
  sendProgress(event: InstallerProgressEvent): void

  /**
   * 监听来自外部的任务启动请求。
   * @param handler - 收到请求时的回调，参数为完整的 ClaudeRunOptions
   * @returns 取消监听的函数（cleanup）
   */
  onRun(handler: (options: ClaudeRunOptions) => void): () => void

  /**
   * 监听来自外部的取消请求。
   * @param handler - 收到请求时的回调，参数为 taskId
   * @returns 取消监听的函数（cleanup）
   */
  onAbort(handler: (taskId: string) => void): () => void

  /**
   * 监听来自外部的 AskUserQuestion 答案提交。
   * @param handler - 收到请求时的回调，参数为答案 payload
   * @returns 取消监听的函数（cleanup）
   */
  onAnswer?(handler: (payload: AskUserQuestionAnswerPayload) => void): () => void

  /**
   * 向外部发送 AskUserQuestion 请求并等待响应。
   * 用于在 canUseTool 回调中请求前端显示对话框。
   * @param request - AskUserQuestion 请求数据
   * @returns 用户响应，如果取消则返回 null
   */
  sendAskUserQuestion?(request: AskUserQuestionRequest): Promise<AskUserQuestionResponse | null>
}