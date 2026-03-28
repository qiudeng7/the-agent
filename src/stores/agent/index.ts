/**
 * @module stores/agent
 * @description Agent 任务状态管理（Pinia store）。
 *              通过依赖注入的 transport 与后端通信。
 *
 * 依赖注入（通过 Vue inject）：
 * - agentTransport: IAgentTransportClient
 *
 * 事件解耦：
 * - result 时 emit 'agent:done'，由 messages store 监听处理
 * - error 时 emit 'agent:error'，由 messages store 监听处理
 * - system.init 时 emit 'agent:init'，记录 SDK 会话 ID
 *
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed, inject } from 'vue'
import type { ContentBlock, ClaudeEvent, PermissionMode, McpServerConfig } from '#claude/types'
import { AGENT_TRANSPORT_KEY, type IAgentTransportClient } from '@/di/interfaces'
import { emitter } from '@/events'

/** 流式输出缓冲区 */
interface StreamBuffer {
  content: ContentBlock[]
  /** 思考开始时间（毫秒），用于计算思考耗时 */
  thinkingStartTime: number | null
}

/** 创建空的缓冲区 */
function createEmptyBuffer(): StreamBuffer {
  return {
    content: [],
    thinkingStartTime: null,
  }
}

export const useAgentStore = defineStore('agent', () => {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const transport = inject<IAgentTransportClient>(AGENT_TRANSPORT_KEY)!

  // ── State ──────────────────────────────────────────────────────────────────
  const currentTaskId = ref<string | null>(null)
  const currentSessionId = ref<string | null>(null)
  const sdkSessionId = ref<string | null>(null)
  const currentModelId = ref<string | null>(null)
  const isGenerating = ref(false)
  const buffer = ref<StreamBuffer>(createEmptyBuffer())
  const error = ref<string | null>(null)
  const lastResult = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const currentContent = computed(() => buffer.value.content)

  /** 当前文本内容（从 buffer 中提取 text 类型的 block） */
  const currentText = computed(() => {
    const textBlocks = buffer.value.content.filter(b => b.type === 'text')
    return textBlocks.map(b => b.text).join('')
  })

  /** 当前思考内容（从 buffer 中提取 thinking 类型的 block） */
  const currentThinking = computed(() => {
    const thinkingBlocks = buffer.value.content.filter(b => b.type === 'thinking')
    return thinkingBlocks.map(b => b.thinking).join('')
  })

  // ── 事件订阅 ───────────────────────────────────────────────────────────────
  let unsubscribe: (() => void) | null = null

  function ensureSubscribed() {
    if (unsubscribe) return
    unsubscribe = transport.onEvent(handleClaudeEvent)
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

  /**
   * 处理 Claude SDK 流式事件
   */
  function handleClaudeEvent(event: ClaudeEvent) {
    if (event.taskId !== currentTaskId.value) return

    switch (event.type) {
      case 'system':
        if (event.subtype === 'init') {
          sdkSessionId.value = event.sessionId
          console.log('[Claude] Session initialized:', event.sessionId)
          const sessionId = currentSessionId.value
          if (sessionId) {
            emitter.emit('agent:init', { sessionId, sdkSessionId: event.sessionId })
          }
        }
        break

      case 'assistant':
        // 追加内容到缓冲区
        buffer.value.content.push(...event.content)
        break

      case 'user':
        // SDK 回放用户消息，一般用于多轮对话
        console.log('[Claude] User message replay:', event.content)
        break

      case 'tool_use':
        buffer.value.content.push({
          type: 'tool_use',
          id: event.toolUseId,
          name: event.toolName,
          input: event.input,
        })
        break

      case 'tool_result':
        buffer.value.content.push({
          type: 'tool_result',
          toolUseId: event.toolUseId,
          content: event.result,
          isError: event.isError,
        })
        break

      case 'result': {
        console.log('[Claude] Result:', event.result)
        lastResult.value = event.result

        // 触发事件，由 messages store 处理
        const sessionId = currentSessionId.value
        if (sessionId) {
          // 如果 buffer 为空但 result 有内容，创建 text block
          const content: ContentBlock[] = buffer.value.content.length > 0
            ? buffer.value.content
            : [{ type: 'text', text: event.result }]

          emitter.emit('agent:done', {
            sessionId,
            message: { role: 'assistant', content },
            stats: {
              costUsd: event.costUsd,
              durationMs: event.durationMs,
              durationApiMs: event.durationApiMs,
              numTurns: event.numTurns,
              totalTokens: event.totalTokens,
            },
          })
        }
        resetState()
        break
      }

      case 'error': {
        console.error('[Claude] Error:', event.error, event.code)
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

  function resetState() {
    currentTaskId.value = null
    currentSessionId.value = null
    sdkSessionId.value = null
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
   * @param options 可选参数
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
      /** 权限模式 */
      permissionMode?: PermissionMode
      /** 允许使用的工具列表 */
      allowedTools?: string[]
      /** MCP 服务器配置 */
      mcpServers?: Record<string, McpServerConfig>
      /** 恢复会话 ID */
      resume?: string
      /** 调试模式 */
      debug?: boolean
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
    lastResult.value = null

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
      permissionMode: options?.permissionMode,
      allowedTools: options?.allowedTools,
      mcpServers: options?.mcpServers,
      resume: options?.resume,
      debug: options?.debug,
    }
    console.log('[Claude] Running with options:', {
      model: requestOptions.model,
      baseURL: requestOptions.baseURL,
      permissionMode: requestOptions.permissionMode,
      allowedTools: requestOptions.allowedTools,
      resume: requestOptions.resume,
    })
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
    sdkSessionId,
    currentModelId,
    isGenerating,
    currentContent,
    currentText,
    currentThinking,
    error,
    lastResult,
    runAgent,
    abort,
    teardown,
    setupEventListeners,
    teardownEventListeners,
  }
})

// 导出子模块
export * from './types'