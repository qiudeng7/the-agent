/**
 * @module claude-installer/installer
 * @description Claude Code 主安装器，整合检测、FNM、NPM 安装逻辑。
 */

import { rmSync } from 'fs'
import type { InstallResult, InstallOptions } from './types'
import { DEFAULT_OPTIONS } from './types'
import { findClaude, findNpm, findFnm } from './detector'
import { installFnm, installNodeWithFnm } from './fnm-installer'
import { installClaudeWithNpm } from './npm-installer'

/**
 * 确保 Claude Code 已安装。
 *
 * 流程：
 * 1. 检查系统中是否已有 claude
 * 2. 如果没有，检查是否有 npm
 * 3. 如果有 npm，直接用 npm 安装
 * 4. 如果没有 npm，检查是否有 fnm
 * 5. 如果有 fnm，用 fnm 安装 node，再用 npm 安装
 * 6. 如果没有 fnm，下载安装 fnm，再安装 node 和 claude
 *
 * @param options 安装选项
 * @returns 安装结果
 */
export async function ensureClaudeInstalled(
  options: InstallOptions = {}
): Promise<InstallResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const onProgress = opts.onProgress || (() => {})

  try {
    // Step 1: 检查是否已安装
    onProgress('Checking for existing Claude installation...')
    const existingClaude = await findClaude()
    if (existingClaude) {
      onProgress(`Found existing Claude at: ${existingClaude}`)
      return {
        success: true,
        claudePath: existingClaude,
        method: 'existing',
      }
    }

    // Step 2: 检查 npm
    onProgress('Checking for npm...')
    const existingNpm = await findNpm()
    if (existingNpm) {
      onProgress(`Found npm at: ${existingNpm}`)
      const claudePath = await installClaudeWithNpm(
        opts.useChinaMirror ? opts.npmRegistry : undefined,
        onProgress
      )
      return {
        success: true,
        claudePath,
        method: 'npm',
      }
    }

    // Step 3: 检查 fnm
    onProgress('Checking for fnm...')
    const existingFnm = await findFnm()
    let fnmPath: string
    let shouldCleanupFnm = false

    if (!existingFnm) {
      // 安装 fnm
      onProgress('FNM not found, installing...')
      fnmPath = await installFnm(onProgress)
      shouldCleanupFnm = true
    } else {
      onProgress(`Found fnm at: ${existingFnm}`)
      fnmPath = existingFnm
    }

    try {
      // 使用 fnm 安装 Node.js
      await installNodeWithFnm(
        fnmPath,
        '22',
        opts.useChinaMirror ? opts.fnmMirror : undefined,
        onProgress
      )

      // 使用 npm 安装 Claude
      const claudePath = await installClaudeWithNpm(
        opts.useChinaMirror ? opts.npmRegistry : undefined,
        onProgress
      )

      return {
        success: true,
        claudePath,
        method: 'fnm',
      }
    } finally {
      // 清理临时 fnm
      if (shouldCleanupFnm && fnmPath) {
        onProgress('Cleaning up temporary FNM...')
        try {
          const fnmDir = require('path').dirname(fnmPath)
          rmSync(fnmDir, { recursive: true, force: true })
        } catch {
          // 忽略清理错误
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    onProgress(`Installation failed: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * 仅检测 Claude 路径，不安装。
 */
export async function detectClaude(): Promise<string | null> {
  return findClaude()
}