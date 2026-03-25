<!--
  @component Chat (view)
  @description 对话页面，路由：/chat/:id。
               展示当前会话的消息列表（用户消息右对齐 + 蓝绿气泡，AI 消息左对齐 + 灰色气泡）。
               空状态时显示引导提示（"开始对话"）。
               底部挂载 ChatInput，提交后追加用户消息到 chatStore，并模拟 AI 回复（1s 延迟）。
               TODO：替换模拟回复逻辑为真实 AI API 调用（接入 agentStore）。
  @layer view
-->
<template>
  <div class="chat-view">
    <!-- Messages -->
    <div class="messages-container">
      <div v-if="messages.length === 0" class="messages-empty">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 class="empty-title">开始对话</h2>
          <p class="empty-desc">在下方输入你的问题，AI 会为你解答</p>
        </div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            <div v-if="message.role === 'user'" class="user-avatar">
              <span>U</span>
            </div>
            <div v-else class="ai-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div class="message-content">
            <p class="message-text">{{ message.content }}</p>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="chat-input-wrapper">
      <ChatInput @submit="handleSubmit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatInput from '@/components/Chat/ChatInput.vue'
import { useChatStore, type Message } from '@/stores/chat'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()

const sessionId = computed(() => route.params.id as string)
// 统一以路由 ID 为准查找会话，避免 currentSessionId 与 URL 不同步
const session = computed(() => chatStore.sessions.find(s => s.id === sessionId.value))
const messages = computed(() => session.value?.messages ?? [])

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleSubmit(input: string, options: { deepThink: boolean; webSearch: boolean; model: string }) {
  if (!sessionId.value) return

  // Add user message
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input,
    timestamp: Date.now(),
  }
  chatStore.addMessage(sessionId.value, userMessage)

  // TODO: Send to AI and get response
  // For now, add a mock response
  setTimeout(() => {
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `这是一个模拟回复。你问了："${input}"\n\n（深度思考：${options.deepThink}, 联网搜索：${options.webSearch}, 模型：${options.model}）`,
      timestamp: Date.now(),
    }
    chatStore.addMessage(sessionId.value, aiMessage)
  }, 1000)
}

// 处理来自首页"推荐问题"点击的初始消息（通过路由 query.q 传递）
onMounted(() => {
  const q = route.query.q
  if (q && typeof q === 'string') {
    handleSubmit(q, { deepThink: false, webSearch: false, model: 'default' })
    // 清除 query 参数，避免刷新页面重复发送
    router.replace({ name: 'chat', params: { id: sessionId.value } })
  }
})
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.messages-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: var(--color-primary)/10;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.empty-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.empty-desc {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-muted-foreground);
}

/* Messages List */
.messages-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message {
  display: flex;
  gap: 16px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-foreground);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 14px 18px;
  border-radius: var(--radius-xl);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.message.assistant .message-text {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
}

.message.user .message-text {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.message-time {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  padding: 0 4px;
}

/* Chat Input Wrapper */
.chat-input-wrapper {
  padding-top: 16px;
}
</style>
