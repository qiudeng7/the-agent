<!--
  @component UserMenu
  @description 用户菜单组件，包含用户信息、设置入口和端切换。
               用于 AdminLayout、EmployeeLayout、Sidebar 的底部用户区域。
  @layer component
-->
<template>
  <div
    class="user-section"
    @mouseenter="showMenu = true"
    @mouseleave="showMenu = false"
  >
    <!-- 展开菜单 -->
    <Transition name="slide-up">
      <div v-if="showMenu" class="user-menu">
        <!-- 设置入口 -->
        <div class="menu-section">
          <div class="menu-section-title">设置</div>
          <div class="menu-items settings-items">
            <button class="menu-item" @click="goToSettings('general')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>通用</span>
            </button>
            <button class="menu-item" @click="goToSettings('model')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>模型</span>
            </button>
            <button class="menu-item" @click="goToSettings('appearance')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <span>外观</span>
            </button>
          </div>
        </div>

        <!-- 分割线 -->
        <div class="menu-divider"></div>

        <!-- 端切换 -->
        <div class="menu-section">
          <div class="menu-section-title">切换端</div>
          <div class="menu-items port-items">
            <button
              v-for="port in appStore.availablePortInfos"
              :key="port.id"
              class="menu-item port-item"
              :class="{ active: appStore.currentPort === port.id }"
              @click="switchToPort(port.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path :d="port.icon"/>
              </svg>
              <span>{{ port.label }}</span>
              <svg v-if="appStore.currentPort === port.id" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 用户按钮 -->
    <div class="user-profile" :class="{ 'menu-open': showMenu }">
      <div class="user-info">
        <div class="user-avatar"><span>{{ userInitial }}</span></div>
        <span class="user-name">{{ userName }}</span>
        <svg class="chevron-icon" :class="{ rotated: showMenu }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore, type Port } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const showMenu = ref(false)

// 用户信息
const userName = computed(() => authStore.user?.nickname || authStore.user?.email?.split('@')[0] || '用户')
const userInitial = computed(() => {
  const name = userName.value
  return name.charAt(0).toUpperCase()
})

// 跳转设置页（带锚点）
function goToSettings(section: string) {
  showMenu.value = false
  appStore.switchPort('agent')
  router.push({ path: '/settings', query: { section } })
}

// 切换端
function switchToPort(port: Port) {
  showMenu.value = false
  if (appStore.switchPort(port)) {
    router.push(appStore.currentPortInfo.path)
  }
}
</script>

<style scoped>
/* 用户区域 */
.user-section {
  position: relative;
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
}

.user-profile {
  padding: 12px 16px;
  cursor: pointer;
}

.user-profile.menu-open .user-info {
  background: var(--color-primary);
}

.user-profile.menu-open .user-avatar {
  background: var(--color-primary-foreground);
  color: var(--color-primary);
}

.user-profile.menu-open .user-name,
.user-profile.menu-open .chevron-icon {
  color: var(--color-primary-foreground);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-full);
  background: var(--color-muted);
  transition: var(--transition-gentle);
}

.user-profile:hover .user-info {
  background: var(--color-primary);
}

.user-profile:hover .user-avatar {
  background: var(--color-primary-foreground);
  color: var(--color-primary);
}

.user-profile:hover .user-name,
.user-profile:hover .chevron-icon {
  color: var(--color-primary-foreground);
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary-foreground);
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
  transition: var(--transition-gentle);
}

.user-name {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-icon {
  color: var(--color-muted-foreground);
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* 展开菜单 */
.user-menu {
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  margin-bottom: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lift);
  z-index: 100;
  overflow: hidden;
}

.menu-section {
  padding: 12px;
}

.menu-section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding: 0 4px;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-items {
  flex-direction: row;
  gap: 4px;
}

.settings-items .menu-item {
  flex: 1;
  justify-content: center;
  padding: 8px 4px;
}

.settings-items .menu-item span {
  font-size: 0.75rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-foreground);
  text-align: left;
  transition: var(--transition-gentle);
}

.menu-item:hover {
  background: var(--color-muted);
}

.menu-item.port-item.active {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.check-icon {
  margin-left: auto;
  color: var(--color-primary);
}

.menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 12px;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>