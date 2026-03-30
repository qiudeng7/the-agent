/**
 * @module utils/rate-limit
 * @description 速率限制工具。
 *              使用内存存储实现简单的 IP 速率限制。
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

interface RateLimitOptions {
  /** 时间窗口（毫秒），默认 60 秒 */
  windowMs?: number
  /** 窗口内最大请求次数，默认 5 */
  max?: number
  /** 成功响应后的冷却时间（毫秒），默认 0 */
  cooldownMs?: number
}

const store = new Map<string, RateLimitEntry>()
const cooldownStore = new Map<string, number>()

/**
 * 检查是否超过速率限制。
 * @param key 限制键（通常是 IP 地址）
 * @param options 限制选项
 * @returns 是否允许请求，以及剩余等待时间
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {},
): { allowed: boolean; retryAfter?: number } {
  const { windowMs = 60000, max = 5, cooldownMs = 0 } = options

  const now = Date.now()

  // 检查冷却期
  const cooldownEnd = cooldownStore.get(key)
  if (cooldownEnd && now < cooldownEnd) {
    return { allowed: false, retryAfter: Math.ceil((cooldownEnd - now) / 1000) }
  }

  // 获取或创建条目
  let entry = store.get(key)

  if (!entry || now - entry.firstRequest > windowMs) {
    // 新窗口
    entry = { count: 1, firstRequest: now }
    store.set(key, entry)
    return { allowed: true }
  }

  // 现有窗口内
  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.firstRequest + windowMs - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

/**
 * 记录成功响应（用于设置冷却期）。
 * @param key 限制键
 * @param cooldownMs 冷却时间
 */
export function recordSuccess(key: string, cooldownMs: number = 0): void {
  if (cooldownMs > 0) {
    cooldownStore.set(key, Date.now() + cooldownMs)
  }
}

/**
 * 清理过期条目（可定期调用）。
 */
export function cleanupExpired(): void {
  const now = Date.now()
  const maxAge = 120000 // 2 分钟

  for (const [key, entry] of store.entries()) {
    if (now - entry.firstRequest > maxAge) {
      store.delete(key)
    }
  }

  for (const [key, cooldownEnd] of cooldownStore.entries()) {
    if (now > cooldownEnd) {
      cooldownStore.delete(key)
    }
  }
}

// 定期清理过期条目（每分钟）
setInterval(cleanupExpired, 60000)