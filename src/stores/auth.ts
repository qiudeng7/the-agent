/**
 * @module stores/auth
 * @description 认证状态管理（Pinia store）。
 *              管理登录状态、token、用户信息。
 *              必须登录才能使用应用。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as backend from '@/services/backend'
import { useChatStore } from './chat'
import { useSettingsStore } from './settings'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<backend.User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!token.value)

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * 初始化认证状态（应用启动时调用）
   * 如果有 token，验证并获取用户信息
   */
  async function init() {
    if (!token.value) return false

    try {
      isLoading.value = true
      user.value = await backend.getCurrentUser()

      // 拉取初始数据
      const chatStore = useChatStore()
      const settingsStore = useSettingsStore()

      await Promise.all([
        chatStore.fetchAll(),
        settingsStore.fetch(),
      ])

      return true
    } catch (err) {
      // Token 无效，清除登录状态
      console.error('[Auth] Init failed:', err)
      logout()
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 登录
   */
  async function login(email: string, password: string) {
    try {
      isLoading.value = true
      error.value = null

      const response = await backend.login(email, password)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)

      // 拉取初始数据
      const chatStore = useChatStore()
      const settingsStore = useSettingsStore()

      await Promise.all([
        chatStore.fetchAll(),
        settingsStore.fetch(),
      ])
    } catch (err) {
      if (err instanceof backend.ApiError) {
        error.value = err.message
      } else {
        error.value = '登录失败，请检查网络连接'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 注册
   */
  async function register(email: string, password: string, nickname?: string) {
    try {
      isLoading.value = true
      error.value = null

      const response = await backend.register(email, password, nickname)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)

      // 新用户没有数据，直接完成
    } catch (err) {
      if (err instanceof backend.ApiError) {
        error.value = err.message
      } else {
        error.value = '注册失败，请检查网络连接'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 登出
   */
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')

    // 清空本地缓存
    const chatStore = useChatStore()
    const settingsStore = useSettingsStore()
    chatStore.clear()
    settingsStore.clear()
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  return {
    // State
    token,
    user,
    isLoading,
    error,
    // Getters
    isLoggedIn,
    // Actions
    init,
    login,
    register,
    logout,
    clearError,
  }
})