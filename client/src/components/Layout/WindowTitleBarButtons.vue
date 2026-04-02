<!--
  @component WindowTitleBarButtons
  @description Windows 平台右上角窗口控制按钮（最小化、最大化/还原、关闭）。
               固定定位在右上角，仅 Windows 平台显示。
               macOS 使用原生红黄绿三圆点，无需此组件。
  @layer layout
-->
<template>
  <div v-if="isWindows" class="window-titlebar-buttons">
    <button class="titlebar-btn minimize" @click="minimize" title="最小化">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="2" y="5.5" width="8" height="1" fill="currentColor"/>
      </svg>
    </button>
    <button class="titlebar-btn maximize" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
      <svg v-if="isMaximized" width="12" height="12" viewBox="0 0 12 12">
        <rect x="2" y="4" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>
        <polyline points="4,4 4,2 10,2 10,8 8,8" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
      <svg v-else width="12" height="12" viewBox="0 0 12 12">
        <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
    </button>
    <button class="titlebar-btn close" @click="close" title="关闭">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
        <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import { SYSTEM_SERVICE_KEY } from '@/di/interfaces'
import type { ISystemService } from '@/di/interfaces'

const systemService = inject<ISystemService>(SYSTEM_SERVICE_KEY)

const isWindows = ref(false)
const isMaximized = ref(false)

onMounted(async () => {
  try {
    if (systemService) {
      const platform = await systemService.getPlatform()
      isWindows.value = platform === 'win32'
    }
  } catch (e) {
    console.error('[WindowTitleBarButtons] Failed to get platform:', e)
  }
})

async function minimize() {
  await window.electronAPI.minimizeWindow()
}

async function toggleMaximize() {
  await window.electronAPI.maximizeWindow()
  isMaximized.value = !isMaximized.value
}

async function close() {
  await window.electronAPI.closeWindow()
}
</script>

<style scoped>
.window-titlebar-buttons {
  position: fixed;
  top: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
  transition: background 0.1s ease;
}

.titlebar-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.titlebar-btn.close:hover {
  background: #e81123;
  color: white;
}
</style>