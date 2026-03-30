/**
 * @module error-handler
 * @description 全局错误处理器
 *              捕获所有未处理的错误并返回详细信息
 */
import type { NitroErrorHandler } from 'nitro/types'
import type { H3Event } from 'h3'

const errorHandler: NitroErrorHandler = (error, event) => {
  // 将 HTTPEvent 转换为 H3Event 以访问完整属性
  const h3Event = event as H3Event

  // 记录错误到控制台
  console.error('[API Error]', {
    url: h3Event.url?.pathname + h3Event.url?.search || h3Event.path,
    method: h3Event.req?.method,
    error: error.message,
    stack: error.stack,
  })

  // 返回详细错误信息
  const statusCode = error.statusCode || 500
  const responseBody = {
    success: false,
    error: error.message || 'Internal Server Error',
    statusCode,
    // 只在生产环境显示堆栈的前几行（方便调试）
    ...(process.env.NODE_ENV !== 'production' && {
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    }),
  }

  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default errorHandler