import type { ForgeConfig } from '@electron-forge/shared-types'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { downloadClaudeCode, downloadGitForWindows, type ClaudeCodePlatform } from './claude/downloader'
import 'dotenv/config'

// 获取 GitHub token（优先环境变量，否则从 gh CLI 获取）
function getGitHubToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN
  }
  try {
    return execSync('gh auth token', { encoding: 'utf-8' }).trim()
  } catch {
    console.warn('[Forge] Failed to get GitHub token from gh CLI')
    return undefined
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './public/icon',
    appBundleId: 'com.example.the-agent',
    appCategoryType: 'public.app-category.productivity',
    darwinDarkModeSupport: true,
  },
  rebuildConfig: {},
  makers: [
    // 构建为压缩包
    {
      name: '@electron-forge/maker-zip',
      config: {},
      platforms: ['darwin', 'win32', 'linux'],
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'qiudeng7',
          name: 'the-agent',
        },
        authToken: getGitHubToken(),
      },
    },
  ],
  plugins: [],
  hooks: {
    generateAssets: async (_config, platform, arch) => {
      const platformMap: Record<string, ClaudeCodePlatform> = {
        'darwin-arm64': 'darwin-arm64',
        'darwin-x64': 'darwin-x64',
        'linux-x64': 'linux-x64',
        'linux-arm64': 'linux-arm64',
        'win32-x64': 'win32-x64',
        'win32-arm64': 'win32-arm64',
      }

      const key = `${platform}-${arch}`
      const claudePlatform = platformMap[key]
      if (!claudePlatform) {
        console.warn(`[forge] Unsupported platform: ${key}, skipping Claude Code download`)
        return
      }

      const assetsDir = path.resolve(__dirname, 'claude-code-installation-assets', claudePlatform)
      fs.mkdirSync(assetsDir, { recursive: true })

      const binaryName = platform === 'win32' ? 'claude.exe' : 'claude'
      const destPath = path.join(assetsDir, binaryName)

      console.log(`[forge] Downloading Claude Code for ${claudePlatform}...`)
      const result = await downloadClaudeCode({ platform: claudePlatform, destPath })

      if (result.skipped) {
        console.log(`[forge] Claude Code ${result.version} already up-to-date, skipped download`)
      } else {
        console.log(`[forge] Downloaded Claude Code ${result.version} to ${destPath}`)
      }

      // 动态添加到 extraResource
      if (!_config.packagerConfig.extraResource) {
        _config.packagerConfig.extraResource = []
      }
      const extraRes = _config.packagerConfig.extraResource as string[]
      if (!extraRes.includes(assetsDir)) {
        extraRes.push(assetsDir)
      }

      // Windows 平台：下载 Git for Windows
      if (platform === 'win32') {
        const gitArch = arch === 'arm64' ? 'arm64' : 'x64'
        const gitDir = path.resolve(__dirname, 'claude-code-installation-assets', `win32-git-${gitArch}`)

        console.log(`[forge] Downloading Git for Windows ${gitArch}...`)
        await downloadGitForWindows({
          arch: gitArch,
          destDir: gitDir,
          onProgress: (msg) => console.log(`[forge] ${msg}`),
        })

        if (!extraRes.includes(gitDir)) {
          extraRes.push(gitDir)
        }
      }
    },
  },
}

export default config
