<!--
  @component App
  @description 根组件，负责：
    - 监听 settingsStore.currentTheme 变化，同步切换 <html> 元素的 .dark 类
    - 提供 <router-view /> 出口渲染各页面
    - 显示 Claude Code 安装进度对话框
  @layer root
-->
<template>
  <div id="app" :class="{ dark: isDarkMode }">
    <router-view />
    <InstallerDialog
      :visible="showDialog"
      :events="events"
      @close="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useSettingsStore } from './stores/settings'
import { useChatStore } from './stores/chat'
import { useAgentStore } from './stores/agent'
import { useInstaller } from './composables/useInstaller'
import InstallerDialog from './components/InstallerDialog.vue'

const settingsStore = useSettingsStore()

const isDarkMode = computed(() => settingsStore.currentTheme === 'dark')

// Watch for theme changes and update html class
watch(
  () => settingsStore.currentTheme,
  (newTheme) => {
    const isDark = newTheme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
  },
  { immediate: true }
)

// Installer 对话框
const { events, showDialog, startListener, stopListener, closeDialog } = useInstaller()

onMounted(() => {
  // Initial setup
  const isDark = settingsStore.currentTheme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)

  // 开始监听安装进度
  startListener()
})

onUnmounted(() => {
  // 清理 stores 事件监听
  const chatStore = useChatStore()
  const agentStore = useAgentStore()

  settingsStore.teardownEventListeners()
  chatStore.teardownEventListeners()
  agentStore.teardownEventListeners()
  settingsStore.ui.stopWatching()

  // 停止监听安装进度
  stopListener()
})
</script>

<style scoped>
#app {
  width: 100%;
  height: 100%;
}
</style>
