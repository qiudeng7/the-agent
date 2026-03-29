/**
 * @module composables/useChatSubmit
 * @description 聊天提交逻辑 composable。
 *              封装消息提交、模型初始化等业务逻辑。
 * @layer composables
 */
import { computed, type Ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAgentStore } from '@/stores/agent'
import { useSettingsStore } from '@/stores/settings'
import type { PermissionMode } from '#claude/types'

export interface UseChatSubmitOptions {
  /** 会话 ID */
  sessionId: Ref<string | null>
  /** 会话模型（双向绑定） */
  sessionModel: Ref<string>
}

export interface UseChatSubmitReturn {
  /** 是否正在生成 */
  isGenerating: Ref<boolean>
  /** 提交消息 */
  handleSubmit: (input: string, options: { model: string; permissionMode: PermissionMode }) => Promise<void>
  /** 初始化会话模型 */
  initSessionModel: () => void
  /** 模型切换回调 */
  handleModelChange: (modelId: string) => void
}

/**
 * 聊天提交逻辑 composable
 */
export function useChatSubmit(options: UseChatSubmitOptions): UseChatSubmitReturn {
  const { sessionId, sessionModel } = options

  // ── Stores ───────────────────────────────────────────────────────────────────
  const chatStore = useChatStore()
  const agentStore = useAgentStore()
  const settingsStore = useSettingsStore()

  // ── 状态 ──────────────────────────────────────────────────────────────────────
  const isGenerating = computed(() => agentStore.isGenerating)

  // ── 会话数据 ──────────────────────────────────────────────────────────────────
  const session = computed(() =>
    chatStore.sessions.find(s => s.id === sessionId.value),
  )

  // ── 提交消息 ──────────────────────────────────────────────────────────────────
  async function handleSubmit(
    input: string,
    options: { model: string; permissionMode: PermissionMode },
  ): Promise<void> {
    if (!sessionId.value || agentStore.isGenerating) return

    const modelId = options.model || settingsStore.defaultModel
    const modelConfig = settingsStore.getModelConfig(modelId)

    // 构建历史消息（在添加用户消息之前，避免重复）
    const sessionMessages = session.value?.messages.map(m => ({
      role: m.role,
      content: m.content,
    })) ?? []

    // 添加用户消息到 chat store（用于前端显示）
    await chatStore.addMessage(sessionId.value, {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: input,
      timestamp: Date.now(),
    })

    // 调用 agent
    await agentStore.runAgent(
      sessionId.value,
      input,
      sessionMessages,
      {
        model: modelId,
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL,
        permissionMode: options.permissionMode,
      },
    )

    // 更新会话模型
    if (modelId) {
      chatStore.setSessionModel(sessionId.value, modelId)
    }

    // 保存权限模式到设置
    settingsStore.setPermissionMode(options.permissionMode)
  }

  // ── 初始化会话模型 ────────────────────────────────────────────────────────────
  function initSessionModel(): void {
    if (sessionId.value) {
      const model = chatStore.getSessionModel(sessionId.value)
      sessionModel.value = model || settingsStore.defaultModel || settingsStore.enabledAvailableModels[0]?.id || ''
    }
  }

  // ── 模型切换回调 ──────────────────────────────────────────────────────────────
  function handleModelChange(modelId: string): void {
    sessionModel.value = modelId
    if (sessionId.value) {
      chatStore.setSessionModel(sessionId.value, modelId)
    }
  }

  return {
    isGenerating,
    handleSubmit,
    initSessionModel,
    handleModelChange,
  }
}