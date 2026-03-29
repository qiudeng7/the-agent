/**
 * @module services/types
 * @description 后端 API 类型定义。
 *              与后端数据库 schema 对应的数据结构。
 * @layer types
 */
import type { ContentBlock, PermissionMode } from '#claude/types'

// ─────────────────────────────────────────────────────────────────────────────
// 用户类型
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  nickname: string | null
  role: 'admin' | 'employee'
  createdAt: number
}

/** 登录/注册响应数据 */
export interface AuthData {
  token: string
  user: User
}

/** API 包装响应 */
export interface ApiResponse<T> {
  success: boolean
  data: T
}

/** 登录/注册 API 响应 */
export type AuthResponse = ApiResponse<AuthData>

/** 获取当前用户 API 响应 */
export type MeResponse = ApiResponse<{ user: User }>

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
  permissionMode?: PermissionMode
  updatedAt?: number
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 任务类型
// ─────────────────────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

export interface Task {
  id: number
  title: string
  category: string | null
  tag: string | null
  description: string | null
  status: TaskStatus
  createdByUserId: number
  assignedToUserId: number | null
  createdAt: string
  updatedAt: string
}

export interface TaskListParams {
  page?: number
  pageSize?: number
  status?: TaskStatus
  category?: string
  search?: string
}

export interface TaskListResponse {
  tasks: Task[]
  total: number
  page: number
  pageSize: number
}

export interface TaskStats {
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  byAssignee: Record<number, number>
  total: number
}

/** 任务列表 API 响应 */
export type TaskListApiResponse = ApiResponse<TaskListResponse>

/** 单个任务 API 响应 */
export type TaskApiResponse = ApiResponse<{ task: Task }>

/** 任务统计 API 响应 */
export type TaskStatsApiResponse = ApiResponse<TaskStats>

// ─────────────────────────────────────────────────────────────────────────────
// 员工端任务类型
// ─────────────────────────────────────────────────────────────────────────────

/** 表单字段配置 */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'date'
  required?: boolean
  placeholder?: string
  options?: string[]
  defaultValue?: any
}

/** 员工端任务类型配置 */
export interface EmployeeTaskType {
  name: string
  category: string
  route: string
  icon: string
  requiresForm: boolean
  formFields?: FormField[]
  description?: string
}