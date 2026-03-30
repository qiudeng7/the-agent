import type { ForgeConfig } from '@electron-forge/shared-types'
import path from 'path'
import fs from 'fs'
import { downloadClaudeCode, type ClaudeCodePlatform } from './claude/downloader'

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
    {
      name: '@electron-forge/maker-zip',
      config: {},
      platforms: ['darwin', 'win32', 'linux'],
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          name: 'the-agent',
          productName: 'The Agent',
          homepage: 'https://github.com/your-org/the-agent',
          icon: './public/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'the-agent',
          productName: 'The Agent',
          homepage: 'https://github.com/your-org/the-agent',
          icon: './public/icon.png',
        },
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
    },
  },
}

export default config
