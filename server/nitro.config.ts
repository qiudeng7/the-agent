import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  compatibilityDate: '2025-03-28',
  // 生产环境使用 Cloudflare Workers preset
  preset: 'cloudflare-module',
  // 启用 Nitro 数据库 API
  // 这会让 Nitro 正确配置 D1 binding 到 globalThis.__env__.DB
  experimental: {
    database: true,
  },
  // 自定义错误处理器，返回详细错误信息
  errorHandler: './error-handler.ts',
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
  alias: {
    '~': resolve(__dirname, '.'),
  },
  // Nitro 数据库配置
  // 生产环境：Cloudflare D1（通过 globalThis.__env__.DB 访问）
  // 开发环境：使用 better-sqlite3 内存数据库（在 db/index.ts 中实现）
  database: {
    default: {
      connector: 'cloudflare-d1',
      options: {
        bindingName: 'DB',
      },
    },
  },
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