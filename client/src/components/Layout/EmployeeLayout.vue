<!--
  @component EmployeeLayout
  @description 员工端布局，包含：
    - 左侧固定导航栏
    - 右侧主内容区域
    - 顶部窗口拖动区域
  @layer layout
-->
<template>
  <div class="employee-layout">
    <!-- 窗口拖动区域 -->
    <div class="window-drag-region"></div>

    <!-- 侧边栏 -->
    <aside class="employee-sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6M9 12h6M9 15h4"/>
          </svg>
          <span>员工端</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/employee/tasks" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>我的任务</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="back-btn" @click="goToAgent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>返回 Agent</span>
        </button>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="employee-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

function goToAgent() {
  appStore.switchPort('agent')
  router.push('/')
}
</script>

<style scoped>
.employee-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.window-drag-region {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  -webkit-app-region: drag;
  z-index: 0;
  pointer-events: none;
}

.employee-sidebar {
  width: 220px;
  height: 100vh;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  -webkit-app-region: no-drag;
}

.sidebar-header {
  padding: 36px 16px 16px;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-secondary);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 1.1rem;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  color: var(--color-foreground);
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.875rem;
  transition: var(--transition-gentle);
}

.nav-item:hover {
  background: var(--color-muted);
}

.nav-item.router-link-active {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid var(--color-border);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted-foreground);
  font-family: var(--font-body);
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.back-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.employee-main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>