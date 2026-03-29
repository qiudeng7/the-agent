/**
 * @module router
 * @description 路由配置，使用 Hash History 模式（兼容 Electron file:// 协议）。
 *              三端路由分组：
 *              - Agent 端（默认）：/ | /chat/:id | /settings
 *              - Admin 端：/admin/*
 *              - Employee 端：/employee/*
 *              登录/注册页面独立布局
 * @layer routing
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/components/Layout/AppLayout.vue'
import AdminLayout from '@/components/Layout/AdminLayout.vue'
import EmployeeLayout from '@/components/Layout/EmployeeLayout.vue'
import Home from '@/views/Home.vue'
import Chat from '@/views/Chat.vue'
import Settings from '@/views/Settings.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
// Admin views
import AdminDashboard from '@/views/admin/Dashboard.vue'
import AdminTasks from '@/views/admin/Tasks.vue'
import AdminApps from '@/views/admin/Apps.vue'
// Employee views
import EmployeeTasks from '@/views/employee/Tasks.vue'
import EmployeeTaskCategory from '@/views/employee/TaskCategory.vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore, type Port } from '@/stores/app'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // ── 登录/注册页面（独立布局） ─────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: { requiresAuth: false },
    },

    // ── Agent 端（默认） ───────────────────────────────────────────────────────
    {
      path: '/',
      component: AppLayout,
      meta: { port: 'agent' as Port },
      children: [
        {
          path: '',
          name: 'home',
          component: Home,
        },
        {
          path: 'chat/:id',
          name: 'chat',
          component: Chat,
        },
        {
          path: 'settings',
          name: 'settings',
          component: Settings,
        },
      ],
    },

    // ── Admin 端 ───────────────────────────────────────────────────────────────
    {
      path: '/admin',
      component: AdminLayout,
      meta: { port: 'admin' as Port, requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/dashboard',
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboard,
        },
        {
          path: 'tasks',
          name: 'admin-tasks',
          component: AdminTasks,
        },
        {
          path: 'apps',
          name: 'admin-apps',
          component: AdminApps,
        },
      ],
    },

    // ── Employee 端 ────────────────────────────────────────────────────────────
    {
      path: '/employee',
      component: EmployeeLayout,
      meta: { port: 'employee' as Port },
      children: [
        {
          path: '',
          redirect: '/employee/tasks',
        },
        {
          path: 'tasks',
          name: 'employee-tasks',
          component: EmployeeTasks,
        },
        {
          path: 'tasks/:category',
          name: 'employee-task-category',
          component: EmployeeTaskCategory,
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const appStore = useAppStore()

  // 如果有 token 但没有用户信息，尝试初始化
  if (authStore.token && !authStore.user) {
    try {
      await authStore.init()
    } catch (err) {
      console.error('[Router] Auth init failed:', err)
      // init 失败时会自动 logout，继续导航
    }
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    // 未登录，跳转到登录页
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // 已登录但访问登录/注册页，跳转到首页
  if ((to.name === 'login' || to.name === 'register') && authStore.isLoggedIn) {
    next({ name: 'home' })
    return
  }

  // 检查端权限
  const port = to.meta.port as Port | undefined
  if (port && !appStore.availablePorts.includes(port)) {
    // 无权限访问该端，跳转到默认端
    console.warn(`[Router] Port "${port}" is not available for user`)
    next({ name: 'home' })
    return
  }

  // Admin 端额外检查
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    // 非 admin 用户访问 admin 端，跳转到首页
    console.warn('[Router] Admin access required')
    next({ name: 'home' })
    return
  }

  // 更新当前端状态
  if (port) {
    appStore.detectPortFromPath(to.path)
  }

  next()
})

export default router