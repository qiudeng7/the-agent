/**
 * @module services/backend
 * @description 后端 API 服务封装。
 *              直接使用 fetch 与后端通信，不走 Electron IPC。
 * @layer service
 */
import type { ContentBlock } from '#claude/types'
import type {
  AuthResponse, MeResponse, Session, SessionDetail, Message, Settings,
  TaskListParams, TaskListApiResponse, TaskApiResponse, TaskStatsApiResponse,
} from './types'

// API 基础地址（开发环境使用本地服务器，生产环境使用配置的地址）
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// 重导出类型（保持兼容性）
export type {
  User, AuthResponse, MeResponse, Session, SessionDetail, Message, Settings,
  Task, TaskListParams, TaskListApiResponse, TaskApiResponse, TaskStatsApiResponse,
} from './types'

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

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 30000

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

  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    // 检查响应内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new ApiError(response.status, 'Invalid response format: expected JSON')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'Request failed')
    }

    return data
  } catch (err) {
    // 处理超时错误
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timeout')
    }
    // 处理网络错误
    if (err instanceof TypeError) {
      throw new ApiError(0, 'Network error: unable to connect to server')
    }
    // 已经是 ApiError，直接抛出
    if (err instanceof ApiError) {
      throw err
    }
    // 其他错误
    throw new ApiError(0, err instanceof Error ? err.message : 'Unknown error')
  } finally {
    clearTimeout(timeoutId)
  }
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

export async function getCurrentUser(): Promise<MeResponse> {
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
  taskId?: number,
): Promise<Session> {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, model, taskId }),
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

// ─────────────────────────────────────────────────────────────────────────────
// 任务 API
// ─────────────────────────────────────────────────────────────────────────────

/** 获取任务列表 */
export async function fetchTasks(params: TaskListParams = {}): Promise<TaskListApiResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.status) query.set('status', params.status)
  if (params.category) query.set('category', params.category)
  if (params.search) query.set('search', params.search)

  const queryString = query.toString()
  return request(`/api/tasks${queryString ? `?${queryString}` : ''}`)
}

/** 获取单个任务 */
export async function fetchTask(id: number): Promise<TaskApiResponse> {
  return request(`/api/tasks/${id}`)
}

/** 创建任务 */
export async function createTask(taskData: {
  title: string
  category?: string
  tag?: string
  description?: string
  assignedToUserId?: string
}): Promise<TaskApiResponse> {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  })
}

/** 更新任务 */
export async function updateTask(
  id: number,
  taskData: {
    title?: string
    category?: string
    tag?: string
    description?: string
    status?: string
    assignedToUserId?: string | null
  },
): Promise<TaskApiResponse> {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(taskData),
  })
}

/** 删除任务 */
export async function deleteTask(id: number): Promise<{ success: boolean }> {
  return request(`/api/tasks/${id}`, {
    method: 'DELETE',
  })
}

/** 获取任务统计 */
export async function fetchTaskStats(): Promise<TaskStatsApiResponse> {
  return request('/api/tasks/stats')
}

// ─────────────────────────────────────────────────────────────────────────────
// 管理端 API
// ─────────────────────────────────────────────────────────────────────────────

/** 获取数据库表数据 */
export async function fetchDatabaseTable(tableName: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return request(`/api/admin/database/${tableName}`)
}

/** 创建数据库记录 */
export async function createDatabaseRecord(tableName: string, data: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  return request(`/api/admin/database/${tableName}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新数据库记录 */
export async function updateDatabaseRecord(tableName: string, id: number, data: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  return request(`/api/admin/database/${tableName}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** 删除数据库记录 */
export async function deleteDatabaseRecord(tableName: string, id: number): Promise<{ success: boolean; error?: string }> {
  return request(`/api/admin/database/${tableName}/${id}`, {
    method: 'DELETE',
  })
}