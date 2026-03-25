/**
 * @module electron/electron.d.ts
 * @description Electron IPC API 全局类型声明。
 *              定义 IElectronAPI 接口，并通过 declare global 扩展 Window 类型，
 *              使渲染进程 TypeScript 代码可以安全访问 window.electronAPI。
 * @layer types
 */

export interface IElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] } | null>
  closeWindow: () => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

export {}
