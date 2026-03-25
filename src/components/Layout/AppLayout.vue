<template>
  <div class="app-layout">
    <!-- 顶部拖拽区域 -->
    <div class="titlebar-drag-region"></div>
    <div class="app-body">
      <Sidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar/Sidebar.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* 顶部拖拽区域 - 用于窗口拖拽 */
.titlebar-drag-region {
  height: 32px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 0;
  pointer-events: none;
}

.titlebar-drag-region > * {
  pointer-events: auto;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
