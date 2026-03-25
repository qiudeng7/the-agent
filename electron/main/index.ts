/**
 * @module electron/main
 * @description Electron 主进程入口，负责创建 BrowserWindow 并注册 IPC 处理器。
 *              窗口配置：无边框（frame: false）+ macOS hiddenInset（保留原生红黄绿三圆点）。
 *              调试端口：9223（开发模式下供 chrome-devtools-mcp 连接）。
 *              IPC 处理器：
 *                - get-app-version / get-platform：返回应用信息
 *                - closeWindow / minimizeWindow / maximizeWindow：窗口控制
 *                - open-file-dialog：系统文件选择对话框
 * @layer electron-main
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

// 在创建窗口前配置远程调试端口
app.commandLine.appendSwitch('remote-debugging-port', '9223')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,  // 无边框窗口
    titleBarStyle: 'hiddenInset',  // macOS: 隐藏标题栏但保留原生窗口控制按钮
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 加载应用
  if (process.env.VITE_DEV_SERVER_URL) {
    // 开发模式：打开 DevTools
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
    console.log('[Electron] DevTools 远程调试端口：http://127.0.0.1:9223')
  } else {
    // 生产模式：从 asar 包中加载
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App events
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// 窗口控制
ipcMain.handle('closeWindow', () => {
  mainWindow?.close()
})

ipcMain.handle('minimizeWindow', () => {
  mainWindow?.minimize()
})

ipcMain.handle('maximizeWindow', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

// 示例：文件对话框
ipcMain.handle('open-file-dialog', async () => {
  const { dialog } = await import('electron')
  if (!mainWindow) return null
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
    ],
  })
})
