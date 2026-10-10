import assert from "node:assert/strict"
import test from "node:test"
import { h } from "preact"
import renderToString from "preact-render-to-string"
import Content from "./Content"
import type { QuartzComponentProps } from "../types"

function renderContent(author?: unknown) {
  const props = {
    fileData: {
      filePath: "content/example.md",
      frontmatter: { title: "An article", cssclasses: ["custom-article"], author },
    },
    tree: {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Original article body" }],
        },
      ],
    },
    rawMarkdown: "# An article\n\nOriginal article body <keep as text>",
  } as unknown as QuartzComponentProps
  return renderToString(h(Content(), props))
}

function shareAuthor(html: string) {
  return html.match(/<article\b[^>]*\bdata-share-author="([^"]*)"/)?.[1]
}

test("article SSR exposes its own frontmatter author for the long share poster", () => {
  const html = renderContent("小灰")
  assert.equal(shareAuthor(html), "小灰")
  assert.match(html, /<article class="popover-hint custom-article"/)
  assert.match(html, /<p>Original article body<\/p>/)
  assert.match(html, /<textarea id="copy-page-markdown-source"[^>]*hidden[^>]*readOnly/i)
  assert.match(html, /Original article body &lt;keep as text(?:>|&gt;)<\/textarea>/)
})

test("article SSR combines multiple credited authors without altering their names", () => {
  assert.equal(shareAuthor(renderContent(["小灰", "Guest author"])), "小灰、Guest author")
})

test("article SSR safely escapes an author attribute", () => {
  const html = renderContent('A "quoted" <author> & contributor')
  assert.equal(
    shareAuthor(html)?.replace(/&gt;/g, ">"),
    "A &quot;quoted&quot; &lt;author> &amp; contributor",
  )
  assert.doesNotMatch(html, /<author>/)
})

test("an absent or malformed article author never invents attribution", () => {
  for (const author of [undefined, null, 42, false, { name: "Do not stringify" }]) {
    assert.equal(shareAuthor(renderContent(author)), undefined)
  }
  for (const author of [[], [null, 42, false, { name: "Do not stringify" }]]) {
    assert.equal(shareAuthor(renderContent(author)) || undefined, undefined)
  }
  assert.equal(shareAuthor(renderContent([null, "Actual author", 42, {}])), "Actual author")
})
