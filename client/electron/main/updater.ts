/**
 * @module electron/main/updater
 * @description Electron updater 模块（自实现版本）。
 *              使用 GitHub API 检查更新，下载 zip 包后提示用户手动安装。
 *
 *              IPC 通道约定：
 *                updater:check   renderer → main (invoke): 检查更新
 *                updater:download renderer → main (invoke): 下载更新
 *                updater:cancel  renderer → main (invoke): 取消下载
 *                updater:install renderer → main (invoke): 打开下载目录
 *                updater:status  main → renderer (send): 状态变化通知
 *                updater:progress main → renderer (send): 下载进度
 *
 * @layer electron-main
 */

import { ipcMain, app, BrowserWindow, shell } from 'electron'
import { https } from 'follow-redirects'
import fs from 'fs'
import path from 'path'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// ── 配置 ────────────────────────────────────────────────────────────────────

/** GitHub 代理地址（用于加速下载） */
const GITHUB_PROXY = 'https://v6.gh-proxy.org'

/** GitHub 仓库信息 */
const GITHUB_REPO = {
  owner: 'qiudeng7',
  name: 'the-agent',
}

// ── 类型定义 ────────────────────────────────────────────────────────────────

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'extracting'
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
  downloadUrl?: string
  downloadPath?: string
}

export interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

interface GitHubRelease {
  tag_name: string
  published_at: string
  body?: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
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
  let latestRelease: GitHubRelease | null = null
  let targetAsset: GitHubRelease['assets'][0] | null = null
  let downloadRequest: ReturnType<typeof https.request> | null = null
  let downloadedFilePath: string | null = null
  let pendingUpdateDir: string | null = null

  // ── 辅助函数 ─────────────────────────────────────────────────────────────

  function sendStatus(data: UpdaterStatusData) {
    console.log('[Updater] Status:', data.status, data.info?.version || '', data.error || '')
    getWindow()?.webContents.send('updater:status', data)
  }

  function sendProgress(progress: ProgressInfo) {
    getWindow()?.webContents.send('updater:progress', progress)
  }

  /** 获取当前平台的 asset 名称模式 */
  function getAssetPattern(): RegExp {
    const platform = process.platform
    const arch = process.arch

    // 匹配 the-agent-{platform}-{arch}-{version}.zip
    return new RegExp(`the-agent-${platform}-${arch}-\\d+\\.\\d+\\.\\d+\\.zip`)
  }

  /** 从 GitHub release 找到对应的 asset */
  function findAsset(release: GitHubRelease): GitHubRelease['assets'][0] | null {
    const pattern = getAssetPattern()
    return release.assets.find((asset) => pattern.test(asset.name)) || null
  }

  /** 调用 GitHub API 获取最新 release */
  async function fetchLatestRelease(): Promise<GitHubRelease> {
    const url = `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.name}/releases/latest`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'the-agent-updater',
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<GitHubRelease>
  }

  /** 比较版本号 */
  function isNewerVersion(latest: string, current: string): boolean {
    const parseVersion = (v: string) => {
      const parts = v.replace(/^v/, '').split('.').map(Number)
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
    }

    const l = parseVersion(latest)
    const c = parseVersion(current)

    if (l.major !== c.major) return l.major > c.major
    if (l.minor !== c.minor) return l.minor > c.minor
    return l.patch > c.patch
  }

  /** 获取当前安装位置 */
  function getCurrentInstallPath(): string {
    const appPath = app.getAppPath()

    if (process.platform === 'darwin') {
      // macOS: app.getAppPath() = /path/to/the-agent.app/Contents/Resources/app.asar
      // 需要向上找到 .app 目录
      let current = appPath
      while (current !== '/') {
        if (current.endsWith('.app')) return current
        current = path.dirname(current)
      }
      // 兜底：假设标准结构
      return path.dirname(path.dirname(path.dirname(appPath)))
    } else if (process.platform === 'win32') {
      // Windows: app.getAppPath() = /path/to/the-agent/resources/app.asar
      // 应用根目录是 resources 的父目录
      return path.dirname(path.dirname(appPath))
    }
    return appPath
  }

