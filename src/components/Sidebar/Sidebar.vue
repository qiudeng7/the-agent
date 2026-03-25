<template>
  <div class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="search-box">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          name="search"
          placeholder="搜索会话..."
          class="search-input"
          aria-label="搜索会话"
        />
      </div>
    </div>

    <div class="sidebar-content">
      <nav class="nav-menu">
        <button class="nav-item" @click="router.push('/')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>首页</span>
        </button>
        <button class="nav-item" @click="router.push('/apps')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>全部应用</span>
        </button>
      </nav>

      <SessionList />
    </div>

    <div class="user-profile" @click="router.push('/settings')" title="设置">
      <div class="user-info">
        <div class="user-avatar"><span>U</span></div>
        <span class="user-name">用户</span>
        <svg class="settings-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import SessionList from './SessionList.vue'

defineProps<{ collapsed: boolean }>()

const router = useRouter()
const chatStore = useChatStore()

const searchQuery = computed({
  get: () => chatStore.searchQuery,
  set: (val) => chatStore.setSearchQuery(val),
})
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  -webkit-app-region: no-drag;
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0;
}

.sidebar-header {
  padding: 36px 12px 8px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 6px 10px;
  transition: var(--transition-gentle);
}

.search-box:focus-within {
  border-color: var(--color-primary);
}

.search-icon {
  color: var(--color-muted-foreground);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-foreground);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-muted-foreground);
}

.search-input:focus {
  outline: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
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

.nav-item:hover {
  background: var(--color-muted);
}

.user-profile {
  padding: 12px 16px;
  cursor: pointer;
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
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
.user-profile:hover .settings-icon {
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
}

.user-name {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.settings-icon {
  margin-left: auto;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
  transition: var(--transition-gentle);
}
</style>
