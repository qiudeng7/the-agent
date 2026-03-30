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
  /** 当前消息的块索引偏移（每条新消息重置） */
  blockIndexOffset: number
  /** 当前消息中已处理的块数量 */
  currentMessageBlocks: number
}

/** 创建空的缓冲区 */
function createEmptyBuffer(): StreamBuffer {
  return {
    content: [],
    thinkingStartTime: null,
    blockIndexOffset: 0,
    currentMessageBlocks: 0,
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
   * 处理流式增量事件
   */
  function handleStreamEvent(event: ClaudeEvent) {
    if (event.type !== 'stream_event') return

    switch (event.subtype) {
      case 'message_start': {
        // 新消息开始，重置当前消息的索引偏移
        buffer.value.blockIndexOffset = buffer.value.content.length
        buffer.value.currentMessageBlocks = 0
        break
      }

      case 'content_block_start': {
        // 开始新的内容块，push 到 buffer 末尾
        const newBlock: ContentBlock = event.blockType === 'text'
          ? { type: 'text', text: '' }
          : event.blockType === 'thinking'
            ? { type: 'thinking', thinking: '' }
            : { type: 'tool_use', id: event.toolUseId ?? '', name: event.toolName ?? '', input: {} }

        buffer.value.content.push(newBlock)
        buffer.value.currentMessageBlocks++

        if (event.blockType === 'thinking') {
          buffer.value.thinkingStartTime = Date.now()
        }
        break
      }

      case 'text_delta': {
        // 计算实际索引：当前消息中第 N 个块
        const actualIndex = buffer.value.blockIndexOffset + event.index
        const textBlock = buffer.value.content[actualIndex]
        if (textBlock && textBlock.type === 'text') {
          textBlock.text += event.text
        }
        break
      }

      case 'thinking_delta': {
        const actualIndex = buffer.value.blockIndexOffset + event.index
        const thinkingBlock = buffer.value.content[actualIndex]
        if (thinkingBlock && thinkingBlock.type === 'thinking') {
          thinkingBlock.thinking += event.thinking
        }
        break
      }

      case 'input_json_delta': {
        const actualIndex = buffer.value.blockIndexOffset + event.index
        const toolUseBlock = buffer.value.content[actualIndex] as ContentBlock & { _partialJson?: string }
        if (toolUseBlock && toolUseBlock.type === 'tool_use') {
          if (!toolUseBlock._partialJson) {
            toolUseBlock._partialJson = ''
          }
          toolUseBlock._partialJson += event.partialJson
        }
        break
      }

      case 'content_block_stop': {
        const actualIndex = buffer.value.blockIndexOffset + event.index
        const block = buffer.value.content[actualIndex] as ContentBlock & { _partialJson?: string }
        if (block) {
          if (block.type === 'thinking' && buffer.value.thinkingStartTime) {
            block.durationMs = Date.now() - buffer.value.thinkingStartTime
            buffer.value.thinkingStartTime = null
          }
          if (block.type === 'tool_use' && block._partialJson) {
            try {
              block.input = JSON.parse(block._partialJson)
            } catch {
              block.input = {}
            }
            delete block._partialJson
          }
          // tool_use 结束时，添加一个 running 状态的占位符，让用户立刻看到执行状态
          if (block.type === 'tool_use') {
            const placeholder: ContentBlock = {
              type: 'tool_result',
              toolUseId: block.id,
              content: '',
              isError: false,
            }
            buffer.value.content.push(placeholder)
          }
        }
        break
      }

      case 'message_stop': {
        // 消息结束，更新偏移量
        buffer.value.blockIndexOffset = buffer.value.content.length
        break
      }
    }
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
        // 启用流式输出时，assistant 事件可能包含 tool_result blocks
        // stream_event 只增量构建 text/thinking/tool_use，tool_result 需要从 assistant 合入
        for (const block of event.content) {
          if (block.type === 'tool_result') {
            // 找到对应的占位符并更新
            const placeholder = buffer.value.content.find(
              b => b.type === 'tool_result' && b.toolUseId === block.toolUseId && b.content === '',
            )
            if (placeholder) {
              placeholder.content = block.content
              placeholder.isError = block.isError
            } else {
              // 没有占位符，检查是否已存在（避免重复）
              const exists = buffer.value.content.some(
                b => b.type === 'tool_result' && b.toolUseId === block.toolUseId,
              )
              if (!exists) {
                buffer.value.content.push(block)
              }
            }
          }
        }
        break

      case 'user':
        // SDK 回放用户消息，一般用于多轮对话
        console.log('[Claude] User message replay:', event.content)
        // 检查是否包含 tool_result，更新对应的占位符
        for (const block of event.content) {
          if (block.type === 'tool_result') {
            console.log('[Claude] Found tool_result in user message:', block)
            // 找到对应的占位符并更新
            const placeholder = buffer.value.content.find(
              b => b.type === 'tool_result' && b.toolUseId === block.toolUseId && b.content === '',
            )
            if (placeholder) {
              // 更新占位符内容
              placeholder.content = block.content
              placeholder.isError = block.isError
            } else {
              // 没有占位符，直接添加（避免重复）
              const exists = buffer.value.content.some(
                b => b.type === 'tool_result' && b.toolUseId === block.toolUseId,
              )
              if (!exists) {
                buffer.value.content.push(block)
              }
            }
          }
        }
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

      case 'stream_event':
        handleStreamEvent(event)
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
        // 先保存已生成的内容
        saveBufferBeforeReset()
        // 触发错误事件（追加错误消息）
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

    // 打断时保存已生成的内容（如果有）
    saveBufferBeforeReset()

    await transport.abort(taskId)
    resetState()
  }

  /** 打断或出错时保存已生成的内容 */
  function saveBufferBeforeReset() {
    const sessionId = currentSessionId.value
    if (!sessionId) return

    const content = buffer.value.content
    if (content.length === 0) return

    // 过滤掉没有实际内容的空块
    const meaningfulContent = content.filter(block => {
      if (block.type === 'text') return block.text.length > 0
      if (block.type === 'thinking') return block.thinking.length > 0
      if (block.type === 'tool_use') return block.id && block.name
      return true // tool_result 保留
    })

    if (meaningfulContent.length === 0) return

    // 发送打断时的消息
    emitter.emit('agent:done', {
      sessionId,
      message: { role: 'assistant', content: meaningfulContent },
      stats: undefined, // 打断时没有统计信息
    })
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