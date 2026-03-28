/**
 * @module claude/utils/content-mapper
 * @description SDK content block 与 agent ContentBlock 之间的转换工具。
 */

import type { ContentBlock } from '../types'

/**
 * SDK 原始 content block 类型（来自 Claude Agent SDK）。
 */
export interface SdkContentBlock {
  type: string
  text?: string
  thinking?: string
  signature?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | unknown[]
  is_error?: boolean
}

/**
 * 将 SDK content block 转换为本地 ContentBlock 类型。
 */
export function mapSdkContentBlock(block: SdkContentBlock): ContentBlock {
  switch (block.type) {
    case 'text':
      return {
        type: 'text',
        text: block.text ?? '',
      }

    case 'thinking':
      return {
        type: 'thinking',
        thinking: block.thinking ?? '',
        signature: block.signature,
      }

    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.id ?? '',
        name: block.name ?? '',
        input: block.input ?? {},
      }

    case 'tool_result':
      return {
        type: 'tool_result',
        toolUseId: block.tool_use_id ?? '',
        content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
        isError: block.is_error ?? false,
      }

    default:
      // 未知类型，转为文本块
      return {
        type: 'text',
        text: JSON.stringify(block),
      }
  }
}

/**
 * 将 SDK content blocks 数组转换为本地 ContentBlock[]。
 */
export function mapSdkContentBlocks(blocks: SdkContentBlock[] | undefined): ContentBlock[] {
  if (!blocks || !Array.isArray(blocks)) {
    return []
  }
  return blocks.map(mapSdkContentBlock)
}

/**
 * 将本地 ContentBlock 转换为 SDK 格式。
 */
export function mapToSdkContentBlock(block: ContentBlock): SdkContentBlock {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text }

    case 'thinking':
      return {
        type: 'thinking',
        thinking: block.thinking,
        signature: block.signature,
      }

    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input,
      }

    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: block.toolUseId,
        content: block.content,
        is_error: block.isError,
      }
  }
}

/**
 * 将本地 ContentBlock[] 转换为 SDK 格式数组。
 */
export function mapToSdkContentBlocks(blocks: ContentBlock[]): SdkContentBlock[] {
  return blocks.map(mapToSdkContentBlock)
}