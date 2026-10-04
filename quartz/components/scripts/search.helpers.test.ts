import assert from "node:assert/strict"
import test from "node:test"
import {
  highlightSearchText,
  nextSearchResultIndex,
  parseSearchQuery,
  searchTermPattern,
} from "./search.helpers"

test("search terms are literal, including regex metacharacters and non-Latin text", () => {
  for (const term of ["[", "]", "(", "C++", "a.b", "foo?", "a|b", "^$", "\\", "智能体"]) {
    assert.equal(
      highlightSearchText(term, `before ${term} after`),
      `before <span class="highlight">${term}</span> after`,
    )
  }
  assert.equal(searchTermPattern(" "), undefined)
  assert.equal(highlightSearchText("a.b", "aXb"), "aXb")
})

test("highlighting escapes indexed HTML and does not mutate highlight markup", () => {
  assert.equal(
    highlightSearchText('<img src="x">', '<img src="x">'),
    '<span class="highlight">&lt;img src=&quot;x&quot;&gt;</span>',
  )
  assert.equal(highlightSearchText("", "<script>&'"), "&lt;script&gt;&amp;&#039;")
  assert.equal(
    highlightSearchText("one two", "ONE TWO three"),
    '<span class="highlight">ONE TWO</span> three',
  )
})

test("short excerpts retain their final word and only truncated excerpts get ellipses", () => {
  assert.equal(
    highlightSearchText("last", "first last", true),
    'first <span class="highlight">last</span>',
  )
  assert.equal(highlightSearchText("missing", "one", true), "one")
  const result = highlightSearchText(
    "target",
    `${"before ".repeat(90)}target ${"after ".repeat(90)}`,
    true,
  )
  assert.ok(result.startsWith("…"))
  assert.ok(result.endsWith("…"))
  assert.ok(result.includes('<span class="highlight">target</span>'))
})

test("tag-only and tag-filtered searches retain the correct query and highlight term", () => {
  assert.deepEqual(parseSearchQuery("  hello  "), { type: "basic", term: "hello" })
  assert.deepEqual(parseSearchQuery("#agent"), { type: "tags", term: "agent" })
  assert.deepEqual(parseSearchQuery("#agent  C++"), { type: "basic", term: "C++", tag: "agent" })
  assert.deepEqual(parseSearchQuery("#"), { type: "tags", term: "" })
})

test("first ArrowDown selects the first result and ArrowUp returns to input", () => {
  assert.equal(nextSearchResultIndex(-1, 3, 1), 0)
  assert.equal(nextSearchResultIndex(0, 3, 1), 1)
  assert.equal(nextSearchResultIndex(0, 3, -1), -1)
  assert.equal(nextSearchResultIndex(-1, 3, -1), 2)
  assert.equal(nextSearchResultIndex(2, 3, 1), 2)
  assert.equal(nextSearchResultIndex(-1, 0, 1), -1)
})
