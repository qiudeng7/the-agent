<!--
  @component NotFound
  @description 404 页面，当路由不存在时显示。
  @layer view
-->
<template>
  <div class="not-found">
    <div class="content">
      <div class="error-code">404</div>
      <h1 class="title">页面不存在</h1>
      <p class="description">您访问的页面不存在或已被移除</p>
      <button class="back-btn" @click="goBack">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push({ name: 'home' })
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--color-background);
}

.content {
  text-align: center;
  padding: 40px;
}

.error-code {
  font-size: 8rem;
  font-weight: 700;
  color: var(--color-muted-foreground);
  line-height: 1;
  font-family: var(--font-heading);
}

.title {
  font-size: 1.5rem;
  color: var(--color-foreground);
  margin: 20px 0 10px;
  font-family: var(--font-heading);
}

.description {
  font-size: 0.95rem;
  color: var(--color-muted-foreground);
  margin-bottom: 30px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-gentle);
}

.back-btn:hover {
  opacity: 0.9;
}
</style>