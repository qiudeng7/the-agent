/**
 * @module electron/main/updater
 * @description Electron updater 模块（函数式设计）。
 *              使用 electron-updater 实现自动检查和全量更新。
 *
 *              IPC 通道约定：
 *                updater:check   renderer → main (invoke): 检查更新
 *                updater:download renderer → main (invoke): 下载更新
 *                updater:cancel  renderer → main (invoke): 取消下载
 *                updater:install renderer → main (invoke): 安装更新（退出并重启）
 *                updater:status  main → renderer (send): 状态变化通知
 *                updater:progress main → renderer (send): 下载进度
 *
 * @layer electron-main
 */

import { autoUpdater, CancellationToken } from 'electron-updater'
import { ipcMain, BrowserWindow } from 'electron'

// ── 类型定义 ────────────────────────────────────────────────────────────────

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdaterStatusData {
  status: UpdaterStatus
  info?: UpdateInfo
  error?: string
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

interface UpdaterAPI {
  check: () => Promise<void>
  download: () => Promise<void>
  cancel: () => Promise<void>
  install: () => Promise<void>
  checkOnStartup: () => void
  destroy: () => void
}

// ── 函数式实现 ──────────────────────────────────────────────────────────────

/**
 * 创建 Electron updater 模块
 * @param getWindow 获取当前窗口的函数
 * @returns updater API 对象
 */
export function createElectronUpdater(getWindow: () => BrowserWindow | null): UpdaterAPI {
  // ── 内部状态（闭包管理） ────────────────────────────────────────────────
  let cancellationToken: CancellationToken | null = null

  // ── autoUpdater 配置 ─────────────────────────────────────────────────────
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  // ── 事件转发 ─────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...')
    getWindow()?.webContents.send('updater:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    getWindow()?.webContents.send('updater:status', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string | undefined,
      },
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available')
    getWindow()?.webContents.send('updater:status', { status: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download progress: ${progress.percent.toFixed(1)}%`)
    getWindow()?.webContents.send('updater:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    getWindow()?.webContents.send('updater:status', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string | undefined,
      },
    })
  })

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error.message)
    getWindow()?.webContents.send('updater:status', {
      status: 'error',
      error: error.message,
    })
  })

  // ── IPC 处理器 ───────────────────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[Updater] Check failed:', err)
      getWindow()?.webContents.send('updater:status', {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (result?.cancellationToken) {
        cancellationToken = result.cancellationToken
        await autoUpdater.downloadUpdate(cancellationToken)
      }
    } catch (err) {
      console.error('[Updater] Download failed:', err)
      getWindow()?.webContents.send('updater:status', {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  ipcMain.handle('updater:cancel', async () => {
    cancellationToken?.cancel()
    cancellationToken = null
    getWindow()?.webContents.send('updater:status', { status: 'idle' })
  })

  ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall()
  })

  // ── 返回接口 ─────────────────────────────────────────────────────────────
  return {
    check: async () => {
      await autoUpdater.checkForUpdates()
    },

    download: async () => {
      const result = await autoUpdater.checkForUpdates()
      if (result?.cancellationToken) {
        cancellationToken = result.cancellationToken
        await autoUpdater.downloadUpdate(cancellationToken)
      }
    },

    cancel: async () => {
      cancellationToken?.cancel()
      cancellationToken = null
    },

    install: async () => {
      autoUpdater.quitAndInstall()
    },

    checkOnStartup: () => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[Updater] Startup check failed:', err)
      })
    },

    destroy: () => {
      ipcMain.removeHandler('updater:check')
      ipcMain.removeHandler('updater:download')
      ipcMain.removeHandler('updater:cancel')
      ipcMain.removeHandler('updater:install')
    },
  }
}