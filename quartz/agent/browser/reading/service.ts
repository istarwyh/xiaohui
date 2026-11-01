import type { NoteRepository, ReadInput } from "../../contracts/notes"
import { AgentError, checkAbort } from "../../contracts/result"

export function paginate(markdown: string, offset: number, length: number) {
  const points = Array.from(markdown)
  if (offset > points.length) throw new AgentError("INVALID_INPUT", "offset 超出正文长度。")
  const end = Math.min(points.length, offset + length)
  return {
    content: points.slice(offset, end).join(""),
    offset,
    nextOffset: end < points.length ? end : null,
    truncated: end < points.length,
  }
}

export function createReader(repository: NoteRepository) {
  return async (input: ReadInput, signal?: AbortSignal) => {
    const source = await repository.readMarkdown(input.slug, signal)
    checkAbort(signal)
    let markdown = source.markdown
    let citationUrl = source.note.url
    if (input.headingId) {
      const heading = source.sections.headings.find((h) => h.id === input.headingId)
      if (!heading)
        throw new AgentError("HEADING_NOT_FOUND", "未找到该 headingId，请使用返回的真实标题 ID。")
      const range = source.sections.available
        ? source.sections.ranges?.find((r) => r.id === input.headingId)
        : undefined
      if (!range)
        throw new AgentError(
          "SECTION_UNAVAILABLE",
          "此文章的标题没有可靠源码位置，请省略 headingId 使用正文分页。",
        )
      const points = Array.from(markdown)
      if (range.start < 0 || range.end > points.length || range.end <= range.start)
        throw new AgentError("INDEX_UNAVAILABLE", "章节位置无效，请刷新后重试。", true)
      markdown = points.slice(range.start, range.end).join("")
      citationUrl = heading.url ?? source.note.url
    }
    return {
      revision: source.revision,
      data: {
        title: source.note.title,
        slug: source.note.slug,
        canonicalUrl: source.note.url,
        citationUrl,
        hash: source.note.hash,
        format: "markdown",
        ...paginate(markdown, input.offset, input.length),
        headings: source.sections.headings.slice(0, 50),
        hasMoreHeadings: source.sections.headings.length > 50,
        sectionReadingAvailable: source.sections.available,
      },
    }
  }
}
