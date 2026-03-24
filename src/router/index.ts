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
