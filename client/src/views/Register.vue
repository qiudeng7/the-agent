<!--
  @component Register (view)
  @description 注册页面，路由：/register。
               遵循 Organic 设计风格：
               - 柔和的背景色
               - 圆润的表单元素
               - 自然的过渡动画
  @layer view
-->
<template>
  <div class="register-page">
    <!-- Electron 窗口拖动区域 -->
    <div class="window-drag-region"></div>

    <!-- Decorative blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="register-card">
      <div class="card-header">
        <h1 class="title">创建账户</h1>
        <p class="subtitle">开始您的 AI 之旅</p>
      </div>

      <form class="form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="label">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="your@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="label">昵称（可选）</label>
          <input
            v-model="nickname"
            type="text"
            class="input"
            placeholder="您的昵称"
            autocomplete="nickname"
          />
        </div>

        <div class="form-group">
          <label class="label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="至少 6 个字符"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label class="label">确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="再次输入密码"
            required
            autocomplete="new-password"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>注册</span>
        </button>
      </form>

      <div class="card-footer">
        <p>已有账户？</p>
        <router-link to="/login" class="link">登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码至少需要 6 个字符'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  try {
    isLoading.value = true
    error.value = ''
    await authStore.register(
      email.value,
      password.value,
      nickname.value || undefined
    )
    router.push('/')
  } catch (err) {
    error.value = authStore.error || '注册失败，请重试'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: var(--color-background);
}

/* Electron 窗口拖动区域 */
.window-drag-region {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  -webkit-app-region: drag;
  z-index: 100;
}

/* Decorative blobs */
.blob {
  position: absolute;
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
}

.blob-1 {
  width: 350px;
  height: 350px;
  background: var(--color-secondary);
  top: -80px;
  right: -80px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: var(--color-primary);
  bottom: -100px;
  left: -100px;
}

.register-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-lift);
  position: relative;
  z-index: 1;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.subtitle {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--color-muted-foreground);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.input {
  height: 48px;
  padding: 0 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-foreground);
  font-family: var(--font-body);
  font-size: 0.95rem;
  transition: var(--transition-gentle);
}

.input::placeholder {
  color: var(--color-muted-foreground);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(93, 112, 82, 0.15);
}

.error-message {
  padding: 12px 16px;
  background: rgba(168, 84, 72, 0.1);
  border: 1px solid var(--color-destructive);
  border-radius: var(--radius-md);
  color: var(--color-destructive);
  font-size: 0.875rem;
  text-align: center;
}

.btn {
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-gentle);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  box-shadow: 0 4px 20px -2px rgba(93, 112, 82, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 6px 24px -2px rgba(93, 112, 82, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.card-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--color-muted-foreground);
}

.link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
  transition: var(--transition-gentle);
}

.link:hover {
  text-decoration: underline;
}
</style>