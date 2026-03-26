/**
 * @module agent/types
 * @description Agent 模块共享数据类型，被 provider、tool、transport 及前端 store 共同引用。
 *              类型设计参照 Anthropic Messages API，同时保持 provider 无关性。
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
// 工具定义
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolPropertySchema {
  type: string
  description?: string
  enum?: unknown[]
  items?: ToolPropertySchema
  properties?: Record<string, ToolPropertySchema>
  required?: string[]
  [key: string]: unknown
}

export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, ToolPropertySchema>
  required?: string[]
}

/** 传给 LLM 的工具描述，结构遵循 JSON Schema */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

export interface ToolResult {
  content: string
  isError?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 任务运行参数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 工具执行回调，由 AgentRunner 在调用 provider.run() 前注入。
 * Provider 在 agentic loop 遇到 tool_use 时直接调用，无需依赖外部传递机制。
 */
export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>,
  taskId: string,
  signal?: AbortSignal,
) => Promise<ToolResult>

export interface AgentRunOptions {
  /** 客户端生成的唯一任务 ID，用于关联流式事件和 abort 操作 */
  taskId: string
  /** 本轮前的完整对话历史 */
  messages: AgentMessage[]
  /** 本轮用户输入 */
  userInput: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 模型标识符，由具体 provider 解释（如 'claude-opus-4-6'） */
  model?: string
  /** 最大输出 token 数 */
  maxTokens?: number
  /** 本次任务可用的工具列表 */
  tools?: ToolDefinition[]
  /** 工具执行器，由 AgentRunner 注入；transport 直接触发 run() 时可为空 */
  toolExecutor?: ToolExecutor
  /** API Base URL，可选，用于代理或自托管服务 */
  baseURL?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 流式事件
// 主进程执行过程中通过 transport 逐条推送给前端
// ─────────────────────────────────────────────────────────────────────────────

/** 文本增量（流式打字效果） */
export interface TextDeltaEvent {
  type: 'text_delta'
  taskId: string
  delta: string
}

/** 思考过程增量 */
export interface ThinkingDeltaEvent {
  type: 'thinking_delta'
  taskId: string
  delta: string
}

/** AI 发起工具调用 */
export interface ToolUseEvent {
  type: 'tool_use'
  taskId: string
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

/** 工具执行完成，结果已回传给 LLM */
export interface ToolResultEvent {
  type: 'tool_result'
  taskId: string
  toolUseId: string
  result: string
  isError: boolean
}

/** 本轮生成完成，附带完整 assistant 消息供前端追加到历史 */
export interface DoneEvent {
  type: 'done'
  taskId: string
  message: AgentMessage
}

/** 运行期错误（API 异常、工具执行失败等） */
export interface ErrorEvent {
  type: 'error'
  taskId: string
  error: string
  /** 可选错误码，便于前端分类处理（如 'rate_limit' | 'auth' | 'tool_error'） */
  code?: string
}

export type AgentEvent =
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | ToolUseEvent
  | ToolResultEvent
  | DoneEvent
  | ErrorEvent
