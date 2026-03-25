<template>
  <div class="titlebar">
    <!-- macOS: 三个点在左边 -->
    <template v-if="platform === 'darwin'">
      <div class="window-controls">
        <button class="control-btn macOS-close" @click="closeWindow" title="关闭">
          <svg class="icon-symbol" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
        <button class="control-btn macOS-minimize" @click="minimizeWindow" title="最小化">
          <svg class="icon-symbol" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect y="4" width="10" height="2"/>
          </svg>
        </button>
        <button class="control-btn macOS-maximize" @click="maximizeWindow" title="最大化">
          <svg class="icon-symbol" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="8" height="8"/>
          </svg>
        </button>
      </div>
      <div class="titlebar-title">The Agent</div>
      <div class="titlebar-spacer"></div>
    </template>

    <!-- Windows: 三个点在右边 -->
    <template v-else>
      <div class="titlebar-title">The Agent</div>
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimizeWindow" title="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect y="4" width="10" height="2"/>
          </svg>
        </button>
        <button class="control-btn maximize" @click="maximizeWindow" title="最大化">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="8" height="8"/>
          </svg>
        </button>
        <button class="control-btn close" @click="closeWindow" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const platform = ref<string>('unknown')

onMounted(async () => {
  if (window.electronAPI) {
    platform.value = await window.electronAPI.getPlatform()
  }
})

function closeWindow() {
  window.electronAPI?.closeWindow?.()
}

function minimizeWindow() {
  window.electronAPI?.minimizeWindow?.()
}

function maximizeWindow() {
  window.electronAPI?.maximizeWindow?.()
}
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.titlebar-title {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-foreground);
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.window-controls:hover .macOS-close .icon-symbol,
.window-controls:hover .macOS-minimize .icon-symbol,
.window-controls:hover .macOS-maximize .icon-symbol {
  opacity: 1;
}

/* macOS 样式 - 红黄绿圆点，hover 显示图标 */
.macOS-close,
.macOS-minimize,
.macOS-maximize {
  width: 14px !important;
  height: 14px !important;
  border-radius: 50% !important;
  border: 0.5px solid rgba(0, 0, 0, 0.25) !important;
  cursor: pointer !important;
  position: relative !important;
  padding: 0 !important;
  transition: all 0.15s ease !important;
  background-color: transparent !important;
}

.macOS-close {
  background-color: #ff5f57 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

.macOS-minimize {
  background-color: #febc2e !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

.macOS-maximize {
  background-color: #28c840 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

.macOS-close:hover,
.macOS-minimize:hover,
.macOS-maximize:hover {
  filter: brightness(0.85);
}

.macOS-close .icon-symbol,
.macOS-minimize .icon-symbol,
.macOS-maximize .icon-symbol {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.1s ease;
}

/* Windows 样式 */
.control-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.control-btn:hover {
  background: var(--color-muted);
}

.control-btn.close:hover {
  background: var(--color-destructive);
  color: white;
}

.titlebar-spacer {
  flex: 1;
}
</style>
