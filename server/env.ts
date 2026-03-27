/**
 * @module env
 * @description 环境变量类型安全访问
 */
export const env = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
}