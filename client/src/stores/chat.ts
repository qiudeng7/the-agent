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
 * 子模块访问：
 * - 通过 sessionList / messages 属性直接访问子模块
 * - 聚合层提供常用方法的快捷访问
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ContentBlock } from '#claude/types'
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
  async function createSession(title?: string, model?: string, taskId?: number): Promise<ChatSession> {
    const session = await sessionList.createSession(title, model, taskId)
    currentSessionId.value = session.id
    // 新会话没有消息，标记为已加载
    messages.markSessionLoaded(session.id)
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
    // ── 子模块（直接访问）────────────────────────────────────────────────────
    sessionList,
    messages,

    // ── 聚合 Getters ────────────────────────────────────────────────────────
    sessions,
    currentSessionId,
    currentSession,
    groupedSessions,

    // ── 核心操作 ────────────────────────────────────────────────────────────
    switchSession,
    createSession,
    deleteSession,
    loadSessionMessages,
    setSessionModel,
    getSessionModel,
    addMessage,
    isThinkingCollapsed,
    toggleThinking,
    clear,

    // ── 快捷访问（常用属性）─────────────────────────────────────────────────
    groups: sessionList.groups,
    searchQuery: sessionList.searchQuery,
    isLoading: sessionList.isLoading,
    filteredSessions: sessionList.filteredSessions,
    thinkingExpandedStates: messages.thinkingExpandedStates,

    // ── 快捷访问（常用方法）─────────────────────────────────────────────────
    setSearchQuery: sessionList.setSearchQuery,
    createGroup: sessionList.createGroup,
    updateSessionTitle: sessionList.updateSessionTitle,
    fetchAll: sessionList.fetchAll,

    // ── 生命周期 ────────────────────────────────────────────────────────────
    setupEventListeners,
    teardownEventListeners,
  }
})