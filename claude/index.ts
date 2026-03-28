/**
 * @module claude
 * @description Claude Agent SDK 模块公共入口，统一重导出所有类型和实现。
 *
 * 使用方式：
 *   import type { ClaudeEvent, ClaudeRunOptions } from '#claude'
 *   import { ClaudeAgentProvider, ClaudeRunner } from '#claude'
 *
 * 目录结构：
 *   types.ts              ← 共享数据类型（Event、Options、McpServerConfig…）
 *   interfaces/
 *     provider.ts         ← IClaudeProvider 接口
 *   provider.ts           ← ClaudeAgentProvider 实现（基于 SDK query()）
 *   runner.ts             ← ClaudeRunner 执行器
 *   utils/
 *     content-mapper.ts   ← SDK content block ↔ agent ContentBlock 转换
 */

// ── 类型导出 ────────────────────────────────────────────────────────────────
export type * from './types'

// ── 接口导出 ────────────────────────────────────────────────────────────────
export type { IClaudeProvider } from './interfaces/provider'

// ── 实现导出 ────────────────────────────────────────────────────────────────
export { ClaudeAgentProvider, type ClaudeProviderOptions } from './provider'
export { ClaudeRunner } from './runner'

// ── 工具导出 ────────────────────────────────────────────────────────────────
export {
  mapSdkContentBlock,
  mapSdkContentBlocks,
  mapToSdkContentBlock,
  mapToSdkContentBlocks,
} from './utils/content-mapper'