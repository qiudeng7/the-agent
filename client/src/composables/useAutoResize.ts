/**
 * @module composables/useAutoResize
 * @description Textarea 自动伸缩 composable。
 *              根据内容自动调整高度，最大高度可配置。
 *              只依赖 Vue，与项目其他部分解耦。
 * @layer composables
 */
import { watch, type Ref } from 'vue'

export interface UseAutoResizeOptions {
  /** 最大高度（像素），默认 200 */
  maxHeight?: number
  /** 最小高度（像素），默认 auto */
  minHeight?: number
}

/**
 * Textarea 自动伸缩
 * @param textareaRef textarea 元素的引用
 * @param options 配置选项
 */
export function useAutoResize(
  textareaRef: Ref<HTMLTextAreaElement | null>,
  options: UseAutoResizeOptions = {},
) {
  const { maxHeight = 200, minHeight } = options

  /**
   * 调整 textarea 高度
   */
  function resize() {
    const el = textareaRef.value
    if (!el) return

    // 先重置高度以获取正确的 scrollHeight
    el.style.height = 'auto'

    // 计算新高度
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = newHeight + 'px'

    // 如果设置了最小高度，确保不低于最小值
    if (minHeight && newHeight < minHeight) {
      el.style.height = minHeight + 'px'
    }
  }

  /**
   * 重置到初始高度
   */
  function reset() {
    const el = textareaRef.value
    if (el) {
      el.style.height = 'auto'
    }
  }

  return {
    resize,
    reset,
  }
}

/**
 * 带响应式内容的自动伸缩
 * 用于内容变化时自动调整高度
 */
export function useAutoResizeWithContent(
  textareaRef: Ref<HTMLTextAreaElement | null>,
  content: Ref<string>,
  options: UseAutoResizeOptions = {},
) {
  const { resize, reset } = useAutoResize(textareaRef, options)

  // 监听内容变化自动调整
  watch(content, resize, { flush: 'post' })

  return {
    resize,
    reset,
  }
}