/**
 * @module stores/agent/types
 * @description Agent Store 内部类型定义。
 * @layer state
 */

import type { ContentBlock } from '#agent/types'

/** 流式输出缓冲区 */
export interface StreamBuffer {
  text: string
  thinking: string
  blocks: ContentBlock[]
  /** 思考开始时间（毫秒），用于计算思考耗时 */
  thinkingStartTime: number | null
}

/** 创建空的缓冲区 */
export function createEmptyBuffer(): StreamBuffer {
  return {
    text: '',
    thinking: '',
    blocks: [],
    thinkingStartTime: null,
  }
}