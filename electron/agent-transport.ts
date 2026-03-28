/**
 * @module electron/agent-transport
 * @description ElectronAgentTransport — 基于 Electron IPC 的 IClaudeTransportServer 实现。
 *
 *              IPC 通道约定：
 *                agent:run   renderer → main (invoke): 发起任务，payload = ClaudeRunOptions
 *                agent:abort renderer → main (invoke): 取消任务，payload = taskId
 *                agent:event main → renderer (send):   推送流式事件，payload = ClaudeEvent
 *
 *              构造函数中一次性注册 ipcMain 处理器，onRun / onAbort 只设置回调指针，
 *              避免同一通道多次 handle 的冲突。
 * @layer electron-main
 */

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { ClaudeEvent, ClaudeRunOptions } from '#claude/types'
import type { IClaudeTransportServer } from '#claude/interfaces/transport'

export class ElectronAgentTransport implements IClaudeTransportServer {
  private _getWindow: () => BrowserWindow | null
  private _runHandler: ((options: ClaudeRunOptions) => void) | null = null
  private _abortHandler: ((taskId: string) => void) | null = null

  constructor(getWindow: () => BrowserWindow | null) {
    this._getWindow = getWindow

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
    console.log('[ElectronAgentTransport] IPC handlers registered')
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
}