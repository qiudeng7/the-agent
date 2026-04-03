/**
 * @module db/index
 * @description 数据库连接层
 *              使用 Nitro database API + drizzle-orm
 *
 *              架构：
 *              - Cloudflare 模式：D1 + drizzle-orm/d1
 *              - Standalone 模式：SQLite 文件数据库 + drizzle-orm/better-sqlite3
 *              - 开发环境（无 D1 binding）：内存数据库 + drizzle-orm/better-sqlite3
 *
 *              环境变量：
 *              - DEPLOY_MODE: cloudflare | standalone
 *              - DATABASE_PATH: standalone 模式的数据库文件路径（默认 ./data.db）
 */
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleBetterSqlite3 } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

// 使用 D1 类型作为主类型，better-sqlite3 实例通过 unknown 中间转换
type DrizzleDb = ReturnType<typeof drizzleD1<typeof schema>>

// ─────────────────────────────────────────────────────────────────────────────
// 数据库实例获取
// ─────────────────────────────────────────────────────────────────────────────

let _db: DrizzleDb | null = null

/**
 * 获取数据库实例
 * - Cloudflare 生产环境：从 Nitro 的 D1 binding 获取
 * - Standalone 模式：使用 better-sqlite3 文件数据库
 * - 开发环境：使用 better-sqlite3 内存数据库
 */
function getDb(): DrizzleDb {
  if (_db) return _db

  // 检查部署模式
  const deployMode = process.env.DEPLOY_MODE || 'cloudflare'

  // 1. Cloudflare 模式：尝试获取 D1 binding
  const env = (globalThis as any).__env__
  if (deployMode === 'cloudflare' && env?.DB) {
    console.log('[DB] Using D1 database (Cloudflare)')
    _db = drizzleD1(env.DB, { schema }) as DrizzleDb
    return _db
  }

  // 2. Standalone 模式：文件数据库
  if (deployMode === 'standalone') {
    const dbPath = process.env.DATABASE_PATH || './data.db'
    console.log(`[DB] Using SQLite file database: ${dbPath}`)

    const sqlite = new Database(dbPath)

    // 首次启动时自动执行迁移
    initSchemaFromFile(sqlite)

    _db = drizzleBetterSqlite3(sqlite, { schema }) as unknown as DrizzleDb
    return _db
  }

  // 3. 开发环境（无 D1 binding）：内存数据库
  console.log('[DB] Using better-sqlite3 in-memory database (dev)')
  const sqlite = new Database(':memory:')
  initSchemaFromFile(sqlite)
  _db = drizzleBetterSqlite3(sqlite, { schema }) as unknown as DrizzleDb
  return _db
}

/**
 * 从 SQL 文件初始化数据库 schema
 * 用于 standalone 和开发环境
 */
function initSchemaFromFile(sqlite: Database.Database) {
  // 尝试读取迁移 SQL 文件
  const migrationsPath = resolve(process.cwd(), 'db/migrations/all.sql')

  if (existsSync(migrationsPath)) {
    console.log('[DB] Applying migrations from all.sql')
    const sql = readFileSync(migrationsPath, 'utf-8')
    // 分割并执行每个语句
    sql.split(';').filter(s => s.trim()).forEach(statement => {
      try {
        sqlite.exec(statement.trim())
      } catch (err) {
        // 忽略 "table already exists" 类错误
        if (!(err as Error).message.includes('already exists')) {
          console.warn('[DB] Migration warning:', (err as Error).message)
        }
      }
    })
  } else {
    // 无迁移文件时创建基础 schema
    console.log('[DB] No migrations file, creating basic schema')
    createBasicSchema(sqlite)
  }
}

/**
 * 创建基础 schema（无迁移文件时的 fallback）
 */
function createBasicSchema(sqlite: Database.Database) {
  // 用户表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      nickname text,
      role text DEFAULT 'employee' NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      deleted_at integer
    )
  `)

  // 聊天会话表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      title text NOT NULL,
      model text NOT NULL,
      task_id integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
    )
  `)

  // 消息表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY NOT NULL,
      session_id text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      model text,
      timestamp integer NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE cascade
    )
  `)

  // 用户设置表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id text PRIMARY KEY NOT NULL,
      language text DEFAULT 'system' NOT NULL,
      theme text DEFAULT 'system' NOT NULL,
      custom_model_configs text,
      enabled_models text,
      default_model text,
      updated_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
    )
  `)

  // 任务表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      title text NOT NULL,
      category text,
      tag text,
      description text,
      status text DEFAULT 'todo' NOT NULL,
      created_by_user_id text NOT NULL,
      assigned_to_user_id text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      deleted_at integer,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE cascade,
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE set null
    )
  `)
}

// 导出数据库实例（延迟初始化）
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    return getDb()[prop as keyof DrizzleDb]
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Schema 初始化（兼容旧版本，主要用于内存数据库测试）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 初始化数据库表结构
 * @deprecated 使用迁移文件或自动初始化，此方法仅用于兼容
 */
export async function initSchema() {
  // D1 环境不需要初始化
  const env = (globalThis as any).__env__
  if (env?.DB) {
    console.log('[DB] Skipping schema init for D1')
    return
  }

  // 其他环境已在 getDb() 中自动初始化
  console.log('[DB] Schema init handled automatically')
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────────────────

export * from './schema'