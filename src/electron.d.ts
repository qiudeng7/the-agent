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
