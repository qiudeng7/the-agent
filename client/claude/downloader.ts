/**
 * @module claude/downloader
 * @description 从 Anthropic GCS 下载 Claude Code 最新版二进制文件。
 *              供构建期脚本调用，将对应平台的二进制预置到应用资源目录中。
 *
 *              下载流程：
 *              1. GET .../latest          → 版本号字符串
 *              2. GET .../{ver}/manifest.json → 各平台 SHA256 checksum
 *              3. GET .../{ver}/{platform}/claude[.exe] → 二进制，边下边校验
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

const GCS_BUCKET =
  'https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases'

export type ClaudeCodePlatform =
  | 'darwin-arm64'
  | 'darwin-x64'
  | 'linux-x64'
  | 'linux-arm64'
  | 'linux-x64-musl'
  | 'linux-arm64-musl'
  | 'win32-x64'
  | 'win32-arm64'

export interface DownloadOptions {
  platform: ClaudeCodePlatform
  /** 保存路径（含文件名，Windows 需含 .exe） */
  destPath: string
  /** 进度回调：已下载字节数 / 总字节数（-1 表示未知） */
  onProgress?: (downloaded: number, total: number) => void
}

export interface DownloadResult {
  version: string
  platform: ClaudeCodePlatform
  destPath: string
  /** true 表示本地已是最新，跳过下载 */
  skipped: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 公共 API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 下载指定平台的 Claude Code 最新版二进制到 destPath。
 * 若文件已存在且 SHA256 与 manifest 一致，跳过下载。
 * 下载完成后自动校验 SHA256，Unix 平台自动 chmod +x。
 */
export async function downloadClaudeCode(options: DownloadOptions): Promise<DownloadResult> {
  const { platform, destPath, onProgress } = options

  const version = await fetchText(`${GCS_BUCKET}/latest`)
  const manifest = await fetchJSON<{ platforms: Record<string, { checksum: string }> }>(
    `${GCS_BUCKET}/${version}/manifest.json`,
  )

  const platformMeta = manifest.platforms[platform]
  if (!platformMeta) {
    throw new Error(`Platform "${platform}" not found in manifest (version ${version})`)
  }

  // 已存在且 checksum 匹配，跳过下载
  if (fs.existsSync(destPath) && computeFileSha256(destPath) === platformMeta.checksum) {
    // 确保已有执行权限
    if (!platform.startsWith('win32')) {
      fs.chmodSync(destPath, 0o755)
    }
    return { version, platform, destPath, skipped: true }
  }

  const binaryName = platform.startsWith('win32') ? 'claude.exe' : 'claude'
  const url = `${GCS_BUCKET}/${version}/${platform}/${binaryName}`

  await downloadAndVerify(url, destPath, platformMeta.checksum, onProgress)

  if (!platform.startsWith('win32')) {
    fs.chmodSync(destPath, 0o755)
  }

  return { version, platform, destPath, skipped: false }
}

/**
 * 仅查询当前最新版本号，不下载。
 */
export async function fetchLatestVersion(): Promise<string> {
  return fetchText(`${GCS_BUCKET}/latest`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部工具
// ─────────────────────────────────────────────────────────────────────────────

function computeFileSha256(filePath: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  return (await response.text()).trim()
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  return response.json() as Promise<T>
}

/**
 * 流式下载到文件，同时计算 SHA256，完成后与 expectedChecksum 比对。
 */
async function downloadAndVerify(
  url: string,
  destPath: string,
  expectedChecksum: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }

  const total = parseInt(response.headers.get('content-length') ?? '-1', 10)
  let downloaded = 0

  // 确保目标目录存在
  fs.mkdirSync(path.dirname(destPath), { recursive: true })

  // 创建写入流和 hash
  const fileStream = fs.createWriteStream(destPath)
  const hash = crypto.createHash('sha256')

  try {
    // 使用 TransformStream 来计算进度和 hash
    const transform = new TransformStream({
      transform(chunk, controller) {
        downloaded += chunk.length
        hash.update(chunk)
        onProgress?.(downloaded, total)
        controller.enqueue(chunk)
      },
    })

    // 检查 body 是否存在
    if (!response.body) {
      throw new Error('Response body is null')
    }

    // 连接管道：response.body -> transform -> fileStream
    await pipeline(response.body.pipeThrough(transform), fileStream)

    // 验证 checksum
    const actual = hash.digest('hex')
    if (actual !== expectedChecksum) {
      fs.unlinkSync(destPath)
      throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actual}`)
    }
  } catch (err) {
    // 清理部分下载的文件
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath)
      }
    } catch {
      /* ignore */
    }
    // 输出手动下载命令
    console.error('\n[Forge] Download failed:', err instanceof Error ? err.message : String(err))
    console.error('\n[Forge] You can manually download with this command:\n')
    console.error(`  curl -L -o "${destPath}" "${url}"\n`)
    console.error('[Forge] After manual download, re-run the build command.\n')
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Git for Windows 下载
// ─────────────────────────────────────────────────────────────────────────────

const GIT_FOR_WINDOWS_BASE_URL = 'https://github.com/git-for-windows/git/releases/download/v2.53.0.windows.2'

export interface GitForWindowsOptions {
  /** 架构：'x64' | 'arm64' */
  arch: 'x64' | 'arm64'
  /** 解压目标目录 */
  destDir: string
  /** 进度回调 */
  onProgress?: (message: string) => void
}

/**
 * 下载并解压 Git for Windows Portable 到指定目录。
 * 版本固定为 2.53.0.2。
 */
export async function downloadGitForWindows(options: GitForWindowsOptions): Promise<void> {
  const { arch, destDir, onProgress } = options
  // @ts-ignore - node-7z 没有类型定义
  const Seven = (await import('node-7z')).default
  const sevenBin = (await import('7zip-bin')).default

  // 确保 7za 二进制有执行权限（macOS/Linux 上 npm 安装后可能缺失）
  try {
    fs.chmodSync(sevenBin.path7za, 0o755)
  } catch {
    /* ignore */
  }

  const filename = arch === 'x64' ? 'PortableGit-2.53.0.2-64-bit.7z.exe' : 'PortableGit-2.53.0.2-arm64.7z.exe'
  const url = `${GIT_FOR_WINDOWS_BASE_URL}/${filename}`
  const tempFile = `${destDir}.7z.exe`

  onProgress?.(`Downloading Git for Windows ${arch}...`)
  fs.mkdirSync(destDir, { recursive: true })

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`)
    }
    if (!response.body) {
      throw new Error('Response body is null')
    }
    await pipeline(response.body, fs.createWriteStream(tempFile))
  } catch (err) {
    console.error('\n[Forge] Download failed:', err instanceof Error ? err.message : String(err))
    console.error('\n[Forge] You can manually download with this command:\n')
    console.error(`  curl -L -o "${tempFile}" "${url}"\n`)
    throw err
  }

  onProgress?.('Extracting Git for Windows...')
  const stream = Seven.extractFull(tempFile, destDir, {
    $bin: sevenBin.path7za,
  })

  await new Promise<void>((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  fs.unlinkSync(tempFile)
  onProgress?.(`Git for Windows extracted to ${destDir}`)
}