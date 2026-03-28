/**
 * @module claude-installer/detector
 * @description 检测系统中是否已安装 Claude Code、Node.js、npm、fnm。
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { platform } from 'os'

const execAsync = promisify(exec)

/**
 * 查找 Claude 可执行文件路径。
 * @returns Claude 路径，未找到返回 null
 */
export async function findClaude(): Promise<string | null> {
  const currentPlatform = platform()

  try {
    // macOS 和 Linux 使用 whereis
    if (currentPlatform === 'darwin' || currentPlatform === 'linux') {
      const { stdout } = await execAsync('whereis claude')
      // whereis 输出格式: "claude: /path/to/claude /other/path"
      const parts = stdout.trim().split(/\s+/)
      if (parts.length > 1) {
        // 返回第一个找到的路径
        return parts[1]
      }
    }
    // Windows 使用 where
    else if (currentPlatform === 'win32') {
      const { stdout } = await execAsync('where claude')
      const paths = stdout.trim().split('\n')
      if (paths.length > 0) {
        return paths[0].trim()
      }
    }
  } catch {
    // 命令执行失败，说明未找到
  }

  return null
}

/**
 * 检查 npm 是否可用。
 * @returns npm 路径，未找到返回 null
 */
export async function findNpm(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('which npm')
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * 检查 fnm 是否可用。
 * @returns fnm 路径，未找到返回 null
 */
export async function findFnm(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('which fnm')
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * 获取 Node.js 版本。
 * @returns 版本字符串，未安装返回 null
 */
export async function getNodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('node --version')
    return stdout.trim()
  } catch {
    return null
  }
}

/**
 * 获取 npm 版本。
 * @returns 版本字符串，未安装返回 null
 */
export async function getNpmVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('npm --version')
    return stdout.trim()
  } catch {
    return null
  }
}