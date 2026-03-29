<!--
  @component AdminDashboard
  @description 管理端仪表盘页面，包含统计概览和快速操作入口
  @layer view
-->
<template>
  <div class="admin-dashboard">
    <!-- Page Header -->
    <header class="page-header">
      <h1>仪表盘</h1>
      <p class="subtitle">管理任务和应用</p>
    </header>

    <!-- Dashboard Stats -->
    <div class="stats-grid">
      <!-- Total Tasks -->
      <div class="stat-card primary">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-label">总任务</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">
            <span class="stat-number">{{ taskStore.total || '--' }}</span>
          </div>
        </div>
      </div>

      <!-- Completed -->
      <div class="stat-card success">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-label">已完成</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">
            <span class="stat-number">{{ taskStore.stats?.byStatus?.done || '--' }}</span>
          </div>
        </div>
      </div>

      <!-- In Progress -->
      <div class="stat-card warning">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-label">进行中</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">
            <span class="stat-number">{{ taskStore.stats?.byStatus?.in_progress || '--' }}</span>
          </div>
        </div>
      </div>

      <!-- Users -->
      <div class="stat-card secondary">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-label">用户</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">
            <span class="stat-number">--</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h2 class="section-title">快速操作</h2>
      <div class="actions-grid">
        <router-link to="/admin/tasks" class="action-card">
          <div class="action-inner">
            <div class="action-content">
              <div class="action-icon primary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div class="action-text">
                <h3>任务管理</h3>
                <p>创建、编辑和管理所有任务</p>
              </div>
            </div>
            <div class="action-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </div>
        </router-link>

        <div class="action-card disabled" title="功能开发中">
          <div class="action-inner">
            <div class="action-content">
              <div class="action-icon secondary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div class="action-text">
                <h3>应用管理</h3>
                <p>查看和管理数据库数据</p>
              </div>
            </div>
            <div class="action-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'

const taskStore = useTaskStore()

onMounted(async () => {
  // 加载任务列表和统计数据
  await taskStore.fetchTasks()
  await taskStore.fetchStats()
})
</script>

<style scoped>
.admin-dashboard {
  flex: 1;
  padding: 40px;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-header h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-foreground);
  letter-spacing: -0.02em;
}

.subtitle {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-muted-foreground);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  position: relative;
  padding: 24px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-lift);
}

.stat-decoration {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 96px;
  height: 96px;
  border-radius: 0 0 0 100%;
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-decoration {
  transform: scale(1.1);
}

.stat-card.primary .stat-decoration {
  background: var(--color-primary)/5;
}

.stat-card.success .stat-decoration {
  background: #10b981/5;
}

.stat-card.warning .stat-decoration {
  background: #f59e0b/5;
}

.stat-card.secondary .stat-decoration {
  background: var(--color-secondary)/5;
}

.stat-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-icon {
  padding: 8px;
  border-radius: var(--radius-full);
  font-size: 20px;
}

.stat-card.primary .stat-icon {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.stat-card.success .stat-icon {
  background: #10b981/10;
  color: #10b981;
}

.stat-card.warning .stat-icon {
  background: #f59e0b/10;
  color: #f59e0b;
}

.stat-card.secondary .stat-icon {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.stat-value {
  display: flex;
  align-items: baseline;
}

.stat-number {
  font-family: var(--font-heading);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-foreground);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-foreground);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 640px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

.action-card {
  display: block;
  padding: 6px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  transition: box-shadow 0.3s ease;
}

.action-card:hover {
  box-shadow: var(--shadow-lift);
}

.action-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-card.disabled:hover {
  box-shadow: var(--shadow-sm);
}

.action-card.disabled .action-arrow {
  display: none;
}

.action-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--color-muted)/30;
  border-radius: calc(var(--radius-xl) - 6px);
  transition: background 0.3s ease;
}

.action-card:hover .action-inner {
  background: var(--color-muted)/50;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon.primary {
  background: var(--color-primary)/10;
  color: var(--color-primary);
}

.action-icon.secondary {
  background: var(--color-secondary)/10;
  color: var(--color-secondary);
}

.action-text h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-foreground);
  margin-bottom: 4px;
}

.action-text p {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
}

.action-arrow {
  color: var(--color-primary);
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(4px);
}
</style>