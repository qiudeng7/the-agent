/**
 * @module agent/tool-registry
 * @description ToolRegistry — IToolRegistry 的标准实现。
 *              基于 Map 管理工具集合，支持热替换（register 同名工具时覆盖旧实例）。
 */

import type { ITool, IToolRegistry } from '#agent/interfaces/tool'
import type { ToolDefinition } from '#agent/types'

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>()

  register(tool: ITool): void {
    this.tools.set(tool.definition.name, tool)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name)
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition)
  }
}
