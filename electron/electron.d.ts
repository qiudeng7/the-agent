// Electron IPC 类型声明
// 此文件为全局类型声明，无需 import/export

export interface IElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] } | null>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

export {}
