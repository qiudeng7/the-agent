/**
 * Drizzle Kit 配置
 * 只用于生成迁移文件，不需要数据库连接
 *
 * 迁移流程：
 * 1. pnpm run db:generate - 生成迁移 SQL 文件
 * 2. pnpm run db:migrate:d1 - 通过 wrangler 应用到 D1
 *
 * 注意：开发环境使用内存数据库，每次启动自动初始化，无需迁移
 */
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  // 不需要 dbCredentials，只用 generate 命令
})