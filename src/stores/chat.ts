import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
  content: string
  timestamp: number
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
    if (groups.value.length === 0) {
      return { ungrouped: sessions.value }
    }
    const result: Record<string, ChatSession[]> = {}
    groups.value.forEach(group => {
      result[group.name] = group.sessionIds
        .map(id => sessions.value.find(s => s.id === id))
        .filter((s): s is ChatSession => !!s)
    })
    // Add ungrouped sessions
    const groupedIds = groups.value.flatMap(g => g.sessionIds)
    result['其他'] = sessions.value.filter(s => !groupedIds.includes(s.id))
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
      // Update title from first message if it's the first message
      if (session.messages.length === 1 && message.role === 'user') {
        session.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
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

  return {
    sessions,
    currentSessionId,
    currentSession,
    groups,
    searchQuery,
    filteredSessions,
    groupedSessions,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    addMessage,
    createGroup,
    addSessionToGroup,
    setSearchQuery,
  }
})
