/**
 * @module utils/icons
 * @description SVG 图标组件工厂函数，供 <component :is="icon" /> 动态渲染。
 *              每个函数接受可选 size 参数（默认 24），返回包含 template 字符串的 Vue 组件对象。
 *              注意：运行时 template 编译需要完整版 Vue（含编译器），Vite 开发模式下已自动包含。
 * @layer utils
 */

/** 创作文字图标（首页快捷操作 - "创作文字"） */
export function createWritingIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/>
        <circle cx="11" cy="11" r="2"/>
      </svg>
    `,
  }
}

/** 图片/绘画图标（首页"生成图片" + 应用广场"AI 绘画"） */
export function createImageIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    `,
  }
}

/** 分析/推理图标（首页"分析问题"） */
export function createAnalyzeIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    `,
  }
}

/** 代码/编程图标（首页"编程帮助" + 应用广场"代码助手"） */
export function createCodeIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    `,
  }
}

/** 文档/阅读图标（应用广场"AI 阅读助手"） */
export function createDocumentIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    `,
  }
}

/** 文案创作图标（应用广场"文案创作"） */
export function createCopywritingIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      </svg>
    `,
  }
}

/** 学习/书籍图标（应用广场"学习辅导"） */
export function createLearnIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    `,
  }
}

/** 旅行/地球图标（应用广场"旅行规划师"） */
export function createTravelIcon(size = 24) {
  return {
    template: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    `,
  }
}