  /** 解压 zip 文件 */
  async function extractZip(zipPath: string, destDir: string): Promise<void> {
    fs.mkdirSync(destDir, { recursive: true })

    if (process.platform === 'darwin') {
      await execPromise(`unzip -o "${zipPath}" -d "${destDir}"`)
    } else if (process.platform === 'win32') {
      await execPromise(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`)
    }
  }

  /** macOS: 找解压后的 .app */
  function findExtractedApp(updateDir: string): string {
    const items = fs.readdirSync(updateDir)
    const appFile = items.find((f) => f.endsWith('.app'))
    if (appFile) return path.join(updateDir, appFile)

    // 嵌套结构: the-agent-darwin-arm64-xxx/the-agent.app
    for (const item of items) {
      const itemPath = path.join(updateDir, item)
      if (fs.statSync(itemPath).isDirectory()) {
        const subItems = fs.readdirSync(itemPath)
        const subApp = subItems.find((f) => f.endsWith('.app'))
        if (subApp) return path.join(itemPath, subApp)
      }
    }
    throw new Error('Could not find .app in extracted zip')
  }

  /** Windows: 找解压后的应用目录 */
  function findExtractedDir(updateDir: string): string {
    const items = fs.readdirSync(updateDir)
    if (items.includes('the-agent')) return path.join(updateDir, 'the-agent')

    // 嵌套结构
    for (const item of items) {
      const itemPath = path.join(updateDir, item)
      if (fs.statSync(itemPath).isDirectory()) {
        const subItems = fs.readdirSync(itemPath)
        if (subItems.includes('the-agent.exe')) return itemPath
      }
    }
    throw new Error('Could not find app directory in extracted zip')
  }

  /** 生成并执行替换脚本 */
  function quitAndInstall(updateDir: string): void {
    const installPath = getCurrentInstallPath()
    const tmpDir = app.getPath('temp')

    if (process.platform === 'darwin') {
      const scriptPath = path.join(tmpDir, 'the-agent-update.sh')
      const extractedApp = findExtractedApp(updateDir)

      const script = `#!/bin/bash
TARGET="$1"
SOURCE="$2"

sleep 3
rm -rf "$TARGET"
cp -R "$SOURCE" "$TARGET"
open "$TARGET"
`
      fs.writeFileSync(scriptPath, script)
      fs.chmodSync(scriptPath, 0o755)

      spawn('sh', [scriptPath, installPath, extractedApp], {
        detached: true,
        stdio: 'ignore',
      })
    } else if (process.platform === 'win32') {
      const scriptPath = path.join(tmpDir, 'the-agent-update.ps1')
      const extractedDir = findExtractedDir(updateDir)

      const script = `
param($Target, $Source)

Start-Sleep -Seconds 3
Remove-Item -Path $Target -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path $Source -Destination $Target -Recurse -Force
Start-Process (Join-Path $Target "the-agent.exe")
`
      fs.writeFileSync(scriptPath, script)

      spawn(
        'powershell',
        ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Target', installPath, '-Source', extractedDir],
        {
          detached: true,
          stdio: 'ignore',
        }
      )
    }

    app.quit()
  }

  // ── 核心逻辑函数 ───────────────────────────────────────────────────────────

  async function doCheck(): Promise<void> {
    try {
      sendStatus({ status: 'checking' })

      const release = await fetchLatestRelease()
      const asset = findAsset(release)

      if (!asset) {
        throw new Error(`No compatible asset found for platform ${process.platform}-${process.arch}`)
      }

      latestRelease = release
      targetAsset = asset

      const currentVersion = app.getVersion()
      const latestVersion = release.tag_name.replace(/^v/, '')

      if (isNewerVersion(release.tag_name, currentVersion)) {
        sendStatus({
          status: 'available',
          info: {
            version: latestVersion,
            releaseDate: release.published_at,
            releaseNotes: release.body,
            downloadUrl: asset.browser_download_url,
          },
        })
      } else {
        sendStatus({ status: 'not-available' })
      }
    } catch (err) {
      console.error('[Updater] Check failed:', err)
      sendStatus({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function doDownload(): Promise<void> {
    if (!targetAsset) {
      sendStatus({ status: 'error', error: 'No update available' })
      return
    }

    try {
      sendStatus({ status: 'downloading' })

      const tmpDir = app.getPath('temp')
      const zipPath = path.join(tmpDir, targetAsset.name)

      // 使用代理加速下载
      const downloadUrl = `${GITHUB_PROXY}/${targetAsset.browser_download_url}`

      console.log('[Updater] Downloading:', downloadUrl)

      await new Promise<void>((resolve, reject) => {
        const fileStream = fs.createWriteStream(zipPath)
        let downloadedBytes = 0
        const totalBytes = targetAsset!.size
        let startTime = Date.now()

        downloadRequest = https.get(downloadUrl, (response: import('http').IncomingMessage) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: ${response.statusCode}`))
            return
          }

