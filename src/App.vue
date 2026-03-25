<!--
  @component App
  @description 根组件，负责：
    - 监听 settingsStore.currentTheme 变化，同步切换 <html> 元素的 .dark 类
    - 提供 <router-view /> 出口渲染各页面
  @layer root
-->
<template>
  <div id="app" :class="{ dark: isDarkMode }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useSettingsStore } from './stores/settings'

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

onMounted(() => {
  // Initial setup
  const isDark = settingsStore.currentTheme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
})
</script>

<style scoped>
#app {
  width: 100%;
  height: 100%;
}
</style>
