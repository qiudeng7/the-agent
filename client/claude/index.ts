/**
 * @module claude
 * @description Claude Agent SDK 模块公共入口，统一重导出所有类型和实现。
 *
 * 使用方式：
 *   import type { ClaudeEvent, ClaudeRunOptions } from '#claude'
 *   import { runAgent, convertMessage, type AgentConfig } from '#claude'
 *
 * 目录结构：
 *   types.ts              ← 共享数据类型
 *   interfaces/
 *     transport.ts        ← IClaudeTransportServer 接口
 *   runner.ts             ← 执行函数（runAgent, convertMessage, buildSdkOptions, buildPrompt）
 */

// ── 类型导出 ────────────────────────────────────────────────────────────────
export type * from './types'

// ── 接口导出 ────────────────────────────────────────────────────────────────
export type { IClaudeTransportServer, AskUserQuestionRequest, AskUserQuestionResponse } from './interfaces/transport'

// ── 实现导出 ────────────────────────────────────────────────────────────────
export { runAgent, convertMessage, type AgentConfig } from './runner'
export {
  downloadClaudeCode,
  fetchLatestVersion,
  downloadGitForWindows,
  type ClaudeCodePlatform,
  type DownloadOptions,
  type DownloadResult,
  type GitForWindowsOptions,
} from './downloader'