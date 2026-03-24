import { contextBridge, ipcRenderer } from 'electron'

// 定义 IPC 通道类型
export interface IElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] } | null>
}

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
} as IElectronAPI)

// 类型声明
declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
