import assert from "node:assert/strict"
import test from "node:test"
import type { QuartzPluginData } from "../plugins/vfile"
import type { FullSlug } from "./path"
import {
  type CuratedHomeItem,
  type HomeDiagnostic,
  HomeLinkResolutionError,
  getFeedDate,
  getFeedPages,
  getHomeUiLocale,
  getPageLanguage,
  getPageLocale,
  isHomePage,
  resolveHomeItems,
} from "./homePageModel"

const page = (slug: string, frontmatter: Record<string, unknown> = {}): QuartzPluginData => ({
  slug: slug as FullSlug,
  frontmatter: { title: slug, tags: [], ...frontmatter },
})
const dated = (slug: string, dates: Partial<NonNullable<QuartzPluginData["dates"]>>) => ({
  ...page(slug),
  dates: dates as QuartzPluginData["dates"],
})
const home = "index" as FullSlug
const link = (slug: string, extra: Partial<CuratedHomeItem> = {}): CuratedHomeItem => ({
  id: slug,
  target: { kind: "page", slug },
  ...extra,
})

test("home identification requires the explicit marker and a reserved homepage slug", () => {
  for (const slug of ["index", "en"]) {
    assert.equal(isHomePage(page(slug, { pageType: "home" })), true)
    assert.equal(isHomePage(page(slug)), false)
  }
  for (const slug of ["notes/index", "article", "landing"]) {
    assert.equal(isHomePage(page(slug, { pageType: "home" })), false)
    assert.equal(isHomePage(page(slug)), false)
  }
})

test("frontmatter takes precedence over the homepage-only English path fallback", () => {
  assert.equal(getPageLocale(page("en/article", { lang: "zh" })), "zh-CN")
  assert.equal(getPageLocale(page("article", { lang: "en-GB" })), "en")
  assert.equal(getPageLocale(page("en/article")), "en")
  assert.equal(getHomeUiLocale(page("en")), "en-US")
  assert.equal(getHomeUiLocale(page("index")), "zh-CN")
  assert.equal(getPageLanguage(page("en/article", { lang: "ja" })), "ja")
})

test("page-scoped feeds keep explicit language, English fallback and Chinese defaults distinct", () => {
  const files = [
    page("zh-default"),
    page("zh", { lang: "zh" }),
    page("zh-regional", { lang: "zh-TW" }),
    page("en/article"),
    page("english", { lang: "en-US" }),
    page("en/chinese", { lang: "zh-CN" }),
    page("other", { lang: "ja" }),
  ]
  const slugs = (entries: QuartzPluginData[]) => entries.map((entry) => entry.slug).sort()
  assert.deepEqual(slugs(getFeedPages(files, { page: page("index"), languageScope: "page" })), [
    "en/chinese",
    "zh",
    "zh-default",
    "zh-regional",
  ])
  assert.deepEqual(slugs(getFeedPages(files, { page: page("en"), languageScope: "page" })), [
    "en/article",
    "english",
  ])
  assert.equal(getFeedPages(files).length, files.length, "Existing callers retain all languages")
})

test("missing English frontmatter produces actionable diagnostics without mutating files", () => {
  const files = [page("en/article"), page("en/explicit", { lang: "en" }), page("chinese")]
  const original = structuredClone(files)
  const diagnostics: HomeDiagnostic[] = []
  getFeedPages(files, { diagnostics })
  assert.deepEqual(
    diagnostics.map(({ code, location }) => ({ code, location })),
    [{ code: "missing-language", location: "en/article" }],
  )
  assert.deepEqual(files, original)
})

test("system pages and feed:false are excluded without conflating rss/recent metadata", () => {
  const files = [
    ...[
      "index",
      "en",
      "404",
      "tags",
      "tags/agents",
      "notes/index",
      "AGENTS",
      "CLAUDE",
      "notes/AGENTS",
      "notes/CLAUDE.md",
    ].map((slug) => page(slug)),
    page("new-home", { pageType: "home" }),
    page("hidden", { feed: false }),
    page("untitled", { title: "  " }),
    page("custom-exclude"),
    page("article", { rss: false, recent: false }),
    page("keep"),
    {},
  ]
  assert.deepEqual(
    getFeedPages(files, { excludeSlugs: ["custom-exclude"] }).map((entry) => entry.slug),
    ["article", "keep"],
  )
})

