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

import https from 'https'
import http from 'http'
import fs from 'fs'
import crypto from 'crypto'

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
  /** true 表示本地已是最新，跳过了下载 */
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

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => (data += chunk.toString()))
      res.on('end', () => resolve(data.trim()))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function fetchJSON<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T
}

/**
 * 流式下载到文件，同时计算 SHA256，完成后与 expectedChecksum 比对。
 */
function downloadAndVerify(
  url: string,
  destPath: string,
  expectedChecksum: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      const total = parseInt(res.headers['content-length'] ?? '-1', 10)
      let downloaded = 0

      const fileStream = fs.createWriteStream(destPath)
      const hash = crypto.createHash('sha256')

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        hash.update(chunk)
        onProgress?.(downloaded, total)
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        const actual = hash.digest('hex')
        if (actual !== expectedChecksum) {
          fs.unlinkSync(destPath)
          reject(new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actual}`))
        } else {
          resolve()
        }
      })

      res.on('error', (err: Error) => {
        fs.unlinkSync(destPath)
        reject(err)
      })
      fileStream.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * 支持 301/302 跳转的 https.get。
 */
function httpsGet(
  url: string,
  callback: (res: http.IncomingMessage) => void,
): http.ClientRequest {
  const req = https.get(url, (res) => {
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      httpsGet(res.headers.location, callback)
      return
    }
    if (res.statusCode && res.statusCode >= 400) {
      callback(res)
      res.resume()
      return
    }
    callback(res)
  })
  return req
}
