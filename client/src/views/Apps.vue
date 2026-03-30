<!--
  @component Apps (view)
  @description 应用广场页面，路由：/apps。
               展示可用 AI 应用列表，支持分类标签筛选和关键词搜索（实时过滤）。
               点击应用卡片自动创建新会话并跳转对话页 /chat/:id。
               应用数据和图标定义在本文件内；图标通过 utils/icons.ts 工厂函数生成。
               卡片 UI 由 AppCard 组件负责渲染。
  @layer view
-->
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
      <AppCard
        v-for="app in filteredApps"
        :key="app.id"
        :name="app.name"
        :description="app.description"
        :source="app.source"
        :icon-color="app.iconColor"
        :icon="app.icon"
        @select="selectApp(app)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import AppCard from '@/components/Apps/AppCard.vue'
import {
  createDocumentIcon,
  createImageIcon,
  createCodeIcon,
  createCopywritingIcon,
  createLearnIcon,
  createTravelIcon,
} from '@/utils/icons'

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
    icon: createDocumentIcon(28),
  },
  {
    id: '2',
    name: 'AI 绘画',
    description: '创意一键即画',
    source: 'The Agent 官方',
    category: 'recommended',
    iconColor: 'var(--color-secondary)',
    icon: createImageIcon(28),
  },
  {
    id: '3',
    name: '代码助手',
    description: '编程、调试、解释',
    source: 'The Agent 官方',
    category: 'productivity',
    iconColor: '#7C5DFA',
    icon: createCodeIcon(28),
  },
  {
    id: '4',
    name: '文案创作',
    description: '朋友圈、小红书文案',
    source: 'The Agent 官方',
    category: 'creative',
    iconColor: 'var(--color-accent-foreground)',
    icon: createCopywritingIcon(28),
  },
  {
    id: '5',
    name: '学习辅导',
    description: '作业问题、知识点讲解',
    source: 'The Agent 官方',
    category: 'learning',
    iconColor: 'var(--color-primary)',
    icon: createLearnIcon(28),
  },
  {
    id: '6',
    name: '旅行规划师',
    description: '行程规划、攻略推荐',
    source: 'The Agent 官方',
    category: 'life',
    iconColor: 'var(--color-secondary)',
    icon: createTravelIcon(28),
  },
]

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

async function selectApp(app: typeof apps[0]) {
  const session = await chatStore.createSession(app.name)
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
</style>
