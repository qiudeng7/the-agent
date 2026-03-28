/**
 * @module claude-installer
 * @description Claude Code 安装器模块。
 *
 * 提供 Claude Code CLI 的自动检测和安装功能。
 *
 * 使用方式：
 * ```typescript
 * import { ensureClaudeInstalled } from '#claude-installer'
 *
 * const result = await ensureClaudeInstalled({
 *   useChinaMirror: true,
 *   onProgress: (msg) => console.log(msg),
 * })
 *
 * if (result.success) {
 *   console.log('Claude installed at:', result.claudePath)
 * }
 * ```
 */

export type * from './types'
export { ensureClaudeInstalled, detectClaude } from './installer'
export { findClaude, findNpm, findFnm, getNodeVersion, getNpmVersion } from './detector'