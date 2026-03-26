/**
 * @module stores/agent
 * @description Agent 任务状态管理（Pinia store）。
 *              通过 Electron IPC 与主进程 AgentRunner 通信：
 *              - runAgent()：发起任务，传入 sessionId 和用户输入
 *              - 订阅 onAgentEvent 实时更新流式输出
 *              - abort()：取消当前任务
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AgentEvent, ContentBlock } from '#agent/types'
import { useChatStore } from './chat'

/** 流式输出缓冲区 */
interface StreamBuffer {
  text: string
  thinking: string
  blocks: ContentBlock[]
}

export const useAgentStore = defineStore('agent', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  /** 当前运行的 taskId（对应一个 assistant 消息的生成过程） */
  const currentTaskId = ref<string | null>(null)
  /** 当前 taskId 关联的 sessionId */
  const currentSessionId = ref<string | null>(null)
  /** 是否正在生成 */
  const isGenerating = ref(false)
  /** 流式输出缓冲区 */
  const buffer = ref<StreamBuffer>({ text: '', thinking: '', blocks: [] })
  /** 错误信息 */
  const error = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  /** 当前累积的文本（不含 thinking） */
  const currentText = computed(() => buffer.value.text)

  /** 当前累积的 thinking 内容 */
  const currentThinking = computed(() => buffer.value.thinking)

  // ── IPC 事件订阅 ───────────────────────────────────────────────────────────
  let unsubscribe: (() => void) | null = null

  function ensureSubscribed() {
    if (unsubscribe) return
    unsubscribe = window.electronAPI.onAgentEvent(handleAgentEvent)
  }

  function handleAgentEvent(event: AgentEvent) {
    // 忽略非当前任务的事件
    if (event.taskId !== currentTaskId.value) return

    switch (event.type) {
      case 'text_delta':
        buffer.value.text += event.delta
        break

      case 'thinking_delta':
        buffer.value.thinking += event.delta
        break

      case 'tool_use':
        buffer.value.blocks.push({
          type: 'tool_use',
          id: event.toolUseId,
          name: event.toolName,
          input: event.input,
        })
        // 清空 text/thinking 缓冲，准备下一个 block
        flushTextToBlocks()
        break

      case 'tool_result':
        buffer.value.blocks.push({
          type: 'tool_result',
          toolUseId: event.toolUseId,
          content: event.result,
          isError: event.isError,
        })
        break

      case 'done': {
        console.log('[Agent] Done, blocks:', event.message.content)
        // 最终刷新文本缓冲
        flushTextToBlocks()
        // 追加到 chat store
        appendToChat(event.message.content)
        // 重置状态
        resetState()
        break
      }

      case 'error':
        console.error('[Agent] Error:', event.error, event.code)
        error.value = event.error
        isGenerating.value = false
        // 可选：把错误追加到消息
        const chatStore = useChatStore()
        const sid = currentSessionId.value
        if (sid) {
          chatStore.addMessage(sid, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ 错误: ${event.error}${event.code ? ` (${event.code})` : ''}`,
            timestamp: Date.now(),
          })
        }
        resetState()
        break
    }
  }

  /** 将累积的 text/thinking 刷新为 ContentBlock */
  function flushTextToBlocks() {
    const { text, thinking, blocks } = buffer.value
    if (thinking) {
      blocks.push({ type: 'thinking', thinking })
      buffer.value.thinking = ''
    }
    if (text) {
      blocks.push({ type: 'text', text })
      buffer.value.text = ''
    }
  }

  /** 将 assistant 消息追加到 chat store */
  function appendToChat(content: string | ContentBlock[]) {
    const chatStore = useChatStore()
    const sessionId = currentSessionId.value
    if (!sessionId) return

    // 如果 content 是 string，直接使用
    // 如果是 ContentBlock[]，使用 buffer.blocks（已经 flush 过）
    const finalContent: string | ContentBlock[] =
      typeof content === 'string' ? content : buffer.value.blocks

    chatStore.addMessage(sessionId, {
      id: Date.now().toString(),
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
    })
  }

  function resetState() {
    currentTaskId.value = null
    currentSessionId.value = null
    isGenerating.value = false
    buffer.value = { text: '', thinking: '', blocks: [] }
    error.value = null
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * 发起 agent 任务。
   * @param sessionId 会话 ID
   * @param userInput 用户输入
   * @param options 可选参数（model、systemPrompt 等）
   */
  async function runAgent(
    sessionId: string,
    userInput: string,
    options?: {
      model?: string
      systemPrompt?: string
      deepThink?: boolean
    },
  ) {
    ensureSubscribed()

    const chatStore = useChatStore()
    const taskId = Date.now().toString()

    // 追加用户消息
    chatStore.addMessage(sessionId, {
      id: taskId + '-user',
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    })

    // 构建历史消息（当前会话所有消息）
    const session = chatStore.sessions.find(s => s.id === sessionId)
    const messages = session?.messages.map(m => ({
      role: m.role,
      content: m.content,
    })) ?? []

    // 设置状态
    currentTaskId.value = taskId
    currentSessionId.value = sessionId
    isGenerating.value = true
    buffer.value = { text: '', thinking: '', blocks: [] }
    error.value = null

    // 调用 IPC
    await window.electronAPI.agentRun({
      taskId,
      userInput,
      messages,
      model: options?.model,
      systemPrompt: options?.systemPrompt,
      // deepThink 可映射到 thinking 参数（待 provider 支持）
    })
  }

  /** 取消当前任务 */
  async function abort() {
    const taskId = currentTaskId.value
    if (!taskId) return
    await window.electronAPI.agentAbort(taskId)
    resetState()
  }

  return {
    // State
    currentTaskId,
    currentSessionId,
    isGenerating,
    currentText,
    currentThinking,
    error,
    // Actions
    runAgent,
    abort,
  }
})