import assert from "node:assert/strict"
import test from "node:test"
import { parseHTML } from "linkedom"
import { createShareMetadata } from "./shareMetadata"

function page() {
  const { document } = parseHTML(`<html><head><title>Fallback title</title>
    <meta name="share-url" content="https://example.test/short">
    <link rel="canonical" href="https://example.test/original">
    <meta property="og:description" content="OG excerpt">
    </head><body><h1>Article <span class="copy-page-control">Controls</span></h1>
    <textarea id="copy-page-markdown-source"></textarea><article><p>DOM excerpt</p></article>
    </body></html>`)
  const heading = document.querySelector("h1")!
  const reader = createShareMetadata(document, heading, () => "https://example.test/current")
  return { document, heading, reader, source: document.querySelector("textarea")! }
}

test("share URL fallback is live and handles removed or empty metadata", () => {
  const { document, reader } = page()
  assert.equal(reader.shareUrlForPage(), "https://example.test/short")
  document.querySelector('meta[name="share-url"]')!.setAttribute("content", "")
  assert.equal(reader.shareUrlForPage(), "https://example.test/original")
  document.querySelector("link")!.remove()
  assert.equal(reader.shareUrlForPage(), "https://example.test/current")
  document
    .querySelector('meta[name="share-url"]')!
    .setAttribute("content", "https://example.test/new")
  assert.equal(reader.shareData().url, "https://example.test/new")
})

test("title excludes controls without mutating the live heading", () => {
  const { heading, reader } = page()
  assert.equal(reader.shareData().title, "Article")
  assert.ok(heading.querySelector(".copy-page-control"))
  heading.firstChild!.textContent = "Updated article "
  assert.equal(reader.shareData().title, "Updated article")
})

test("description retains YAML, body, OG and DOM priority", () => {
  const { document, reader, source } = page()
  source.value = '---\ndescription: "Quoted description"\n---\n\nBody excerpt'
  assert.equal(reader.shareData().text, "Quoted description")
  source.value = "---\ndescription: |\n  First line\n  Second line\n---\n\nBody excerpt"
  assert.equal(reader.shareData().text, "First line\nSecond line")
  source.value = "---\ntitle: ignored\n---\n\n# Heading\n\nBody **excerpt**"
  assert.equal(reader.shareData().text, "Body excerpt")
  assert.equal(reader.markdownSource(), source.value)
  source.value = ""
  assert.equal(reader.shareData().text, "OG excerpt")
  document.querySelector('meta[property="og:description"]')!.remove()
  assert.equal(reader.shareData().text, "DOM excerpt")
})

test("a new navigation reader uses its own heading and document", () => {
  const first = page()
  const second = page()
  second.heading.firstChild!.textContent = "Second page "
  second.document
    .querySelector('meta[name="share-url"]')!
    .setAttribute("content", "https://example.test/second")
  assert.equal(second.reader.shareData().title, "Second page")
  assert.equal(second.reader.shareData().url, "https://example.test/second")
  assert.equal(first.reader.shareData().title, "Article")
  assert.equal(first.reader.shareData().url, "https://example.test/short")
})
