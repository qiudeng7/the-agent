/**
 * @module claude/runner
 * @description Claude Agent 执行模块 - 纯函数实现。
 *
 *              核心职责：
 *              1. 构建 SDK 配置（buildSdkOptions, buildPrompt）
 *              2. 执行 Agent（runAgent）
 *              3. 转换消息（convertMessage）
 *
 *              设计原则：
 *              - 无状态：不维护任何运行状态
 *              - 纯函数：所有函数只依赖输入参数
 *              - 只用 canUseTool：不使用 streamInput
 */

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
import type {
  BetaRawMessageStreamEvent,
  BetaContentBlock,
  BetaTextBlock,
  BetaThinkingBlock,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { Options, PermissionResult } from '@anthropic-ai/claude-agent-sdk'
import type {
  ClaudeRunOptions,
  ClaudeEvent,
  ContentBlock,
  AskUserQuestionItem,
} from './types'
import type { IClaudeTransportServer, AskUserQuestionRequest } from './interfaces/transport'

// ─────────────────────────────────────────────────────────────────────────────
// 配置接口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent 配置参数（只读，不管理）
 */
export interface AgentConfig {
  /** Claude Code 可执行文件路径 */
  claudePath?: string
  /** Git 路径（Windows 上需要添加到 PATH） */
  gitPath?: string
  /** 默认模型 */
  defaultModel?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心执行函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 执行 Agent 任务，产出流式事件。
 *
 * @param options - 运行参数
 * @param config - Agent 配置
 * @param transport - 通信抽象（用于 AskUserQuestion）
 * @returns 流式事件 AsyncIterable
 */
export async function* runAgent(
  options: ClaudeRunOptions,
  config: AgentConfig,
  transport: IClaudeTransportServer,
): AsyncIterable<ClaudeEvent> {
  const { taskId } = options

  // 构建 SDK options
  const sdkOptions = buildSdkOptions(options, config, transport)

  // 构建 prompt
  const prompt = buildPrompt(options)

  // 调用 query()
  const queryObj = query({ prompt, options: sdkOptions })

  try {
    // 迭代消息并转换
    for await (const message of queryObj) {
      const event = convertMessage(message, taskId)
      if (event) {
        yield event
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    yield { type: 'error', taskId, error }
  } finally {
    // 确保 Query 被关闭
    queryObj.close()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SDK Options 构建
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 构建 SDK Options。
 */
function buildSdkOptions(
  options: ClaudeRunOptions,
  config: AgentConfig,
  transport: IClaudeTransportServer,
): Options {
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
    taskId,
  } = options

  // 构建环境变量（继承 process.env）
  const env: Record<string, string> = { ...process.env }

  // Git 路径（Windows 上添加 bin 和 cmd 到 PATH）
  if (config.gitPath) {
    const gitBin = `${config.gitPath}\\bin`
    const gitCmd = `${config.gitPath}\\cmd`
    env.PATH = `${gitCmd};${gitBin};${process.env.PATH ?? ''}`
  }

  // API Key
  if (apiKey) {
    env.ANTHROPIC_API_KEY = apiKey
  }

  // Base URL
  if (baseURL) {
    env.ANTHROPIC_BASE_URL = baseURL
  }

  console.log('[ClaudeRunner] Config:', {
    claudePath: config.claudePath,
    gitPath: config.gitPath,
    hasApiKey: !!apiKey,
    hasBaseURL: !!baseURL,
    envPath: env.PATH?.slice(0, 200),
  })

  return {
    model: model ?? config.defaultModel ?? 'claude-opus-4-6',
    systemPrompt,
    permissionMode,
    allowedTools,
    mcpServers,
    resume,
    debug: debug ?? true, // 默认开启 debug
    ...(config.claudePath ? { pathToClaudeCodeExecutable: config.claudePath } : {}),
    env: Object.keys(env).length > 0 ? env : undefined,
    includePartialMessages: true,
    // canUseTool 拦截 AskUserQuestion
    canUseTool: async (
      toolName: string,
      input: Record<string, unknown>,
      canUseToolOptions: { toolUseID: string },
    ): Promise<PermissionResult> => {
      if (toolName === 'AskUserQuestion') {
        console.log('[ClaudeRunner] Intercepting AskUserQuestion')

        // 发送请求给前端
        const request: AskUserQuestionRequest = {
          taskId,
          toolUseId: canUseToolOptions.toolUseID,
          questions: (input as { questions: AskUserQuestionItem[] }).questions,
        }

        const response = await transport.sendAskUserQuestion?.(request)

        if (response) {
          // 返回 allow 并提供答案作为 updatedInput
          return {
            behavior: 'allow',
            updatedInput: {
              questions: (input as { questions: AskUserQuestionItem[] }).questions,
              answers: response.answers,
              annotations: response.annotations,
            },
          }
        } else {
          // 用户取消
          return {
            behavior: 'deny',
            message: 'User cancelled the question',
          }
        }
      }

      // 其他工具使用默认行为
      return { behavior: 'allow' }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt 构建
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 构建 prompt（支持多轮对话历史）。
 */
function buildPrompt(options: ClaudeRunOptions): string {
  const { userInput, messages } = options

  // 如果有历史消息，格式化为对话上下文
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

// ─────────────────────────────────────────────────────────────────────────────
// 消息转换
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 转换 SDK message 为 ClaudeEvent。
 */
export function convertMessage(msg: SDKMessage, taskId: string): ClaudeEvent | null {
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
        content: mapContentBlocks(assistantMsg.message.content),
      }
    }

    case 'user': {
      const userMsg = msg as SDKUserMessage
      const content = userMsg.message.content
      if (typeof content === 'string') {
        return {
          type: 'user',
          taskId,
          content: [{ type: 'text', text: content }],
        }
      }
      return {
        type: 'user',
        taskId,
        content: mapContentParamArray(content as unknown[]),
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
      return convertStreamEvent(msg as { type: 'stream_event'; event: BetaRawMessageStreamEvent }, taskId)
    }

    case 'tool_use_summary': {
      const toolMsg = msg as SDKToolUseSummaryMessage
      return {
        type: 'tool_use',
        taskId,
        toolUseId: toolMsg.preceding_tool_use_ids?.[0] ?? '',
        toolName: 'summary',
        input: { summary: toolMsg.summary },
      }
    }

    default:
      console.log('[ClaudeRunner] Unhandled message type:', msg.type, JSON.stringify(msg).slice(0, 200))
      return null
  }
}

/**
 * 转换 stream_event 流式消息。
 */
function convertStreamEvent(
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
        toolUseId: '',
        partialJson: delta.partial_json ?? '',
        index: event.index ?? 0,
      }
    }
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

/**
 * 映射 BetaContentBlock → ContentBlock。
 */
function mapContentBlocks(blocks: BetaContentBlock[]): ContentBlock[] {
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
        return {
          type: 'text',
          text: JSON.stringify(block),
        }
    }
  })
}

/**
 * 映射 ContentBlockParam[] → ContentBlock。
 */
function mapContentParamArray(blocks: unknown[]): ContentBlock[] {
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
          isError: (b.is_error as boolean | undefined) ?? false,
        }

      default:
        return {
          type: 'text',
          text: JSON.stringify(block),
        }
    }
  })
}