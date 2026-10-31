import type { NoteRepository, SearchInput } from "../../contracts/notes"
import type { SearchRuntime } from "../../../search/contracts/runtime"
import { AgentError, checkAbort } from "../../contracts/result"
import { waitFor } from "../data/cache"

const normalize = (text: string) => text.normalize("NFKC").toLowerCase()

export function topicFor(slug: string) {
  const parts = slug.split("/")
  if (parts[0] === "en") parts.shift()
  return parts.length > 1 ? parts[0] : "root"
}

function snippet(text: string, query: string) {
  const normalized = text.replace(/\s+/g, " ")
  const position = normalize(normalized).indexOf(normalize(query))
  const start = position < 0 ? 0 : Math.max(0, position - 120)
  // Slice a small code-unit window before allocating a code-point array.
  let window = normalized.slice(start, start + 600)
  if (start && /^[\uDC00-\uDFFF]/.test(window)) window = window.slice(1)
  const excerpt = Array.from(window).slice(0, 240).join("")
  return `${start ? "…" : ""}${excerpt}${start + excerpt.length < normalized.length ? "…" : ""}`
}

export function createSearch(repository: NoteRepository, provider: () => SearchRuntime) {
  return async (input: SearchInput, signal?: AbortSignal) => {
    const runtime = provider()
    if (!runtime) throw new AgentError("INDEX_UNAVAILABLE", "共享搜索尚未就绪，请稍后重试。", true)
    let [directory, data] = await Promise.all([
      repository.getCatalog(signal),
      waitFor(runtime.load(), signal),
    ])
    const aligned = () =>
      Object.keys(data).length === directory.pages.length &&
      directory.pages.every((p) => data[p.slug]?.hash === p.hash)
    if (!aligned()) {
      ;[directory, data] = await Promise.all([
        repository.getCatalog(signal, true),
        waitFor(runtime.reload(), signal),
      ])
    }
    if (!aligned())
      throw new AgentError("STALE_CONTENT", "搜索与文章目录版本不一致，请稍后重试。", true)
    checkAbort(signal)
    const topics = [...new Set(directory.pages.map((p) => topicFor(p.slug)))].sort()
    if (input.topic && !topics.includes(input.topic))
      throw new AgentError("INVALID_INPUT", `未知主题，可用主题：${topics.join("、")}`)
    const bySlug = new Map(directory.pages.map((p) => [p.slug, p]))
    const results = await waitFor(
      runtime.search({
        query: input.query,
        limit: Object.keys(data).length,
        index: ["title", "tags", "content"],
      }),
      signal,
    )
    data = results.data
    if (!aligned()) throw new AgentError("STALE_CONTENT", "检索期间索引已变化，请重试。", true)
    const sourceSlugs = Object.keys(data)
    const matches = new Map<string, Set<string>>()
    const scores = new Map<string, number>()
    for (const group of results.fields) {
      for (const id of group.result) {
        const slug = sourceSlugs[id]
        const p = bySlug.get(slug)
        if (
          !p ||
          (input.topic && topicFor(slug) !== input.topic) ||
          (input.language !== "all" && p.language !== input.language)
        )
          continue
        const field = group.field === "content" ? "text" : group.field
        scores.set(
          slug,
          (scores.get(slug) ?? 0) + (field === "title" ? 16 : field === "tags" ? 8 : 1),
        )
        const set = matches.get(slug) ?? new Set<string>()
        set.add(field)
        matches.set(slug, set)
      }
    }
    const ranked = [...scores.keys()].sort(
      (a, b) => scores.get(b)! - scores.get(a)! || a.localeCompare(b),
    )
    const items = await Promise.all(
      ranked.slice(0, input.limit).map(async (slug) => {
        const p = bySlug.get(slug)!
        const sections = await repository.getSections(p, directory.revision, signal)
        return {
          slug,
          title: p.title,
          canonicalUrl: p.url,
          language: p.language,
          snippet: snippet(data[slug].content, input.query),
          matchedFields: [...matches.get(slug)!],
          headings: sections.headings
            .filter((h) => normalize(h.text).includes(normalize(input.query)))
            .slice(0, 3),
        }
      }),
    )
    checkAbort(signal)
    return { revision: directory.revision, data: { items, hasMore: ranked.length > input.limit } }
  }
}
