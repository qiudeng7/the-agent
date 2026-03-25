/**
 * @module agent/providers/claude
 * @description Claude provider — 基于 @anthropic-ai/sdk 实现 IAgentProvider。
 *
 *              执行完整的 agentic loop：
 *              1. 调用 Claude Messages API（流式）
 *              2. 遇到 tool_use 时 yield ToolUseEvent，等待工具执行回调，yield ToolResultEvent
 *              3. 将工具结果作为新消息继续请求，直到 stop_reason === 'end_turn'
 *              4. 最终 yield DoneEvent（含完整 assistant 消息）
 *              5. 任意阶段出错 yield ErrorEvent
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  AgentRunOptions,
  AgentEvent,
  AgentMessage,
  ContentBlock,
  ToolResultContent,
} from '../../types'
import type { IAgentProvider } from '../../interfaces/provider'

// ─────────────────────────────────────────────────────────────────────────────
// 类型映射辅助
// ─────────────────────────────────────────────────────────────────────────────

/** 将 AgentMessage[] 转换为 Anthropic SDK 的 MessageParam[] */
function toSdkMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content }
    }

    const content: Anthropic.ContentBlockParam[] = msg.content.map((block) => {
      switch (block.type) {
        case 'text':
          return { type: 'text', text: block.text } satisfies Anthropic.TextBlockParam
        case 'thinking':
          // thinking block 回传时需要 signature（Claude 要求）
          return {
            type: 'thinking',
            thinking: block.thinking,
            signature: block.signature ?? '',
          } as Anthropic.ThinkingBlockParam
        case 'tool_use':
          return {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          } satisfies Anthropic.ToolUseBlockParam
        case 'tool_result':
          return {
            type: 'tool_result',
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          } satisfies Anthropic.ToolResultBlockParam
      }
    })

    return { role: msg.role, content }
  })
}

/** 将 AgentRunOptions 的 tools 转换为 Anthropic SDK 的 Tool[] */
function toSdkTools(tools: AgentRunOptions['tools']): Anthropic.Tool[] {
  if (!tools) return []
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object' as const,
      properties: t.inputSchema.properties,
      required: t.inputSchema.required,
    },
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// ClaudeProvider
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeProviderOptions {
  /** Anthropic API Key，默认读取 process.env.ANTHROPIC_API_KEY */
  apiKey?: string
  /** 默认模型，可被 AgentRunOptions.model 覆盖 */
  defaultModel?: string
  /** 默认最大 token 数 */
  defaultMaxTokens?: number
}

export class ClaudeProvider implements IAgentProvider {
  readonly name = 'claude'

  private client: Anthropic
  private defaultModel: string
  private defaultMaxTokens: number
  /** 正在运行的任务：taskId → AbortController */
  private runningTasks = new Map<string, AbortController>()

