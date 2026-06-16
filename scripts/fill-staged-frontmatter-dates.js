#!/usr/bin/env node
// Fills missing frontmatter dates in staged markdown files before commit.

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import matter from "gray-matter"

const DATE_ALIASES = {
  created: ["created", "date"],
  modified: ["modified", "lastmod", "updated", "last-modified"],
  published: ["published", "publishDate", "date"],
}

function stagedMarkdownFiles() {
  const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    encoding: "utf8",
  })

  return output
    .split("\n")
    .filter((file) => file.startsWith("content/") && file.endsWith(".md"))
    .filter((file) => !file.split("/").some((part) => part.startsWith(".")))
    .filter((file) => fs.existsSync(file))
}

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

function frontmatterBounds(text) {
  if (!text.startsWith("---\n")) return undefined

  const close = text.indexOf("\n---", 4)
  if (close === -1) return undefined

  return {
    fmStart: 4,
    fmEnd: close,
  }
}

function hasAny(data, keys) {
  return keys.some((key) => data[key] !== undefined && data[key] !== null && data[key] !== "")
}

function missingFields(data, date) {
  const fields = []

  if (!hasAny(data, DATE_ALIASES.created)) {
    fields.push(["created", date])
  }
  if (!hasAny(data, DATE_ALIASES.modified)) {
    fields.push(["modified", date])
  }
  if (!hasAny(data, DATE_ALIASES.published)) {
    fields.push(["published", date])
  }

  return fields
}

function insertFieldsIntoFrontmatter(frontmatter, fields) {
  const lines = frontmatter.length > 0 ? frontmatter.split("\n") : []
  const insertAt = lines.findIndex((line) => /^title\s*:/.test(line))
  const rendered = fields.map(([key, value]) => `${key}: ${value}`)

  if (insertAt >= 0) {
    lines.splice(insertAt + 1, 0, ...rendered)
  } else {
    lines.unshift(...rendered)
  }

  return lines.join("\n")
}

function applyFields(text, fields) {
  const bounds = frontmatterBounds(text)
  if (!bounds) {
    return `---\n${fields.map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n\n${text}`
  }

  const frontmatter = text.slice(bounds.fmStart, bounds.fmEnd)
  const nextFrontmatter = insertFieldsIntoFrontmatter(frontmatter, fields)
  return `${text.slice(0, bounds.fmStart)}${nextFrontmatter}${text.slice(bounds.fmEnd)}`
}

function main() {
  const date = todayInShanghai()
  const changed = []

  for (const file of stagedMarkdownFiles()) {
    const text = fs.readFileSync(file, "utf8")
    let data
    try {
      data = matter(text).data ?? {}
    } catch {
      continue
    }

    const fields = missingFields(data, date)
    if (fields.length === 0) continue

    fs.writeFileSync(file, applyFields(text, fields))
    execFileSync("git", ["add", "--", file])
    changed.push({ file, fields })
  }

  if (changed.length > 0) {
    console.log(`Filled frontmatter dates in ${changed.length} staged file(s):`)
    for (const change of changed) {
      console.log(`- ${change.file}: ${change.fields.map(([key]) => key).join(", ")}`)
    }
  }
}

main()
