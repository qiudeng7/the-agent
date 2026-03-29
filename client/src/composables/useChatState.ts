/**
 * @module composables/useChatState
 * @description 聊天状态管理 composable。
 *              封装流式消息和工具 UI 状态管理逻辑。
 * @layer composables
 */
import { ref, type Ref, type ComputedRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { ContentBlock, ToolResultContent } from '#claude/types'

export interface UseChatStateOptions {
  /** 流式内容块 */
  streamingContentBlocks: ComputedRef<ContentBlock[]>
}

export interface UseChatStateReturn {
  // ── 思考块折叠状态 ────────────────────────────────────────────────────────────
  /** 流式思考块是否折叠 */
  isStreamingThinkingCollapsed: Ref<boolean>
  /** 切换流式思考块折叠状态 */
  toggleStreamingThinking: () => void

  // ── 工具 UI 状态 ──────────────────────────────────────────────────────────────
  /** 展开的工具 ID */
  expandedTools: Ref<Record<string, boolean>>
  /** 工具详情激活的 tab */
  toolActiveTab: Ref<Record<string, 'input' | 'result'>>
  /** 切换工具展开状态 */
  toggleToolExpand: (toolId: string) => void
  /** 判断工具是否展开 */
  isToolExpanded: (toolId: string) => boolean
  /** 获取工具激活的 tab */
  getToolActiveTab: (toolId: string) => 'input' | 'result'
  /** 设置工具激活的 tab */
  setToolActiveTab: (toolId: string, tab: 'input' | 'result') => void
  /** 获取工具结果 */
  getToolResult: (toolUseId: string) => ToolResultContent | undefined
  /** 获取工具状态 */
  getToolStatus: (toolUseId: string) => 'running' | 'done' | 'error'
}

/**
 * 聊天状态管理 composable
 */
export function useChatState(options: UseChatStateOptions): UseChatStateReturn {
  const { streamingContentBlocks } = options

  const settingsStore = useSettingsStore()

  // ── 思考块折叠状态 ────────────────────────────────────────────────────────────
  const isStreamingThinkingCollapsed = ref(settingsStore.collapseThinking)

  function toggleStreamingThinking(): void {
    isStreamingThinkingCollapsed.value = !isStreamingThinkingCollapsed.value
  }

  // ── 工具 UI 状态 ──────────────────────────────────────────────────────────────
  const expandedTools = ref<Record<string, boolean>>({})
  const toolActiveTab = ref<Record<string, 'input' | 'result'>>({})

  function toggleToolExpand(toolId: string): void {
    expandedTools.value[toolId] = !expandedTools.value[toolId]
  }

  function isToolExpanded(toolId: string): boolean {
    return expandedTools.value[toolId] ?? false
  }

  function getToolActiveTab(toolId: string): 'input' | 'result' {
    return toolActiveTab.value[toolId] || 'input'
  }

  function setToolActiveTab(toolId: string, tab: 'input' | 'result'): void {
    toolActiveTab.value[toolId] = tab
  }

  function getToolResult(toolUseId: string): ToolResultContent | undefined {
    return streamingContentBlocks.value.find(
      b => b.type === 'tool_result' && b.toolUseId === toolUseId,
    ) as ToolResultContent | undefined
  }

  function getToolStatus(toolUseId: string): 'running' | 'done' | 'error' {
    const result = getToolResult(toolUseId)
    if (!result) return 'running'
    if (result.isError) return 'error'
    return 'done'
  }

  return {
    // 思考块状态
    isStreamingThinkingCollapsed,
    toggleStreamingThinking,

    // 工具 UI 状态
    expandedTools,
    toolActiveTab,
    toggleToolExpand,
    isToolExpanded,
    getToolActiveTab,
    setToolActiveTab,
    getToolResult,
    getToolStatus,
  }
}