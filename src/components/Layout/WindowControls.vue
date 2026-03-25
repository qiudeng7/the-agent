<template>
  <div class="window-controls" :class="{ 'is-mac': isMac }">
    <button class="ctrl-btn" @click="$emit('toggleSidebar')" :title="collapsed ? '展开侧栏' : '收起侧栏'">
      <svg v-if="collapsed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <button class="ctrl-btn" @click="newChat" title="新建对话">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggleSidebar: [] }>()

const router = useRouter()
const isMac = navigator.userAgent.includes('Mac')

function newChat() {
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
}
</script>

<style scoped>
.window-controls {
  position: fixed;
  top: 5px;
  left: 8px;
  display: flex;
  gap: 4px;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.window-controls.is-mac {
  left: 72px;
}

.ctrl-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
  transition: var(--transition-gentle);
  padding: 0;
}

.ctrl-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}
</style>
