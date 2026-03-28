/**
 * @module events
 * @description 应用级事件总线，用于解耦各模块之间的通信。
 *
 *              使用 mitt 实现，作为 @vueuse/core 的依赖已可用。
 *
 *              事件命名规范：
 *              - 模块名:动作名（如 auth:login-success, agent:done）
 *              - 成功事件用 success 后缀
 *              - 状态变更用 changed 后缀
 *
 * @layer infrastructure
 */
import mitt from 'mitt'
import type { AgentMessage } from '#agent/types'

/**
 * 应用事件类型定义
 */
export type AppEvents = {
  // ── 认证事件 ────────────────────────────────────────────────────────────────
  /** 登录成功（init 验证成功或 login 成功） */
  'auth:login-success': void
  /** 登出 */
  'auth:logout': void

  // ── Agent 事件 ────────────────────────────────────────────────────────────────
  /** Agent 完成一轮对话 */
  'agent:done': { sessionId: string; message: AgentMessage }
  /** Agent 出错 */
  'agent:error': { sessionId: string; error: string; code?: string }
  /** Agent 开始生成 */
  'agent:start': { sessionId: string; taskId: string }

  // ── 设置事件 ────────────────────────────────────────────────────────────────
  /** 设置变更（已同步到服务器） */
  'settings:changed': void
  /** 设置加载完成 */
  'settings:loaded': void

  // ── 会话事件 ────────────────────────────────────────────────────────────────
  /** 会话创建 */
  'session:created': { sessionId: string }
  /** 会话删除 */
  'session:deleted': { sessionId: string }
  /** 会话列表加载完成 */
  'sessions:loaded': void
}

/** 事件总线实例 */
export const emitter = mitt<AppEvents>()