/**
 * @module electron/main
 * @description Electron 主进程入口，负责创建 BrowserWindow、注册 IPC 处理器，
 *             并组装 Claude Agent 执行逻辑。
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
import fs from 'fs'
import { runAgent, type AgentConfig } from '#claude'
import { ElectronAgentTransport } from '#electron/agent-transport'
import { createElectronUpdater } from '#electron/main/updater'

let mainWindow: BrowserWindow | null = null

// 在创建窗口前配置远程调试端口
app.commandLine.appendSwitch('remote-debugging-port', '9223')

// ─────────────────────────────────────────────────────────────────────────────
// Updater
// ─────────────────────────────────────────────────────────────────────────────

let updater: ReturnType<typeof createElectronUpdater> | null = null

function setupUpdater() {
  updater = createElectronUpdater(() => mainWindow)
  updater.checkOnStartup()
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 组装
// ─────────────────────────────────────────────────────────────────────────────

/** 最小运行状态：taskId → AbortController（用于 IPC abort） */
const abortControllers = new Map<string, AbortController>()

let transport: ElectronAgentTransport | null = null

function resolveBundledClaudePath(): string | undefined {
  const platform = process.platform
  const arch = process.arch
  const binaryName = platform === 'win32' ? 'claude.exe' : 'claude'

  const baseDir = process.env.VITE_DEV_SERVER_URL
    ? path.resolve(__dirname, '../../claude-code-installation-assets')
    : process.resourcesPath

  const candidate = path.join(baseDir, `${platform}-${arch}`, binaryName)
  return fs.existsSync(candidate) ? candidate : undefined
}

function resolveGitPath(): string | undefined {
  if (process.platform !== 'win32') return undefined

  // 开发环境：从项目目录下的 claude-code-installation-assets 读取
  // 生产环境：从 process.resourcesPath 读取
  const baseDir = process.env.VITE_DEV_SERVER_URL
    ? path.resolve(__dirname, '../../claude-code-installation-assets')
    : process.resourcesPath

  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const gitDir = path.join(baseDir, `win32-git-${arch}`)
  if (!fs.existsSync(gitDir)) return undefined
  return gitDir
}

function setupAgent() {
  console.log('[Claude] Setting up claude runner...')
  transport = new ElectronAgentTransport(() => mainWindow)

  const gitPath = resolveGitPath()
  if (gitPath) {
    console.log('[Claude] Injecting bundled Git for Windows into PATH')
  }

  const config: AgentConfig = {
    claudePath: resolveBundledClaudePath(),
    gitPath,
    defaultModel: 'claude-opus-4-6',
  }

  if (config.claudePath) {
    console.log('[Claude] Using bundled claude:', config.claudePath)
  }

  // 监听 IPC 事件
  transport.onRun((options) => {
    // 异步执行，不阻塞
    void handleRun(options, config, transport!)
  })

  transport.onAbort((taskId) => {
    const ctrl = abortControllers.get(taskId)
    if (ctrl) {
      ctrl.abort()
      abortControllers.delete(taskId)
      console.log('[Claude] Aborted task:', taskId)
    }
  })

  console.log('[Claude] Claude runner started')
}

async function handleRun(
  options: import('#claude/types').ClaudeRunOptions,
  config: AgentConfig,
  transport: ElectronAgentTransport,
) {
  const { taskId } = options
  const ctrl = new AbortController()
  abortControllers.set(taskId, ctrl)

  console.log('[Claude] Starting task:', taskId)

  try {
    for await (const event of runAgent(options, config, transport)) {
      // 检查是否被 abort
      if (ctrl.signal.aborted) {
        transport.send({
          type: 'error',
          taskId,
          error: 'Task aborted',
          code: 'aborted',
        })
        return
      }
      transport.send(event)
    }
    console.log('[Claude] Task completed:', taskId)
  } catch (err) {
    console.error('[Claude] Task error:', taskId, err)
    transport.send({
      type: 'error',
      taskId,
      error: err instanceof Error ? err.message : String(err),
    })
  } finally {
    abortControllers.delete(taskId)
  }
}

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
  setupAgent()
  setupUpdater()
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

app.on('will-quit', () => {
  transport?.destroy()
  transport = null
  updater?.destroy()
  updater = null
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