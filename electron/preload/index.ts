/**
 * @module electron/preload
 * @description 预加载脚本，通过 contextBridge 将安全的 IPC 调用桥接为 window.electronAPI。
 *              渲染进程通过此对象与主进程通信，无需直接访问 Node.js / Electron 内部 API。
 *              contextIsolation: true 确保渲染进程沙箱安全。
 * @layer electron-preload
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI } from '../electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  minimizeWindow: () => ipcRenderer.invoke('minimizeWindow'),
  maximizeWindow: () => ipcRenderer.invoke('maximizeWindow'),
} as IElectronAPI)
