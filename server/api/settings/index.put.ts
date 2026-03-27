/**
 * @module api/settings/index.put
 * @description 更新用户设置 API
 *              PUT /api/settings
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, readBody } from 'h3'
import { db, userSettings } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

interface UpdateSettingsBody {
  language?: 'system' | 'zh' | 'ja' | 'en'
  theme?: 'system' | 'light' | 'dark'
  customModelConfigs?: unknown[]
  enabledModels?: string[]
  defaultModel?: string
}

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  const body = await readBody<UpdateSettingsBody>(event)

  // 查找现有设置
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, payload.userId))
    .limit(1)

  const existing = result[0]
  const now = new Date()

  if (existing) {
    // 更新现有设置
    await db
      .update(userSettings)
      .set({
        language: body.language || existing.language,
        theme: body.theme || existing.theme,
        customModelConfigs: body.customModelConfigs
          ? JSON.stringify(body.customModelConfigs)
          : existing.customModelConfigs,
        enabledModels: body.enabledModels
          ? JSON.stringify(body.enabledModels)
          : existing.enabledModels,
        defaultModel: body.defaultModel || existing.defaultModel,
        updatedAt: now,
      })
      .where(eq(userSettings.userId, payload.userId))
  } else {
    // 创建新设置
    await db.insert(userSettings).values({
      userId: payload.userId,
      language: body.language || 'system',
      theme: body.theme || 'system',
      customModelConfigs: body.customModelConfigs
        ? JSON.stringify(body.customModelConfigs)
        : null,
      enabledModels: body.enabledModels
        ? JSON.stringify(body.enabledModels)
        : null,
      defaultModel: body.defaultModel || null,
      updatedAt: now,
    })
  }

  // 返回更新后的设置
  return {
    language: body.language || existing?.language || 'system',
    theme: body.theme || existing?.theme || 'system',
    customModelConfigs: body.customModelConfigs || [],
    enabledModels: body.enabledModels || [],
    defaultModel: body.defaultModel || '',
    updatedAt: now.getTime(),
  }
})