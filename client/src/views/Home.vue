<!--
  @component Home (view)
  @description 应用首页，路由：/（根路径）。
               包含：
               - 个性化问候语（用户姓名）
               - 快捷功能卡片：创作文字、生成图片、分析问题、编程帮助
               - 推荐问题列表（点击直接创建会话并跳转对话页）
               - 底部 ChatInput 输入框（提交后创建会话并跳转 /chat/:id）
               图标通过 utils/icons.ts 工厂函数生成，以 <component :is="icon" /> 渲染。
  @layer view
-->
<template>
  <div class="welcome">
    <!-- Greeting -->
    <div class="greeting">
      <h1 class="greeting-title">Hi，{{ userName }}</h1>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button
        v-for="(action, index) in actions"
        :key="index"
        class="action-card"
        @click="handleAction(action)"
      >
        <div class="action-icon" :style="{ background: action.color }">
          <component :is="action.icon" />
        </div>
        <div class="action-content">
          <h3 class="action-title">{{ action.title }}</h3>
          <p class="action-desc">{{ action.description }}</p>
        </div>
      </button>
    </div>

    <!-- Suggestions -->
    <div class="suggestions">
      <h2 class="suggestions-title">你可以这样问</h2>
      <div class="suggestions-grid">
        <button
          v-for="(suggestion, index) in suggestionList"
          :key="index"
          class="suggestion-card"
          @click="handleSuggestion(suggestion)"
        >
          <div class="suggestion-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span class="suggestion-text">{{ suggestion }}</span>
        </button>
      </div>
    </div>

    <!-- Chat Input -->
    <ChatInput ref="chatInputRef" @submit="handleSubmit" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ChatInput from '@/components/Chat/ChatInput.vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { ref, computed } from 'vue'
import {
  createWritingIcon,
  createImageIcon,
  createAnalyzeIcon,
  createCodeIcon,
} from '@/utils/icons'
import type { PermissionMode } from '#claude/types'

const router = useRouter()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)

// 获取当前选中的模型（优先从 ChatInput 读取，否则用默认模型）
const currentModel = computed(() =>
  chatInputRef.value?.selectedModel || settingsStore.defaultModel
)

const userName = '秋灯'

const actions = [
  {
    title: '创作文字',
    description: '文案、故事、诗歌',
    icon: createWritingIcon(),
    color: 'var(--color-primary)',
  },
  {
    title: '生成图片',
    description: '创意绘画、设计',
    icon: createImageIcon(),
    color: 'var(--color-secondary)',
  },
  {
    title: '分析问题',
    description: '逻辑推理、总结',
    icon: createAnalyzeIcon(),
    color: 'var(--color-accent-foreground)',
  },
  {
    title: '编程帮助',
    description: '代码、调试、解释',
    icon: createCodeIcon(),
    color: '#7C5DFA',
  },
]

const suggestionList = [
  '为什么鳄鱼会流泪？',
  '如果人类平均寿命延长到 150 岁，什么职业会最先淘汰？',
  '如果地球突然变成立方体，人类能适应吗？',
  '解释一下量子纠缠',
]

async function handleAction(action: typeof actions[0]) {
  const session = await chatStore.createSession(action.title)
  // 设置会话的当前模型
  if (currentModel.value) {
    chatStore.setSessionModel(session.id, currentModel.value)
  }
  router.push(`/chat/${session.id}`)
}

async function handleSuggestion(text: string) {
  const session = await chatStore.createSession(text)
  // 设置会话的当前模型
  if (currentModel.value) {
    chatStore.setSessionModel(session.id, currentModel.value)
  }
  // 通过 query 传递问题文本和选中的模型
  router.push({
    name: 'chat',
    params: { id: session.id },
    query: { q: text, model: currentModel.value },
  })
}

async function handleSubmit(input: string, options: { model: string; permissionMode: PermissionMode }) {
  // 保存用户选择的权限模式，确保 Chat 页面能使用正确的值
  settingsStore.setPermissionMode(options.permissionMode)

  const session = await chatStore.createSession(input)
  // 设置会话的当前模型
  if (options.model) {
    chatStore.setSessionModel(session.id, options.model)
  }
  // 通过 query 传递消息和模型
  router.push({
    name: 'chat',
    params: { id: session.id },
    query: { q: input, model: options.model },
  })
}
</script>

<style scoped>
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 40px 24px;
}

/* Greeting */
.greeting {
  text-align: center;
  margin-bottom: 40px;
}

.greeting-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
  color: var(--color-foreground);
  letter-spacing: -0.02em;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto 48px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-background);
  cursor: pointer;
  transition: var(--transition-natural);
  box-shadow: var(--shadow-soft);
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: var(--transition-gentle);
}

.action-card:hover .action-icon {
  transform: scale(1.05);
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.action-title {
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.action-desc {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-muted-foreground);
  line-height: 1.5;
}

/* Suggestions */
.suggestions {
  max-width: 900px;
  width: 100%;
  margin: 0 auto 32px;
}

.suggestions-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  margin-bottom: 16px;
  text-align: center;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.suggestion-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-muted);
  cursor: pointer;
  transition: var(--transition-gentle);
  text-align: left;
}

.suggestion-card:hover {
  border-color: var(--color-primary);
  background: var(--color-muted);
}

.suggestion-icon {
  width: 36px;
  height: 36px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
}

.suggestion-text {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-foreground);
  line-height: 1.4;
}
</style>
