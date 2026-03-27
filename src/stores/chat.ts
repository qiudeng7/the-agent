/**
 * @module stores/chat
 * @description 会话状态管理（Pinia store）。
 *              管理会话列表（sessions）、分组（groups）、当前会话 ID 和搜索关键词。
 *              数据来源为后端 API，本地作为缓存。
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ContentBlock } from '#agent/types'
import * as backend from '@/services/backend'

export interface ChatSession {
  id: string
  title: string
  model: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  /** 消息是否已加载 */
  messagesLoaded?: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  /** 纯文本或富内容块（thinking / tool_use / tool_result） */
  content: string | ContentBlock[]
  timestamp: number
  /** 该消息使用的模型 ID（仅 assistant 消息有） */
  model?: string
}

export interface ChatGroup {
  id: string
  name: string
  sessionIds: string[]
}

export const useChatStore = defineStore('chat', () => {
  // State
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const groups = ref<ChatGroup[]>([])
  const searchQuery = ref('')
  /** 思考块展开状态（key: `${messageId}-${blockIdx}`） */
  const thinkingExpandedStates = ref<Record<string, boolean>>({})
  const isLoading = ref(false)

  // Getters
  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value)
  )

  const filteredSessions = computed(() => {
    if (!searchQuery.value.trim()) return sessions.value
    return sessions.value.filter(s =>
      s.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })

  const groupedSessions = computed(() => {
    const base = filteredSessions.value
    if (groups.value.length === 0) {
      return { ungrouped: base }
    }
    const result: Record<string, ChatSession[]> = {}
    groups.value.forEach(group => {
      result[group.name] = group.sessionIds
        .map(id => base.find(s => s.id === id))
        .filter((s): s is ChatSession => !!s)
    })
    const groupedIds = groups.value.flatMap(g => g.sessionIds)
    result['其他'] = base.filter(s => !groupedIds.includes(s.id))
    return result
  })

  // ── API Actions ────────────────────────────────────────────────────────────

  /**
   * 从服务器获取所有会话（登录后调用）
   */
  async function fetchAll() {
    try {
      isLoading.value = true
      const remoteSessions = await backend.fetchSessions()

      // 转换为本地格式（messages 为空，需要时加载）
      sessions.value = remoteSessions.map(s => ({
        id: s.id,
        title: s.title,
        model: s.model,
        messages: [],
        messagesLoaded: false,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载单个会话的消息
   */
  async function loadSessionMessages(sessionId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.messagesLoaded) return

    try {
      const detail = await backend.fetchSession(sessionId)
      session.messages = detail.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        timestamp: m.timestamp,
      }))
      session.messagesLoaded = true
    } catch (err) {
      console.error('[Chat] Failed to load messages:', err)
    }
  }

  /**
   * 创建会话（调用 API）
   */
  async function createSession(title?: string, model?: string): Promise<ChatSession> {
    const remote = await backend.createSession(title, model)

    const session: ChatSession = {
      id: remote.id,
      title: remote.title,
      model: remote.model,
      messages: [],
      messagesLoaded: true,
      createdAt: remote.createdAt,
      updatedAt: remote.updatedAt,
    }

    sessions.value.unshift(session)
    currentSessionId.value = session.id
    return session
  }

  /**
   * 删除会话（调用 API）
   */
  async function deleteSession(id: string) {
    await backend.deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
    }
  }

  /**
   * 添加消息（调用 API）
   */
  async function addMessage(sessionId: string, message: Message) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return

    // 先乐观更新本地
    session.messages.push(message)
    session.updatedAt = Date.now()

    try {
      // 调用 API
      const saved = await backend.addMessage(sessionId, {
        id: message.id,
        role: message.role,
        content: message.content,
        model: message.model,
        timestamp: message.timestamp,
      })

      // 更新消息 ID（如果服务器生成了新的）
      const index = session.messages.findIndex(m => m.id === message.id)
      if (index !== -1) {
        session.messages[index].id = saved.id
      }

      // 更新会话标题（服务器可能已更新）
      const detail = await backend.fetchSession(sessionId)
      session.title = detail.session.title
    } catch (err) {
      console.error('[Chat] Failed to add message:', err)
      // 回滚
      session.messages.pop()
    }
  }

  /**
   * 清空本地缓存（登出时调用）
   */
  function clear() {
    sessions.value = []
    currentSessionId.value = null
    groups.value = []
    searchQuery.value = ''
  }

  // ── Local Actions ───────────────────────────────────────────────────────────

  function switchSession(id: string) {
    currentSessionId.value = id
    // 自动加载消息
    loadSessionMessages(id)
  }

  function updateSessionTitle(id: string, title: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
    }
  }

  function createGroup(name: string) {
    const group: ChatGroup = {
      id: Date.now().toString(),
      name,
      sessionIds: [],
    }
    groups.value.push(group)
    return group
  }

  function addSessionToGroup(groupId: string, sessionId: string) {
    const group = groups.value.find(g => g.id === groupId)
    if (group && !group.sessionIds.includes(sessionId)) {
      group.sessionIds.push(sessionId)
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setSessionModel(sessionId: string, modelId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.model = modelId
      session.updatedAt = Date.now()
    }
  }

  function getSessionModel(sessionId: string): string | null {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return null

    if (session.model && session.model !== 'default') {
      return session.model
    }

    for (let i = session.messages.length - 1; i >= 0; i--) {
      const msg = session.messages[i]
      if (msg.role === 'assistant' && msg.model) {
        return msg.model
      }
    }

    return null
  }

  /** 判断思考块是否折叠 */
  function isThinkingCollapsed(key: string, defaultCollapsed: boolean): boolean {
    const current = thinkingExpandedStates.value[key]
    if (current === undefined) {
      return defaultCollapsed
    }
    // 存储的是"是否展开"，所以折叠 = !展开
    return !current
  }

  /** 切换思考块的折叠状态 */
  function toggleThinking(key: string, defaultCollapsed: boolean): void {
    const current = thinkingExpandedStates.value[key]
    if (current === undefined) {
      // 第一次切换：从默认状态翻转
      // 如果默认折叠，展开它；如果默认展开，折叠它
      thinkingExpandedStates.value[key] = defaultCollapsed ? true : false
    } else {
      thinkingExpandedStates.value[key] = !current
    }
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    groups,
    searchQuery,
    isLoading,
    filteredSessions,
    groupedSessions,
    thinkingExpandedStates,
    // API Actions
    fetchAll,
    loadSessionMessages,
    createSession,
    deleteSession,
    addMessage,
    clear,
    // Local Actions
    switchSession,
    updateSessionTitle,
    createGroup,
    addSessionToGroup,
    setSearchQuery,
    setSessionModel,
    getSessionModel,
    isThinkingCollapsed,
    toggleThinking,
  }
})