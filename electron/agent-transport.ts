/**
 * @module electron/agent-transport
 * @description ElectronAgentTransport — 基于 Electron IPC 的 IAgentTransport 实现。
 *
 *              IPC 通道约定：
 *                agent:run   renderer → main (invoke): 发起任务，payload = AgentRunOptions
 *                agent:abort renderer → main (invoke): 取消任务，payload = taskId
 *                agent:event main → renderer (send):   推送流式事件，payload = AgentEvent
 *
 *              构造函数中一次性注册 ipcMain 处理器，onRun / onAbort 只设置回调指针，
 *              避免同一通道多次 handle 的冲突。
 * @layer electron-main
 */

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { AgentEvent, AgentRunOptions } from '#agent/types'
import type { IAgentTransport } from '#agent/interfaces/transport'

export class ElectronAgentTransport implements IAgentTransport {
  private _getWindow: () => BrowserWindow | null
  private _runHandler: ((options: AgentRunOptions) => void) | null = null
  private _abortHandler: ((taskId: string) => void) | null = null

  constructor(getWindow: () => BrowserWindow | null) {
    this._getWindow = getWindow

    // 一次性注册 IPC 处理器
    ipcMain.handle('agent:run', (_event, options: AgentRunOptions) => {
      this._runHandler?.(options)
    })

    ipcMain.handle('agent:abort', (_event, taskId: string) => {
      this._abortHandler?.(taskId)
    })
  }

  /** 向渲染进程推送流式事件 */
  send(event: AgentEvent): void {
    this._getWindow()?.webContents.send('agent:event', event)
  }

  onRun(handler: (options: AgentRunOptions) => void): () => void {
    this._runHandler = handler
    return () => { this._runHandler = null }
  }

  onAbort(handler: (taskId: string) => void): () => void {
    this._abortHandler = handler
    return () => { this._abortHandler = null }
  }
}
