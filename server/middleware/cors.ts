/**
 * @module server/middleware/cors
 * @description CORS 中间件
 */
import { defineEventHandler, setResponseHeaders, sendNoContent } from 'h3'

export default defineEventHandler((event) => {
  const origin = event.node.req.headers.origin || '*'

  // 设置 CORS 头
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  })

  // 处理 preflight 请求
  if (event.node.req.method === 'OPTIONS') {
    return sendNoContent(event, 204)
  }
})