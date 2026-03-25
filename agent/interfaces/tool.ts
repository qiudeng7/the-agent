/**
 * @module agent/interfaces/tool
 * @description ITool / IToolRegistry — 工具定义与注册抽象。
 *
 *              工具是 agent 可调用的原子能力单元（文件读写、代码执行、网络请求等）。
 *              ITool 封装单个工具的 schema 描述和执行逻辑，
 *              IToolRegistry 统一管理工具集合，provider 执行 tool_use 时从中查找并调用。
 *
 *              扩展工具时只需实现 ITool 并 register，无需修改 provider 代码。
 */

import type { ToolDefinition, ToolResult } from '../types'

export interface ToolContext {
  /** 所属任务 ID，用于日志关联和取消联动 */
  taskId: string
  /** 用于响应 abort 的信号，工具实现应在耗时操作中检查 */
  signal?: AbortSignal
}

export interface ITool {
  /**
   * 工具的 JSON Schema 描述，直接传给 LLM。
   * name 必须全局唯一（在同一 registry 内）。
   */
  readonly definition: ToolDefinition

  /**
   * 执行工具调用。
   * @param input  - LLM 填入的参数（实现者可假设已通过 inputSchema 校验）
   * @param context - 运行上下文（taskId、AbortSignal 等）
   * @returns ToolResult，isError=true 时 content 为错误描述，LLM 可据此纠正
   */
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}

export interface IToolRegistry {
  /**
   * 注册工具。name 重复时覆盖旧工具（便于热替换）。
   */
  register(tool: ITool): void

  /** 注销工具 */
  unregister(name: string): void

  /**
   * 按名称获取工具实例，不存在时返回 undefined。
   */
  get(name: string): ITool | undefined

  /**
   * 获取所有已注册工具的 ToolDefinition 列表。
   * Provider 在调用 LLM 前通过此方法获取 tools 参数。
   */
  getDefinitions(): ToolDefinition[]
}
