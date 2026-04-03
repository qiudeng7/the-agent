import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 部署模式：cloudflare（默认）或 standalone
const deployMode = process.env.DEPLOY_MODE || 'cloudflare'
const isStandalone = deployMode === 'standalone'

export default {
  compatibilityDate: '2025-03-28',
  // 生产环境 preset 根据部署模式切换
  // cloudflare → Cloudflare Workers
  // standalone → Node.js 服务
  preset: isStandalone ? 'node-server' : 'cloudflare-module',
  // 自定义错误处理器，返回详细错误信息
  errorHandler: './error-handler.ts',
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
  alias: {
    '~': resolve(__dirname, '.'),
  },
  // Nitro 数据库配置（仅 Cloudflare 模式）
  // standalone 模式使用 better-sqlite3，在 db/index.ts 中处理
  ...(!isStandalone && {
    experimental: {
      database: true,
    },
    database: {
      default: {
        connector: 'cloudflare-d1',
        options: {
          bindingName: 'DB',
        },
      },
    },
  }),
  // 开发环境 CORS 配置
  devServer: {
    cors: true,
  },
  // 生产环境 CORS（通过 routeRules）
  routeRules: {
    '/api/**': {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
      },
    },
  },
}