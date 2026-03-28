/**
 * @module stores/messages
 * @description 消息状态管理。
 *              按 sessionId 管理消息列表，使用 Map 存储各会话的消息。
 *              管理思考块展开状态。
 *
 * 事件监听：
 * - agent:done → addMessage
 * - agent:error → addErrorMessage
 * - agent:start → addUserMessage
 * - session:deleted → 清理该会话消息
 * - auth:logout → clear
 *
 * @layer state
 */
import { ref, reactive, computed, watch } from 'vue'
import type { ContentBlock } from '#claude/types'
import { emitter } from '@/events'
import * as backend from '@/services/backend'

/** 消息 */
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  timestamp: number
  model?: string
}

/** 会话详情 */
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

/**
 * 创建消息模块
 */
export function createMessagesModule() {
  // ── State ──────────────────────────────────────────────────────────────────
  /** 各会话的消息（使用 reactive 对象，Vue 可以追踪属性变化） */
  const messagesBySession = reactive<Record<string, Message[]>>({})
  /** 已加载消息的会话 ID 集合（使用 reactive Set） */
  const loadedSessions = reactive(new Set<string>())
  /** 思考块展开状态（key: `${sessionId}-${messageId}-${blockIdx}`） */
  const thinkingExpandedStates = ref<Record<string, boolean>>({})

  // ── Getters ────────────────────────────────────────────────────────────────

  function getMessages(sessionId: string): Message[] {
    // 直接访问 reactive 对象属性，Vue 会追踪依赖
    return messagesBySession[sessionId] ?? []
  }

  function isMessagesLoaded(sessionId: string): boolean {
    return loadedSessions.has(sessionId)
  }

  function getSessionModel(sessionId: string): string | null {
    const messages = messagesBySession[sessionId]
    if (!messages) return null

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.model) {
        return msg.model
      }
    }
    return null
  }

  function isThinkingCollapsed(key: string, defaultCollapsed: boolean): boolean {
    const current = thinkingExpandedStates.value[key]
    if (current === undefined) {
      return defaultCollapsed
    }
    return !current
  }

  function toggleThinking(key: string, defaultCollapsed: boolean): void {
    const current = thinkingExpandedStates.value[key]
    if (current === undefined) {
      thinkingExpandedStates.value[key] = defaultCollapsed ? true : false
    } else {
      thinkingExpandedStates.value[key] = !current
    }
  }

  // ── API Actions ────────────────────────────────────────────────────────────

  async function loadMessages(sessionId: string) {
    if (loadedSessions.has(sessionId)) return

    try {
      const detail = await backend.fetchSession(sessionId)
      const msgs: Message[] = detail.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        timestamp: m.timestamp,
      }))
      messagesBySession[sessionId] = msgs
      loadedSessions.add(sessionId)
    } catch (err) {
      console.error('[Messages] Failed to load:', err)
    }
  }

  async function addMessage(
    sessionId: string,
    message: Message,
    options?: { updateTitle?: boolean },
  ) {
    const messages = messagesBySession[sessionId] ?? []
    messages.push(message)
    messagesBySession[sessionId] = messages

    try {
      const saved = await backend.addMessage(sessionId, {
        id: message.id,
        role: message.role,
        content: message.content,
        model: message.model,
        timestamp: message.timestamp,
      })

      // 更新消息 ID
      const index = messages.findIndex(m => m.id === message.id)
      if (index !== -1) {
        messages[index].id = saved.id
      }

      // 可选：更新会话标题
      if (options?.updateTitle) {
        await backend.fetchSession(sessionId)
        // 标题更新由 session-list 处理
      }
    } catch (err) {
      console.error('[Messages] Failed to add:', err)
      // 回滚
      const idx = messages.findIndex(m => m.id === message.id)
      if (idx !== -1) {
        messages.splice(idx, 1)
      }
    }
  }

  function addLocalMessage(sessionId: string, message: Message) {
    const messages = messagesBySession[sessionId] ?? []
    messages.push(message)
    messagesBySession[sessionId] = messages
  }

  // ── 事件处理 ──────────────────────────────────────────────────────────────

  function handleAgentDone(event: { sessionId: string; message: { role: 'user' | 'assistant'; content: string | ContentBlock[] }; stats?: { costUsd?: number; durationMs?: number } }) {
    const { sessionId, message } = event
    addMessage(sessionId, {
      id: Date.now().toString(),
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
    })
  }

  function handleAgentError(event: { sessionId: string; error: string; code?: string }) {
    const { sessionId, error, code } = event
    addMessage(sessionId, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `❌ 错误: ${error}${code ? ` (${code})` : ''}`,
      timestamp: Date.now(),
    })
  }

  function handleAgentStart(_event: { sessionId: string; taskId: string }) {
    // 用户消息需要在 runAgent 调用前由外部添加
    // 这里只标记开始
  }

  function handleSessionDeleted(event: { sessionId: string }) {
    delete messagesBySession[event.sessionId]
    loadedSessions.delete(event.sessionId)
    // 清理思考折叠状态
    const prefix = `${event.sessionId}-`
    for (const key in thinkingExpandedStates.value) {
      if (key.startsWith(prefix)) {
        delete thinkingExpandedStates.value[key]
      }
    }
  }

  function clear() {
    // 清空 reactive 对象的所有属性
    for (const key in messagesBySession) {
      delete messagesBySession[key]
    }
    loadedSessions.clear()
    thinkingExpandedStates.value = {}
  }

  // ── 事件监听 ──────────────────────────────────────────────────────────────

  function setupEventListeners() {
    emitter.on('agent:done', handleAgentDone)
    emitter.on('agent:error', handleAgentError)
    emitter.on('agent:start', handleAgentStart)
    emitter.on('session:deleted', handleSessionDeleted)
    emitter.on('auth:logout', clear)
  }

  function teardownEventListeners() {
    emitter.off('agent:done', handleAgentDone)
    emitter.off('agent:error', handleAgentError)
    emitter.off('agent:start', handleAgentStart)
    emitter.off('session:deleted', handleSessionDeleted)
    emitter.off('auth:logout', clear)
  }

  return {
    messagesBySession,
    loadedSessions,
    thinkingExpandedStates,
    getMessages,
    isMessagesLoaded,
    getSessionModel,
    isThinkingCollapsed,
    toggleThinking,
    loadMessages,
    addMessage,
    addLocalMessage,
    clear,
    setupEventListeners,
    teardownEventListeners,
  }
}

export type MessagesModule = ReturnType<typeof createMessagesModule>