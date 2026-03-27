/**
 * @module api/settings/index
 * @description 获取用户设置 API
 *              GET /api/settings
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, createError } from 'h3'
import { db, userSettings } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  // 查找用户设置
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, payload.userId))
    .limit(1)

  const settings = result[0]

  if (!settings) {
    // 如果没有设置记录，返回默认设置
    return {
      language: 'system',
      theme: 'system',
      customModelConfigs: [],
      enabledModels: [],
      defaultModel: '',
    }
  }

  // 返回设置
  return {
    language: settings.language,
    theme: settings.theme,
    customModelConfigs: settings.customModelConfigs
      ? JSON.parse(settings.customModelConfigs)
      : [],
    enabledModels: settings.enabledModels
      ? JSON.parse(settings.enabledModels)
      : [],
    defaultModel: settings.defaultModel || '',
    updatedAt: settings.updatedAt.getTime(),
  }
})