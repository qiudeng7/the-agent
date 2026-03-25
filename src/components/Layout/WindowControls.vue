<template>
  <div class="window-controls" :class="{ 'is-mac': isMac }">
    <button
      class="ctrl-btn"
      @click="$emit('toggleSidebar')"
      @mouseenter="show(collapsed ? '展开侧栏' : '收起侧栏', $event)"
      @mouseleave="hide"
    >
      <svg v-if="collapsed" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      <svg v-else width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>

    <button
      class="ctrl-btn"
      @click="newChat"
      @mouseenter="show('新建对话', $event)"
      @mouseleave="hide"
    >
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="visible" class="tooltip" :style="style">{{ text }}</div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggleSidebar: [] }>()

const router = useRouter()
const isMac = navigator.userAgent.includes('Mac')

const visible = ref(false)
const text = ref('')
const x = ref(0)
const y = ref(0)

const style = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

function show(label: string, e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  x.value = rect.left + rect.width / 2
  y.value = rect.bottom + 6
  text.value = label
  visible.value = true
}

function hide() {
  visible.value = false
}

function newChat() {
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
}
</script>

<style scoped>
.window-controls {
  position: fixed;
  top: 0;
  left: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.window-controls.is-mac {
  left: 72px;
}

.ctrl-btn {
  width: 25px;
  height: 25px;
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

<style>
/* 非 scoped：teleport 到 body，scoped 选择器无法命中 */
.tooltip {
  position: fixed;
  transform: translateX(-50%);
  background: var(--color-foreground);
  color: var(--color-background);
  font-size: 0.7rem;
  font-family: var(--font-body);
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
}
</style>
