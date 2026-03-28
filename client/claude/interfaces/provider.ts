/**
 * @module claude/interfaces/provider
 * @description IClaudeProvider — Claude Agent SDK provider 抽象接口。
 *
 *              任何基于 Claude Agent SDK 的实现都需实现此接口，
 *              使执行层与具体 SDK 版本解耦。
 *
 *              设计约定：
 *              - run() 返回 AsyncIterable，provider 负责调用 SDK query()
 *              - 外部通过 for await...of 消费事件
 *              - abort() 必须幂等，多次调用不应抛错
 */

import type { ClaudeRunOptions, ClaudeEvent } from '../types'

export interface IClaudeProvider {
  /** Provider 标识 */
  readonly name: 'claude-agent-sdk'

  /**
   * 执行一次完整的 agent 任务，流式产出事件序列。
   *
   * Provider 实现职责：
   * 1. 调用 SDK query()，流式接收响应
   * 2. 将 SDK message 转换为 ClaudeEvent
   * 3. 生成完毕时 yield ResultEvent
   * 4. 出错时 yield ClaudeErrorEvent 并终止迭代
   * 5. 收到 abort 信号时，尽快结束迭代
   *
   * @param options - 任务运行参数
   * @returns AsyncIterable<ClaudeEvent>，调用方 for await...of 消费
   */
  run(options: ClaudeRunOptions): AsyncIterable<ClaudeEvent>

  /**
   * 取消正在进行的任务。幂等，taskId 不存在时静默忽略。
   * @param taskId - 要取消的任务 ID
   */
  abort(taskId: string): void

  /**
   * 获取 SDK 版本信息。
   */
  getVersion(): string
}