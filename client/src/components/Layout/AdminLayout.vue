<!--
  @component AdminLayout
  @description 管理端布局，包含：
    - 左侧固定导航栏
    - 右侧主内容区域
    - 顶部窗口拖动区域
  @layer layout
-->
<template>
  <div class="admin-layout">
    <!-- 窗口拖动区域 -->
    <div class="window-drag-region"></div>

    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          <span>管理端</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/admin/dashboard" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>仪表盘</span>
        </router-link>

        <router-link to="/admin/tasks" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>任务管理</span>
        </router-link>

        <router-link to="/admin/apps" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>应用管理</span>
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
    <main class="admin-main">
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
.admin-layout {
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

.admin-sidebar {
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
  color: var(--color-primary);
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
  background: var(--color-primary)/10;
  color: var(--color-primary);
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

.admin-main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>