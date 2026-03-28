/**
 * @module services/types
 * @description 后端 API 类型定义。
 *              与后端数据库 schema 对应的数据结构。
 * @layer types
 */
import type { ContentBlock } from '#agent/types'

// ─────────────────────────────────────────────────────────────────────────────
// 用户类型
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  nickname: string | null
  createdAt: number
}

export interface AuthResponse {
  token: string
  user: User
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 会话类型
// ─────────────────────────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface SessionDetail {
  session: {
    id: string
    title: string
    model: string
    createdAt: number
    updatedAt: number
  }
  messages: Message[]
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 消息类型
// ─────────────────────────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  model?: string
  timestamp: number
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 设置类型
// ─────────────────────────────────────────────────────────────────────────────────────

export interface Settings {
  language: 'system' | 'zh' | 'ja' | 'en'
  theme: 'system' | 'light' | 'dark'
  customModelConfigs: unknown[]
  enabledModels: string[]
  defaultModel: string
  updatedAt?: number
}