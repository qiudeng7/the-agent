/**
 * @module claude/types
 * @description Claude Agent SDK 模块共享数据类型。
 *              类型设计适配 Claude Agent SDK，同时保持 IPC 传输的简洁性。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 消息内容块
// ─────────────────────────────────────────────────────────────────────────────

export interface TextContent {
  type: 'text'
  text: string
}

/** 扩展推理模型（如 claude-opus-4-5-thinking）产出的思考过程 */
export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  /** 部分 provider 要求回传此签名以验证思考内容未被篡改 */
  signature?: string
  /** 思考耗时（毫秒），由前端计算并附加 */
  durationMs?: number
}

/** AI 发起的工具调用 */
export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/** 工具执行后回传给 AI 的结果 */
export interface ToolResultContent {
  type: 'tool_result'
  toolUseId: string
  content: string
  isError?: boolean
}

export type ContentBlock =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent

// ─────────────────────────────────────────────────────────────────────────────
// 对话消息
// ─────────────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface AgentMessage {
  role: MessageRole
  /** 纯文本时用 string，含工具调用/结果时用 ContentBlock[] */
  content: string | ContentBlock[]
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP 服务器配置
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MCP 服务器配置，用于扩展 Agent 的工具能力。
 */
export interface McpServerConfig {
  /** 启动 MCP 服务器的命令 */
  command: string
  /** 命令行参数 */
  args?: string[]
  /** 环境变量 */
  env?: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// 权限模式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 权限模式，控制 Agent 对工具和文件的操作权限。
 *
 * - bypassPermissions: 跳过所有权限检查（危险，仅用于测试）
 * - acceptEdits: 自动接受文件编辑
 * - default: 默认交互式，需要用户确认
 * - plan: 规划模式，先规划再执行
 * - dontAsk: 不提示权限，未预批准则拒绝
 */
export type PermissionMode =
  | 'bypassPermissions'
  | 'acceptEdits'
  | 'default'
  | 'plan'
  | 'dontAsk'

// ─────────────────────────────────────────────────────────────────────────────
// 任务运行参数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claude Agent SDK 运行参数。
 */
export interface ClaudeRunOptions {
  /** 客户端生成的唯一任务 ID，用于关联流式事件和 abort 操作 */
  taskId: string
  /** 用户输入（作为 prompt） */
  userInput: string
  /** 对话历史（可选，用于多轮对话） */
  messages?: AgentMessage[]
  /** 模型标识符（如 'claude-opus-4-6'） */
  model?: string
  /** API Key（可选，用于覆盖默认配置） */
  apiKey?: string
  /** API Base URL（可选，用于代理或自托管服务） */
  baseURL?: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 权限模式 */
  permissionMode?: PermissionMode
  /** 允许使用的工具列表（白名单） */
  allowedTools?: string[]
  /** MCP 服务器配置 */
  mcpServers?: Record<string, McpServerConfig>
  /** 恢复会话 ID（用于继续之前的对话） */
  resume?: string
  /** 调试模式 */
  debug?: boolean
  /** Claude Code CLI 可执行文件路径 */
  cliPath?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 流式事件
// ─────────────────────────────────────────────────────────────────────────────

/** 会话初始化事件 */
export interface SystemInitEvent {
  type: 'system'
  subtype: 'init'
  taskId: string
  sessionId: string
}

/** AI 响应事件（包含 content 数组） */
export interface AssistantMessageEvent {
  type: 'assistant'
  taskId: string
  content: ContentBlock[]
}

/** 最终结果事件 */
export interface ResultEvent {
  type: 'result'
  taskId: string
  result: string
  /** API 调用费用（美元） */
  costUsd?: number
  /** 总耗时（毫秒） */
  durationMs?: number
  /** API 调用耗时（毫秒） */
  durationApiMs?: number
  /** 对话轮数 */
  numTurns?: number
  /** 总 token 数 */
  totalTokens?: number
}

/** 用户消息事件 */
export interface UserMessageEvent {
  type: 'user'
  taskId: string
  content: ContentBlock[]
}

/** 工具使用事件（用于前端展示） */
export interface ClaudeToolUseEvent {
  type: 'tool_use'
  taskId: string
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

/** 工具结果事件 */
export interface ClaudeToolResultEvent {
  type: 'tool_result'
  taskId: string
  toolUseId: string
  result: string
  isError: boolean
}

/** 错误事件 */
export interface ClaudeErrorEvent {
  type: 'error'
  taskId: string
  error: string
  /** 错误码（如 'aborted'、'rate_limit'、'auth'） */
  code?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// AskUserQuestion 工具相关类型
// ─────────────────────────────────────────────────────────────────────────────

/** AskUserQuestion 工具的问题选项 */
export interface AskUserQuestionOption {
  label: string
  description?: string
  preview?: string
}

/** AskUserQuestion 工具的问题 */
export interface AskUserQuestionItem {
  header: string
  multiSelect: boolean
  options: AskUserQuestionOption[]
  question: string
}

/** AskUserQuestion 工具的输入 */
export interface AskUserQuestionInput {
  questions: AskUserQuestionItem[]
}

/** 提交 AskUserQuestion 答案的 payload */
export interface AskUserQuestionAnswerPayload {
  taskId: string
  toolUseId: string
  answers: Record<string, string>
  annotations?: Record<string, { notes?: string; preview?: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// 流式增量事件（includePartialMessages: true 时产生）
// ─────────────────────────────────────────────────────────────────────────────

/** 流式文本增量事件 */
export interface StreamTextDeltaEvent {
  type: 'stream_event'
  subtype: 'text_delta'
  taskId: string
  /** 文本增量 */
  text: string
  /** 内容块索引 */
  index: number
}

/** 流式思考增量事件 */
export interface StreamThinkingDeltaEvent {
  type: 'stream_event'
  subtype: 'thinking_delta'
  taskId: string
  /** 思考增量 */
  thinking: string
  /** 内容块索引 */
  index: number
}

/** 流式工具输入增量事件 */
export interface StreamToolInputDeltaEvent {
  type: 'stream_event'
  subtype: 'input_json_delta'
  taskId: string
  /** 工具调用 ID */
  toolUseId: string
  /** JSON 输入增量 */
  partialJson: string
  /** 内容块索引 */
  index: number
}

/** 流式内容块开始事件 */
export interface StreamContentBlockStartEvent {
  type: 'stream_event'
  subtype: 'content_block_start'
  taskId: string
  /** 内容块索引 */
  index: number
  /** 内容块类型：text / thinking / tool_use */
  blockType: 'text' | 'thinking' | 'tool_use'
  /** 工具名称（仅 tool_use 时有效） */
  toolName?: string
  /** 工具调用 ID（仅 tool_use 时有效） */
  toolUseId?: string
}

/** 流式内容块结束事件 */
export interface StreamContentBlockStopEvent {
  type: 'stream_event'
  subtype: 'content_block_stop'
  taskId: string
  /** 内容块索引 */
  index: number
}

/** 流式消息开始事件 */
export interface StreamMessageStartEvent {
  type: 'stream_event'
  subtype: 'message_start'
  taskId: string
}

/** 流式消息结束事件 */
export interface StreamMessageStopEvent {
  type: 'stream_event'
  subtype: 'message_stop'
  taskId: string
}

/**
 * Claude Agent SDK 流式事件类型。
 */
export type ClaudeEvent =
  | SystemInitEvent
  | AssistantMessageEvent
  | ResultEvent
  | UserMessageEvent
  | ClaudeToolUseEvent
  | ClaudeToolResultEvent
  | ClaudeErrorEvent
  | StreamTextDeltaEvent
  | StreamThinkingDeltaEvent
  | StreamToolInputDeltaEvent
  | StreamContentBlockStartEvent
  | StreamContentBlockStopEvent
  | StreamMessageStartEvent
  | StreamMessageStopEvent