#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "./lib/frontmatter.js"

const CONTENT_DIR = "content"
const FALLBACK_DATE = "2026-01-01"
const IGNORED_FILE_NAMES = new Set(["CLAUDE.md"])
const IGNORED_DIR_NAMES = new Set(["private", "templates"])
const DATE_ALIASES = {
  created: ["created", "date"],
  modified: ["modified", "lastmod", "updated", "last-modified"],
  published: ["published", "publishDate", "date"],
}

function usage() {
  console.log(`Usage:
  node scripts/backfill-frontmatter-dates.js [--write] [--include-index]

Default mode is dry-run.

Rules:
  created   = earliest git author date visible for the current file path
  modified  = latest git author date visible for the current file path
  published = created

Existing frontmatter date fields are preserved. The script only fills missing
canonical fields when no equivalent alias exists.`)
}

function walkMarkdown(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue
    if (entry.isDirectory() && IGNORED_DIR_NAMES.has(entry.name)) continue
    if (entry.isFile() && IGNORED_FILE_NAMES.has(entry.name)) continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkMarkdown(fullPath, out)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(fullPath)
    }
  }
  return out
}

function gitDatesFor(file) {
  try {
    const output = execFileSync("git", ["log", "--follow", "--format=%aI", "--", file], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean)

    if (output.length === 0) return undefined

    return {
      created: output[output.length - 1],
      modified: output[0],
    }
  } catch {
    return undefined
  }
}

function frontmatterBounds(text) {
  if (!text.startsWith("---\n")) return undefined

  const close = text.indexOf("\n---", 4)
  if (close === -1) return undefined

  const closeLineEnd = text.indexOf("\n", close + 1)
  return {
    bodyStart: closeLineEnd === -1 ? text.length : closeLineEnd + 1,
    fmStart: 4,
    fmEnd: close,
  }
}

function hasAny(data, keys) {
  return keys.some((key) => data[key] !== undefined && data[key] !== null)
}

function plannedFields(data, dates) {
  const fields = []

  if (!hasAny(data, DATE_ALIASES.created)) {
    fields.push(["created", dates.created])
  }
  if (!hasAny(data, DATE_ALIASES.modified)) {
    fields.push(["modified", dates.modified])
  }
  if (!hasAny(data, DATE_ALIASES.published)) {
    fields.push(["published", dates.created])
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
  const args = new Set(process.argv.slice(2))
  if (args.has("--help") || args.has("-h")) {
    usage()
    return
  }

  const write = args.has("--write")
  const includeIndex = args.has("--include-index")
  const files = walkMarkdown(CONTENT_DIR)
    .filter((file) => includeIndex || path.relative(CONTENT_DIR, file) !== "index.md")
    .sort((a, b) => a.localeCompare(b))

  const changes = []
  const skipped = {
    existing: 0,
    noGit: 0,
    parseError: 0,
  }

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8")
    let data
    try {
      data = parseFrontmatter(text).data
    } catch (error) {
      skipped.parseError += 1
      changes.push({ file, error: `frontmatter parse error: ${String(error).split("\n")[0]}` })
      continue
    }

    const dates = gitDatesFor(file) ?? { created: FALLBACK_DATE, modified: FALLBACK_DATE }
    if (dates.created === FALLBACK_DATE) {
      skipped.noGit += 1
    }

    const fields = plannedFields(data, dates)
    if (fields.length === 0) {
      skipped.existing += 1
      continue
    }

    changes.push({ file, fields })

    if (write) {
      fs.writeFileSync(file, applyFields(text, fields))
    }
  }

  const action = write ? "Updated" : "Would update"
  console.log(`${action} ${changes.filter((c) => c.fields).length} file(s).`)
  console.log(`Skipped existing dates: ${skipped.existing}`)
  console.log(`Used ${FALLBACK_DATE} fallback (no git history): ${skipped.noGit}`)
  console.log(`Skipped parse errors: ${skipped.parseError}`)

  for (const change of changes.slice(0, 20)) {
    if (change.error) {
      console.log(`- ${change.file}: ${change.error}`)
      continue
    }

    console.log(
      `- ${change.file}: ${change.fields.map(([key, value]) => `${key}=${value}`).join(", ")}`,
    )
  }

  if (!write && changes.some((c) => c.fields)) {
    console.log("\nDry-run only. Re-run with --write to modify files.")
  }
}

main()
