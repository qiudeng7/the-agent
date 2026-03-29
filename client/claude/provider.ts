/**
 * @module claude/provider
 * @description ClaudeAgentProvider — 基于 @anthropic-ai/claude-agent-sdk 实现。
 *
 *              核心职责：
 *              1. 配置 SDK 环境（API key、base URL、CLI path）
 *              2. 调用 SDK query() 函数
 *              3. 将 SDK message 转换为 ClaudeEvent（IPC 类型）
 *              4. 管理 abort 状态
 */

import path from 'path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultSuccess,
  SDKResultError,
  SDKSystemMessage,
  SDKUserMessage,
  SDKToolUseSummaryMessage,
} from '@anthropic-ai/claude-agent-sdk'
import type { BetaRawMessageStreamEvent, BetaContentBlock, BetaTextBlock, BetaThinkingBlock, BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { ClaudeRunOptions, ClaudeEvent, ContentBlock } from './types'
import { detectClaude } from '#claude-installer'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 路径解析
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取 Claude Agent SDK 的 cli.js 路径。
 * 在 Electron 打包环境中，SDK 无法通过 import.meta.url 正确定位 cli.js，
 * 需要通过 require.resolve 找到正确的路径。
 */
function getSdkCliPath(): string {
  try {
    // 通过 package.json 定位 SDK 包目录
    const sdkPackagePath = require.resolve('@anthropic-ai/claude-agent-sdk/package.json')
    return path.join(path.dirname(sdkPackagePath), 'cli.js')
  } catch {
    // 回退：尝试直接解析 cli.js
    try {
      return require.resolve('@anthropic-ai/claude-agent-sdk/cli.js')
    } catch {
      // 最后回退：假设在 node_modules 中
      return path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'cli.js')
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ClaudeAgentProvider
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeProviderOptions {
  /** Claude Code 可执行文件路径（如果已安装） */
  claudePath?: string
  /** 默认模型，默认值：'claude-opus-4-6' */
  defaultModel?: string
  /** 进度回调，用于在初始化过程中向用户显示进度信息 */
  onProgress?: (message: string) => void
}

export class ClaudeAgentProvider {
  readonly name = 'claude-agent-sdk'

  private sdkCliPath: string
  private claudePath: string | null = null
  private defaultModel: string
  private onProgress?: (message: string) => void
  /** 正在运行的任务：taskId → AbortController */
  private runningTasks = new Map<string, AbortController>()
  /** 是否已初始化（检测 claude 路径） */
  private initialized = false

  constructor(options: ClaudeProviderOptions = {}) {
    this.sdkCliPath = getSdkCliPath()
    this.claudePath = options.claudePath ?? null
    this.defaultModel = options.defaultModel ?? 'claude-opus-4-6'
    this.onProgress = options.onProgress

    console.log('[ClaudeAgentProvider] SDK CLI path:', this.sdkCliPath)
  }

  /**
   * 初始化：检测 Claude Code 路径。
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // 如果已提供路径，直接使用
    if (this.claudePath) {
      console.log('[ClaudeAgentProvider] Using provided claude path:', this.claudePath)
      this.initialized = true
      return
    }

    // 检测系统中是否已安装
    this.onProgress?.('Detecting Claude Code installation...')
    const detected = await detectClaude()
    if (detected) {
      this.claudePath = detected
      console.log('[ClaudeAgentProvider] Detected claude at:', this.claudePath)
      this.onProgress?.(`Found Claude Code at: ${this.claudePath}`)
    } else {
      console.log('[ClaudeAgentProvider] Claude Code not found, will use SDK cli.js')
      this.onProgress?.('Claude Code not found in system')
    }

    this.initialized = true
  }

  abort(taskId: string): void {
    const ctrl = this.runningTasks.get(taskId)
    if (ctrl) {
      ctrl.abort()
      this.runningTasks.delete(taskId)
    }
  }

  async *run(options: ClaudeRunOptions): AsyncIterable<ClaudeEvent> {
    // 确保已初始化
    await this.initialize()

    const { taskId } = options
    const ctrl = new AbortController()
    this.runningTasks.set(taskId, ctrl)

    try {
      // 构建 SDK options
      const sdkOptions = this._buildSdkOptions(options)

      // 构建 prompt（支持多轮对话）
      const prompt = this._buildPrompt(options)

      // 调用 SDK query()
      for await (const message of query({ prompt, options: sdkOptions })) {
        if (ctrl.signal.aborted) {
          yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
          return
        }

        const event = this._convertMessage(message, taskId)
        if (event) {
          yield event
        }
      }
    } catch (err) {
      if (ctrl.signal.aborted) {
        yield { type: 'error', taskId, error: 'Task aborted', code: 'aborted' }
      } else {
        const error = err instanceof Error ? err.message : String(err)
        yield { type: 'error', taskId, error }
      }
    } finally {
      this.runningTasks.delete(taskId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：构建 SDK options
  // ─────────────────────────────────────────────────────────────────────────

  private _buildSdkOptions(options: ClaudeRunOptions): Record<string, unknown> {
    const {
      model,
      apiKey,
      baseURL,
      systemPrompt,
      permissionMode,
      allowedTools,
      mcpServers,
      resume,
      debug,
    } = options

    // 通过 env 选项传递环境变量给 SDK 子进程
    const env: Record<string, string> = {}
    if (apiKey) {
      env.ANTHROPIC_API_KEY = apiKey
    }
    if (baseURL) {
      env.ANTHROPIC_BASE_URL = baseURL
    }

    // 确定 pathToClaudeCodeExecutable：
    // - 如果检测到系统安装的 claude，使用该路径
    // - 否则使用 SDK 包内的 cli.js
    const pathToClaudeCodeExecutable = this.claudePath || this.sdkCliPath

    return {
      model: model ?? this.defaultModel,
      systemPrompt,
      permissionMode,
      allowedTools,
      mcpServers,
      resume,
      debug,
      env: Object.keys(env).length > 0 ? env : undefined,
      pathToClaudeCodeExecutable,
      includePartialMessages: true,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：构建 prompt
  // ─────────────────────────────────────────────────────────────────────────

  private _buildPrompt(options: ClaudeRunOptions): string {
    const { userInput, messages } = options

    // 如果有历史消息，将其格式化为对话上下文文本
    // SDK 主要通过 resume 功能实现多轮对话，这里只做简单的文本拼接
    if (messages && messages.length > 0) {
      const historyText = messages
        .map((m) => {
          const contentText =
            typeof m.content === 'string'
              ? m.content
              : m.content
                  .map((b: ContentBlock) => {
                    if (b.type === 'text') return b.text
                    if (b.type === 'thinking') return `[思考] ${b.thinking}`
                    if (b.type === 'tool_use') return `[工具调用] ${b.name}`
                    if (b.type === 'tool_result') return `[工具结果] ${b.content}`
                    return ''
                  })
                  .join('\n')
          return `${m.role === 'user' ? '用户' : '助手'}: ${contentText}`
        })
        .join('\n\n')

      return `${historyText}\n\n用户: ${userInput}`
    }

    // 无历史消息，直接使用用户输入
    return userInput
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：转换 SDK message 为 ClaudeEvent
  // ─────────────────────────────────────────────────────────────────────────

  private _convertMessage(msg: SDKMessage, taskId: string): ClaudeEvent | null {
    switch (msg.type) {
      case 'system': {
        const sysMsg = msg as SDKSystemMessage
        if (sysMsg.subtype === 'init') {
          return {
            type: 'system',
            subtype: 'init',
            taskId,
            sessionId: sysMsg.session_id,
          }
        }
        return null
      }

      case 'assistant': {
        const assistantMsg = msg as SDKAssistantMessage
        return {
          type: 'assistant',
          taskId,
          content: this._mapContentBlocks(assistantMsg.message.content),
        }
      }

      case 'user': {
        const userMsg = msg as SDKUserMessage
        const content = userMsg.message.content
        console.log('[ClaudeAgentProvider] User message:', { type: typeof content, content })
        // SDKUserMessage.message.content 可以是 string 或 ContentBlockParam[]
        if (typeof content === 'string') {
          return {
            type: 'user',
            taskId,
            content: [{ type: 'text', text: content }],
          }
        }
        const mappedContent = this._mapContentParamArray(content as unknown[])
        console.log('[ClaudeAgentProvider] Mapped user content:', mappedContent)
        return {
          type: 'user',
          taskId,
          content: mappedContent,
        }
      }

      case 'result': {
        if (msg.subtype === 'success') {
          const resultMsg = msg as SDKResultSuccess
          return {
            type: 'result',
            taskId,
            result: resultMsg.result,
            costUsd: resultMsg.total_cost_usd,
            durationMs: resultMsg.duration_ms,
            durationApiMs: resultMsg.duration_api_ms,
            numTurns: resultMsg.num_turns,
            totalTokens: resultMsg.usage?.input_tokens + resultMsg.usage?.output_tokens,
          }
        } else {
          const errorResult = msg as SDKResultError
          return {
            type: 'error',
            taskId,
            error: errorResult.errors?.join('\n') ?? 'Unknown error',
          }
        }
      }

      case 'stream_event': {
        // SDKPartialAssistantMessage 的 type 是 'stream_event'
        return this._convertStreamEvent(msg as { type: 'stream_event'; event: BetaRawMessageStreamEvent }, taskId)
      }

      case 'tool_use_summary': {
        const toolMsg = msg as SDKToolUseSummaryMessage
        // tool_use_summary 只有 summary，没有 tool_use_id
        // 前端需要根据 preceding_tool_use_ids 来匹配
        return {
          type: 'tool_use',
          taskId,
          toolUseId: toolMsg.preceding_tool_use_ids?.[0] ?? '',
          toolName: 'summary',
          input: { summary: toolMsg.summary },
        }
      }

      default:
        // 未处理的消息类型，记录详细信息便于调试
        console.log('[ClaudeAgentProvider] Unhandled message type:', msg.type, JSON.stringify(msg).slice(0, 200))
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：转换 stream_event 流式消息
  // ─────────────────────────────────────────────────────────────────────────

  private _convertStreamEvent(
    msg: { type: 'stream_event'; event: BetaRawMessageStreamEvent },
    taskId: string,
  ): ClaudeEvent | null {
    const event = msg.event

    if (event.type === 'content_block_delta') {
      const delta = event.delta
      if (delta.type === 'text_delta') {
        return {
          type: 'stream_event',
          subtype: 'text_delta',
          taskId,
          text: delta.text ?? '',
          index: event.index ?? 0,
        }
      }
      if (delta.type === 'thinking_delta') {
        return {
          type: 'stream_event',
          subtype: 'thinking_delta',
          taskId,
          thinking: delta.thinking ?? '',
          index: event.index ?? 0,
        }
      }
      if (delta.type === 'input_json_delta') {
        return {
          type: 'stream_event',
          subtype: 'input_json_delta',
          taskId,
          // input_json_delta 没有 toolUseId，前端需要根据 index 从 content_block_start 获取
          toolUseId: '',
          partialJson: delta.partial_json ?? '',
          index: event.index ?? 0,
        }
      }
      // 其他 delta 类型忽略
      return null
    }

    if (event.type === 'content_block_start') {
      const block = event.content_block
      return {
        type: 'stream_event',
        subtype: 'content_block_start',
        taskId,
        index: event.index,
        blockType: block.type as 'text' | 'thinking' | 'tool_use',
        toolName: (block as BetaToolUseBlock).name,
        toolUseId: (block as BetaToolUseBlock).id,
      }
    }

    if (event.type === 'content_block_stop') {
      return {
        type: 'stream_event',
        subtype: 'content_block_stop',
        taskId,
        index: event.index,
      }
    }

    if (event.type === 'message_start') {
      return {
        type: 'stream_event',
        subtype: 'message_start',
        taskId,
      }
    }

    if (event.type === 'message_stop') {
      return {
        type: 'stream_event',
        subtype: 'message_stop',
        taskId,
      }
    }

    return null
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：映射 BetaContentBlock → ContentBlock
  // ─────────────────────────────────────────────────────────────────────────

  private _mapContentBlocks(blocks: BetaContentBlock[]): ContentBlock[] {
    return blocks.map((block) => {
      switch (block.type) {
        case 'text':
          return {
            type: 'text',
            text: (block as BetaTextBlock).text,
          }

        case 'thinking':
          return {
            type: 'thinking',
            thinking: (block as BetaThinkingBlock).thinking,
            signature: (block as BetaThinkingBlock).signature,
          }

        case 'tool_use':
          return {
            type: 'tool_use',
            id: (block as BetaToolUseBlock).id,
            name: (block as BetaToolUseBlock).name,
            input: (block as BetaToolUseBlock).input as Record<string, unknown>,
          }

        case 'mcp_tool_use':
          return {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          }

        case 'mcp_tool_result':
          return {
            type: 'tool_result',
            toolUseId: block.tool_use_id,
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            isError: block.is_error ?? false,
          }

        default:
          // 其他类型转为文本
          return {
            type: 'text',
            text: JSON.stringify(block),
          }
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：映射 ContentBlockParam[] → ContentBlock[]
  // ─────────────────────────────────────────────────────────────────────────

  private _mapContentParamArray(blocks: unknown[]): ContentBlock[] {
    return blocks.map((block) => {
      const b = block as Record<string, unknown>
      switch (b.type) {
        case 'text':
          return {
            type: 'text',
            text: b.text as string,
          }

        case 'thinking':
          return {
            type: 'thinking',
            thinking: b.thinking as string,
            signature: b.signature as string | undefined,
          }

        case 'tool_use':
          return {
            type: 'tool_use',
            id: b.id as string,
            name: b.name as string,
            input: b.input as Record<string, unknown>,
          }

        case 'tool_result':
          return {
            type: 'tool_result',
            toolUseId: b.tool_use_id as string,
            content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content),
            isError: b.is_error as boolean | undefined ?? false,
          }

        default:
          return {
            type: 'text',
            text: JSON.stringify(block),
          }
      }
    })
  }
}