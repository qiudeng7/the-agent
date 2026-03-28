/**
 * @module stores/chat
 * @description 会话状态管理（Pinia store）。
 *              聚合会话列表和消息管理模块。
 *              管理当前选中会话 ID 和相关视图状态。
 *
 * 模块拆分：
 * - session-list.ts: 会话列表、分组、搜索
 * - messages.ts: 消息管理、思考折叠状态
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ContentBlock } from '#agent/types'
import { emitter } from '@/events'
import { createSessionListModule, type SessionSummary, type ChatGroup } from './session-list'
import { createMessagesModule, type Message } from './messages'

// 重导出类型
export type { SessionSummary, ChatGroup, Message }

export interface ChatSession extends SessionSummary {
  messages: Message[]
  messagesLoaded?: boolean
}

export const useChatStore = defineStore('chat', () => {
  // ── 模块实例 ──────────────────────────────────────────────────────────────
  const sessionList = createSessionListModule()
  const messages = createMessagesModule()

  // ── 当前会话状态 ──────────────────────────────────────────────────────────
  const currentSessionId = ref<string | null>(null)

  // ── 聚合 Getters ──────────────────────────────────────────────────────────

  /** 会话列表（带消息） */
  const sessions = computed<ChatSession[]>(() => {
    return sessionList.sessions.value.map(s => ({
      ...s,
      messages: messages.getMessages(s.id),
      messagesLoaded: messages.isMessagesLoaded(s.id),
    }))
  })

  /** 当前会话 */
  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value),
  )

  /** 分组会话 */
  const groupedSessions = computed(() => {
    const base = sessionList.filteredSessions.value
    if (sessionList.groups.value.length === 0) {
      return { ungrouped: base }
    }
    const result: Record<string, ChatSession[]> = {}
    sessionList.groups.value.forEach(group => {
      result[group.name] = group.sessionIds
        .map(id => sessions.value.find(s => s.id === id))
        .filter((s): s is ChatSession => !!s)
    })
    const groupedIds = sessionList.groups.value.flatMap(g => g.sessionIds)
    result['其他'] = sessions.value.filter(s => !groupedIds.includes(s.id))
    return result
  })

  // ── 聚合 Actions ──────────────────────────────────────────────────────────

  /** 切换会话 */
  function switchSession(id: string) {
    currentSessionId.value = id
    // 自动加载消息
    messages.loadMessages(id)
  }

  /** 创建会话 */
  async function createSession(title?: string, model?: string): Promise<ChatSession> {
    const session = await sessionList.createSession(title, model)
    currentSessionId.value = session.id
    // 新会话没有消息，标记为已加载
    messages.messagesBySession.value.set(session.id, [])
    messages.loadedSessions.value.add(session.id)
    return {
      ...session,
      messages: [],
      messagesLoaded: true,
    }
  }

  /** 删除会话 */
  async function deleteSession(id: string) {
    await sessionList.deleteSession(id)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
    }
    // messages 模块会通过 session:deleted 事件自动清理
  }

  /** 加载会话消息 */
  async function loadSessionMessages(sessionId: string) {
    await messages.loadMessages(sessionId)
  }

  /** 添加消息 */
  async function addMessage(sessionId: string, message: Message) {
    await messages.addMessage(sessionId, message, { updateTitle: true })
    // 更新会话的 updatedAt
    const session = sessionList.sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.updatedAt = Date.now()
    }
  }

  /** 设置会话模型 */
  function setSessionModel(sessionId: string, modelId: string) {
    sessionList.setSessionModel(sessionId, modelId)
  }

  /** 获取会话当前模型 */
  function getSessionModel(sessionId: string): string | null {
    return messages.getSessionModel(sessionId)
  }

  /** 判断思考块是否折叠 */
  function isThinkingCollapsed(key: string, defaultCollapsed: boolean): boolean {
    return messages.isThinkingCollapsed(key, defaultCollapsed)
  }

  /** 切换思考块的折叠状态 */
  function toggleThinking(key: string, defaultCollapsed: boolean): void {
    messages.toggleThinking(key, defaultCollapsed)
  }

  /** 清空所有数据 */
  function clear() {
    currentSessionId.value = null
    sessionList.clear()
    messages.clear()
  }

  // ── 代理 session-list 方法 ────────────────────────────────────────────────
  const setSearchQuery = sessionList.setSearchQuery
  const createGroup = sessionList.createGroup
  const addSessionToGroup = sessionList.addSessionToGroup
  const updateSessionTitle = sessionList.updateSessionTitle
  const fetchAll = sessionList.fetchAll

  // ── 生命周期 ──────────────────────────────────────────────────────────────

  function setupEventListeners() {
    sessionList.setupEventListeners()
    messages.setupEventListeners()
  }

  function teardownEventListeners() {
    sessionList.teardownEventListeners()
    messages.teardownEventListeners()
  }

  return {
    // 会话列表
    sessions,
    currentSessionId,
    currentSession,
    groups: sessionList.groups,
    searchQuery: sessionList.searchQuery,
    isLoading: sessionList.isLoading,
    filteredSessions: sessionList.filteredSessions,
    groupedSessions,

    // 消息相关
    thinkingExpandedStates: messages.thinkingExpandedStates,

    // 会话操作
    switchSession,
    createSession,
    deleteSession,
    loadSessionMessages,
    updateSessionTitle,
    setSessionModel,
    getSessionModel,

    // 消息操作
    addMessage,
    isThinkingCollapsed,
    toggleThinking,

    // 搜索和分组
    setSearchQuery,
    createGroup,
    addSessionToGroup,

    // 数据加载
    fetchAll,
    clear,

    // 生命周期
    setupEventListeners,
    teardownEventListeners,
  }
})