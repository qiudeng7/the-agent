/**
 * @module stores/chat
 * @description 会话状态管理（Pinia store）。
 *              管理会话列表（sessions）、分组（groups）、当前会话 ID 和搜索关键词。
 *              - createSession：创建新会话并置顶
 *              - addMessage：追加消息，首条用户消息自动截取前 30 字符作为会话标题
 *              - groupedSessions：按分组聚合会话，未分组的归入"其他"分类
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ContentBlock } from '#agent/types'

export interface ChatSession {
  id: string
  title: string
  model: string
  messages: Message[]
  createdAt: number
  updatedAt: number
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
    // 基于 filteredSessions 而非 sessions.value，使搜索过滤生效
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
    // Add ungrouped sessions
    const groupedIds = groups.value.flatMap(g => g.sessionIds)
    result['其他'] = base.filter(s => !groupedIds.includes(s.id))
    return result
  })

  // Actions
  function createSession(title?: string) {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: title || '新会话',
      model: 'default',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    return session
  }

  function switchSession(id: string) {
    currentSessionId.value = id
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
    }
  }

  function updateSessionTitle(id: string, title: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
    }
  }

  function addMessage(sessionId: string, message: Message) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.messages.push(message)
      session.updatedAt = Date.now()
      // Update title from first message if it's the first user message
      if (session.messages.length === 1 && message.role === 'user') {
        const text = typeof message.content === 'string'
          ? message.content
          : message.content.find(b => b.type === 'text')?.text ?? ''
        session.title = text.slice(0, 30) + (text.length > 30 ? '...' : '')
      }
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

  /** 设置会话当前使用的模型 */
  function setSessionModel(sessionId: string, modelId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.model = modelId
      session.updatedAt = Date.now()
    }
  }

  /** 获取会话当前应使用的模型 ID */
  function getSessionModel(sessionId: string): string | null {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return null

    // 如果会话已有模型设置，直接返回
    if (session.model && session.model !== 'default') {
      return session.model
    }

    // 否则从最后一条 assistant 消息推断
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
    if (thinkingExpandedStates.value[key] === undefined) {
      return defaultCollapsed
    }
    return !thinkingExpandedStates.value[key]
  }

  /** 切换思考块的折叠状态 */
  function toggleThinking(key: string): void {
    thinkingExpandedStates.value[key] = !thinkingExpandedStates.value[key]
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    groups,
    searchQuery,
    filteredSessions,
    groupedSessions,
    thinkingExpandedStates,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    addMessage,
    createGroup,
    addSessionToGroup,
    setSearchQuery,
    setSessionModel,
    getSessionModel,
    isThinkingCollapsed,
    toggleThinking,
  }
})
