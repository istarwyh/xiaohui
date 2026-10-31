import { result } from "../../contracts/result"
import { parameters } from "./validation"

export function getCurrentNote(
  current: (signal?: AbortSignal) => Promise<{ data: unknown; revision: string }>,
): WebMCP.ModelContextTool {
  return {
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    name: "get-current-note",
    description:
      "获取用户当前打开笔记的标题、slug、章节和正式引用链接。正文请使用 read-note。首页或列表页请用 search-notes。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute(input, options) {
      return result(async () => {
        parameters(input, [])
        return current(options.signal)
      }, options.signal)
    },
  }
}
