/**
 * @module db/index
 * @description 数据库连接层
 *              使用 Nitro database API + drizzle-orm
 *
 *              架构：
 *              - 开发环境：Node.js SQLite（内存数据库）+ drizzle-orm/better-sqlite3
 *              - 生产环境：Cloudflare D1 + drizzle-orm/d1
 *
 *              Nitro 的 database 配置用于设置 D1 binding，
 *              我们直接从 Nitro 环境获取数据库连接。
 */
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleBetterSqlite3 } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

type DrizzleDb = ReturnType<typeof drizzleD1<typeof schema>>

// ─────────────────────────────────────────────────────────────────────────────
// 数据库实例获取
// ─────────────────────────────────────────────────────────────────────────────

let _db: DrizzleDb | null = null

/**
 * 获取数据库实例
 * - 生产环境：从 Nitro 的 D1 binding 获取
 * - 开发环境：使用 better-sqlite3 内存数据库
 */
function getDb(): DrizzleDb {
  if (_db) return _db

  // 尝试获取 D1 binding（生产环境）
  // Nitro 会将 D1 binding 放到 globalThis.__env__.DB
  const env = (globalThis as any).__env__
  if (env?.DB) {
    console.log('[DB] Using D1 database')
    _db = drizzleD1(env.DB, { schema }) as DrizzleDb
    return _db
  }

  // 开发环境：使用 better-sqlite3 内存数据库
  console.log('[DB] Using better-sqlite3 in-memory database')
  const sqlite = new Database(':memory:')
  _db = drizzleBetterSqlite3(sqlite, { schema }) as DrizzleDb
  return _db
}

// 导出数据库实例（延迟初始化）
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    return getDb()[prop as keyof DrizzleDb]
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Schema 初始化（仅用于开发环境内存数据库）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 初始化数据库表结构
 * 仅用于开发环境的内存数据库，生产环境通过 D1 迁移
 */
export async function initSchema() {
  // 只在开发环境（内存数据库）执行
  const env = (globalThis as any).__env__
  if (env?.DB) {
    console.log('[DB] Skipping schema init for D1')
    return
  }

  // 如果已有数据库实例，复用它（避免重复创建内存数据库）
  let sqlite: Database.Database
  if (_db) {
    // 已有实例，需要获取底层 sqlite 对象
    // drizzle-orm/better-sqlite3 的内部结构无法直接获取，重新创建并替换
    console.log('[DB] Replacing existing in-memory database for schema init')
    sqlite = new Database(':memory:')
  } else {
    sqlite = new Database(':memory:')
  }

  // 创建用户表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL,
      password_hash text NOT NULL,
      nickname text,
      role text DEFAULT 'employee' NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      deleted_at integer
    )
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)
  `)

  // 创建聊天会话表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      title text NOT NULL,
      model text NOT NULL,
      task_id integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
    )
  `)

  // 创建消息表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY NOT NULL,
      session_id text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      model text,
      timestamp integer NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON UPDATE no action ON DELETE cascade
    )
  `)

  // 创建用户设置表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id text PRIMARY KEY NOT NULL,
      language text DEFAULT 'system' NOT NULL,
      theme text DEFAULT 'system' NOT NULL,
      custom_model_configs text,
      enabled_models text,
      default_model text,
      updated_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
    )
  `)

  // 创建任务表
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
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE set null
    )
  `)

  // 更新全局数据库实例
  _db = drizzleBetterSqlite3(sqlite, { schema }) as DrizzleDb
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────────────────

export * from './schema'