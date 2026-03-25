<template>
  <div class="sidebar">
    <!-- Sidebar Header - 功能按钮 -->
    <div class="sidebar-header">
      <!-- 功能按钮：收起侧栏、新建对话 -->
      <div class="action-buttons">
        <button class="icon-btn" @click="toggleSidebar" title="收起侧栏">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button class="icon-btn" @click="newChat" title="新建对话">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
    </div>
    <!-- Search -->
    <div class="search-box">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    <!-- Scrollable Content -->
    <div class="sidebar-content">
      <!-- Navigation -->
      <nav class="nav-menu">
        <button class="nav-item" @click="goHome">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>首页</span>
        </button>
        <button class="nav-item" @click="goToApps">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>全部应用</span>
        </button>
      </nav>

      <!-- Groups & Sessions -->
      <div class="sessions-container">
      <div class="sessions-header">
        <span class="sessions-label">分组</span>
        <button class="add-group-btn" @click="showCreateGroup = true" title="添加分组">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <!-- Grouped Sessions -->
      <div v-for="(groupSessions, groupName) in groupedSessions" :key="groupName" class="session-group">
        <div class="group-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="group-name">{{ groupName }}</span>
        </div>
        <div class="group-sessions">
          <button
            v-for="session in groupSessions"
            :key="session.id"
            :class="['session-item', { active: session.id === currentSessionId }]"
            @click="selectSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
          </button>
        </div>
      </div>
    </div>

      <!-- User Profile -->
      <div class="user-profile" @click="goToSettings" title="设置">
        <div class="user-info">
          <div class="user-avatar">
            <span>{{ userInitial }}</span>
          </div>
          <span class="user-name">{{ userName }}</span>
          <svg class="settings-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateGroup" class="modal-overlay" @click="showCreateGroup = false">
      <div class="modal" @click.stop>
        <h3>创建新分组</h3>
        <input
          v-model="newGroupName"
          type="text"
          name="groupName"
          placeholder="分组名称"
          class="modal-input"
          aria-label="分组名称"
          @keyup.enter="createGroup"
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreateGroup = false">取消</button>
          <button class="btn-confirm" @click="createGroup">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const chatStore = useChatStore()

const searchQuery = computed({
  get: () => chatStore.searchQuery,
  set: (val) => chatStore.setSearchQuery(val),
})

const currentSessionId = computed(() => chatStore.currentSessionId)
const groupedSessions = computed(() => chatStore.groupedSessions)

const showCreateGroup = ref(false)
const newGroupName = ref('')

const userName = '用户'
const userInitial = 'U'

function goHome() {
  router.push('/')
}

function goToApps() {
  router.push('/apps')
}

function selectSession(id: string) {
  chatStore.switchSession(id)
  router.push(`/chat/${id}`)
}

function createGroup() {
  if (newGroupName.value.trim()) {
    chatStore.createGroup(newGroupName.value.trim())
    newGroupName.value = ''
    showCreateGroup.value = false
  }
}

function goToSettings() {
  router.push('/settings')
}

function toggleSidebar() {
  // TODO: 实现收起侧栏功能
  console.log('toggle sidebar')
}

function newChat() {
  const session = chatStore.createSession('新对话')
  router.push(`/chat/${session.id}`)
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

/* Header */
.sidebar-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* 功能按钮 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

.icon-btn:hover {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 10px 14px;
  margin: 8px 16px;
  flex-shrink: 0;
  transition: var(--transition-gentle);
}

.search-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
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
  font-size: 0.875rem;
  color: var(--color-foreground);
}

.search-input::placeholder {
  color: var(--color-muted-foreground);
}

.search-input:focus {
  outline: none;
}

/* Scrollable Content */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

/* Navigation */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

/* Sessions Container */
.sessions-container {
  padding-bottom: 16px;
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 8px;
}

.sessions-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.add-group-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-muted-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-gentle);
}

.add-group-btn:hover {
  background: var(--color-muted);
  color: var(--color-primary);
}

/* Session Group */
.session-group {
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--color-muted-foreground);
  font-size: 0.8125rem;
  font-weight: 600;
}

.group-header svg {
  flex-shrink: 0;
}

.group-sessions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.session-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-gentle);
  overflow: hidden;
}

.session-item:hover {
  background: var(--color-muted);
}

.session-item.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.session-title {
  font-family: var(--font-body);
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-foreground);
}

/* User Profile */
.user-profile {
  padding: 16px;
  cursor: pointer;
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

.user-profile:hover .user-name {
  color: var(--color-primary-foreground);
}

.settings-icon {
  margin-left: auto;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
  transition: var(--transition-gentle);
}

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
}

.user-name {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
  transition: var(--transition-gentle);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 24px;
  width: 90%;
  max-width: 360px;
  box-shadow: var(--shadow-float);
}

.modal h3 {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--color-foreground);
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  margin-bottom: 16px;
}

.modal-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary)/10;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.btn-cancel {
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-foreground);
}

.btn-cancel:hover {
  border-color: var(--color-muted-foreground);
}

.btn-confirm {
  background: var(--color-primary);
  border: none;
  color: var(--color-primary-foreground);
  box-shadow: var(--shadow-soft);
}

.btn-confirm:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-lift);
}
</style>
