import assert from "node:assert/strict"
import test from "node:test"
import { parseHTML } from "linkedom"
import { posterTextBoundary, selectPosterExcerpt, snapshotArticle } from "./sharePoster"

function article(html: string) {
  return parseHTML(`<html><body><article>${html}</article></body></html>`).document.querySelector(
    "article",
  )! as unknown as HTMLElement
}

test("snapshot preserves paragraph breaks and inline semantic markup without changing the source", () => {
  const source = article(
    "<p>第一段<br>下一行 <strong>重点</strong> <em>语气</em> <code>inline()</code></p><p>第二段</p>",
  )
  const original = source.outerHTML
  const copy = snapshotArticle(source)
  assert.equal(source.outerHTML, original)
  assert.equal(copy.querySelectorAll("p").length, 2)
  assert.equal(copy.querySelectorAll("br").length, 1)
  for (const tag of ["strong", "em", "code"]) assert.ok(copy.querySelector(tag))
  assert.equal(copy.textContent, source.textContent)
})

test("snapshot retains nested lists, quotes, highlighted code, table cells, images and math", () => {
  const source = article(
    '<ol start="3"><li>A<ul><li>B</li></ul></li></ol><blockquote><p>引文</p></blockquote>' +
      '<pre><code><span style="color: rgb(120, 20, 30)">  const x = 1</span>\n    return x</code></pre>' +
      "<table><thead><tr><th>名称</th><th>值</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>" +
      '<figure><img src="https://example.com/real.png" alt="实际图片"><figcaption>图注</figcaption></figure>' +
      '<span class="katex"><span class="katex-mathml"><math><mi>x</mi></math></span><span class="katex-html" aria-hidden="true"><span>x</span><svg viewBox="0 0 10 10"><path d="M0 0L10 10"></path></svg></span></span>',
  )
  const copy = snapshotArticle(source)
  for (const selector of [
    "ol[start='3'] li ul li",
    "blockquote p",
    "pre code span",
    "table th",
    "table td",
    "figure img",
    "figcaption",
    ".katex-html svg path",
  ])
    assert.ok(copy.querySelector(selector), selector)
  assert.equal(copy.querySelector("pre")?.textContent, "  const x = 1\n    return x")
  assert.equal(copy.querySelector("img")?.getAttribute("alt"), "实际图片")
})

test("snapshot excludes active controls and executable attributes", () => {
  const source = article(
    '<p onclick="steal()">Visible</p><script>steal()</script><iframe src="https://example.com"></iframe><button>copy</button><p hidden>secret</p><a href="javascript:steal()">text</a><img src="https://example.com/p.png" onerror="steal()">',
  )
  const copy = snapshotArticle(source)
  assert.equal(copy.querySelectorAll("script,iframe,button,[hidden],[onclick],[onerror]").length, 0)
  assert.equal(copy.textContent?.includes("secret"), false)
  assert.equal(copy.querySelector('[href^="javascript:"]'), null)
  assert.ok(copy.textContent?.includes("Visible"))
})

test("short DOM excerpts retain complete blocks and do not fade", () => {
  const source = snapshotArticle(article("<p>第一段<strong>强调</strong></p><p>第二段<br>末行</p>"))
  const result = selectPosterExcerpt(source)
  assert.equal(result.truncated, false)
  assert.equal(result.article.querySelectorAll("p").length, 2)
  assert.ok(result.article.querySelector("strong"))
  assert.ok(result.article.querySelector("br"))
})

test("excerpt ends on a nearby complete paragraph and preserves the next heading's content", () => {
  const source = snapshotArticle(
    article(`<p>${"甲".repeat(450)}</p><p>${"乙".repeat(420)}</p><p>剩余内容</p>`),
  )
  const result = selectPosterExcerpt(source)
  assert.equal(result.truncated, true)
  assert.equal(result.article.textContent, "甲".repeat(450) + "乙".repeat(420))
  const heading = selectPosterExcerpt(
    snapshotArticle(article(`<p>${"甲".repeat(795)}</p><h2>下一节</h2><p>本节内容</p><p>后文</p>`)),
  )
  assert.ok(heading.article.textContent?.includes("本节内容"))
})

test("oversized inline paragraphs truncate without dropping emphasis or splitting emoji", () => {
  const emoji = "👩🏽‍💻"
  const source = snapshotArticle(
    article(`<p>开头<strong>${emoji.repeat(1100)}</strong><em>末尾</em></p>`),
  )
  const result = selectPosterExcerpt(source)
  assert.equal(result.truncated, true)
  assert.ok(result.article.querySelector("strong"))
  assert.equal(result.article.querySelector("em"), null)
  const text = result.article.querySelector("strong")!.textContent!
  assert.equal(text.replaceAll(emoji, ""), "")
  assert.ok(text.length > 0)
})

test("text boundaries favor sentences and never bisect a grapheme", () => {
  const sentence = "甲".repeat(820) + "。" + "乙".repeat(400)
  assert.equal(sentence.slice(0, posterTextBoundary(sentence)), "甲".repeat(820) + "。")
  const text = "👩🏽‍💻".repeat(1200)
  const excerpt = text.slice(0, posterTextBoundary(text))
  assert.equal(excerpt.replaceAll("👩🏽‍💻", ""), "")
  assert.ok(excerpt.length > 0 && excerpt.length < text.length)
})

test("SVG arrows and clipping keep local definitions after IDs are remapped", () => {
  const source = article(
    '<svg viewBox="0 0 100 40"><defs><marker id="arrow" markerWidth="4" markerHeight="4"><path d="M0 0L4 2L0 4Z"/></marker><clipPath id="clip" clipPathUnits="userSpaceOnUse"><rect width="100" height="40"/></clipPath></defs><path d="M0 20L90 20" marker-end="url(#arrow)" clip-path="url(#clip)"/></svg>',
  )
  const copy = snapshotArticle(source)
  const marker = copy.querySelector("marker")!
  const clip = copy.querySelector("clipPath")!
  const arrow = copy.querySelector("svg > path")!
  assert.ok(marker.id && marker.id !== "arrow")
  assert.equal(arrow.getAttribute("marker-end"), `url(#${marker.id})`)
  assert.equal(arrow.getAttribute("clip-path"), `url(#${clip.id})`)
  assert.equal(clip.getAttribute("clipPathUnits"), "userSpaceOnUse")
})

test("merged table cells retain their original relationships in the snapshot", () => {
  const copy = snapshotArticle(
    article(
      '<table><thead><tr><th colspan="2">Group</th><th>Other</th></tr></thead><tbody><tr><td rowspan="2">A</td><td>B</td><td>C</td></tr><tr><td>D</td><td>E</td></tr></tbody></table>',
    ),
  )
  assert.equal(copy.querySelector("th")?.getAttribute("colspan"), "2")
  assert.equal(copy.querySelector("td")?.getAttribute("rowspan"), "2")
  assert.equal(copy.querySelectorAll("tr").length, 3)
})
