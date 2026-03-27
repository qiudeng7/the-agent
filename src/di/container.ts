/**
 * @module di/container
 * @description 依赖注入容器。
 *              管理应用中所有外部依赖的具体实现。
 *
 * 使用方式：
 * 1. 应用启动时调用 initDependencies() 配置依赖
 * 2. Store 中通过 getDependencies() 获取依赖
 * 3. 测试时可以通过 setDependencies() 替换 mock
 *
 * @layer di
 */

import type { IStoreDependencies, IAgentTransport, IStorage, ISystemService } from './interfaces'

/** 全局依赖容器 */
let deps: IStoreDependencies | null = null

/**
 * 初始化依赖容器
 * 应在应用启动时调用
 */
export function initDependencies(dependencies: IStoreDependencies): void {
  deps = dependencies
}

/**
 * 获取依赖容器
 * Store 中使用此函数获取注入的依赖
 */
export function getDependencies(): IStoreDependencies {
  if (!deps) {
    throw new Error(
      '[DI] Dependencies not initialized. Call initDependencies() first.'
    )
  }
  return deps
}

/**
 * 设置依赖容器（用于测试）
 */
export function setDependencies(dependencies: Partial<IStoreDependencies>): void {
  deps = { ...deps, ...dependencies } as IStoreDependencies
}

/**
 * 重置依赖容器（用于测试清理）
 */
export function resetDependencies(): void {
  deps = null
}

// ─────────────────────────────────────────────────────────────────────────────
// 便捷访问函数
// ─────────────────────────────────────────────────────────────────────────────

/** 获取 Agent 传输 */
export function getAgentTransport(): IAgentTransport {
  return getDependencies().agentTransport
}

/** 获取存储服务 */
export function getStorage(): IStorage {
  return getDependencies().storage
}

/** 获取系统服务 */
export function getSystemService(): ISystemService {
  return getDependencies().systemService
}