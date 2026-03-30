/**
 * @module error-handler
 * @description 全局错误处理器
 *              捕获所有未处理的错误并返回详细信息
 */
import type { NitroErrorHandler } from 'nitropack/types'

const errorHandler: NitroErrorHandler = (error, event) => {
  // 记录错误到控制台
  console.error('[API Error]', {
    url: event.path,
    method: event.method,
    error: error.message,
    stack: error.stack,
  })

  // 返回详细错误信息
  const statusCode = error.statusCode || 500
  const response = {
    success: false,
    error: error.message || 'Internal Server Error',
    statusCode,
    // 只在生产环境显示堆栈的前几行（方便调试）
    ...(process.env.NODE_ENV !== 'production' && {
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    }),
  }

  event.node.res.statusCode = statusCode
  event.node.res.setHeader('Content-Type', 'application/json')
  event.node.res.end(JSON.stringify(response))
}

export default errorHandler