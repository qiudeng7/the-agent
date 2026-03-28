/**
 * @module claude/provider
 * @description ClaudeAgentProvider — 基于 @anthropic-ai/claude-agent-sdk 实现 IClaudeProvider。
 *
 *              核心职责：
 *              1. 配置 SDK 环境（API key、base URL、CLI path）
 *              2. 调用 SDK query() 函数
 *              3. 将 SDK message 转换为 ClaudeEvent
 *              4. 管理 abort 状态
 */

import path from 'path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { ClaudeRunOptions, ClaudeEvent } from './types'
import type { IClaudeProvider } from './interfaces/provider'
import type { ContentBlock } from '#agent/types'
import { mapSdkContentBlocks, type SdkContentBlock } from './utils/content-mapper'

// ─────────────────────────────────────────────────────────────────────────────
// SDK 类型（用于类型安全）
// ─────────────────────────────────────────────────────────────────────────────

interface SdkMessage {
  type: string
  subtype?: string
  session_id?: string
  content?: unknown[]
  result?: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  num_turns?: number
  total_tokens?: number
  error?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  is_error?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI 路径解析
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取 Claude Agent SDK 的 cli.js 路径。
 * 在 Electron 打包环境中，SDK 无法通过 import.meta.url 正确定位 cli.js，
 * 需要通过 require.resolve 找到正确的路径。
 */
function getCliPath(): string {
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
  /** Claude Code CLI 可执行文件路径 */
  cliPath?: string
  /** 默认模型 */
  defaultModel?: string
}

export class ClaudeAgentProvider implements IClaudeProvider {
  readonly name = 'claude-agent-sdk'

  private cliPath: string
  private defaultModel: string
  /** 正在运行的任务：taskId → AbortController */
  private runningTasks = new Map<string, AbortController>()

  constructor(options: ClaudeProviderOptions = {}) {
    // 优先使用传入的 cliPath，否则自动检测
    this.cliPath = options.cliPath ?? getCliPath()
    this.defaultModel = options.defaultModel ?? 'claude-opus-4-6'

    console.log('[ClaudeAgentProvider] CLI path:', this.cliPath)
  }

  getVersion(): string {
    // SDK 版本信息（可以从 package.json 读取）
    return '1.0.0'
  }

  abort(taskId: string): void {
    const ctrl = this.runningTasks.get(taskId)
    if (ctrl) {
      ctrl.abort()
      this.runningTasks.delete(taskId)
    }
  }

  async *run(options: ClaudeRunOptions): AsyncIterable<ClaudeEvent> {
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

        const event = this._convertMessage(message as SdkMessage, taskId)
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
      cliPath,
    } = options

    // 通过 env 选项传递环境变量给 SDK 子进程
    const env: Record<string, string> = {}
    if (apiKey) {
      env.ANTHROPIC_API_KEY = apiKey
    }
    if (baseURL) {
      env.ANTHROPIC_BASE_URL = baseURL
    }

    return {
      model: model ?? this.defaultModel,
      systemPrompt,
      permissionMode,
      allowedTools,
      mcpServers,
      resume,
      debug,
      env: Object.keys(env).length > 0 ? env : undefined,
      pathToClaudeCodeExecutable: cliPath ?? this.cliPath,
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

  private _convertMessage(message: SdkMessage, taskId: string): ClaudeEvent | null {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          return {
            type: 'system',
            subtype: 'init',
            taskId,
            sessionId: message.session_id ?? '',
          }
        }
        return null

      case 'assistant':
        return {
          type: 'assistant',
          taskId,
          content: mapSdkContentBlocks(message.content as SdkContentBlock[]),
        }

      case 'user':
        return {
          type: 'user',
          taskId,
          content: mapSdkContentBlocks(message.content as SdkContentBlock[]),
        }

      case 'result':
        return {
          type: 'result',
          taskId,
          result: typeof message.result === 'string' ? message.result : JSON.stringify(message.result),
          costUsd: message.cost_usd,
          durationMs: message.duration_ms,
          durationApiMs: message.duration_api_ms,
          numTurns: message.num_turns,
          totalTokens: message.total_tokens,
        }

      case 'error':
        return {
          type: 'error',
          taskId,
          error: message.error ?? 'Unknown error',
        }

      case 'tool_use':
        return {
          type: 'tool_use',
          taskId,
          toolUseId: message.id ?? '',
          toolName: message.name ?? '',
          input: message.input ?? {},
        }

      case 'tool_result':
        return {
          type: 'tool_result',
          taskId,
          toolUseId: message.tool_use_id ?? '',
          result: typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? ''),
          isError: message.is_error ?? false,
        }

      default:
        // 未处理的消息类型，记录日志但不返回事件
        console.log('[ClaudeAgentProvider] Unknown message type:', message.type)
        return null
    }
  }
}