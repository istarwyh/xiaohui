import type { NoteRepository } from "../../contracts/notes"
import { AgentError, checkAbort } from "../../contracts/result"

export interface PageSnapshot {
  generation: number
  slug: string
  url: string
  kind: string
  navigating: boolean
}

export function createCurrentNote(repository: NoteRepository, snapshot: () => PageSnapshot) {
  return async (signal?: AbortSignal) => {
    const before = snapshot()
    if (before.navigating) throw new AgentError("PAGE_CHANGED", "页面正在切换，请重试。", true)
    const directory = await repository.getCatalog(signal)
    if (snapshot().generation !== before.generation || snapshot().url !== before.url) {
      throw new AgentError("PAGE_CHANGED", "当前页面已变化，请重试。", true)
    }
    const note = directory.pages.find((p) => p.slug === before.slug)
    if (!note || note.kind !== "article" || before.kind !== "article") {
      throw new AgentError("NOT_AN_ARTICLE", "当前页面不是笔记正文，可使用 search-notes 搜索。")
    }
    const sections = await repository.getSections(note, directory.revision, signal)
    checkAbort(signal)
    const after = snapshot()
    if (
      after.navigating ||
      after.generation !== before.generation ||
      after.slug !== before.slug ||
      after.url !== before.url
    ) {
      throw new AgentError("PAGE_CHANGED", "当前页面已变化，请重试。", true)
    }
    let headingId = ""
    try {
      headingId = decodeURIComponent(new URL(before.url).hash.slice(1))
    } catch {
      /* Invalid user fragment. */
    }
    const heading = sections.headings.find((h) => h.id === headingId)
    return {
      revision: directory.revision,
      data: {
        title: note.title,
        slug: note.slug,
        canonicalUrl: note.url,
        citationUrl: heading?.url ?? note.url,
        hash: note.hash,
        pageKind: "article",
        headings: sections.headings.slice(0, 50),
        hasMoreHeadings: sections.headings.length > 50,
      },
    }
  }
}
