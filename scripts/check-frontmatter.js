#!/usr/bin/env node
// Validates frontmatter dates in staged markdown files.
//
// Rules:
//   1. Frontmatter must parse as valid YAML.
//   2. Any of {created, modified, published, date, lastmod, updated} must be
//      either ISO-8601 (YYYY-MM-DD or full datetime) or a YAML date.
//   3. The resulting date must be parseable by JS Date.
//   4. The date must not be in the far future (more than 1 day ahead).
//
// Invoked from .git/hooks/pre-commit. Pass --all to scan every md file under
// content/ (useful for CI / one-shot audits).

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const DATE_FIELDS = ["created", "modified", "published", "date", "lastmod", "updated", "last-modified"]
// Required field groups: each group must have at least one alias present.
const REQUIRED_GROUPS = {
  created: ["created", "date"],
  modified: ["modified", "lastmod", "updated", "last-modified"],
}
// Accept full ISO-8601 datetimes or date-only.
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function getStagedMarkdown() {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" })
    return out
      .split("\n")
      .filter((p) => p.endsWith(".md") && p.startsWith("content/"))
      .filter((p) => fs.existsSync(p))
  } catch {
    return []
  }
}

function getAllMarkdown(root = "content") {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "public") continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith(".md")) out.push(p)
    }
  }
  walk(root)
  return out
}

function checkFile(file) {
  const errors = []
  let fm
  try {
    fm = matter(fs.readFileSync(file)).data || {}
  } catch (e) {
    errors.push(`frontmatter parse error: ${String(e).split("\n")[0]}`)
    return errors
  }
  const hasValue = (k) => fm[k] !== undefined && fm[k] !== null && fm[k] !== ""
  for (const [group, aliases] of Object.entries(REQUIRED_GROUPS)) {
    if (!aliases.some(hasValue)) {
      errors.push(`missing required "${group}" field (any of: ${aliases.join(", ")})`)
    }
  }
  for (const key of DATE_FIELDS) {
    const v = fm[key]
    if (v === undefined || v === null) continue
    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) errors.push(`${key}: invalid date object`)
      continue
    }
    const s = String(v)
    if (!ISO_RE.test(s)) {
      errors.push(`${key}: "${s}" is not ISO-8601 (use YYYY-MM-DD or full RFC 3339)`)
      continue
    }
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s)
    if (Number.isNaN(parsed.getTime())) {
      errors.push(`${key}: "${s}" is unparseable`)
      continue
    }
    const tooFarAhead = parsed.getTime() - Date.now() > 24 * 60 * 60 * 1000
    if (tooFarAhead) errors.push(`${key}: "${s}" is more than 1 day in the future`)
  }
  return errors
}

const args = process.argv.slice(2)
const all = args.includes("--all")
const files = all ? getAllMarkdown() : getStagedMarkdown()

if (!files.length) {
  process.exit(0)
}

let failed = 0
for (const f of files) {
  const errs = checkFile(f)
  if (errs.length) {
    failed++
    console.error(`\x1b[31m✗\x1b[0m ${f}`)
    for (const e of errs) console.error(`    ${e}`)
  }
}

if (failed > 0) {
  console.error("")
  console.error(`Frontmatter check failed for ${failed} file(s).`)
  console.error("Fix the dates above. Supported formats:")
  console.error("  created: 2025-07-02")
  console.error("  created: 2025-07-02T08:29:00+08:00")
  process.exit(1)
}
