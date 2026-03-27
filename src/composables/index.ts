/**
 * @module composables
 * @description Vue Composables 模块。
 *              通过 Vue inject 获取依赖，与具体实现解耦。
 *
 * @layer composables
 */

export { useAutoResize, useAutoResizeWithContent } from './useAutoResize'
export type { UseAutoResizeOptions } from './useAutoResize'

export { useStorage } from './useStorage'
export type { UseStorageOptions } from './useStorage'

export { useSystemTheme } from './useSystemTheme'
export type { ThemeMode } from './useSystemTheme'

export { useFormatTime, useLiveClock } from './useFormatTime'
export type { UseFormatTimeOptions } from './useFormatTime'