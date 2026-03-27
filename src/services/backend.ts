/**
 * @module services/backend
 * @description 后端 API 服务封装
 *              直接使用 fetch 与后端通信，不走 Electron IPC
 */
import type { ContentBlock } from '#agent/types'

// API 基础地址（开发环境使用本地服务器，生产环境使用配置的地址）
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
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

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  model?: string
  timestamp: number
}

export interface Settings {
  language: 'system' | 'zh' | 'ja' | 'en'
  theme: 'system' | 'light' | 'dark'
  customModelConfigs: unknown[]
  enabledModels: string[]
  defaultModel: string
  updatedAt?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// API 错误
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 请求封装
// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, data.message || 'Request failed')
  }

  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 认证 API
// ─────────────────────────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  nickname?: string,
): Promise<AuthResponse> {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  })
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function getCurrentUser(): Promise<User> {
  return request('/api/auth/me')
}

// ─────────────────────────────────────────────────────────────────────────────
// 会话 API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSessions(): Promise<Session[]> {
  return request('/api/sessions')
}

export async function createSession(
  title?: string,
  model?: string,
): Promise<Session> {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, model }),
  })
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  return request(`/api/sessions/${id}`)
}

export async function updateSessionTitle(
  id: string,
  title: string,
): Promise<Session> {
  return request(`/api/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  })
}

export async function deleteSession(id: string): Promise<{ success: boolean }> {
  return request(`/api/sessions/${id}`, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 消息 API
// ─────────────────────────────────────────────────────────────────────────────

export async function addMessage(
  sessionId: string,
  message: {
    id?: string
    role: 'user' | 'assistant'
    content: string | ContentBlock[]
    model?: string
    timestamp?: number
  },
): Promise<Message> {
  return request(`/api/messages/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 设置 API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<Settings> {
  return request('/api/settings')
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}