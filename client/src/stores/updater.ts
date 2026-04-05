/**
 * @module stores/updater
 * @description 应用更新状态管理（Pinia store）。
 *              管理更新检查、下载进度、安装状态。
 *
 * @layer state
 */

import { defineStore } from 'pinia'
import { ref, inject } from 'vue'
import { emitter } from '@/events'
import { UPDATER_KEY, type IUpdater } from '@/di/interfaces'
import type { UpdaterStatus, UpdaterStatusData, UpdateInfo, ProgressInfo } from '../../electron/electron.d'

export type { UpdaterStatus, UpdateInfo, ProgressInfo }

export const useUpdaterStore = defineStore('updater', () => {
  // ── 依赖注入 ────────────────────────────────────────────────────────────────
  const updater = inject<IUpdater>(UPDATER_KEY)!

  // ── 状态 ──────────────────────────────────────────────────────────────────
  const status = ref<UpdaterStatus>('idle')
  const updateInfo = ref<UpdateInfo | null>(null)
  const downloadProgress = ref<ProgressInfo | null>(null)
  const error = ref<string | null>(null)

  // ── 事件监听 ───────────────────────────────────────────────────────────────
  function setupEventListeners() {
    updater.onStatus((data: UpdaterStatusData) => {
      status.value = data.status
      if (data.info) {
        updateInfo.value = data.info
      }
      if (data.error) {
        error.value = data.error
      }

      // 发送 mitt 事件供其他模块监听
      if (data.status === 'available') {
        emitter.emit('updater:available', data.info)
      } else if (data.status === 'downloaded') {
        emitter.emit('updater:downloaded', data.info)
      } else if (data.status === 'error') {
        emitter.emit('updater:error', data.error)
      }
    })

    updater.onProgress((progress: ProgressInfo) => {
      downloadProgress.value = progress
      status.value = 'downloading'
    })
  }

  function teardownEventListeners() {
    // updater.onStatus/onProgress 返回的取消函数会在组件卸载时自动调用
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function check() {
    error.value = null
    await updater.check()
  }

  async function download() {
    error.value = null
    downloadProgress.value = null
    await updater.download()
  }

  async function cancel() {
    await updater.cancel()
    downloadProgress.value = null
  }

  async function install() {
    await updater.install()
  }

  function reset() {
    status.value = 'idle'
    updateInfo.value = null
    downloadProgress.value = null
    error.value = null
  }

  return {
    // 状态
    status,
    updateInfo,
    downloadProgress,
    error,

    // 生命周期
    setupEventListeners,
    teardownEventListeners,

    // Actions
    check,
    download,
    cancel,
    install,
    reset,
  }
})