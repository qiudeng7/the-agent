/**
 * @module claude-installer/types
 * @description Claude Code 安装器类型定义。
 */

/** 支持的平台 */
export type Platform = 'darwin' | 'linux' | 'win32'

/** 支持的架构 */
export type Arch = 'x64' | 'arm64'

/** 安装结果 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean
  /** Claude 可执行文件路径 */
  claudePath?: string
  /** 错误信息 */
  error?: string
  /** 安装方式 */
  method?: 'existing' | 'npm' | 'fnm'
}

/** 安装选项 */
export interface InstallOptions {
  /** 是否使用国内镜像 */
  useChinaMirror?: boolean
  /** npm 镜像源 */
  npmRegistry?: string
  /** fnm node 镜像源 */
  fnmMirror?: string
  /** 安装进度回调 */
  onProgress?: (message: string) => void
}

/** 默认安装选项 */
export const DEFAULT_OPTIONS: InstallOptions = {
  useChinaMirror: true,
  npmRegistry: 'https://registry.npmmirror.com',
  fnmMirror: 'https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/',
}

/** FNM 下载地址 */
export const FNM_DOWNLOAD_URLS: Record<Platform, string> = {
  darwin: 'https://v6.gh-proxy.org/https://github.com/Schniz/fnm/releases/download/v1.39.0/fnm-macos.zip',
  linux: 'https://v6.gh-proxy.org/https://github.com/Schniz/fnm/releases/download/v1.39.0/fnm-linux.zip',
  win32: 'https://v6.gh-proxy.org/https://github.com/Schniz/fnm/releases/download/v1.39.0/fnm-windows.zip',
}