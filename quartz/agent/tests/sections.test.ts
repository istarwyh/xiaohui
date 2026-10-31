import assert from "node:assert/strict"
import test from "node:test"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkFrontmatter from "remark-frontmatter"
import remarkRehype from "remark-rehype"
import rehypeSlug from "rehype-slug"
import { visit } from "unist-util-visit"
import { toString } from "hast-util-to-string"
import type { Root, Element } from "hast"
import { buildSections } from "../build/sections"
import { createReader } from "../browser/reading/service"
import type { Heading, NoteRepository } from "../contracts/notes"

async function parse(markdown: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkRehype)
    .use(rehypeSlug)
  const tree = (await processor.run(processor.parse(markdown))) as Root
  const headings: Heading[] = []
  visit(tree, "element", (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName))
      headings.push({
        depth: Number(node.tagName[1]),
        text: toString(node),
        id: String(node.properties?.id),
        url: "https://xiaohui.cool/note#" + encodeURIComponent(String(node.properties?.id)),
      })
  })
  return { tree, headings }
}

test("duplicate Chinese headings, nested sections, Setext and emoji have exact parser-derived ranges", async () => {
  const markdown =
    "# 总览😀\n\n开头。\n\n## 重复标题\n\n第一段😀。\n\n### 子节\n\n子内容。\n\n## 重复标题\n\n第二段。\n\n尾节\n----\n\n末尾。\n\n```md\n## 这不是标题\n```"
  const { tree, headings } = await parse(markdown)
  const sections = buildSections(markdown, tree, headings, "hash", "revision")
  assert.equal(sections.available, true)
  assert.equal(sections.ranges?.length, 5)
  const note = {
    slug: "note",
    title: "Note",
    url: "https://xiaohui.cool/note",
    markdownUrl: "https://xiaohui.cool/agent/pages/note.md",
    hash: "hash",
    kind: "article" as const,
    language: "zh" as const,
  }
  const repo: NoteRepository = {
    readMarkdown: async () => ({ note, markdown, sections, revision: "revision" }),
    getCatalog: async () => ({ schemaVersion: "1.0", revision: "revision", pages: [note] }),
    getSections: async () => sections,
  }
  const read = createReader(repo)
  const first = await read({ slug: "note", headingId: headings[1].id, offset: 0, length: 12000 })
  assert.match(first.data.content, /第一段😀/)
  assert.match(first.data.content, /子内容/)
  assert.doesNotMatch(first.data.content, /第二段/)
  const second = await read({ slug: "note", headingId: headings[3].id, offset: 0, length: 12000 })
  assert.match(second.data.content, /第二段/)
  assert.doesNotMatch(second.data.content, /第一段|末尾/)
  assert.notEqual(first.data.citationUrl, second.data.citationUrl)
  const chunk = await read({ slug: "note", headingId: headings[1].id, offset: 0, length: 8 })
  assert.equal(chunk.data.nextOffset, 8)
})

test("frontmatter and leading whitespace are accounted for without guessing heading slugs", async () => {
  const source = '---\ntitle: "metadata"\n---\n\n  \n# Title\n\nText\n\n## Next\n\nBody'
  const { tree, headings } = await parse(source)
  const sections = buildSections(source, tree, headings, "hash", "revision")
  assert.equal(sections.available, true)
  assert.equal(sections.ranges?.[0].start, 0)
})

test("missing positions or unmatched generated headings retain the explicit section fallback", async () => {
  const markdown = "## Real\n\nText"
  const { tree, headings } = await parse(markdown)
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "h2") delete node.position
  })
  assert.equal(buildSections(markdown, tree, headings, "hash", "revision").available, false)
})
