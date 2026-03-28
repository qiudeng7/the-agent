/**
 * @module stores/agent
 * @description Agent 任务状态管理（Pinia store）。
 *              通过依赖注入的 transport 与后端通信。
 *
 * 依赖注入（通过 Vue inject）：
 * - agentTransport: IAgentTransportClient
 *
 * 模块拆分：
 * - types.ts: 内部类型定义
 * - stream-buffer.ts: 流式输出缓冲区管理
 * - event-handler.ts: Agent 事件处理
 * - task-runner.ts: 任务调度逻辑
 *
 * 事件解耦：
 * - done 时 emit 'agent:done'，由 messages store 监听处理
 * - error 时 emit 'agent:error'，由 messages store 监听处理
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, inject } from 'vue'
import type { AgentEvent, ContentBlock } from '#agent/types'
import { AGENT_TRANSPORT_KEY, type IAgentTransportClient } from '@/di/interfaces'
import { emitter } from '@/events'
import type { StreamBuffer } from './types'
import { createEmptyBuffer } from './types'

export const useAgentStore = defineStore('agent', () => {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const transport = inject<IAgentTransportClient>(AGENT_TRANSPORT_KEY)!

  // ── State ──────────────────────────────────────────────────────────────────
  const currentTaskId = ref<string | null>(null)
  const currentSessionId = ref<string | null>(null)
  const currentModelId = ref<string | null>(null)
  const isGenerating = ref(false)
  const buffer = ref<StreamBuffer>(createEmptyBuffer())
  const error = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const currentText = computed(() => buffer.value.text)
  const currentThinking = computed(() => buffer.value.thinking)

  // ── 事件订阅 ───────────────────────────────────────────────────────────────
  let unsubscribe: (() => void) | null = null

  function ensureSubscribed() {
    if (unsubscribe) return
    unsubscribe = transport.onEvent(handleAgentEvent)
  }

  function setupEventListeners() {
    emitter.on('auth:logout', teardown)
  }

  function teardownEventListeners() {
    emitter.off('auth:logout', teardown)
  }

  function teardown() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    resetState()
  }

  function handleAgentEvent(event: AgentEvent) {
    if (event.taskId !== currentTaskId.value) return

    switch (event.type) {
      case 'text_delta':
        buffer.value.text += event.delta
        break

      case 'thinking_delta':
        if (!buffer.value.thinkingStartTime) {
          buffer.value.thinkingStartTime = Date.now()
        }
        buffer.value.thinking += event.delta
        break

      case 'tool_use':
        flushTextToBlocks()
        buffer.value.blocks.push({
          type: 'tool_use',
          id: event.toolUseId,
          name: event.toolName,
          input: event.input,
        })
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
        flushTextToBlocks()
        // 触发事件，由 messages store 处理
        const sessionId = currentSessionId.value
        if (sessionId) {
          emitter.emit('agent:done', {
            sessionId,
            message: { role: 'assistant', content: buffer.value.blocks },
          })
        }
        resetState()
        break
      }

      case 'error': {
        console.error('[Agent] Error:', event.error, event.code)
        error.value = event.error
        isGenerating.value = false
        // 触发错误事件
        const sessionId = currentSessionId.value
        if (sessionId) {
          emitter.emit('agent:error', {
            sessionId,
            error: event.error,
            code: event.code,
          })
        }
        resetState()
        break
      }
    }
  }

  function flushTextToBlocks() {
    const { text, thinking, blocks, thinkingStartTime } = buffer.value
    if (thinking) {
      blocks.push({
        type: 'thinking',
        thinking,
        durationMs: thinkingStartTime ? Date.now() - thinkingStartTime : undefined,
      })
      buffer.value.thinking = ''
      buffer.value.thinkingStartTime = null
    }
    if (text) {
      blocks.push({ type: 'text', text })
      buffer.value.text = ''
    }
  }

  function resetState() {
    currentTaskId.value = null
    currentSessionId.value = null
    currentModelId.value = null
    isGenerating.value = false
    buffer.value = createEmptyBuffer()
    error.value = null
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * 发起 agent 任务。
   * @param sessionId 会话 ID
   * @param userInput 用户输入
   * @param messages 历史消息（由外部提供）
   * @param options 可选参数（model、systemPrompt、apiKey、baseURL）
   */
  async function runAgent(
    sessionId: string,
    userInput: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }>,
    options?: {
      model?: string
      systemPrompt?: string
      apiKey?: string
      baseURL?: string
    },
  ) {
    ensureSubscribed()

    const taskId = Date.now().toString()
    const modelId = options?.model || ''

    // 设置状态
    currentTaskId.value = taskId
    currentSessionId.value = sessionId
    currentModelId.value = modelId
    isGenerating.value = true
    buffer.value = createEmptyBuffer()
    error.value = null

    // 触发开始事件（让 messages store 添加用户消息）
    emitter.emit('agent:start', { sessionId, taskId })

    // 调用 IPC
    const requestOptions = {
      taskId,
      userInput,
      messages: JSON.parse(JSON.stringify(messages)),
      model: modelId,
      systemPrompt: options?.systemPrompt,
      apiKey: options?.apiKey,
      baseURL: options?.baseURL,
    }
    console.log('[Agent] Running with model:', requestOptions.model, 'baseURL:', requestOptions.baseURL)
    await transport.run(requestOptions)
  }

  async function abort() {
    const taskId = currentTaskId.value
    if (!taskId) return
    await transport.abort(taskId)
    resetState()
  }

  return {
    currentTaskId,
    currentSessionId,
    currentModelId,
    isGenerating,
    currentText,
    currentThinking,
    error,
    runAgent,
    abort,
    teardown,
    setupEventListeners,
    teardownEventListeners,
  }
})

// 导出子模块
export * from './types'