<!--
  @component AppCard
  @description 应用广场中的单个应用卡片。
               展示应用图标（动态背景色 + SVG 图标组件）、名称、简介、来源。
               点击时触发 select 事件，由父组件 Apps.vue 处理跳转逻辑。
  @props name - 应用名称
  @props description - 一句话简介
  @props source - 来源标注（如"The Agent 官方"）
  @props iconColor - 图标背景色（CSS 颜色值或 CSS 变量）
  @props icon - SVG 图标组件对象（由 utils/icons.ts 工厂函数生成）
  @emits select - 卡片被点击
  @layer component
-->
<template>
  <div class="app-card" @click="$emit('select')">
    <div class="app-icon" :style="{ background: iconColor }">
      <component :is="icon" />
    </div>
    <div class="app-content">
      <h3 class="app-name">{{ name }}</h3>
      <p class="app-desc">{{ description }}</p>
      <span class="app-source">来自 {{ source }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  description: string
  source: string
  iconColor: string
  icon: object
}>()

defineEmits<{ select: [] }>()
</script>

<style scoped>
.app-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-muted);
  cursor: pointer;
  transition: var(--transition-natural);
  box-shadow: var(--shadow-soft);
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.app-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: var(--transition-gentle);
}

.app-card:hover .app-icon {
  transform: scale(1.05);
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.app-name {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.app-desc {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-muted-foreground);
  line-height: 1.4;
}

.app-source {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}
</style>
