/**
 * @module composables
 * @description Vue Composables 模块入口。
 *              所有 composable 只依赖 Vue，与项目其他部分解耦。
 *              可以在任意 Vue 3 项目中复用。
 *
 * 可用 composables：
 * - useAutoResize     - textarea 自动伸缩
 * - useLocalStorage   - localStorage 持久化
 * - useSystemTheme    - 系统主题检测
 * - useFormatTime     - 时间格式化
 *
 * @layer composables
 */

export { useAutoResize, useAutoResizeWithContent } from './useAutoResize'
export type { UseAutoResizeOptions } from './useAutoResize'

export { useLocalStorage, useLocalStorageBatch, usePersistToLocalStorage } from './useLocalStorage'
export type { UseLocalStorageOptions } from './useLocalStorage'

export { useSystemTheme, useThemeControl } from './useSystemTheme'
export type { ThemeMode, UseSystemThemeOptions } from './useSystemTheme'

export { useFormatTime, useLiveClock } from './useFormatTime'
export type { UseFormatTimeOptions } from './useFormatTime'