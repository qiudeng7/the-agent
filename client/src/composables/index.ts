/**
 * @module composables
 * @description 项目特定的 Vue Composables。
 *              通用功能优先使用 VueUse。
 *
 * 可用：
 * - useAutoResize: textarea 自动伸缩（VueUse 无对应）
 * - useChatSubmit: 聊天提交逻辑（消息发送、模型初始化）
 * - useChatState: 流式消息和工具 UI 状态管理
 * - useAskQuestion: AskUserQuestion Dialog 处理
 * - useScrollControl: 滚动控制
 *
 * VueUse 替代：
 * - useStorage / useLocalStorage → @vueuse/core
 * - usePreferredDark → @vueuse/core
 * - useDateFormat / useNow → @vueuse/core
 *
 * @layer composables
 */

export { useAutoResize, useAutoResizeWithContent } from './useAutoResize'
export type { UseAutoResizeOptions } from './useAutoResize'

export { useChatSubmit } from './useChatSubmit'
export type { UseChatSubmitOptions, UseChatSubmitReturn } from './useChatSubmit'

export { useChatState } from './useChatState'
export type { UseChatStateOptions, UseChatStateReturn } from './useChatState'

export { useAskQuestion } from './useAskQuestion'
export type { AskQuestionRequest, UseAskQuestionReturn } from './useAskQuestion'

export { useScrollControl } from './useScrollControl'
export type { UseScrollControlOptions, UseScrollControlReturn } from './useScrollControl'