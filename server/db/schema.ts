/**
 * @module db/schema
 * @description Drizzle ORM 数据模型定义
 *              支持SQLite（本地）和 D1（Cloudflare Workers）
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ─────────────────────────────────────────────────────────────────────────────
// 用户表
// ─────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname'),
  role: text('role', { enum: ['admin', 'employee'] }).notNull().default('employee'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// 聊天会话表
// ─────────────────────────────────────────────────────────────────────────────

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  model: text('model').notNull(),
  /** 可选：绑定的任务 ID（员工端任务专属会话） */
  taskId: integer('task_id')
    .references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type ChatSession = typeof chatSessions.$inferSelect
export type NewChatSession = typeof chatSessions.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// 消息表
// ─────────────────────────────────────────────────────────────────────────────

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  /** JSON: string | ContentBlock[] */
  content: text('content').notNull(),
  /** 该消息使用的模型 ID（仅 assistant 消息有） */
  model: text('model'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
})

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// 用户设置表
// ─────────────────────────────────────────────────────────────────────────────

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  language: text('language', { enum: ['system', 'zh', 'ja', 'en'] })
    .notNull()
    .default('system'),
  theme: text('theme', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  /** JSON: CustomModelConfig[] */
  customModelConfigs: text('custom_model_configs'),
  /** JSON: string[] */
  enabledModels: text('enabled_models'),
  defaultModel: text('default_model'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type UserSettings = typeof userSettings.$inferSelect
export type NewUserSettings = typeof userSettings.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// 任务表
// ─────────────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category'),
  tag: text('tag'),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'in_review', 'done', 'cancelled'] })
    .notNull()
    .default('todo'),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assignedToUserId: text('assigned_to_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Schema 导出
// ─────────────────────────────────────────────────────────────────────────────

export const schema = {
  users,
  chatSessions,
  messages,
  userSettings,
  tasks,
}