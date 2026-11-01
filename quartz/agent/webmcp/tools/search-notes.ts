import type { SearchInput } from "../../contracts/notes"
import { AgentError, result } from "../../contracts/result"
import { integer, parameters, text } from "./validation"

export function searchNotes(
  search: (
    input: SearchInput,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; revision: string }>,
): WebMCP.ModelContextTool {
  return {
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    name: "search-notes",
    description: "按关键词搜索晓灰已公开的笔记，返回摘要与正式引用链接。深入阅读请使用 read-note。",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 1, maxLength: 200, description: "要搜索的关键词" },
        topic: { type: "string", description: "一级主题，例如 program、invest、learning" },
        language: { type: "string", enum: ["zh", "en", "all"], description: "文章语言，默认 all" },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "最多返回条数，默认 5" },
      },
    },
    execute(input, options) {
      return result(async () => {
        const p = parameters(input, ["query", "topic", "language", "limit"])
        const language = p.language ?? "all"
        if (language !== "zh" && language !== "en" && language !== "all")
          throw new AgentError("INVALID_INPUT", "language 必须是 zh、en 或 all。")
        return search(
          {
            query: text(p.query, "query", 200),
            topic: p.topic === undefined ? undefined : text(p.topic, "topic", 80),
            language,
            limit: integer(p.limit, "limit", 5, 1, 10),
          },
          options.signal,
        )
      }, options.signal)
    },
  }
}
