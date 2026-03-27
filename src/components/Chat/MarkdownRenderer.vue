<!--
  @component MarkdownRenderer
  @description 实时 Markdown 渲染组件。
               支持流式输入时的增量渲染，处理代码块、列表、链接等常见元素。
               使用 marked 库解析，配合 CSS 样式实现美化。
  @layer component
-->
<template>
  <div class="markdown-content" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

// 配置 marked 选项
marked.setOptions({
  breaks: true, // 支持 GFM 换行
  gfm: true, // GitHub Flavored Markdown
})

const renderedHtml = computed(() => {
  if (!props.content) return ''
  // 对于流式输入，可能存在未闭合的代码块
  // marked 会自动处理这种情况
  return marked.parse(props.content) as string
})
</script>

<style>
.markdown-content {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.6;
  word-break: break-word;
}

/* 段落 */
.markdown-content p {
  margin: 0 0 1em 0;
}

.markdown-content p:last-child {
  margin-bottom: 0;
}

/* 代码块 */
.markdown-content pre {
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.markdown-content code {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.8125rem;
}

/* 行内代码 */
.markdown-content :not(pre) > code {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

/* 列表 */
.markdown-content ul,
.markdown-content ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-content li {
  margin: 0.25em 0;
}

.markdown-content li > p {
  margin: 0;
}

/* 链接 */
.markdown-content a {
  color: var(--color-primary);
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

/* 标题 */
.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  margin: 1em 0 0.5em 0;
  line-height: 1.3;
}

.markdown-content h1 { font-size: 1.5em; }
.markdown-content h2 { font-size: 1.25em; }
.markdown-content h3 { font-size: 1.1em; }
.markdown-content h4 { font-size: 1em; }

/* 引用块 */
.markdown-content blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--color-muted-foreground);
}

.markdown-content blockquote p {
  margin: 0;
}

/* 分隔线 */
.markdown-content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

/* 表格 */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
}

.markdown-content th {
  background: var(--color-muted);
  font-weight: 600;
}

/* 强调 */
.markdown-content strong {
  font-weight: 600;
}

.markdown-content em {
  font-style: italic;
}

/* 删除线 */
.markdown-content del {
  text-decoration: line-through;
  color: var(--color-muted-foreground);
}
</style>