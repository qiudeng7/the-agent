/**
 * @module stores/app
 * @description 应用全局状态管理（Pinia store）。
 *              管理当前端（agent/admin/employee）、可用端列表。
 *              根据用户角色动态计算可访问的端。
 * @layer state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

export type Port = 'agent' | 'admin' | 'employee'

export interface PortInfo {
  id: Port
  label: string
  icon: string
  path: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量配置
// ─────────────────────────────────────────────────────────────────────────────

/** 端信息配置 */
export const PORTS: Record<Port, PortInfo> = {
  agent: {
    id: 'agent',
    label: 'Agent',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    path: '/',
  },
  admin: {
    id: 'admin',
    label: '管理端',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    path: '/admin',
  },
  employee: {
    id: 'employee',
    label: '员工端',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h2v5zm0 4h-2v-2h2v2z',
    path: '/employee',
  },
}

/** 角色对应的端权限 */
const PORT_PERMISSIONS: Record<string, Port[]> = {
  admin: ['agent', 'admin', 'employee'],
  employee: ['agent', 'employee'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Store 定义
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = defineStore('app', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const currentPort = ref<Port>('agent')

  // ── Getters ────────────────────────────────────────────────────────────────

  /** 可用的端列表（根据用户角色计算） */
  const availablePorts = computed<Port[]>(() => {
    const authStore = useAuthStore()
    const role = authStore.user?.role || 'employee'
    return PORT_PERMISSIONS[role] || ['agent']
  })

  /** 可用的端信息列表 */
  const availablePortInfos = computed<PortInfo[]>(() => {
    return availablePorts.value.map((id) => PORTS[id])
  })

  /** 当前端信息 */
  const currentPortInfo = computed<PortInfo>(() => PORTS[currentPort.value])

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * 切换端
   * @param port - 目标端
   * @returns 是否切换成功
   */
  function switchPort(port: Port): boolean {
    if (!availablePorts.value.includes(port)) {
      console.warn(`[AppStore] Port "${port}" is not available for current user`)
      return false
    }
    currentPort.value = port
    return true
  }

  /**
   * 根据路由路径自动检测当前端
   * @param path - 当前路由路径
   */
  function detectPortFromPath(path: string) {
    if (path.startsWith('/admin')) {
      currentPort.value = 'admin'
    } else if (path.startsWith('/employee')) {
      currentPort.value = 'employee'
    } else {
      currentPort.value = 'agent'
    }
  }

  return {
    // State
    currentPort,
    // Getters
    availablePorts,
    availablePortInfos,
    currentPortInfo,
    // Actions
    switchPort,
    detectPortFromPath,
  }
})