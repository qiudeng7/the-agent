/**
 * @module composables/useInstaller
 * @description 管理 Claude Code 安装进度对话框状态。
 * @layer composable
 */
import { ref, readonly } from 'vue'
import type { InstallerProgressEvent } from '#claude-installer/types'

/** 安装事件列表 */
const events = ref<InstallerProgressEvent[]>([])

/** 是否显示对话框 */
const showDialog = ref(false)

/** 清理函数 */
let cleanup: (() => void) | null = null

/**
 * 开始监听安装进度事件。
 */
export function startInstallerListener() {
  if (cleanup) return // 已在监听

  cleanup = window.electronAPI.onClaudeInstallerProgress((event) => {
    // 添加事件到列表
    events.value.push(event)

    // 如果是需要安装的事件，显示对话框
    if (event.type === 'check:not-found') {
      showDialog.value = true
    }

    // 如果是成功或失败事件，可以记录
    console.log('[Claude Installer]', event.type, event)
  })
}

/**
 * 停止监听安装进度事件。
 */
export function stopInstallerListener() {
  if (cleanup) {
    cleanup()
    cleanup = null
  }
}

/**
 * 关闭对话框并重置状态。
 */
export function closeInstallerDialog() {
  showDialog.value = false
  events.value = []
}

/**
 * 安装器状态 composable。
 */
export function useInstaller() {
  return {
    events: readonly(events),
    showDialog: readonly(showDialog),
    startListener: startInstallerListener,
    stopListener: stopInstallerListener,
    closeDialog: closeInstallerDialog,
  }
}