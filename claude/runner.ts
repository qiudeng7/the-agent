/**
 * @module claude/runner
 * @description ClaudeRunner — 连接 provider 和 transport 的执行器。
 *
 *              职责：
 *              1. 监听 transport.onRun() 触发的任务请求
 *              2. 调用 provider.run() 驱动 SDK query()
 *              3. 将产出的每条 ClaudeEvent 通过 transport.send() 推送给外部
 *              4. 监听 transport.onAbort()，取消正在运行的任务
 *
 *              不含任何 SDK 或通信细节，可搭配任意 transport 使用。
 */

import type { IAgentTransportServer } from '#agent/interfaces/transport'
import type { IClaudeProvider } from './interfaces/provider'
import type { ClaudeRunOptions } from './types'

export class ClaudeRunner {
  constructor(
    private readonly provider: IClaudeProvider,
    private readonly transport: IAgentTransportServer,
  ) {}

  /**
   * 启动 runner，开始监听 transport 事件。
   * @returns cleanup 函数，调用后停止监听
   */
  start(): () => void {
    const stopRun = this.transport.onRun((options: ClaudeRunOptions) => {
      // 异步执行，不阻塞 transport 事件循环
      void this._handleRun(options)
    })

    const stopAbort = this.transport.onAbort((taskId: string) => {
      this.provider.abort(taskId)
    })

    return () => {
      stopRun()
      stopAbort()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：处理任务运行
  // ─────────────────────────────────────────────────────────────────────────

  private async _handleRun(options: ClaudeRunOptions): Promise<void> {
    const { taskId } = options

    try {
      for await (const event of this.provider.run(options)) {
        this.transport.send(event)
      }
    } catch (err) {
      // provider 内部应 yield ClaudeErrorEvent 而非 throw，此处作为兜底
      this.transport.send({
        type: 'error',
        taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}