/**
 * @module db/index
 * @description 数据库连接适配器
 *              支持 D1（Cloudflare Workers）和 better-sqlite3（本地开发/单机部署）
 *
 *              Nitro 3 通过 db0 连接器配置数据库：
 *              - 生产环境：cloudflare-d1 连接器，通过 globalThis.__env__.DB 获取绑定
 *              - 开发环境：better-sqlite3 连接器
 */
import { drizzle } from 'drizzle-orm/d1'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { schema } from './schema'

// ─────────────────────────────────────────────────────────────────────────────
// 本地开发数据库（单例）
// ─────────────────────────────────────────────────────────────────────────────

let _localDb: ReturnType<typeof drizzleSqlite> | null = null

function getLocalDb() {
  if (_localDb) return _localDb

  const dbPath = join(process.cwd(), 'data', 'local.db')
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  _localDb = drizzleSqlite(sqlite, { schema })
  return _localDb
}

// ─────────────────────────────────────────────────────────────────────────────
// D1 数据库获取
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取 D1 数据库实例（用于 Cloudflare Workers）
 *
 * Nitro 使用 db0 cloudflare-d1 连接器，它会将 D1 binding 放到：
 * - globalThis.__env__.DB（推荐方式）
 * - globalThis.__cf_env__.DB（旧版兼容）
 */
function getD1Db() {
  // Nitro/db0 推荐的访问方式
  const env = (globalThis as any).__env__
  if (env && env.DB) {
    return drizzle(env.DB, { schema })
  }

  // 旧版兼容方式
  const cfEnv = (globalThis as any).__cf_env__
  if (cfEnv && cfEnv.DB) {
    return drizzle(cfEnv.DB, { schema })
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取数据库实例
 * - Cloudflare Workers: 使用 D1（通过 Nitro 的 __env__ 绑定）
 * - 本地开发: 使用 better-sqlite3
 */
export function getDb() {
  const d1Db = getD1Db()
  if (d1Db) return d1Db
  return getLocalDb()
}

// 便捷导出（使用 Proxy 实现延迟加载）
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>]
  },
})

export * from './schema'