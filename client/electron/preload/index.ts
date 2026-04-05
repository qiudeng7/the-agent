/**
 * @module electron/preload
 * @description 预加载脚本，通过 contextBridge 将安全的 IPC 调用桥接为 window.electronAPI。
 *              渲染进程通过此对象与主进程通信，无需直接访问 Node.js / Electron 内部 API。
 *              contextIsolation: true 确保渲染进程沙箱安全。
 *
 *              暴露的 agent 相关 API：
 *                agentRun(options)       发起任务（不含 toolExecutor，主进程注入）
 *                agentAbort(taskId)      取消任务
 *                onAgentEvent(handler)   订阅流式事件，返回取消订阅函数
 *                submitAskUserQuestionAnswer(payload)  提交 AskUserQuestion 答案
 *                onAskQuestion(handler)  监听 AskUserQuestion 请求
 *                answerAskQuestion(toolUseId, response)  回答 AskUserQuestion
 * @layer electron-preload
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI } from '../electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ── 系统 API ──────────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  minimizeWindow: () => ipcRenderer.invoke('minimizeWindow'),
  maximizeWindow: () => ipcRenderer.invoke('maximizeWindow'),

  // ── Agent API ─────────────────────────────────────────────────────────────
  agentRun: (options: Parameters<IElectronAPI['agentRun']>[0]) =>
    ipcRenderer.invoke('agent:run', options),

  agentAbort: (taskId: string) =>
    ipcRenderer.invoke('agent:abort', taskId),

  onAgentEvent: (handler: Parameters<IElectronAPI['onAgentEvent']>[0]) => {
    const listener = (_: Electron.IpcRendererEvent, event: unknown) =>
      handler(event as Parameters<typeof handler>[0])
    ipcRenderer.on('agent:event', listener)
    return () => ipcRenderer.removeListener('agent:event', listener)
  },

  submitAskUserQuestionAnswer: (payload: Parameters<IElectronAPI['submitAskUserQuestionAnswer']>[0]) =>
    ipcRenderer.invoke('agent:submit-answer', payload),

  onAskQuestion: (handler: Parameters<IElectronAPI['onAskQuestion']>[0]) => {
    const listener = (_: Electron.IpcRendererEvent, request: Parameters<typeof handler>[0]) =>
      handler(request)
    ipcRenderer.on('agent:ask-question', listener)
    return () => ipcRenderer.removeListener('agent:ask-question', listener)
  },

  answerAskQuestion: (toolUseId: string, response: Parameters<IElectronAPI['answerAskQuestion']>[1]) =>
    ipcRenderer.invoke('agent:answer-question', { toolUseId, response }),

  // ── Updater API ───────────────────────────────────────────────────────────
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterCancel: () => ipcRenderer.invoke('updater:cancel'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (handler: Parameters<IElectronAPI['onUpdaterStatus']>[0]) => {
    const listener = (_: Electron.IpcRendererEvent, data: Parameters<typeof handler>[0]) =>
      handler(data)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  },
  onUpdaterProgress: (handler: Parameters<IElectronAPI['onUpdaterProgress']>[0]) => {
    const listener = (_: Electron.IpcRendererEvent, progress: Parameters<typeof handler>[0]) =>
      handler(progress)
    ipcRenderer.on('updater:progress', listener)
    return () => ipcRenderer.removeListener('updater:progress', listener)
  },
} as IElectronAPI)
