<!--
  @component Login (view)
  @description 登录页面，路由：/login。
               遵循 Organic 设计风格：
               - 柔和的背景色
               - 圆润的表单元素
               - 自然的过渡动画
  @layer view
-->
<template>
  <div class="login-page">
    <!-- Decorative blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="login-card">
      <div class="card-header">
        <h1 class="title">欢迎回来</h1>
        <p class="subtitle">登录以继续使用</p>
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
          <label class="label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
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
          <span v-else>登录</span>
        </button>
      </form>

      <div class="card-footer">
        <p>还没有账户？</p>
        <router-link to="/register" class="link">注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) return

  try {
    isLoading.value = true
    error.value = ''
    await authStore.login(email.value, password.value)
    // 登录成功后跳转到之前请求的页面或首页
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (err) {
    error.value = authStore.error || '登录失败，请重试'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: var(--color-background);
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
  width: 400px;
  height: 400px;
  background: var(--color-primary);
  top: -100px;
  left: -100px;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: var(--color-secondary);
  bottom: -50px;
  right: -50px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
}

.login-card {
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
  gap: 20px;
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