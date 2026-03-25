const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const clipboardy = require('clipboardy').default;

// Agent SDK 文档页面列表
const DOC_PAGES = [
  // 基础页面
  { slug: 'overview', title: 'Overview' },
  { slug: 'quickstart', title: 'Quickstart' },
  { slug: 'agent-loop', title: 'How the agent loop works' },

  // Core concepts
  { slug: 'claude-code-features', title: 'Use Claude Code features' },
  { slug: 'sessions', title: 'Work with sessions' },

  // Guides
  { slug: 'streaming-vs-single-mode', title: 'Streaming Input' },
  { slug: 'streaming-output', title: 'Stream responses in real-time' },
  { slug: 'mcp', title: 'Connect MCP servers' },
  { slug: 'custom-tools', title: 'Define custom tools' },
  { slug: 'tool-search', title: 'Tool search' },
  { slug: 'permissions', title: 'Handling Permissions' },
  { slug: 'user-input', title: 'User approvals and input' },
  { slug: 'hooks', title: 'Control execution with hooks' },
  { slug: 'file-checkpointing', title: 'File checkpointing' },
  { slug: 'structured-outputs', title: 'Structured outputs in the SDK' },
  { slug: 'hosting', title: 'Hosting the Agent SDK' },
  { slug: 'secure-deployment', title: 'Securely deploying AI agents' },
  { slug: 'modifying-system-prompts', title: 'Modifying system prompts' },
  { slug: 'subagents', title: 'Subagents in the SDK' },
  { slug: 'slash-commands', title: 'Slash Commands in the SDK' },
  { slug: 'skills', title: 'Agent Skills in the SDK' },
  { slug: 'cost-tracking', title: 'Track cost and usage' },
  { slug: 'todo-tracking', title: 'Todo Lists' },
  { slug: 'plugins', title: 'Plugins in the SDK' },

  // SDK references
  { slug: 'typescript', title: 'TypeScript SDK' },
  { slug: 'typescript-v2-preview', title: 'TypeScript V2 (preview)' },
  { slug: 'python', title: 'Python SDK' },
  { slug: 'migration-guide', title: 'Migration Guide' },
];

const BASE_URL = 'https://platform.claude.com/docs/en/agent-sdk';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'claude-agent-sdk-docs');

// 复制文本到剪贴板 (使用 clipboardy)
function copyToClipboard(text) {
  clipboardy.writeSync(text);
}

// 从剪贴板读取文本
function pasteFromClipboard() {
  try {
    return clipboardy.readSync() || '';
  } catch (e) {
    console.log(`    读取剪贴板失败：${e.message}`);
    return '';
  }
}

// 保存内容到文件
function saveToFile(filename, content) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`  ✓ 已保存：${filename}`);
}

// 提取页面标题和内容
async function extractPageContent(page) {
  try {
    // 获取页面主要内容
    const content = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;

      // 获取标题
      const h1 = main.querySelector('h1');
      const title = h1 ? h1.textContent.trim() : 'Untitled';

      // 获取所有文本内容
      const textContent = main.textContent || '';

      return { title, textContent };
    });

    return content;
  } catch (e) {
    console.log(`  提取内容失败：${e.message}`);
    return null;
  }
}

// 爬取单个页面
async function crawlPage(browser, pageConfig) {
  const url = `${BASE_URL}/${pageConfig.slug}`;
  console.log(`\n正在爬取：${pageConfig.title} (${url})`);

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // 导航到页面
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待页面主要内容加载
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 查找复制按钮 - 使用文本匹配
    const copyButtons = await page.locator('button').filter({ hasText: /copy/i }).all();
    console.log(`  找到 ${copyButtons.length} 个包含"copy"的按钮`);

    // 尝试点击"Copy page"按钮
    let clicked = false;
    for (const btn of copyButtons) {
      const text = await btn.textContent();
      if (text && text.toLowerCase().includes('copy page')) {
        console.log(`  点击复制按钮："${text.trim()}"`);
        await btn.click();
        clicked = true;
        break;
      }
    }

    // 等待复制完成（网站需要时间写入剪贴板）
    console.log('  等待剪贴板更新...');
    await page.waitForTimeout(3000);

    // 从剪贴板读取内容
    let clipboardContent = pasteFromClipboard();
    console.log(`  剪贴板内容长度：${clipboardContent.length}`);

    // 如果第一次读取失败，再试一次
    if (!clipboardContent || clipboardContent.length < 500) {
      console.log('  再次等待并重试读取...');
      await page.waitForTimeout(2000);
      clipboardContent = pasteFromClipboard();
      console.log(`  第二次读取长度：${clipboardContent.length}`);
    }

    if (clipboardContent && clipboardContent.length > 500) {
      // 保存为 markdown 文件
      const filename = `${pageConfig.slug}.md`;
      saveToFile(filename, clipboardContent);
      console.log(`  ✓ 成功保存 ${clipboardContent.length} 字节`);
      await context.close();
      return;
    }

    console.log('  剪贴板内容不足，使用回退方案...');
    // 回退方案：直接提取页面内容
    const content = await extractPageContent(page);
    if (content) {
      const filename = `${pageConfig.slug}.md`;
      saveToFile(filename, `# ${content.title}\n\n${content.textContent}`);
    }

  } catch (error) {
    console.error(`  ✗ 爬取失败：${error.message}`);
    // 截图调试
    await page.screenshot({ path: path.join(OUTPUT_DIR, `error-${pageConfig.slug}.png`) });
    console.log(`  已保存错误截图：error-${pageConfig.slug}.png`);
  } finally {
    await context.close();
  }
}

// 主函数
async function main(limitPages = null) {
  console.log('='.repeat(60));
  console.log('Claude Agent SDK 文档爬虫');
  console.log('='.repeat(60));
  console.log(`输出目录：${OUTPUT_DIR}`);

  const pagesToCrawl = limitPages ? DOC_PAGES.slice(0, limitPages) : DOC_PAGES;
  console.log(`页面总数：${pagesToCrawl.length}${limitPages ? ` (测试模式，仅前 ${limitPages} 个)` : ''}`);

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 启动浏览器
  console.log('\n启动浏览器...');
  const browser = await chromium.launch({
    headless: false, // 使用有头模式以便观察
    args: ['--disable-blink-features=AutomationControlled'],
  });

  // 爬取所有页面
  let successCount = 0;
  for (const pageConfig of pagesToCrawl) {
    await crawlPage(browser, pageConfig);
    successCount++;
    console.log(`进度：${successCount}/${DOC_PAGES.length}`);

    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log(`爬取完成！成功：${successCount}/${pagesToCrawl.length}`);
  console.log('='.repeat(60));
}

// 运行爬虫 - 运行所有页面
main().catch(console.error);
