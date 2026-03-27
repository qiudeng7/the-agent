/**
 * @module composables/useSystemTheme
 * @description 系统主题检测 composable。
 *              通过 inject 获取主题检测依赖。
 * @layer composables
 */
import { ref, onMounted, onUnmounted, inject, type Ref } from 'vue'
import { SYSTEM_SERVICE_KEY, type ISystemService } from '@/di/interfaces'

export type ThemeMode = 'light' | 'dark'

/**
 * 系统主题检测
 */
export function useSystemTheme(): {
  isDark: Ref<boolean>
  theme: Ref<ThemeMode>
} {
  const systemService = inject<ISystemService>(SYSTEM_SERVICE_KEY)!
  const isDark = ref(systemService.theme.isDark)
  const theme = ref<ThemeMode>(isDark.value ? 'dark' : 'light')

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    isDark.value = systemService.theme.isDark
    theme.value = isDark.value ? 'dark' : 'light'

    unsubscribe = systemService.theme.onChange((dark) => {
      isDark.value = dark
      theme.value = dark ? 'dark' : 'light'
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return { isDark, theme }
}