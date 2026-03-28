/**
 * @module claude-installer/npm-installer
 * @description 通过 npm 安装 Claude Code。
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { platform as getPlatform } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

/**
 * 通过 npm 全局安装 @anthropic-ai/claude-code。
 * @param registry npm 镜像源
 * @param onProgress 进度回调
 * @returns claude 可执行文件路径
 */
export async function installClaudeWithNpm(
  registry?: string,
  onProgress?: (message: string) => void
): Promise<string> {
  onProgress?.('Installing @anthropic-ai/claude-code with npm...')

  const args = ['install', '-g', '@anthropic-ai/claude-code']
  if (registry) {
    args.push('--registry', registry)
    onProgress?.(`Using registry: ${registry}`)
  }

  const { stdout, stderr } = await execAsync(`npm ${args.join(' ')}`)
  onProgress?.(stdout)
  if (stderr) {
    onProgress?.(stderr)
  }

  // 查找安装后的 claude 路径
  const claudePath = await findInstalledClaude()
  if (!claudePath) {
    throw new Error('Claude Code installed but executable not found')
  }

  onProgress?.(`Claude Code installed at: ${claudePath}`)
  return claudePath
}

/**
 * 查找已安装的 Claude 路径。
 */
async function findInstalledClaude(): Promise<string | null> {
  const currentPlatform = getPlatform()

  try {
    // 尝试通过 npm root 获取全局安装目录
    const { stdout: npmRoot } = await execAsync('npm root -g')
    const globalDir = npmRoot.trim()

    if (currentPlatform === 'win32') {
      // Windows: npm root -g 返回 node_modules 目录
      // claude.cmd 在上一级目录
      const binDir = join(globalDir, '..', 'claude.cmd')
      return binDir
    } else {
      // macOS/Linux: claude 在 bin 目录
      const binDir = join(globalDir, '..', 'bin', 'claude')
      return binDir
    }
  } catch {
    // 回退：使用 which/where
    try {
      if (currentPlatform === 'win32') {
        const { stdout } = await execAsync('where claude')
        return stdout.trim().split('\n')[0]
      } else {
        const { stdout } = await execAsync('which claude')
        return stdout.trim()
      }
    } catch {
      return null
    }
  }
}

/**
 * 设置 npm 镜像源。
 */
export async function setNpmRegistry(registry: string): Promise<void> {
  await execAsync(`npm config set registry ${registry}`)
}

/**
 * 获取当前 npm 镜像源。
 */
export async function getNpmRegistry(): Promise<string> {
  const { stdout } = await execAsync('npm config get registry')
  return stdout.trim()
}