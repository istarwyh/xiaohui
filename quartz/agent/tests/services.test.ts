import { createSearchRuntime } from "../../search/browser/runtime"
import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { createSearch, topicFor } from "../browser/search/engine"
import { createReader, paginate } from "../browser/reading/service"
import { createCurrentNote, type PageSnapshot } from "../browser/context/current-note"
import { SharedCache, waitFor } from "../browser/data/cache"
import { createRepository } from "../browser/data/repository"
import { assetUrl, markdownPath } from "../browser/data/urls"
import { digest, buildCatalog } from "../build/catalog"
import { searchNotes } from "../webmcp/tools/search-notes"
import { readNote } from "../webmcp/tools/read-note"
import { getCurrentNote } from "../webmcp/tools/get-current-note"
import type { Catalog, NoteRepository, SearchCorpus, Sections } from "../contracts/notes"

const note = {
  slug: "en/program/llm/oneagent-mcps-domain-agent",
  title: "OneAgent + MCPs: Fast Domain Agent Creation",
  url: "https://xiaohui.cool/en/program/llm/oneagent-mcps-domain-agent",
  markdownUrl: "https://xiaohui.cool/agent/pages/en/program/llm/oneagent-mcps-domain-agent.md",
  language: "en" as const,
  kind: "article" as const,
  hash: "page-hash",
}
const directory: Catalog = { schemaVersion: "1.0", revision: "revision", pages: [note] }
const sections: Sections = {
  schemaVersion: "1.0",
  revision: "revision",
  hash: note.hash,
  available: false,
  markdownDigest: "unused",
  headings: [
    {
      depth: 2,
      text: "重复标题",
      id: "重复标题",
      url: note.url + "#" + encodeURIComponent("重复标题"),
    },
  ],
}

async function realCorpus(): Promise<SearchCorpus> {
  // Real published project text; no generated/synthetic claims used for retrieval checks.
  const english = await readFile(
    new URL("../../../content/en/program/llm/oneagent-mcps-domain-agent.md", import.meta.url),
    "utf8",
  )
  const chinese = await readFile(
    new URL(
      "../../../content/program/llm/从Claude Code到 OneAgent：如何做好上下文工程.md",
      import.meta.url,
    ),
    "utf8",
  )
  return {
    schemaVersion: "1.0",
    revision: "revision",
    pages: [
      { ...note, tags: ["MCP"], description: "OneAgent + MCPs", headings: [], text: english },
      {
        ...note,
        slug: "program/llm/上下文工程",
        language: "zh",
        title: "从 Claude Code 到 OneAgent：如何做好上下文工程",
        tags: [],
        description: "上下文工程",
        headings: [],
        text: chinese,
      },
    ],
  }
}

function repository(overrides: Partial<NoteRepository> = {}): NoteRepository {
  return {
    getCatalog: async () => directory,
    getSections: async () => sections,
    readMarkdown: async () => ({ note, sections, markdown: "正文😀内容", revision: "revision" }),
    ...overrides,
  }
}
const options = () => ({ signal: new AbortController().signal })

test("real bilingual content is retrieved, filtered and produces bounded snippets", async () => {
  const corpus = await realCorpus()
  const runtime = createSearchRuntime(async () =>
    Object.fromEntries(
      corpus.pages.map((p) => [
        p.slug,
        { title: p.title, content: p.text, tags: p.tags, hash: p.hash },
      ]),
    ),
  )
  const repo = repository({
    getCatalog: async () => ({
      ...directory,
      pages: corpus.pages.map((p) => ({ ...note, ...p, kind: "article" })),
    }),
  })
  const search = createSearch(repo, () => runtime)
  const chinese = await search({ query: "上下文工程", language: "zh", limit: 5 })
  assert.equal(chinese.data.items[0].language, "zh")
  assert.match(chinese.data.items[0].title, /上下文工程/)
  const english = await search({ query: "MCP", language: "en", topic: "program", limit: 1 })
  assert.equal(english.data.items[0].slug, note.slug)
  assert.ok(Array.from(english.data.items[0].snippet).length <= 242)
  assert.equal(topicFor(note.slug), "program")
  assert.deepEqual(
    (await search({ query: "不存在的主题xyz987", language: "all", limit: 5 })).data.items,
    [],
  )
  await assert.rejects(
    search({ query: "MCP", language: "all", topic: "unknown", limit: 5 }),
    /未知主题/,
  )
})

