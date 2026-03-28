<!--
  @component AppLayout
  @description 全局页面布局容器，包含：
    - 顶部 32px 透明拖拽区域（-webkit-app-region: drag），使窗口可拖动
    - 绝对定位 WindowControls（侧边栏开关 + 新建对话按钮）
    - 左侧可折叠 Sidebar（260px，collapsed 时收起为 0）
    - 右侧 main-content 区域（<router-view /> 出口）
  @state sidebarCollapsed - 侧边栏折叠状态，由 WindowControls 的 toggle-sidebar 事件触发
  @layer layout
-->
<template>
  <div class="app-layout">
    <div class="titlebar-drag-region"></div>
    <WindowControls
      :collapsed="sidebarCollapsed"
      @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
    />
    <div class="app-body">
      <Sidebar :collapsed="sidebarCollapsed" />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import WindowControls from '@/components/Layout/WindowControls.vue'

const sidebarCollapsed = ref(false)
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.titlebar-drag-region {
  height: 32px;
  -webkit-app-region: drag;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 0;
  pointer-events: none;
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
