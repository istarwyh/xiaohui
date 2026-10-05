import { escapeHTML } from "../../util/escape"

export function tokenizeSearchTerm(term: string): string[] {
  const tokens = term.trim().split(/\s+/).filter(Boolean)
  const words = [...tokens]
  for (let i = 1; i < words.length; i++) tokens.push(words.slice(0, i + 1).join(" "))
  return [...new Set(tokens)].sort((a, b) => b.length - a.length)
}

/** User input is literal text, never a regular expression. */
export function searchTermPattern(term: string): RegExp | undefined {
  const tokens = tokenizeSearchTerm(term)
  if (tokens.length === 0) return
  return new RegExp(
    tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "gi",
  )
}

export function highlightSearchText(term: string, text: string, trim = false): string {
  let excerpt = text
  let prefix = ""
  let suffix = ""
  if (trim) {
    const words = text.split(/\s+/).filter(Boolean)
    const contextWords = 30
    const terms = tokenizeSearchTerm(term).map((value) => value.toLowerCase())
    const matches = words.map((word) => terms.some((value) => word.toLowerCase().includes(value)))
    let bestStart = 0
    let bestCount = 0
    for (let i = 0; i <= Math.max(words.length - contextWords, 0); i++) {
      const count = matches.slice(i, i + contextWords).filter(Boolean).length
      if (count > bestCount) {
        bestStart = i
        bestCount = count
      }
    }
    const start = Math.max(bestStart - Math.floor(contextWords / 2), 0)
    const end = Math.min(start + contextWords * 2, words.length)
    excerpt = words.slice(start, end).join(" ")
    prefix = start > 0 ? "…" : ""
    suffix = end < words.length ? "…" : ""
  }

  const pattern = searchTermPattern(term)
  if (!pattern) return `${prefix}${escapeHTML(excerpt)}${suffix}`
  let result = ""
  let offset = 0
  for (const match of excerpt.matchAll(pattern)) {
    const position = match.index!
    result += escapeHTML(excerpt.slice(offset, position))
    result += `<span class="highlight">${escapeHTML(match[0])}</span>`
    offset = position + match[0].length
  }
  return `${prefix}${result}${escapeHTML(excerpt.slice(offset))}${suffix}`
}

export interface SearchQuery {
  type: "basic" | "tags"
  term: string
  tag?: string
}

export function parseSearchQuery(value: string): SearchQuery {
  const query = value.trim()
  if (!query.startsWith("#")) return { type: "basic", term: query }
  const tagQuery = query.slice(1).trim()
  const separator = tagQuery.search(/\s/)
  if (separator < 0) return { type: "tags", term: tagQuery }
  const term = tagQuery.slice(separator + 1).trim()
  return { type: "basic", term, tag: tagQuery.slice(0, separator) }
}

/** -1 means the input is focused; the first ArrowDown must select result zero. */
export function nextSearchResultIndex(current: number, count: number, direction: 1 | -1): number {
  if (count === 0) return -1
  if (current < 0) return direction === 1 ? 0 : count - 1
  return Math.max(-1, Math.min(current + direction, count - 1))
}
