/**
 * @module composables/useScrollControl
 * @description 滚动控制 composable。
 *              封装消息容器滚动到底部的逻辑。
 * @layer composables
 */
import { ref, nextTick, watch, type Ref, type ComputedRef } from 'vue'
import type { Message } from '@/stores/chat'

export interface UseScrollControlOptions {
  /** 消息列表 */
  messages: ComputedRef<Message[]>
  /** 是否正在生成 */
  isGenerating: ComputedRef<boolean>
}

export interface UseScrollControlReturn {
  /** 消息容器引用 */
  messagesContainerRef: Ref<HTMLElement | null>
  /** 滚动到底部 */
  scrollToBottom: () => void
  /** 设置滚动监听 */
  setupScrollWatchers: () => void
}

/**
 * 滚动控制 composable
 */
export function useScrollControl(options: UseScrollControlOptions): UseScrollControlReturn {
  const { messages, isGenerating } = options

  // ── State ────────────────────────────────────────────────────────────────────
  const messagesContainerRef = ref<HTMLElement | null>(null)

  // ── 滚动控制 ──────────────────────────────────────────────────────────────────
  function scrollToBottom() {
    nextTick(() => {
      if (messagesContainerRef.value) {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
      }
    })
  }

  // ── 设置滚动监听 ──────────────────────────────────────────────────────────────
  function setupScrollWatchers() {
    // 监听消息数量变化
    watch(messages, (newMessages, oldMessages) => {
      if (newMessages.length !== oldMessages?.length) {
        scrollToBottom()
      }
    }, { deep: true })

    // 监听生成状态变化（生成结束时滚动）
    watch(isGenerating, (generating, wasGenerating) => {
      if (wasGenerating && !generating) {
        scrollToBottom()
      }
    })
  }

  return {
    messagesContainerRef,
    scrollToBottom,
    setupScrollWatchers,
  }
}