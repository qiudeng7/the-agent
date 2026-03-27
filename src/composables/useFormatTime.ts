/**
 * @module composables/useFormatTime
 * @description 时间格式化 composable。
 *              提供多种时间格式化函数。
 *              只依赖 Vue，与项目其他部分解耦。
 * @layer composables
 */
import { ref, watch, onUnmounted } from 'vue'

export interface UseFormatTimeOptions {
  /** 语言/地区，默认 'zh-CN' */
  locale?: string
  /** 时间格式选项 */
  timeOptions?: Intl.DateTimeFormatOptions
  /** 日期格式选项 */
  dateOptions?: Intl.DateTimeFormatOptions
}

/**
 * 时间格式化工具
 * @param options 配置选项
 */
export function useFormatTime(options: UseFormatTimeOptions = {}) {
  const {
    locale = 'zh-CN',
    timeOptions = { hour: '2-digit', minute: '2-digit' },
    dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
  } = options

  /**
   * 格式化时间戳为时间字符串（如 14:30）
   */
  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(locale, timeOptions)
  }

  /**
   * 格式化时间戳为日期字符串（如 2024/01/15）
   */
  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(locale, dateOptions)
  }

  /**
   * 格式化时间戳为完整日期时间
   */
  function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(locale, {
      ...dateOptions,
      ...timeOptions,
    })
  }

  /**
   * 格式化为相对时间（如 "刚刚"、"5分钟前"）
   */
  function formatRelative(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return formatDate(timestamp)
    }
  }

  /**
   * 格式化时长（如 "1小时30分钟"）
   */
  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      const remainMinutes = minutes % 60
      return remainMinutes > 0 ? `${hours}小时${remainMinutes}分钟` : `${hours}小时`
    } else if (minutes > 0) {
      return `${minutes}分钟`
    } else {
      return `${seconds}秒`
    }
  }

  return {
    formatTime,
    formatDate,
    formatDateTime,
    formatRelative,
    formatDuration,
  }
}

/**
 * 实时更新的时钟
 */
export function useLiveClock(options: UseFormatTimeOptions & { interval?: number } = {}) {
  const { interval = 1000, ...formatOptions } = options
  const { formatTime, formatDate, formatDateTime } = useFormatTime(formatOptions)

  const now = ref(Date.now())
  let timer: number | null = null

  function tick() {
    now.value = Date.now()
  }

  function start() {
    if (timer === null) {
      timer = window.setInterval(tick, interval)
    }
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const displayTime = ref('')
  const displayDate = ref('')
  const displayDateTime = ref('')

  watch(now, () => {
    displayTime.value = formatTime(now.value)
    displayDate.value = formatDate(now.value)
    displayDateTime.value = formatDateTime(now.value)
  }, { immediate: true })

  onUnmounted(stop)

  return {
    now,
    displayTime,
    displayDate,
    displayDateTime,
    start,
    stop,
  }
}