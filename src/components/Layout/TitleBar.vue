<template>
  <div class="titlebar">
    <!-- macOS: 三个点在左边 -->
    <template v-if="platform === 'darwin'">
      <div class="window-controls">
        <button class="control-btn close" @click="closeWindow" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
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
