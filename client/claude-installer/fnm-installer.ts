/**
 * @module claude-installer/fnm-installer
 * @description FNM (Fast Node Manager) 安装逻辑。
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { platform as getPlatform, tmpdir } from 'os'
import { join, dirname } from 'path'
import { createWriteStream, existsSync, mkdirSync, rmSync, chmodSync, readdirSync, copyFileSync, Dirent } from 'fs'
import { pipeline } from 'stream/promises'
import { Extract } from 'unzipper'
import type { Platform } from './types'
import { FNM_DOWNLOAD_URLS } from './types'

const execAsync = promisify(exec)

/**
 * 下载文件。
 */
async function downloadFile(url: string, dest: string, onProgress?: (message: string) => void): Promise<void> {
  onProgress?.(`Downloading: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }

  const fileStream = createWriteStream(dest)
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Failed to get response reader')
  }

  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    fileStream.write(value)
  }

  fileStream.end()
}

/**
 * 安装 FNM。
 * @param onProgress 进度回调
 * @returns fnm 可执行文件路径
 */
export async function installFnm(
  onProgress?: (message: string) => void
): Promise<string> {
  const currentPlatform = getPlatform() as Platform
  const downloadUrl = FNM_DOWNLOAD_URLS[currentPlatform]

  if (!downloadUrl) {
    throw new Error(`Unsupported platform: ${currentPlatform}`)
  }

  onProgress?.(`Installing FNM for ${currentPlatform}...`)

  // 创建临时目录
  const tempDir = join(tmpdir(), 'claude-installer-fnm')
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true })
  }
  mkdirSync(tempDir, { recursive: true })

  // 下载 zip 文件
  const zipPath = join(tempDir, 'fnm.zip')
  await downloadFile(downloadUrl, zipPath, onProgress)

  // 解压
  onProgress?.('Extracting FNM...')
  await pipeline(
    require('fs').createReadStream(zipPath),
    Extract({ path: tempDir })
  )

  // 查找 fnm 可执行文件
  const fnmName = currentPlatform === 'win32' ? 'fnm.exe' : 'fnm'
  const fnmPath = join(tempDir, fnmName)

  if (!existsSync(fnmPath)) {
    // 可能在子目录中
    const files = readdirSync(tempDir, { recursive: true, withFileTypes: true }) as Dirent[]
    const fnmFile = files.find((f: Dirent) => f.name === fnmName)
    if (fnmFile) {
      // f.path 是目录路径，f.name 是文件名
      const actualPath = join((fnmFile as Dirent & { path: string }).path, fnmFile.name)
      // 移动到顶层
      copyFileSync(actualPath, fnmPath)
    }
  }

  if (!existsSync(fnmPath)) {
    throw new Error('FNM executable not found after extraction')
  }

  // 添加执行权限 (非 Windows)
  if (currentPlatform !== 'win32') {
    chmodSync(fnmPath, 0o755)
  }

  onProgress?.(`FNM installed at: ${fnmPath}`)
  return fnmPath
}

/**
 * 使用 FNM 安装 Node.js。
 * @param fnmPath fnm 可执行文件路径
 * @param version Node.js 版本
 * @param mirror 镜像源
 * @param onProgress 进度回调
 * @returns node 和 npm 的安装路径
 */
export async function installNodeWithFnm(
  fnmPath: string,
  version: string = '22',
  mirror?: string,
  onProgress?: (message: string) => void
): Promise<{ nodePath: string; npmPath: string }> {
  onProgress?.(`Installing Node.js ${version} with FNM...`)

  const env = { ...process.env }
  if (mirror) {
    env.FNM_NODE_DIST_MIRROR = mirror
    onProgress?.(`Using mirror: ${mirror}`)
  }

  // 安装 Node.js
  const { stdout } = await execAsync(`"${fnmPath}" install ${version}`, { env })
  onProgress?.(stdout)

  // 获取安装路径
  const { stdout: listOutput } = await execAsync(`"${fnmPath}" list`)
  onProgress?.(listOutput)

  // 使用 fnm use 切换版本
  await execAsync(`"${fnmPath}" use ${version}`, { env })

  // 获取 node 路径
  const { stdout: whichNode } = await execAsync(`"${fnmPath}" exec -- node -e "console.log(process.execPath)"`, { env })
  const nodePath = whichNode.trim()

  // npm 通常在 node 同目录
  const npmName = getPlatform() === 'win32' ? 'npm.cmd' : 'npm'
  const npmPath = join(dirname(nodePath), npmName)

  onProgress?.(`Node installed at: ${nodePath}`)
  onProgress?.(`npm installed at: ${npmPath}`)

  return { nodePath, npmPath }
}