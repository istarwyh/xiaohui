import type { ReadInput } from "../../contracts/notes"
import { result } from "../../contracts/result"
import { integer, parameters, text } from "./validation"

export function readNote(
  read: (input: ReadInput, signal?: AbortSignal) => Promise<{ data: unknown; revision: string }>,
): WebMCP.ModelContextTool {
  return {
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    name: "read-note",
    description:
      "按 slug 读取公开笔记的 Markdown，支持长文分页，返回真实章节 ID 与引用链接。提供 headingId 可读取具有可靠源码映射的章节，offset 相对此章节。",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["slug"],
      properties: {
        slug: { type: "string", maxLength: 512, description: "search-notes 返回的精确 slug" },
        headingId: {
          type: "string",
          description: "返回的真实章节 ID；无可靠映射的文章返回 SECTION_UNAVAILABLE",
        },
        offset: { type: "integer", minimum: 0, description: "正文 code point 偏移，默认 0" },
        length: {
          type: "integer",
          minimum: 1,
          maximum: 12000,
          description: "读取字符数，默认 4000",
        },
      },
    },
    execute(input, options) {
      return result(async () => {
        const p = parameters(input, ["slug", "headingId", "offset", "length"])
        return read(
          {
            slug: text(p.slug, "slug", 512),
            headingId: p.headingId === undefined ? undefined : text(p.headingId, "headingId", 1024),
            offset: integer(p.offset, "offset", 0, 0, Number.MAX_SAFE_INTEGER),
            length: integer(p.length, "length", 4000, 1, 12000),
          },
          options.signal,
        )
      }, options.signal)
    },
  }
}
