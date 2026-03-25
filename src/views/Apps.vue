<template>
  <div class="apps-page">
    <div class="apps-header">
      <h1 class="page-title">应用广场</h1>
      <div class="header-actions">
        <div class="search-box">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            name="appSearch"
            placeholder="输入关键词"
            class="search-input"
            aria-label="输入关键词搜索应用"
          />
        </div>
        <button class="create-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>创建智能体</span>
        </button>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        :class="['tab', { active: activeCategory === cat.id }]"
        @click="activeCategory = cat.id"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Apps Grid -->
    <div class="apps-grid">
      <div
        v-for="app in filteredApps"
        :key="app.id"
        class="app-card"
        @click="selectApp(app)"
      >
        <div class="app-icon" :style="{ background: app.iconColor }">
          <component :is="app.icon" />
        </div>
        <div class="app-content">
          <h3 class="app-name">{{ app.name }}</h3>
          <p class="app-desc">{{ app.description }}</p>
          <span class="app-source">来自 {{ app.source }}</span>
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

const searchQuery = ref('')
const activeCategory = ref('all')

const categories = [
  { id: 'all', name: '全部' },
  { id: 'recommended', name: '官方推荐' },
  { id: 'productivity', name: '工具提效' },
  { id: 'creative', name: '创意创作' },
  { id: 'learning', name: '学习宝库' },
  { id: 'life', name: '生活实用' },
]

const apps = [
  {
    id: '1',
    name: 'AI 阅读助手',
    description: '文档精读、摘要总结',
    source: 'The Agent 官方',
    category: 'recommended',
    iconColor: 'var(--color-primary)',
    icon: createDocumentIcon(),
  },
  {
    id: '2',
    name: 'AI 绘画',
    description: '创意一键即画',
    source: 'The Agent 官方',
    category: 'recommended',
    iconColor: 'var(--color-secondary)',
    icon: createImageIcon(),
  },
  {
    id: '3',
    name: '代码助手',
    description: '编程、调试、解释',
    source: 'The Agent 官方',
    category: 'productivity',
    iconColor: '#7C5DFA',
    icon: createCodeIcon(),
  },
  {
    id: '4',
    name: '文案创作',
    description: '朋友圈、小红书文案',
    source: 'The Agent 官方',
    category: 'creative',
    iconColor: 'var(--color-accent-foreground)',
    icon: createTextIcon(),
  },
  {
    id: '5',
    name: '学习辅导',
    description: '作业问题、知识点讲解',
    source: 'The Agent 官方',
    category: 'learning',
    iconColor: 'var(--color-primary)',
    icon: createLearnIcon(),
  },
  {
    id: '6',
    name: '旅行规划师',
    description: '行程规划、攻略推荐',
    source: 'The Agent 官方',
    category: 'life',
    iconColor: 'var(--color-secondary)',
    icon: createTravelIcon(),
  },
]

function createDocumentIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    `,
  }
}

function createImageIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    `,
  }
}

function createCodeIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    `,
  }
}

function createTextIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      </svg>
    `,
  }
}

function createLearnIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    `,
  }
}

function createTravelIcon() {
  return {
    template: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    `,
  }
}

const filteredApps = computed(() => {
  let result = apps
  if (activeCategory.value !== 'all') {
    result = result.filter(app => app.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    result = result.filter(app =>
      app.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  return result
})

function selectApp(app: typeof apps[0]) {
  const session = chatStore.createSession(app.name)
  router.push(`/chat/${session.id}`)
}
</script>

<style scoped>
.apps-page {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}

/* Header */
.apps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 10px 16px;
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
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-foreground);
  width: 200px;
}

.search-input::placeholder {
  color: var(--color-muted-foreground);
}

.search-input:focus {
  outline: none;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition-gentle);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.create-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-muted);
}

/* Category Tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: var(--color-muted);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition-gentle);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
  white-space: nowrap;
}

.tab:hover {
  background: var(--color-muted);
}

.tab.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* Apps Grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

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
