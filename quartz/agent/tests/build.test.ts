import assert from "node:assert/strict"
import test from "node:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeSlug from "rehype-slug"
import { toString } from "hast-util-to-string"
import { VFile } from "vfile"
import type { Root } from "hast"
import { AgentIndex } from "../../plugins/emitters/agentIndex"
import { RemoveDrafts } from "../../plugins/filters/draft"
import type { BuildCtx } from "../../util/ctx"
import type { FullSlug, FilePath } from "../../util/path"
import type { ProcessedContent } from "../../plugins/vfile"
import { stripFrontmatter } from "../../util/frontmatter"
import { createRepository } from "../browser/data/repository"
import { createReader } from "../browser/reading/service"

async function publicNote(): Promise<ProcessedContent> {
  const relative = "en/program/llm/oneagent-mcps-domain-agent.md"
  const raw = await readFile(new URL("../../../content/" + relative, import.meta.url), "utf8")
  const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeSlug)
  const tree = (await processor.run(processor.parse(stripFrontmatter(raw)))) as Root
  const file = new VFile(stripFrontmatter(raw))
  file.data = {
    slug: relative.slice(0, -3) as FullSlug,
    relativePath: relative as FilePath,
    text: toString(tree),
    description: "Real public article about OneAgent and MCPs.",
    frontmatter: {
      title: "OneAgent + MCPs: Fast Domain Agent Creation",
      tags: ["MCP"],
      lang: "en",
    },
  }
  return [tree, file]
}

test("emitter output supports real-article retrieval and removes withdrawn generated resources", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "xiaohui-agent-"))
  const ctx = {
    argv: { output },
    cfg: {
      configuration: {
        baseUrl: "xiaohui.cool",
        pageTitle: "晓灰",
        locale: "zh-CN",
        defaultDateType: "created",
      },
    },
  } as BuildCtx
  const resources = { css: [], js: [], additionalHead: [] }
  const emitter = AgentIndex()
  async function emit(content: ProcessedContent[]) {
    const files = await emitter.emit(ctx, content, resources)
    if (Symbol.asyncIterator in files)
      for await (const _file of files) {
        /* consume writes */
      }
  }
  try {
    const page = await publicNote()
    const draft: ProcessedContent = [page[0], new VFile(page[1].value)]
    draft[1].data = {
      ...page[1].data,
      slug: "private-draft" as FullSlug,
      frontmatter: { title: "draft", tags: [], draft: true },
    }
    const content = [page, draft].filter((entry) => RemoveDrafts().shouldPublish(ctx, entry))
    await emit(content)
    const catalog = JSON.parse(await readFile(path.join(output, "agent/catalog.json"), "utf8"))
    assert.equal(catalog.pages.length, 1)
    assert.equal(catalog.pages[0].language, "en")
    const fetcher = (async (input: URL | RequestInfo) => {
      const pathname = decodeURIComponent(new URL(String(input)).pathname)
      try {
        const text = await readFile(path.join(output, pathname), "utf8")
        return new Response(text, {
          headers: {
            "content-type": pathname.endsWith(".json") ? "application/json" : "text/plain",
          },
        })
      } catch {
        return new Response("not found", { status: 404 })
      }
    }) as typeof fetch
    const repository = createRepository("https://preview.test", "build", fetcher)
    const read = await createReader(repository)({
      slug: catalog.pages[0].slug,
      offset: 0,
      length: 12000,
    })
    assert.match(read.data.content, /OneAgent|MCP/)
    assert.equal(read.data.canonicalUrl, catalog.pages[0].url)
    assert.ok(read.data.headings.every((h) => h.id && h.url?.startsWith(read.data.canonicalUrl)))
    assert.equal(
      JSON.parse(await readFile(path.join(output, "agent/search-index.json"), "utf8")).revision,
      catalog.revision,
    )
    assert.equal(read.data.sectionReadingAvailable, true)
    const heading = read.data.headings[0]
    const section = await createReader(repository)({
      slug: catalog.pages[0].slug,
      headingId: heading.id!,
      offset: 0,
      length: 12000,
    })
    assert.equal(section.data.citationUrl, heading.url)
    assert.match(section.data.content, /^## /)
    await emit([])
    const empty = JSON.parse(await readFile(path.join(output, "agent/catalog.json"), "utf8"))
    assert.equal(empty.pages.length, 0)
    assert.notEqual(empty.revision, catalog.revision)
    await assert.rejects(
      readFile(path.join(output, "agent/pages", catalog.pages[0].slug + ".md")),
      { code: "ENOENT" },
    )
    await assert.rejects(
      readFile(path.join(output, "agent/sections", catalog.pages[0].slug + ".json")),
      { code: "ENOENT" },
    )
    // Existing discovery endpoints remain valid after withdrawal.
    assert.match(await readFile(path.join(output, "llms.txt"), "utf8"), /manifest/)
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})