test("dates prefer modified, then published, then created and never invent a fallback", () => {
  const modified = new Date("2024-03-01")
  const published = new Date("2024-02-01")
  const created = new Date("2024-01-01")
  assert.equal(getFeedDate(dated("all", { modified, published, created })), modified)
  assert.equal(getFeedDate(dated("published", { published, created })), published)
  assert.equal(getFeedDate(dated("created", { created })), created)
  assert.equal(
    getFeedDate(dated("invalid", { modified: new Date("invalid"), published })),
    published,
  )
  assert.equal(getFeedDate(dated("invalid", { modified: new Date("invalid") })), undefined)
  assert.equal(getFeedDate(page("unknown")), undefined)
})

test("unknown dates sort last, including after pre-epoch dates, with title then slug ties", () => {
  const recent = new Date("2026-01-01")
  const files = [
    page("unknown"),
    dated("older", { created: new Date("1960-01-01") }),
    { ...dated("tie-z", { modified: recent }), frontmatter: { title: "Same", tags: [] } },
    { ...dated("tie-a", { modified: recent }), frontmatter: { title: "Same", tags: [] } },
    { ...dated("title-a", { modified: recent }), frontmatter: { title: "Earlier", tags: [] } },
  ]
  const order = files.map((entry) => entry.slug)
  assert.deepEqual(
    getFeedPages(files).map((entry) => entry.slug),
    ["title-a", "tie-a", "tie-z", "older", "unknown"],
  )
  assert.deepEqual(
    files.map((entry) => entry.slug),
    order,
  )
})

test("curated links resolve only published pages, retaining authored order and Quartz slug rules", () => {
  const files = [
    page("notes/中文-文章", { title: "原文标题" }),
    page("second", { title: "Second" }),
  ]
  const items = resolveHomeItems(
    [
      link("/notes/中文 文章.md", { id: "first", note: "Reviewed recommendation" }),
      link("second", { label: "Curated heading" }),
    ],
    files,
    "en/index" as FullSlug,
  )
  assert.deepEqual(
    items.map(({ id, href, label }) => ({ id, href, label })),
    [
      { id: "first", href: "../notes/中文-文章", label: "原文标题" },
      { id: "second", href: "../second", label: "Curated heading" },
    ],
  )
  assert.equal(items[0].page, files[0])
  assert.equal(items[0].locale, "zh-CN")
  assert.equal(items[0].note, "Reviewed recommendation")
})

test("curated destinations and ids deduplicate stably without filling missing items", () => {
  const diagnostics: HomeDiagnostic[] = []
  const resolved = resolveHomeItems(
    [
      link("a", { id: "same" }),
      link("b", { id: "same" }),
      link("a", { id: "third" }),
      link("missing"),
    ],
    [page("a"), page("b")],
    home,
    { location: "featured", diagnostics },
  )
  assert.deepEqual(
    resolved.map((item) => item.slug),
    ["a"],
  )
  assert.deepEqual(
    diagnostics.map((item) => item.code),
    ["duplicate-item", "duplicate-item", "missing-page"],
  )
  assert.match(diagnostics[2].location, /^featured\[3\]/)
  assert.equal(diagnostics[2].level, "warning")
})

test("required missing and invalid links report configuration positions and fail", () => {
  const diagnostics: HomeDiagnostic[] = []
  assert.throws(
    () =>
      resolveHomeItems(
        [
          link("draft-not-in-published-files", { required: true }),
          {
            id: "unsafe",
            target: { kind: "external", href: "javascript:alert(1)" },
            label: "Bad",
            required: true,
          },
        ],
        [],
        home,
        { location: "identity.about", diagnostics },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HomeLinkResolutionError)
      assert.equal(error.diagnostics.length, 2)
      assert.match(error.message, /identity\.about\[0\]/)
      assert.match(error.message, /draft-not-in-published-files/)
      return true
    },
  )
  assert.equal(diagnostics.filter((item) => item.level === "error").length, 2)
})

test("external URLs require explicit http/https; mailto is a separate allowed target kind", () => {
  const diagnostics: HomeDiagnostic[] = []
  const valid = resolveHomeItems(
    [
      {
        id: "web",
        target: { kind: "external", href: "https://example.com/read?q=one" },
        label: "Read",
      },
      { id: "email", target: { kind: "mailto", href: "mailto:hello@example.com" }, label: "Email" },
      ...[
        "javascript:alert(1)",
        "data:text/html,test",
        "//example.com",
        "/relative",
        "mailto:hello@example.com",
        "https://user:secret@example.com",
        "https://example.com/\nunsafe",
      ].map((href, index): CuratedHomeItem => ({
        id: `unsafe-${index}`,
        target: { kind: "external", href },
        label: "Unsafe",
      })),
    ],
    [],
    home,
    { diagnostics },
  )
  assert.deepEqual(
    valid.map((item) => item.id),
    ["web", "email"],
  )
  assert.equal(diagnostics.length, 7)
})
