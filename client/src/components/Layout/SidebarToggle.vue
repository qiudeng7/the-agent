<!--
  @component SidebarToggle
  @description 固定定位在窗口左上角的侧栏收起/展开按钮。
               - macOS: left: 72px（让出系统红黄绿三圆点位置）
               - Windows / 其他: left: 8px
  @props collapsed - 侧边栏当前是否处于折叠状态
  @emits toggle - 请求切换侧边栏折叠状态
  @layer layout
-->
<template>
  <div class="sidebar-toggle" :class="{ 'is-mac': isMac }">
    <button
      class="toggle-btn"
      @click="$emit('toggle')"
      @mouseenter="showTooltip(collapsed ? '展开侧栏' : '收起侧栏', $event)"
      @mouseleave="hideTooltip"
    >
      <svg v-if="collapsed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="tooltipVisible" class="toggle-tooltip" :style="tooltipStyle">
        {{ tooltipText }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const isMac = navigator.userAgent.includes('Mac')

const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)

const tooltipStyle = computed(() => ({
  left: `${tooltipX.value}px`,
  top: `${tooltipY.value}px`,
}))

function showTooltip(label: string, e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipX.value = rect.left + rect.width / 2
  tooltipY.value = rect.bottom + 6
  tooltipText.value = label
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}
</script>

<style scoped>
.sidebar-toggle {
  position: fixed;
  top: 0;
  left: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.sidebar-toggle.is-mac {
  left: 72px;
}

.toggle-btn {
  width: 28px;
  height: 28px;
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

.toggle-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}
</style>

<style>
/* 非 scoped：teleport 到 body */
.toggle-tooltip {
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