/**
 * @module agent
 * @description Agent 模块公共入口，统一重导出所有类型和接口。
 *
 * 使用方式：
 *   import type { AgentEvent, IAgentProvider } from '#agent'
 *   import type { AgentRunOptions } from '#agent/types'
 *
 * 目录结构：
 *   types.ts              ← 共享数据类型（Message、Event、ToolDefinition…）
 *   interfaces/
 *     provider.ts         ← IAgentProvider（Claude、Codex…）
 *     tool.ts             ← ITool、IToolRegistry
 *     transport.ts        ← IAgentTransport（Electron IPC、HTTP SSE…）
 *   providers/            ← 待实现：具体 provider（claude/、codex/…）
 *   tools/                ← 待实现：具体工具（fs、shell、browser…）
 *   runner.ts             ← 待实现：驱动 provider + tool registry + transport 的执行器
 */

export type * from './types'
export type * from './interfaces/provider'
export type * from './interfaces/tool'
export type * from './interfaces/transport'
export { ClaudeProvider } from './providers/claude'
export type { ClaudeProviderOptions } from './providers/claude'
export { AgentRunner } from './runner'
export { ToolRegistry } from './tool-registry'
