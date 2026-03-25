/**
 * @module router
 * @description 路由配置，使用 Hash History 模式（兼容 Electron file:// 协议）。
 *              所有页面以 AppLayout 为根布局，子路由包含：
 *              / (首页) | /apps (应用广场) | /chat/:id (对话页) | /settings (设置页)
 * @layer routing
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/components/Layout/AppLayout.vue'
import Home from '@/views/Home.vue'
import Chat from '@/views/Chat.vue'
import Apps from '@/views/Apps.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
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

export default router
