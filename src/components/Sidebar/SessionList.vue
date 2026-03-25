<template>
  <div class="sessions-container">
    <div class="sessions-header">
      <span class="sessions-label">分组</span>
      <button class="add-group-btn" @click="showCreateGroup = true" title="添加分组">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>

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

const currentSessionId = computed(() => chatStore.currentSessionId)
const groupedSessions = computed(() => chatStore.groupedSessions)

const showCreateGroup = ref(false)
const newGroupName = ref('')

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
</script>

<style scoped>
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

.modal-overlay {
  position: fixed;
  inset: 0;
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
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: var(--color-primary);
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