  constructor(options: ClaudeProviderOptions = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey })
    this.defaultModel = options.defaultModel ?? 'claude-opus-4-6'
    this.defaultMaxTokens = options.defaultMaxTokens ?? 16000
  }

  abort(taskId: string): void {
    const ctrl = this.runningTasks.get(taskId)
    if (ctrl) {
      ctrl.abort()
      this.runningTasks.delete(taskId)
    }
  }

  async *run(options: AgentRunOptions): AsyncIterable<AgentEvent> {
    const { taskId, userInput, systemPrompt, model, maxTokens, tools } = options

    const abortCtrl = new AbortController()
    this.runningTasks.set(taskId, abortCtrl)

    try {
      yield* this._agenticLoop({
        taskId,
        userInput,
        systemPrompt,
        model: model ?? this.defaultModel,
        maxTokens: maxTokens ?? this.defaultMaxTokens,
        tools,
        history: options.messages,
        signal: abortCtrl.signal,
      })
    } finally {
      this.runningTasks.delete(taskId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：agentic loop
  // ─────────────────────────────────────────────────────────────────────────

  private async *_agenticLoop(params: {
    taskId: string
    userInput: string
    history: AgentMessage[]
    systemPrompt?: string
    model: string
    maxTokens: number
    tools?: AgentRunOptions['tools']
    signal: AbortSignal
  }): AsyncIterable<AgentEvent> {
    const { taskId, userInput, history, systemPrompt, model, maxTokens, tools, signal } = params

    // 构造初始消息列表：历史 + 本轮用户输入
    const messages: Anthropic.MessageParam[] = [
      ...toSdkMessages(history),
      { role: 'user', content: userInput },
    ]

    const sdkTools = toSdkTools(tools)

    // 记录本轮完整 assistant ContentBlock，供最终 DoneEvent 使用
    const assistantBlocks: ContentBlock[] = []

    // agentic loop：持续循环直到 end_turn 或 abort
    loop: while (true) {
      if (signal.aborted) {
        yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
        return
      }

      // ── 一轮流式请求 ──────────────────────────────────────────────────────
      const toolUseBlocksThisRound: Anthropic.ToolUseBlock[] = []

      try {
        const stream = this.client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            tools: sdkTools.length > 0 ? sdkTools : undefined,
            messages,
          },
          { signal },
        )

        // 逐事件处理流
        for await (const event of stream) {
          if (signal.aborted) break

          switch (event.type) {
            case 'content_block_start':
              // tool_use block 开始时记录，文本/思考 block 无需特殊处理
              break

            case 'content_block_delta': {
              const delta = event.delta
              if (delta.type === 'text_delta') {
                yield { type: 'text_delta', taskId, delta: delta.text }
              } else if (delta.type === 'thinking_delta') {
                yield { type: 'thinking_delta', taskId, delta: delta.thinking }
              }
              break
            }

            case 'content_block_stop':
              break
          }
        }

        // 获取完整 message（包含所有 content blocks）
        const message = await stream.finalMessage()

        // 处理本轮所有 content blocks，追加到 assistantBlocks
        for (const block of message.content) {
          switch (block.type) {
            case 'text':
              assistantBlocks.push({ type: 'text', text: block.text })
              break
            case 'thinking':
              assistantBlocks.push({
                type: 'thinking',
                thinking: block.thinking,
                signature: (block as { signature?: string }).signature,
              })
              break
            case 'tool_use':
              assistantBlocks.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
              toolUseBlocksThisRound.push(block)
              break
          }
        }

        // ── 判断 stop_reason ────────────────────────────────────────────────
        if (message.stop_reason === 'end_turn' || toolUseBlocksThisRound.length === 0) {
          // 生成完毕
          const doneMessage: AgentMessage = {
            role: 'assistant',
            content: assistantBlocks,
          }
          yield { type: 'done', taskId, message: doneMessage }
          break loop
        }

        // stop_reason === 'tool_use'：需要执行工具并继续
        // 将本轮 assistant 消息加入历史
        messages.push({ role: 'assistant', content: message.content })

        // yield ToolUseEvent，并收集工具结果
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolBlock of toolUseBlocksThisRound) {
          // 通知外部工具调用开始
          yield {
            type: 'tool_use',
            taskId,
            toolUseId: toolBlock.id,
            toolName: toolBlock.name,
            input: toolBlock.input as Record<string, unknown>,
          }

          // 执行工具（由外部工具执行器通过 transport 回调提供结果）
          // 注意：当前架构中工具执行是在 runner 层做的；
          // provider 这里需要一个机制拿到结果。
          // 采用"工具执行回调"方式：通过构造函数注入，或在 run() 参数中传入。
          // 当前先 yield ToolUseEvent，由 runner 拿到结果后通过
          // _pendingToolResults 传回（见下方说明）
          const result = await this._waitForToolResult(toolBlock.id, signal)

          yield {
            type: 'tool_result',
            taskId,
            toolUseId: toolBlock.id,
            result: result.content,
            isError: result.isError ?? false,
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: result.content,
            is_error: result.isError,
          })

          // 将工具结果追加到 assistantBlocks
          const resultBlock: ToolResultContent = {
            type: 'tool_result',
            toolUseId: toolBlock.id,
            content: result.content,
            isError: result.isError,
          }
          assistantBlocks.push(resultBlock)
        }

        // 将工具结果作为 user 消息加入对话，继续下一轮
        messages.push({ role: 'user', content: toolResults })
      } catch (err) {
        if (signal.aborted) {
          yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
          return
        }
        const errorMsg = err instanceof Error ? err.message : String(err)
        const code = err instanceof Anthropic.RateLimitError
          ? 'rate_limit'
          : err instanceof Anthropic.AuthenticationError
            ? 'auth'
            : undefined
        yield { type: 'error', taskId, error: errorMsg, code }
        return
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 工具结果等待机制
  // 外部调用 resolveToolResult(toolUseId, result) 来解除等待
  // ─────────────────────────────────────────────────────────────────────────

  private _pendingTools = new Map<
    string,
    {
      resolve: (result: { content: string; isError?: boolean }) => void
      reject: (err: Error) => void
    }
  >()

  /**
   * Provider 内部等待工具执行结果。
   * 外部（AgentRunner）在工具执行完成后调用 resolveToolResult() 传入结果。
   */
  private _waitForToolResult(
    toolUseId: string,
    signal: AbortSignal,
  ): Promise<{ content: string; isError?: boolean }> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('aborted'))
        return
      }

      this._pendingTools.set(toolUseId, { resolve, reject })

      signal.addEventListener('abort', () => {
        this._pendingTools.delete(toolUseId)
        reject(new Error('aborted'))
      })
    })
  }

  /**
   * 由 AgentRunner 调用：将工具执行结果传回 provider，解除等待。
   */
  resolveToolResult(toolUseId: string, result: { content: string; isError?: boolean }): void {
    const pending = this._pendingTools.get(toolUseId)
    if (pending) {
      this._pendingTools.delete(toolUseId)
      pending.resolve(result)
    }
  }
}
