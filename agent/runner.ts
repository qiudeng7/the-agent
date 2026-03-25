/**
 * @module agent/runner
 * @description AgentRunner — 连接 provider、tool registry、transport 的执行器。
 *
 *              职责：
 *              1. 监听 transport.onRun() 触发的任务请求
 *              2. 从 IToolRegistry 构建 toolExecutor，注入 AgentRunOptions
 *              3. 调用 provider.run() 驱动 agentic loop
 *              4. 将产出的每条 AgentEvent 通过 transport.send() 推送给外部
 *              5. 监听 transport.onAbort()，转发给 provider.abort()
 *
 *              不含任何 LLM 或通信细节，可搭配任意 provider / transport 使用。
 */

import type { AgentRunOptions } from '#agent/types'
import type { IAgentProvider } from '#agent/interfaces/provider'
import type { IToolRegistry, ToolContext } from '#agent/interfaces/tool'
import type { IAgentTransport } from '#agent/interfaces/transport'

export class AgentRunner {
  constructor(
    private readonly provider: IAgentProvider,
    private readonly registry: IToolRegistry,
    private readonly transport: IAgentTransport,
  ) {}

  /**
   * 启动 runner，开始监听 transport 事件。
   * @returns cleanup 函数，调用后停止监听
   */
  start(): () => void {
    const stopRun = this.transport.onRun((options) => {
      // 异步执行，不阻塞 transport 事件循环
      void this._handleRun(options)
    })

    const stopAbort = this.transport.onAbort((taskId) => {
      this.provider.abort(taskId)
    })

    return () => {
      stopRun()
      stopAbort()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部
  // ─────────────────────────────────────────────────────────────────────────

  private async _handleRun(options: AgentRunOptions): Promise<void> {
    const { taskId } = options

    // 注入工具执行器
    const withExecutor: AgentRunOptions = {
      ...options,
      toolExecutor: (name, input, tid, signal) =>
        this._executeTool(name, input, tid, signal),
    }

    try {
      for await (const event of this.provider.run(withExecutor)) {
        this.transport.send(event)
      }
    } catch (err) {
      // provider 内部应 yield ErrorEvent 而非 throw，此处作为兜底
      this.transport.send({
        type: 'error',
        taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  private async _executeTool(
    name: string,
    input: Record<string, unknown>,
    taskId: string,
    signal?: AbortSignal,
  ) {
    const tool = this.registry.get(name)
    if (!tool) {
      return { content: `Tool "${name}" not registered`, isError: true }
    }

    const context: ToolContext = { taskId, signal }

    try {
      return await tool.execute(input, context)
    } catch (err) {
      return {
        content: err instanceof Error ? err.message : String(err),
        isError: true,
      }
    }
  }
}
