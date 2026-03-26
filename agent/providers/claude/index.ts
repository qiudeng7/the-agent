/**
 * @module agent/providers/claude
 * @description Claude provider — 基于 @anthropic-ai/sdk 实现 IAgentProvider。
 *
 *              执行完整的 agentic loop：
 *              1. 调用 Claude Messages API（流式）
 *              2. 遇到 tool_use 时调用 options.toolExecutor 执行工具
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
} from '#agent/types'
import type { IAgentProvider } from '#agent/interfaces/provider'

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

  private defaultClient: Anthropic
  private defaultModel: string
  private defaultMaxTokens: number
  /** 正在运行的任务：taskId → AbortController */
  private runningTasks = new Map<string, AbortController>()
  /** 每个任务使用的 client（可能不同 baseURL） */
  private taskClients = new Map<string, Anthropic>()

  constructor(options: ClaudeProviderOptions = {}) {
    this.defaultClient = new Anthropic({ apiKey: options.apiKey })
    this.defaultModel = options.defaultModel ?? 'claude-opus-4-6'
    this.defaultMaxTokens = options.defaultMaxTokens ?? 16000
  }

  abort(taskId: string): void {
    const ctrl = this.runningTasks.get(taskId)
    if (ctrl) {
      ctrl.abort()
      this.runningTasks.delete(taskId)
    }
    this.taskClients.delete(taskId)
  }

  async *run(options: AgentRunOptions): AsyncIterable<AgentEvent> {
    const abortCtrl = new AbortController()
    this.runningTasks.set(options.taskId, abortCtrl)

    // 为这个任务创建 client（可能使用自定义 apiKey 和 baseURL）
    const client = (options.apiKey || options.baseURL)
      ? new Anthropic({ apiKey: options.apiKey, baseURL: options.baseURL })
      : this.defaultClient
    this.taskClients.set(options.taskId, client)

    try {
      yield* this._agenticLoop(options, abortCtrl.signal, client)
    } finally {
      this.runningTasks.delete(options.taskId)
      this.taskClients.delete(options.taskId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：agentic loop
  // ─────────────────────────────────────────────────────────────────────────

  private async *_agenticLoop(
    options: AgentRunOptions,
    signal: AbortSignal,
    client: Anthropic,
  ): AsyncIterable<AgentEvent> {
    const {
      taskId,
      userInput,
      messages: history,
      systemPrompt,
      tools,
      toolExecutor,
    } = options

    const model = options.model ?? this.defaultModel
    const maxTokens = options.maxTokens ?? this.defaultMaxTokens

    // 构造初始消息列表：历史 + 本轮用户输入
    const messages: Anthropic.MessageParam[] = [
      ...toSdkMessages(history),
      { role: 'user', content: userInput },
    ]

    const sdkTools = toSdkTools(tools)

    // 记录本轮 assistant 侧 ContentBlock（text / thinking / tool_use）
    // tool_result 属于 user 侧消息，不放入此数组
    const assistantBlocks: ContentBlock[] = []

    // agentic loop：持续循环直到 end_turn 或 abort
    loop: while (true) {
      if (signal.aborted) {
        yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
        return
      }

      const toolUseBlocksThisRound: Anthropic.ToolUseBlock[] = []

      try {
        // ── 流式请求 ──────────────────────────────────────────────────────
        const stream = client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            tools: sdkTools.length > 0 ? sdkTools : undefined,
            messages,
          },
          { signal },
        )

        for await (const event of stream) {
          if (signal.aborted) break

          if (event.type === 'content_block_delta') {
            const { delta } = event
            if (delta.type === 'text_delta') {
              yield { type: 'text_delta', taskId, delta: delta.text }
            } else if (delta.type === 'thinking_delta') {
              yield { type: 'thinking_delta', taskId, delta: delta.thinking }
            }
          }
        }

        const message = await stream.finalMessage()

        // 收集本轮 assistant content blocks
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

        // ── 判断 stop_reason ────────────────────────────────────────────
        if (message.stop_reason === 'end_turn' || toolUseBlocksThisRound.length === 0) {
          yield {
            type: 'done',
            taskId,
            message: { role: 'assistant', content: assistantBlocks },
          }
          break loop
        }

        // stop_reason === 'tool_use'：执行工具，继续下一轮
        messages.push({ role: 'assistant', content: message.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolBlock of toolUseBlocksThisRound) {
          yield {
            type: 'tool_use',
            taskId,
            toolUseId: toolBlock.id,
            toolName: toolBlock.name,
            input: toolBlock.input as Record<string, unknown>,
          }

          // 调用注入的 executor；若无 executor 则返回错误让 LLM 感知
          const result = toolExecutor
            ? await toolExecutor(toolBlock.name, toolBlock.input as Record<string, unknown>, taskId, signal)
            : { content: `No toolExecutor provided for tool "${toolBlock.name}"`, isError: true }

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
        }

        // 工具结果作为 user 消息加入对话
        messages.push({ role: 'user', content: toolResults })

      } catch (err) {
        if (signal.aborted) {
          yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
          return
        }
        const error = err instanceof Error ? err.message : String(err)
        const code = err instanceof Anthropic.RateLimitError
          ? 'rate_limit'
          : err instanceof Anthropic.AuthenticationError
            ? 'auth'
            : undefined
        yield { type: 'error', taskId, error, code }
        return
      }
    }
  }
}