test("pagination preserves code points including emoji and EOF boundaries", () => {
  const first = paginate("甲😀乙丙", 0, 2)
  const second = paginate("甲😀乙丙", first.nextOffset!, 2)
  assert.equal(first.content + second.content, "甲😀乙丙")
  assert.equal(second.nextOffset, null)
  assert.equal(paginate("甲😀", 2, 4).content, "")
  assert.throws(() => paginate("甲", 2, 4), /offset/)
})

test("reader returns explicit section limitation without guessing duplicate heading boundaries", async () => {
  const read = createReader(repository())
  assert.equal((await read({ slug: note.slug, offset: 0, length: 3 })).data.content, "正文😀")
  await assert.rejects(
    read({ slug: note.slug, headingId: "重复标题", offset: 0, length: 3 }),
    /没有可靠/,
  )
  await assert.rejects(
    read({ slug: note.slug, headingId: "unknown", offset: 0, length: 3 }),
    /headingId/,
  )
})

test("tools validate hostile and invalid arguments before invoking services", async () => {
  let calls = 0
  const service = async () => {
    calls++
    return { data: {}, revision: "revision" }
  }
  const search = searchNotes(service)
  for (const input of [
    { query: " " },
    { query: "MCP", limit: -1 },
    { query: "MCP", language: "fr" },
    { query: "MCP", url: "https://evil.test" },
  ]) {
    assert.equal(((await search.execute(input, options())) as { ok: boolean }).ok, false)
  }
  assert.equal(
    (
      (await readNote(service).execute({ slug: note.slug, offset: 1.5 }, options())) as {
        ok: boolean
      }
    ).ok,
    false,
  )
  assert.equal(
    ((await getCurrentNote(service).execute({ extra: true }, options())) as { ok: boolean }).ok,
    false,
  )
  assert.equal(calls, 0)
  assert.equal(((await search.execute({ query: "MCP" }, options())) as { ok: boolean }).ok, true)
  assert.equal(calls, 1)
})

test("current note rejects home/list and detects navigation during metadata retrieval", async () => {
  let state: PageSnapshot = {
    generation: 0,
    navigating: false,
    slug: note.slug,
    url: note.url + "#" + encodeURIComponent("重复标题"),
    kind: "article",
  }
  const current = createCurrentNote(repository(), () => ({ ...state }))
  assert.equal((await current()).data.citationUrl, sections.headings[0].url)
  state.kind = "list"
  await assert.rejects(current(), /不是笔记/)
  state.kind = "article"
  const racing = createCurrentNote(
    repository({
      getSections: async () => {
        state.generation++
        return sections
      },
    }),
    () => ({ ...state }),
  )
  await assert.rejects(racing(), /页面已变化/)
})

test("shared cache coalesces requests, retries failure, and isolates waiter cancellation", async () => {
  const cache = new SharedCache<number>()
  let calls = 0
  let finish!: (value: number) => void
  const load = () => {
    calls++
    return new Promise<number>((resolve) => {
      finish = resolve
    })
  }
  const controller = new AbortController()
  const cancelled = cache.get(load, controller.signal)
  const other = cache.get(load)
  controller.abort()
  await assert.rejects(cancelled, { name: "AbortError" })
  finish(42)
  assert.equal(await other, 42)
  assert.equal(calls, 1)
  cache.clear()
  await assert.rejects(
    cache.get(async () => {
      throw new Error("offline")
    }),
    /offline/,
  )
  assert.equal(await cache.get(async () => 7), 7)
  const aborted = new AbortController()
  aborted.abort()
  assert.throws(() => waitFor(Promise.resolve(1), aborted.signal), { name: "AbortError" })
})

function assetFetcher(markdown: string, mutate?: (url: URL, value: unknown) => unknown) {
  const requests: URL[] = []
  const fetcher = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input))
    requests.push(url)
    let value: unknown
    let type = "application/json"
    if (url.pathname.endsWith("catalog.json")) value = directory
    else if (url.pathname.includes("/sections/"))
      value = { ...sections, markdownDigest: digest(markdown) }
    else if (url.pathname.endsWith("search-index.json")) value = await realCorpus()
    else {
      value = `---\nhash: "${note.hash}"\n---\n\n${markdown}\n`
      type = "text/plain"
    }
    value = mutate?.(url, value) ?? value
    return new Response(typeof value === "string" ? value : JSON.stringify(value), {
      headers: { "content-type": type },
    })
  }) as typeof fetch
  return { fetcher, requests }
}

