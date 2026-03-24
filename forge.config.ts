import type { ForgeConfig } from '@electron-forge/shared-types'

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
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'the-agent',
        setupIcon: './public/icon.ico',
      },
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
  files: ['dist', 'dist-electron', 'node_modules', 'package.json'],
}

export default config
