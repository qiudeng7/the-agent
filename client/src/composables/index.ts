/**
 * @module composables
 * @description 项目特定的 Vue Composables。
 *              通用功能优先使用 VueUse。
 *
 * 可用：
 * - useAutoResize: textarea 自动伸缩（VueUse 无对应）
 * - useChatSubmit: 聊天提交逻辑（消息发送、模型初始化）
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