/**
 * @module electron/agent-transport
 * @description ElectronAgentTransport — 基于 Electron IPC 的 IClaudeTransportServer 实现。
 *
 *              IPC 通道约定：
 *                agent:run   renderer → main (invoke): 发起任务，payload = ClaudeRunOptions
 *                agent:abort renderer → main (invoke): 取消任务，payload = taskId
 *                agent:event main → renderer (send):   推送流式事件，payload = ClaudeEvent
 *                agent:submit-answer renderer → main (invoke): 提交 AskUserQuestion 答案
 *                agent:ask-question main → renderer (send): 发送 AskUserQuestion 请求
 *                agent:answer-question renderer → main (invoke): 回答 AskUserQuestion
 *
 *              构造函数中一次性注册 ipcMain 处理器，onRun / onAbort 只设置回调指针，
 *              避免同一通道多次 handle 的冲突。
 * @layer electron-main
 */

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { ClaudeEvent, ClaudeRunOptions, AskUserQuestionAnswerPayload } from '#claude/types'
import type { IClaudeTransportServer, AskUserQuestionRequest, AskUserQuestionResponse } from '#claude/interfaces/transport'

export class ElectronAgentTransport implements IClaudeTransportServer {
  private _getWindow: () => BrowserWindow | null
  private _runHandler: ((options: ClaudeRunOptions) => void) | null = null
  private _abortHandler: ((taskId: string) => void) | null = null
  private _answerHandler: ((payload: AskUserQuestionAnswerPayload) => void) | null = null
  /** AskUserQuestion 请求的 resolver */
  private _askQuestionResolvers = new Map<string, (response: AskUserQuestionResponse | null) => void>()
  private _isRegistered = false

  constructor(getWindow: () => BrowserWindow | null) {
    this._getWindow = getWindow
    this._registerHandlers()
  }

  private _registerHandlers() {
    if (this._isRegistered) return
    this._isRegistered = true

    // 一次性注册 IPC 处理器
    console.log('[ElectronAgentTransport] Registering IPC handlers...')
    ipcMain.handle('agent:run', (_event, options: ClaudeRunOptions) => {
      console.log('[ElectronAgentTransport] agent:run received', options.taskId)
      this._runHandler?.(options)
    })

    ipcMain.handle('agent:abort', (_event, taskId: string) => {
      console.log('[ElectronAgentTransport] agent:abort received', taskId)
      this._abortHandler?.(taskId)
    })

    ipcMain.handle('agent:submit-answer', (_event, payload: AskUserQuestionAnswerPayload) => {
      console.log('[ElectronAgentTransport] agent:submit-answer received', payload.taskId, payload.toolUseId)
      this._answerHandler?.(payload)
    })

    // AskUserQuestion 答案响应
    ipcMain.handle('agent:answer-question', (_event, { toolUseId, response }: { toolUseId: string; response: AskUserQuestionResponse | null }) => {
      console.log('[ElectronAgentTransport] agent:answer-question received', toolUseId)
      const resolver = this._askQuestionResolvers.get(toolUseId)
      if (resolver) {
        resolver(response)
        this._askQuestionResolvers.delete(toolUseId)
      }
    })
    console.log('[ElectronAgentTransport] IPC handlers registered')
  }

  /** 清理 IPC handlers（应用退出时调用） */
  destroy() {
    if (this._isRegistered) {
      ipcMain.removeHandler('agent:run')
      ipcMain.removeHandler('agent:abort')
      ipcMain.removeHandler('agent:submit-answer')
      ipcMain.removeHandler('agent:answer-question')
      this._isRegistered = false
      console.log('[ElectronAgentTransport] IPC handlers removed')
    }
  }

  /** 向渲染进程推送流式事件 */
  send(event: ClaudeEvent): void {
    this._getWindow()?.webContents.send('agent:event', event)
  }

  onRun(handler: (options: ClaudeRunOptions) => void): () => void {
    this._runHandler = handler
    return () => { this._runHandler = null }
  }

  onAbort(handler: (taskId: string) => void): () => void {
    this._abortHandler = handler
    return () => { this._abortHandler = null }
  }

  /** 设置答案处理器 */
  onAnswer(handler: (payload: AskUserQuestionAnswerPayload) => void): () => void {
    this._answerHandler = handler
    return () => { this._answerHandler = null }
  }

  /**
   * 向渲染进程发送 AskUserQuestion 请求并等待响应。
   */
  async sendAskUserQuestion(request: AskUserQuestionRequest): Promise<AskUserQuestionResponse | null> {
    const window = this._getWindow()
    if (!window) {
      console.warn('[ElectronAgentTransport] No window available for AskUserQuestion')
      return null
    }

    return new Promise((resolve) => {
      // 先设置超时，超时后清理 resolver 并返回 null
      const timeoutId = setTimeout(() => {
        if (this._askQuestionResolvers.has(request.toolUseId)) {
          this._askQuestionResolvers.delete(request.toolUseId)
          resolve(null)
        }
      }, 5 * 60 * 1000)

      // 设置 resolver，在响应到达时清除超时并返回结果
      this._askQuestionResolvers.set(request.toolUseId, (response) => {
        clearTimeout(timeoutId)
        this._askQuestionResolvers.delete(request.toolUseId)
        resolve(response)
      })

      // 发送请求给前端
      window.webContents.send('agent:ask-question', request)
    })
  }
}