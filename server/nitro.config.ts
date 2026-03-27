import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  compatibilityDate: '2025-03-28',
  // 生产环境使用 Cloudflare Workers preset
  preset: 'cloudflare-module',
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
  alias: {
    '~': resolve(__dirname, '.'),
  },
  // Nitro 内置数据库配置（使用 db0）
  // 生产环境：Cloudflare D1
  // 开发环境：本地 SQLite
  database: {
    default: {
      connector: 'cloudflare-d1',
      options: {
        bindingName: 'DB',
      },
    },
  },
  devDatabase: {
    default: {
      connector: 'better-sqlite3',
      options: {
        name: 'local',
      },
    },
  },
}