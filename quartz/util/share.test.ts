import assert from "node:assert/strict"
import test from "node:test"
import { VFile } from "vfile"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { parseShareSlug } from "./share"
import { validateShareRoutes } from "./shareRoutes"
import { BuildCtx } from "./ctx"
import { ProcessedContent } from "../plugins/vfile"
import { FullSlug, FilePath } from "./path"

function file(slug: string, shareSlug?: string, aliases: string[] = []): ProcessedContent {
  return [
    { type: "root", children: [] },
    new VFile({
      data: {
        slug: slug as FullSlug,
        frontmatter: { title: slug, ...(shareSlug ? { shareSlug } : {}) },
        aliases: [...aliases, ...(shareSlug ? [shareSlug] : [])] as FullSlug[],
      },
    }),
  ]
}
function ctx(files = ["notes/article.md"]): BuildCtx {
  return { argv: { directory: "content" }, allFiles: files as FilePath[] } as BuildCtx
}

test("share slugs are optional but strictly root-level English words", () => {
  assert.equal(parseShareSlug(undefined), undefined)
  assert.equal(parseShareSlug("agent-audit"), "agent-audit")
  for (const invalid of [
    "",
    null,
    false,
    42,
    "/agent",
    "Agent",
    "agent--audit",
    "agent_audit",
    "../agent",
    "https://example.com",
    "中文",
    "agent?x",
    "agent#x",
  ]) {
    assert.throws(() => parseShareSlug(invalid), /shareSlug/)
  }
})
test("valid shared entry does not replace canonical slug", async () => {
  const article = file("notes/article", "agent-audit")
  await validateShareRoutes(ctx(), [article])
  assert.equal(article[1].data.slug, "notes/article")
})
test("reject duplicate share slugs, pages, folders, assets and generated namespaces", async () => {
  await assert.rejects(
    validateShareRoutes(ctx(), [file("a", "agent-audit"), file("b", "agent-audit")]),
    /Conflicting/,
  )
  for (const input of [
    "agent-audit.md",
    "agent-audit/index.md",
    "agent-audit/child.md",
    "agent-audit.html",
  ]) {
    await assert.rejects(
      validateShareRoutes(ctx([input]), [file("a", "agent-audit")]),
      /Conflicting/,
    )
  }
  for (const reserved of ["index", "tags", "static", "brand", "agent"]) {
    await assert.rejects(validateShareRoutes(ctx(), [file("a", reserved)]), /Conflicting/)
  }
})
test("reject aliases including paths below the share entry", async () => {
  for (const alias of [
    "agent-audit",
    "agent-audit/index",
    "agent-audit/child",
    "../agent-audit",
    "foo/../agent-audit",
  ]) {
    await assert.rejects(
      validateShareRoutes(ctx(), [file("a", "agent-audit"), file("notes/b", undefined, [alias])]),
      /conflicts/,
    )
  }
})
test("reject handwritten extra-pages that would overwrite the route", async () => {
  const old = process.cwd()
  const root = await mkdtemp(path.join(tmpdir(), "share-route-"))
  try {
    process.chdir(root)
    await mkdir("extra-pages")
    await writeFile("extra-pages/agent-audit.html", "handwritten")
    await assert.rejects(validateShareRoutes(ctx(), [file("a", "agent-audit")]), /Conflicting/)
  } finally {
    process.chdir(old)
    await rm(root, { recursive: true, force: true })
  }
})

test("real alias emitter keeps canonical/noindex and safely renders metadata", async () => {
  const { AliasRedirects } = await import("../plugins/emitters/aliases")
  const { readFile } = await import("node:fs/promises")
  const root = await mkdtemp(path.join(tmpdir(), "share-alias-"))
  try {
    const article = file("notes/article", "agent-audit")
    article[1].data.frontmatter!.title = 'Audit "quoted" <tag>'
    article[1].data.description = "A &amp; B &quot;quoted&quot;"
    const context = ctx()
    context.argv.output = root
    context.cfg = { configuration: { baseUrl: "xiaohui.cool" } } as BuildCtx["cfg"]
    const emitted = await AliasRedirects().emit(context, [article], {
      css: [],
      js: [],
      additionalHead: [],
    })
    if (Symbol.asyncIterator in emitted)
      for await (const _ of emitted) {
        /* consume actual writes */
      }
    const html = await readFile(path.join(root, "agent-audit.html"), "utf8")
    assert.match(html, /name="robots" content="noindex"/)
    assert.match(html, /rel="canonical" href="https:\/\/xiaohui.cool\/notes\/article"/)
    assert.match(html, /http-equiv="refresh" content="0; url=\.\/notes\/article"/)
    assert.match(html, /og:title" content="Audit &quot;quoted&quot; &lt;tag&gt;"/)
    assert.match(html, /og:description" content="A &amp; B &quot;quoted&quot;"/)
    assert.doesNotMatch(html, /&amp;amp;|&amp;quot;/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("reject aliases that escape then re-enter the output directory", async () => {
  await assert.rejects(
    validateShareRoutes(ctx(), [
      file("a", "agent-audit"),
      file("notes/b", undefined, ["foo/../../public/agent-audit"]),
    ]),
    /Unsafe alias/,
  )
})

test("reject platform-dependent backslash aliases", async () => {
  await assert.rejects(
    validateShareRoutes(ctx(), [
      file("a", "agent-audit"),
      file("notes/b", undefined, [String.raw`foo\..\agent-audit`]),
    ]),
    /Unsafe alias/,
  )
})
