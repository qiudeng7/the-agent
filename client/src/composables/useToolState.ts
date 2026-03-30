/**
 * @module composables/useToolState
 * @description 工具状态管理 composable。
 *              封装工具展开状态、tab 切换、运行状态、结果缓存等逻辑。
 *              用于简化 MessageList 组件的 props 传递。
 * @layer composable
 */

import { ref, computed } from 'vue'
import type { ToolResultContent } from '#claude/types'

export interface ToolStateController {
  /** 判断工具是否展开 */
  isToolExpanded: (toolId: string) => boolean
  /** 获取工具激活的 tab */
  getToolActiveTab: (toolId: string) => 'input' | 'result'
  /** 获取工具状态 */
  getToolStatus: (toolUseId: string) => 'running' | 'done' | 'error'
  /** 获取工具结果 */
  getToolResult: (toolUseId: string) => ToolResultContent | undefined
  /** 切换工具展开状态 */
  toggleToolExpand: (toolId: string) => void
  /** 设置工具激活的 tab */
  setToolActiveTab: (toolId: string, tab: 'input' | 'result') => void
}

export interface UseToolStateOptions {
  /** 获取工具结果的函数 */
  getToolResultFn?: (toolUseId: string) => ToolResultContent | undefined
  /** 获取工具状态的函数 */
  getToolStatusFn?: (toolUseId: string) => 'running' | 'done' | 'error'
}

/**
 * 创建工具状态控制器
 */
export function useToolState(options: UseToolStateOptions = {}): ToolStateController {
  // 工具展开状态
  const expandedTools = ref(new Set<string>())
  // 工具激活的 tab
  const toolActiveTabs = ref(new Map<string, 'input' | 'result'>())

  const isToolExpanded = (toolId: string) => expandedTools.value.has(toolId)

  const getToolActiveTab = (toolId: string): 'input' | 'result' => {
    return toolActiveTabs.value.get(toolId) || 'input'
  }

  const getToolStatus = (toolUseId: string): 'running' | 'done' | 'error' => {
    if (options.getToolStatusFn) {
      return options.getToolStatusFn(toolUseId)
    }
    return 'done'
  }

  const getToolResult = (toolUseId: string): ToolResultContent | undefined => {
    if (options.getToolResultFn) {
      return options.getToolResultFn(toolUseId)
    }
    return undefined
  }

  const toggleToolExpand = (toolId: string) => {
    if (expandedTools.value.has(toolId)) {
      expandedTools.value.delete(toolId)
    } else {
      expandedTools.value.add(toolId)
    }
  }

  const setToolActiveTab = (toolId: string, tab: 'input' | 'result') => {
    toolActiveTabs.value.set(toolId, tab)
  }

  return {
    isToolExpanded,
    getToolActiveTab,
    getToolStatus,
    getToolResult,
    toggleToolExpand,
    setToolActiveTab,
  }
}