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

  // body 可以为空，使用默认值
  const language = body?.language || 'system'
  const theme = body?.theme || 'system'
  const customModelConfigs = body?.customModelConfigs
  const enabledModels = body?.enabledModels
  const defaultModel = body?.defaultModel

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
        language: language || existing.language,
        theme: theme || existing.theme,
        customModelConfigs: customModelConfigs
          ? JSON.stringify(customModelConfigs)
          : existing.customModelConfigs,
        enabledModels: enabledModels
          ? JSON.stringify(enabledModels)
          : existing.enabledModels,
        defaultModel: defaultModel || existing.defaultModel,
        updatedAt: now,
      })
      .where(eq(userSettings.userId, payload.userId))
  } else {
    // 创建新设置
    await db.insert(userSettings).values({
      userId: payload.userId,
      language: language,
      theme: theme,
      customModelConfigs: customModelConfigs
        ? JSON.stringify(customModelConfigs)
        : null,
      enabledModels: enabledModels
        ? JSON.stringify(enabledModels)
        : null,
      defaultModel: defaultModel || null,
      updatedAt: now,
    })
  }

  // 返回更新后的设置
  return {
    language: language || existing?.language || 'system',
    theme: theme || existing?.theme || 'system',
    customModelConfigs: customModelConfigs || [],
    enabledModels: enabledModels || [],
    defaultModel: defaultModel || '',
    updatedAt: now.getTime(),
  }
})