          response.pipe(fileStream)

          response.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            const elapsed = (Date.now() - startTime) / 1000
            const bytesPerSecond = elapsed > 0 ? downloadedBytes / elapsed : 0
            const percent = (downloadedBytes / totalBytes) * 100

            sendProgress({
              percent,
              transferred: downloadedBytes,
              total: totalBytes,
              bytesPerSecond,
            })
          })

          fileStream.on('finish', () => {
            fileStream.close()
            downloadedFilePath = zipPath
            resolve()
          })
        })

        downloadRequest.on('error', (err: Error) => {
          fs.unlink(zipPath, () => {})
          reject(err)
        })
      })

      // 解压 zip
      sendStatus({ status: 'extracting' })
      const updateDir = path.join(tmpDir, 'the-agent-update')
      if (fs.existsSync(updateDir)) {
        fs.rmSync(updateDir, { recursive: true })
      }
      await extractZip(zipPath, updateDir)
      pendingUpdateDir = updateDir

      sendStatus({
        status: 'downloaded',
        info: {
          version: latestRelease!.tag_name.replace(/^v/, ''),
          releaseDate: latestRelease!.published_at,
          releaseNotes: latestRelease!.body,
        },
      })
    } catch (err) {
      console.error('[Updater] Download failed:', err)
      sendStatus({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  function doCancel(): void {
    if (downloadRequest) {
      downloadRequest.destroy()
      downloadRequest = null
    }
    sendStatus({ status: 'idle' })
  }

  function doInstall(): void {
    if (pendingUpdateDir) {
      quitAndInstall(pendingUpdateDir)
    } else if (downloadedFilePath) {
      // 兜底：打开 zip 所在目录
      shell.showItemInFolder(downloadedFilePath)
    }
  }

  // ── IPC 处理器 ───────────────────────────────────────────────────────────

  ipcMain.handle('updater:check', async () => {
    await doCheck()
  })

  ipcMain.handle('updater:download', async () => {
    await doDownload()
  })

  ipcMain.handle('updater:cancel', async () => {
    doCancel()
  })

  ipcMain.handle('updater:install', async () => {
    doInstall()
  })

  // ── 返回接口 ─────────────────────────────────────────────────────────────

  return {
    check: doCheck,
    download: doDownload,
    cancel: async () => doCancel(),
    install: async () => doInstall(),
    checkOnStartup: () => {
      setTimeout(() => doCheck(), 3000)
    },
    destroy: () => {
      ipcMain.removeHandler('updater:check')
      ipcMain.removeHandler('updater:download')
      ipcMain.removeHandler('updater:cancel')
      ipcMain.removeHandler('updater:install')
      downloadRequest?.destroy()
      downloadRequest = null
    },
  }
}