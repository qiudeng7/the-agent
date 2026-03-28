<!--
  @component ChatToolsPanel
  @description 聊天输入框上方弹出的扩展工具面板（点击工具栏"工具"按钮展开）。
               以绝对定位覆盖在 .chat-input-wrapper 上方，通过 slideUp 动画入场。
               包含 4 个功能按钮：上传文件、上传图片、导出对话、设置。
               TODO: 各按钮目前为占位状态，需接入实际功能逻辑。
  @parent ChatInput.vue
  @layer component
-->
<template>
  <div class="tools-panel">
    <div class="tools-grid">
      <button class="tool-item">
        <div class="tool-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <span>上传文件</span>
      </button>
      <button class="tool-item">
        <div class="tool-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <span>上传图片</span>
      </button>
      <button class="tool-item">
        <div class="tool-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <span>导出对话</span>
      </button>
      <button class="tool-item">
        <div class="tool-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <span>设置</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，无 props / emits
</script>

<style scoped>
.tools-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-float);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
  color: var(--color-foreground);
  font-family: var(--font-body);
  font-size: 0.8125rem;
}

.tool-item:hover {
  background: var(--color-accent);
}

.tool-icon {
  width: 48px;
  height: 48px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  transition: var(--transition-gentle);
}

.tool-item:hover .tool-icon {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}
</style>
