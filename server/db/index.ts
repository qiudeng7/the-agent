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
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import * as schema from './schema'

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

// 使用 BetterSQLite3Database 作为基础类型，因为 D1 和 SQLite 的方法签名相同
// 运行时会根据环境返回正确的实例
type DrizzleDb = BetterSQLite3Database<typeof schema>

// ─────────────────────────────────────────────────────────────────────────────
// 本地开发数据库（单例）
// ─────────────────────────────────────────────────────────────────────────────

let _localDb: DrizzleDb | null = null

function getLocalDb(): DrizzleDb {
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
function getD1Db(): DrizzleDb | null {
  // Nitro/db0 推荐的访问方式
  const env = (globalThis as any).__env__
  if (env && env.DB) {
    // D1 和 SQLite 的 Drizzle 方法签名相同，类型断言为 DrizzleDb
    return drizzle(env.DB, { schema }) as unknown as DrizzleDb
  }

  // 旧版兼容方式
  const cfEnv = (globalThis as any).__cf_env__
  if (cfEnv && cfEnv.DB) {
    return drizzle(cfEnv.DB, { schema }) as unknown as DrizzleDb
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
export function getDb(): DrizzleDb {
  const d1Db = getD1Db()
  if (d1Db) return d1Db
  return getLocalDb()
}

// 便捷导出（使用 Proxy 实现延迟加载）
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    return getDb()[prop as keyof DrizzleDb]
  },
})

export * from './schema'