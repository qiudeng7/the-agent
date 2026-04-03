/**
 * @module db/migrate
 * @description 本地数据库迁移脚本
 *              用于 standalone 模式下手动执行迁移
 *
 *              使用方法：
 *              DATABASE_PATH=./data.db tsx db/migrate.ts
 *
 *              注意：standalone 模式启动时也会自动执行迁移
 *              此脚本主要用于首次部署或手动维护
 */
import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dbPath = process.env.DATABASE_PATH || './data.db'
const migrationsFile = resolve(process.cwd(), 'db/migrations/all.sql')

console.log(`[Migrate] Database path: ${dbPath}`)
console.log(`[Migrate] Migrations file: ${migrationsFile}`)

// 检查迁移文件是否存在
if (!existsSync(migrationsFile)) {
  console.error('[Migrate] Error: Migrations file not found')
  console.error('[Migrate] Run `pnpm run db:generate` first')
  process.exit(1)
}

// 连接数据库
const sqlite = new Database(dbPath)

// 读取迁移 SQL
const sql = readFileSync(migrationsFile, 'utf-8')

console.log('[Migrate] Applying migrations...')

// 分割并执行每个语句
const statements = sql.split(';').filter(s => s.trim())

let successCount = 0
let skipCount = 0

for (const statement of statements) {
  const trimmed = statement.trim()
  if (!trimmed || trimmed.startsWith('--')) continue

  try {
    sqlite.exec(trimmed)
    successCount++
  } catch (err) {
    const message = (err as Error).message
    // 忽略已存在的错误
    if (message.includes('already exists') || message.includes('duplicate column name')) {
      skipCount++
      console.log(`[Migrate] Skipped (already exists): ${trimmed.slice(0, 50)}...`)
    } else {
      console.error(`[Migrate] Error: ${message}`)
      console.error(`[Migrate] Statement: ${trimmed.slice(0, 100)}...`)
    }
  }
}

console.log(`[Migrate] Completed: ${successCount} executed, ${skipCount} skipped`)

// 关闭数据库连接
sqlite.close()

console.log('[Migrate] Database migration finished successfully')