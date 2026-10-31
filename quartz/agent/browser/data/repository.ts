import type { Catalog, Note, NoteRepository, NoteSource, Sections } from "../../contracts/notes"
import { AgentError, checkAbort } from "../../contracts/result"
import { SharedCache, waitFor } from "./cache"
import { assetUrl, markdownPath, sectionsPath } from "./urls"
import * as validate from "./validation"

export function createRepository(
  origin: string,
  build: string,
  fetcher: typeof fetch = fetch,
): NoteRepository {
  const catalogCache = new SharedCache<Catalog>()
  const notes = new Map<string, NoteSource>()
  const sectionCaches = new Map<string, SharedCache<Sections>>()
  const pending = new Map<string, Promise<NoteSource>>()

  async function request(path: string, version: string, revalidate = false) {
    const url = assetUrl(path, origin, version)
    const response = await fetcher(url, {
      redirect: "error",
      credentials: "omit",
      signal: AbortSignal.timeout(15000),
      cache: revalidate ? "reload" : "default",
    })
    if (!response.ok || (response.url && new URL(response.url).origin !== origin)) {
      throw new AgentError("FETCH_FAILED", "无法读取站内内容，请稍后重试。", true)
    }
    return response
  }

  async function json(path: string, version: string, revalidate = false): Promise<unknown> {
    const response = await request(path, version, revalidate)
    if (!response.headers.get("content-type")?.includes("json")) {
      throw new AgentError("INDEX_UNAVAILABLE", "索引响应不是 JSON。", true)
    }
    return response.json()
  }

  const getCatalog = (signal?: AbortSignal, refresh = false) => {
    if (refresh) catalogCache.clear()
    return catalogCache.get(
      async () => validate.catalog(await json("/agent/catalog.json", build, refresh)),
      signal,
    )
  }

  function getSections(note: Note, revision: string, signal?: AbortSignal) {
    const key = `${revision}:${note.hash}:${note.slug}`
    const cache = sectionCaches.get(key) ?? new SharedCache<Sections>()
    sectionCaches.delete(key)
    sectionCaches.set(key, cache)
    while (sectionCaches.size > 64) sectionCaches.delete(sectionCaches.keys().next().value!)
    return cache.get(async () => {
      const path = sectionsPath(markdownPath(note))
      let data = validate.sections(await json(path, revision))
      if (data.revision !== revision || data.hash !== note.hash)
        data = validate.sections(await json(path, revision, true))
      if (data.revision !== revision || data.hash !== note.hash) {
        catalogCache.clear()
        throw new AgentError("STALE_CONTENT", "文章版本已变化，请重试。", true)
      }
      return data
    }, signal)
  }

  async function loadNote(slug: string): Promise<NoteSource> {
    const directory = await getCatalog()
    const found = directory.pages.find((p) => p.slug === slug)
    if (!found) throw new AgentError("NOTE_NOT_FOUND", "找不到这篇公开笔记。")
    const note = found
    const key = `${directory.revision}:${note.hash}:${slug}`
    const cached = notes.get(key)
    if (cached) {
      notes.delete(key)
      notes.set(key, cached)
      return cached
    }
    const sections = await getSections(note, directory.revision)
    const path = markdownPath(note)
    async function read(revalidate = false) {
      const response = await request(path, note.hash, revalidate)
      const type = response.headers.get("content-type") ?? ""
      if (!/text\/(plain|markdown)|application\/(octet-stream|markdown)/.test(type)) {
        throw new AgentError("FETCH_FAILED", "正文响应格式无效。", true)
      }
      const source = await response.text()
      // AgentIndex emits exactly one metadata block. Do not strip an article's own delimiters.
      const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/.exec(source)
      if (!match || !match[0].includes(`hash: "${note.hash}"`)) return undefined
      const markdown = source.slice(match[0].length).replace(/\n$/, "")
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markdown))
      const digest = Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, "0")).join(
        "",
      )
      return digest === sections.markdownDigest ? markdown : undefined
    }
    const markdown = (await read()) ?? (await read(true))
    if (markdown === undefined) {
      catalogCache.clear()
      throw new AgentError("STALE_CONTENT", "正文与目录版本不一致，请重试。", true)
    }
    const value = { note, sections, markdown, revision: directory.revision }
    notes.set(key, value)
    while (
      notes.size > 10 ||
      (notes.size > 0 &&
        [...notes.values()].reduce((n, v) => n + v.markdown.length * 2, 0) > 2 * 1024 * 1024)
    )
      notes.delete(notes.keys().next().value!)
    return value
  }

  return {
    getCatalog,
    getSections,
    readMarkdown(slug, signal) {
      checkAbort(signal)
      let work = pending.get(slug)
      if (!work) {
        work = loadNote(slug).finally(() => pending.delete(slug))
        pending.set(slug, work)
      }
      return waitFor(work, signal)
    },
  }
}
