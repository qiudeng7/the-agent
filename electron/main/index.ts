/**
 * @module electron/main
 * @description Electron 主进程入口，负责创建 BrowserWindow、注册 IPC 处理器，
 *              并组装 AgentRunner（provider + registry + transport）。
 *
 *              IPC 处理器：
 *                - get-app-version / get-platform：返回应用信息
 *                - closeWindow / minimizeWindow / maximizeWindow：窗口控制
 *                - open-file-dialog：系统文件选择对话框
 *                - agent:run / agent:abort：agent 任务控制（由 ElectronAgentTransport 注册）
 *
 *              调试端口：9223（开发模式下供 chrome-devtools-mcp 连接）
 * @layer electron-main
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { ClaudeProvider, AgentRunner, ToolRegistry } from '#agent'
import { ElectronAgentTransport } from '#electron/agent-transport'

let mainWindow: BrowserWindow | null = null

// 在创建窗口前配置远程调试端口
app.commandLine.appendSwitch('remote-debugging-port', '9223')

// ─────────────────────────────────────────────────────────────────────────────
// Agent 组装
// ─────────────────────────────────────────────────────────────────────────────

const transport = new ElectronAgentTransport(() => mainWindow)
const provider = new ClaudeProvider()   // 读取 ANTHROPIC_API_KEY 环境变量
const registry = new ToolRegistry()
const runner = new AgentRunner(provider, registry, transport)

// 启动 runner（监听 transport 事件）
runner.start()

// ─────────────────────────────────────────────────────────────────────────────
// 窗口管理
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
    console.log('[Electron] DevTools 远程调试端口：http://127.0.0.1:9223')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// App events
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.handle('get-platform', () => process.platform)

ipcMain.handle('closeWindow', () => mainWindow?.close())

ipcMain.handle('minimizeWindow', () => mainWindow?.minimize())

ipcMain.handle('maximizeWindow', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('open-file-dialog', async () => {
  const { dialog } = await import('electron')
  if (!mainWindow) return null
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }],
  })
})
