/**
 * @module agent/interfaces/provider
 * @description IAgentProvider — LLM provider 抽象接口。
 *
 *              任何 LLM 接入（Claude Agent SDK、OpenAI Codex、本地模型等）
 *              都需实现此接口，使 Agent 执行层与具体 SDK 完全解耦。
 *
 *              设计约定：
 *              - run() 返回 AsyncIterable，provider 负责驱动完整的 agentic loop
 *                （包括 tool_use → tool_result → 继续生成的多轮循环）
 *              - 外部通过 for await...of 消费事件，无需关心循环细节
 *              - abort() 必须幂等，多次调用不应抛错
 */

import type { AgentRunOptions, AgentEvent } from '../types'

export interface IAgentProvider {
  /** Provider 标识，如 'claude' / 'codex' / 'local-llama' */
  readonly name: string

  /**
   * 执行一次完整的 agent 任务，流式产出事件序列。
   *
   * Provider 实现职责：
   * 1. 调用 LLM API，流式接收响应
   * 2. 遇到 tool_use 时：yield ToolUseEvent → 等待工具执行 → yield ToolResultEvent → 继续循环
   * 3. 生成完毕时 yield DoneEvent（含完整 assistant 消息）
   * 4. 出错时 yield ErrorEvent 并终止迭代
   * 5. 收到 abort 信号时，尽快结束迭代（可 yield ErrorEvent with code='aborted'）
   *
   * @param options - 任务运行参数（含对话历史、用户输入、工具列表等）
   * @returns AsyncIterable<AgentEvent>，调用方 for await...of 消费
   */
  run(options: AgentRunOptions): AsyncIterable<AgentEvent>

  /**
   * 取消正在进行的任务。幂等，taskId 不存在时静默忽略。
   * @param taskId - 要取消的任务 ID
   */
  abort(taskId: string): void
}