test("repository is lazy, preview-local, bounded, verified and deduplicates concurrent reads", async () => {
  const { fetcher, requests } = assetFetcher("真实正文😀\n---\n内部正文")
  const repo = createRepository("https://preview.test", "build", fetcher)
  assert.equal(requests.length, 0)
  const values = await Promise.all([repo.readMarkdown(note.slug), repo.readMarkdown(note.slug)])
  assert.equal(values[0].markdown, "真实正文😀\n---\n内部正文")
  assert.equal(values[0], values[1])
  assert.equal(requests.length, 3)
  assert.ok(
    requests.every((url) => url.origin === "https://preview.test" && url.searchParams.has("v")),
  )
  await repo.readMarkdown(note.slug)
  assert.equal(requests.length, 3)
  await assert.rejects(repo.readMarkdown("../../private"), /找不到/)
})

test("repository rejects bad schema, HTML errors and stale Markdown", async () => {
  const malformed = assetFetcher("text", (url, value) =>
    url.pathname.includes("catalog") ? { schemaVersion: "wrong" } : value,
  )
  await assert.rejects(
    createRepository("https://preview.test", "build", malformed.fetcher).getCatalog(),
    /版本不兼容/,
  )
  const html = (async () =>
    new Response("<html>Not found</html>", {
      headers: { "content-type": "text/html" },
    })) as typeof fetch
  await assert.rejects(
    createRepository("https://preview.test", "build", html).getCatalog(),
    /不是 JSON/,
  )
  const stale = assetFetcher("text", (url, value) =>
    url.pathname.endsWith(".md") ? String(value).replace("text", "modified") : value,
  )
  await assert.rejects(
    createRepository("https://preview.test", "build", stale.fetcher).readMarkdown(note.slug),
    /版本不一致/,
  )
})

test("asset policies reject external paths, encoded separators and external Markdown", () => {
  assert.throws(() =>
    assetUrl("https://evil.test/agent/catalog.json", "https://preview.test", "build"),
  )
  assert.throws(() => markdownPath({ ...note, markdownUrl: "https://evil.test/agent/pages/a.md" }))
  assert.throws(() =>
    markdownPath({ ...note, markdownUrl: "https://xiaohui.cool/agent/pages/a%2fb.md" }),
  )
})

test("catalog revisions change with content, deletion and metadata, independently of input order", () => {
  const second = { ...note, slug: "program/test" }
  assert.equal(buildCatalog([note, second], []).revision, buildCatalog([second, note], []).revision)
  assert.notEqual(buildCatalog([note, second], []).revision, buildCatalog([note], []).revision)
  assert.notEqual(
    buildCatalog([note], []).revision,
    buildCatalog([{ ...note, hash: "new" }], []).revision,
  )
  assert.notEqual(buildCatalog([note], []).revision, buildCatalog([note], ["tag"]).revision)
})

test("agent search reuses the shared UI corpus and rejects mixed content versions", async () => {
  const corpus = await realCorpus()
  let loads = 0
  const runtime = createSearchRuntime(async () => {
    loads++
    return Object.fromEntries(
      corpus.pages.map((p) => [
        p.slug,
        { title: p.title, content: p.text, tags: p.tags, hash: p.hash },
      ]),
    )
  })
  const repo = repository({
    getCatalog: async () => ({
      ...directory,
      pages: corpus.pages.map((p) => ({ ...note, ...p, kind: "article" })),
    }),
  })
  const search = createSearch(repo, () => runtime)
  const input = { query: "MCP", language: "all" as const, limit: 5 }
  await runtime.load() // normal UI startup
  await search(input)
  await search(input)
  assert.equal(loads, 1)
  const stale = createSearch(
    repository({ getCatalog: async () => ({ ...directory, pages: [{ ...note, hash: "new" }] }) }),
    () => runtime,
  )
  await assert.rejects(stale(input), /版本不一致/)
  assert.equal(loads, 2)
})

test("tool cancellation preserves a custom AbortSignal reason instead of returning a content error", async () => {
  const controller = new AbortController()
  const reason = new Error("user stopped this invocation")
  controller.abort(reason)
  let called = false
  const tool = searchNotes(async () => {
    called = true
    return { data: {}, revision: "revision" }
  })
  const caught = await Promise.resolve()
    .then(() => tool.execute({ query: "MCP" }, { signal: controller.signal }))
    .catch((error) => error)
  assert.equal(caught, reason)
  assert.equal(called, false)
})

test("section metadata downloads are shared across search, context and reading callers", async () => {
  const { fetcher, requests } = assetFetcher("text")
  const repo = createRepository("https://preview.test", "build", fetcher)
  await repo.getCatalog()
  const [a, b] = await Promise.all([
    repo.getSections(note, "revision"),
    repo.getSections(note, "revision"),
  ])
  assert.equal(a, b)
  await repo.getSections(note, "revision")
  assert.equal(requests.filter((u) => u.pathname.includes("/sections/")).length, 1)
})
