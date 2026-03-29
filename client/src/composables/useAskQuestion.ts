/**
 * @module composables/useAskQuestion
 * @description AskUserQuestion Dialog 处理 composable。
 *              封装 AskUserQuestion 工具的对话框状态和事件处理。
 * @layer composables
 */
import { ref, type Ref } from 'vue'
import type { AskUserQuestionItem } from '#claude/types'

export interface AskQuestionRequest {
  taskId: string
  toolUseId: string
  questions: AskUserQuestionItem[]
}

export interface UseAskQuestionReturn {
  /** 是否显示对话框 */
  showAskDialog: Ref<boolean>
  /** 问题列表 */
  askQuestions: Ref<AskUserQuestionItem[]>
  /** 处理 AskUserQuestion 请求 */
  handleAskQuestion: (request: AskQuestionRequest) => void
  /** 提交答案 */
  handleAskSubmit: (answers: Record<string, string>) => Promise<void>
  /** 取消 */
  handleAskCancel: () => void
  /** 设置事件监听（返回清理函数） */
  setupAskQuestionListener: () => () => void
}

/**
 * AskUserQuestion Dialog 处理 composable
 */
export function useAskQuestion(): UseAskQuestionReturn {
  // ── State ────────────────────────────────────────────────────────────────────
  const showAskDialog = ref(false)
  const askQuestions = ref<AskUserQuestionItem[]>([])
  const currentAskToolUseId = ref('')

  // ── 事件处理 ──────────────────────────────────────────────────────────────────
  function handleAskQuestion(request: AskQuestionRequest): void {
    currentAskToolUseId.value = request.toolUseId
    askQuestions.value = request.questions
    showAskDialog.value = true
  }

  async function handleAskSubmit(answers: Record<string, string>): Promise<void> {
    showAskDialog.value = false
    await window.electronAPI.answerAskQuestion(currentAskToolUseId.value, { answers })
  }

  function handleAskCancel(): void {
    showAskDialog.value = false
    // 用户取消时，发送 null 让 SDK 继续
    window.electronAPI.answerAskQuestion(currentAskToolUseId.value, null)
  }

  // ── 事件监听 ──────────────────────────────────────────────────────────────────
  let unsubscribeAskQuestion: (() => void) | null = null

  function setupAskQuestionListener(): () => void {
    unsubscribeAskQuestion = window.electronAPI.onAskQuestion(handleAskQuestion)

    return () => {
      unsubscribeAskQuestion?.()
      unsubscribeAskQuestion = null
    }
  }

  return {
    showAskDialog,
    askQuestions,
    handleAskQuestion,
    handleAskSubmit,
    handleAskCancel,
    setupAskQuestionListener,
  }
}