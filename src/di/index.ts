/**
 * @module di
 * @description 依赖注入模块入口。
 *
 * 导出：
 * - interfaces: 依赖接口定义
 * - container: 依赖容器
 * - providers: 具体实现
 *
 * 使用流程：
 * 1. 应用启动时选择合适的 provider 并初始化
 * 2. Store 中通过 getDependencies() 获取依赖
 * 3. 测试时可以替换依赖为 mock
 *
 * @layer di
 */

// 接口定义
export type {
  IAgentTransport,
  IStorage,
  IThemeDetector,
  ILanguageDetector,
  ISystemService,
  IStoreDependencies,
  StoreInject,
} from './interfaces'

// 容器
export {
  initDependencies,
  getDependencies,
  setDependencies,
  resetDependencies,
  getAgentTransport,
  getStorage,
  getSystemService,
} from './container'

// Electron 实现
export {
  createElectronAgentTransport,
  createLocalStorageProvider,
  createBrowserThemeDetector,
  createBrowserLanguageDetector,
  createElectronSystemService,
  createElectronDependencies,
} from './providers/electron'