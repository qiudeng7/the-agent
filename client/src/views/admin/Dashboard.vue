<!--
  @component AdminDashboard
  @description 管理端仪表盘页面（占位）
  @layer view
-->
<template>
  <div class="admin-dashboard">
    <header class="page-header">
      <h1>仪表盘</h1>
      <p class="subtitle">概览系统和任务状态</p>
    </header>

    <div class="placeholder">
      <div class="placeholder-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <h2>功能开发中</h2>
      <p>仪表盘功能正在开发中，敬请期待</p>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 40px;
}

.page-header h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--color-muted-foreground);
}

.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-muted)/30;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
  margin-bottom: 24px;
}

.placeholder h2 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.placeholder p {
  font-size: 0.9rem;
  color: var(--color-muted-foreground);
}
</style>