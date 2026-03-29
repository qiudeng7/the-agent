/**
 * @module stores/session-list
 * @description 会话列表状态管理。
 *              管理会话列表、分组、搜索。
 *              数据来源为后端 API，本地作为缓存。
 *
 * 事件监听：
 * - auth:login-success → fetchAll
 * - auth:logout → clear
 *
 * @layer state
 */
import { ref, computed } from 'vue'
import { emitter } from '@/events'
import * as backend from '@/services/backend'

/** 会话摘要信息 */
export interface SessionSummary {
  id: string
  title: string
  model: string
  taskId?: number | null
  createdAt: number
  updatedAt: number
}

/** 会话分组 */
export interface ChatGroup {
  id: string
  name: string
  sessionIds: string[]
}

/**
 * 创建会话列表模块
 */
export function createSessionListModule() {
  // ── State ──────────────────────────────────────────────────────────────────
  const sessions = ref<SessionSummary[]>([])
  const groups = ref<ChatGroup[]>([])
  const searchQuery = ref('')
  const isLoading = ref(false)

  // ── Getters ────────────────────────────────────────────────────────────────
  const filteredSessions = computed(() => {
    if (!searchQuery.value.trim()) return sessions.value
    return sessions.value.filter(s =>
      s.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  })

  const groupedSessions = computed(() => {
    const base = filteredSessions.value
    if (groups.value.length === 0) {
      return { ungrouped: base }
    }
    const result: Record<string, SessionSummary[]> = {}
    groups.value.forEach(group => {
      result[group.name] = group.sessionIds
        .map(id => base.find(s => s.id === id))
        .filter((s): s is SessionSummary => !!s)
    })
    const groupedIds = groups.value.flatMap(g => g.sessionIds)
    result['其他'] = base.filter(s => !groupedIds.includes(s.id))
    return result
  })

  // ── API Actions ────────────────────────────────────────────────────────────

  async function fetchAll() {
    try {
      isLoading.value = true
      const remoteSessions = await backend.fetchSessions()
      sessions.value = remoteSessions.map(s => ({
        id: s.id,
        title: s.title,
        model: s.model,
        taskId: s.taskId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
      emitter.emit('sessions:loaded')
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(title?: string, model?: string, taskId?: number): Promise<SessionSummary> {
    const remote = await backend.createSession(title, model, taskId)
    const session: SessionSummary = {
      id: remote.id,
      title: remote.title,
      model: remote.model,
      taskId: remote.taskId,
      createdAt: remote.createdAt,
      updatedAt: remote.updatedAt,
    }
    sessions.value.unshift(session)
    emitter.emit('session:created', { sessionId: session.id })
    return session
  }

  async function deleteSession(id: string) {
    await backend.deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    emitter.emit('session:deleted', { sessionId: id })
  }

  async function updateSessionTitle(id: string, title: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      await backend.updateSessionTitle(id, title)
      session.title = title
      session.updatedAt = Date.now()
    }
  }

  function setSessionModel(id: string, modelId: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.model = modelId
      session.updatedAt = Date.now()
    }
  }

  // ── Local Actions ──────────────────────────────────────────────────────────

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function createGroup(name: string): ChatGroup {
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

  function clear() {
    sessions.value = []
    groups.value = []
    searchQuery.value = ''
  }

  // ── 事件监听 ──────────────────────────────────────────────────────────────

  function setupEventListeners() {
    emitter.on('auth:login-success', fetchAll)
    emitter.on('auth:logout', clear)
  }

  function teardownEventListeners() {
    emitter.off('auth:login-success', fetchAll)
    emitter.off('auth:logout', clear)
  }

  return {
    sessions,
    groups,
    searchQuery,
    isLoading,
    filteredSessions,
    groupedSessions,
    fetchAll,
    createSession,
    deleteSession,
    updateSessionTitle,
    setSessionModel,
    setSearchQuery,
    createGroup,
    addSessionToGroup,
    clear,
    setupEventListeners,
    teardownEventListeners,
  }
}

export type SessionListModule = ReturnType<typeof createSessionListModule>