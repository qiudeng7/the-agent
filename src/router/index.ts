/**
 * @module router
 * @description 路由配置，使用 Hash History 模式（兼容 Electron file:// 协议）。
 *              所有页面以 AppLayout 为根布局，子路由包含：
 *              / (首页) | /apps (应用广场) | /chat/:id (对话页) | /settings (设置页)
 *              登录页面独立布局：
 *              /login | /register
 * @layer routing
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/components/Layout/AppLayout.vue'
import Home from '@/views/Home.vue'
import Chat from '@/views/Chat.vue'
import Apps from '@/views/Apps.vue'
import Settings from '@/views/Settings.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // 登录/注册页面（独立布局）
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
    // 主应用（需要登录）
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: Home,
        },
        {
          path: 'apps',
          name: 'apps',
          component: Apps,
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
  ],
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 如果有 token 但没有用户信息，尝试初始化
  if (authStore.token && !authStore.user) {
    await authStore.init()
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

  next()
})

export default router