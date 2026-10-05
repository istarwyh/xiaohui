import assert from "node:assert/strict"
import test from "node:test"
import { parseFrontmatter } from "./frontmatter.js"

test("frontmatter hooks use js-yaml's supported ESM API and preserve ISO date text", () => {
  const parsed = parseFrontmatter(
    "---\ncreated: 2026-10-04\nmodified: 2026-10-04\ntitle: 晓灰\n---\nBody\n",
  )
  assert.deepEqual(parsed.data, { created: "2026-10-04", modified: "2026-10-04", title: "晓灰" })
  assert.equal(parsed.content, "Body\n")
})
test("frontmatter hooks retain BOM/CRLF and reject malformed YAML", () => {
  assert.equal(parseFrontmatter("\uFEFF---\r\ntitle: Hello\r\n---\r\nBody").data.title, "Hello")
  assert.throws(() => parseFrontmatter("---\ntitle: [broken\n---\nBody"))
  assert.deepEqual(parseFrontmatter("No metadata"), { data: {}, content: "No metadata" })
})
