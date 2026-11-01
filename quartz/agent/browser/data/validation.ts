import type { Catalog, Sections } from "../../contracts/notes"
import { AgentError } from "../../contracts/result"

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const headings = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (h) =>
      object(h) &&
      typeof h.text === "string" &&
      Number.isInteger(h.depth) &&
      Number(h.depth) >= 1 &&
      Number(h.depth) <= 6 &&
      (h.id === undefined || typeof h.id === "string") &&
      (h.url === undefined || typeof h.url === "string"),
  )

function version(value: unknown): asserts value is Record<string, unknown> {
  if (!object(value) || value.schemaVersion !== "1.0" || typeof value.revision !== "string") {
    throw new AgentError("UNSUPPORTED_SCHEMA", "内容索引版本不兼容，请刷新页面。")
  }
}

function invalid(): never {
  throw new AgentError("INDEX_UNAVAILABLE", "内容索引格式无效。", true)
}

export function catalog(value: unknown): Catalog {
  version(value)
  if (
    !Array.isArray(value.pages) ||
    !value.pages.every(
      (p) =>
        object(p) &&
        ["slug", "title", "url", "markdownUrl", "hash"].every((k) => typeof p[k] === "string") &&
        ["zh", "en"].includes(String(p.language)) &&
        ["article", "home", "list"].includes(String(p.kind)),
    ) ||
    new Set(value.pages.map((p) => p.slug)).size !== value.pages.length
  )
    invalid()
  return value as unknown as Catalog
}

export function sections(value: unknown): Sections {
  version(value)
  if (
    typeof value.available !== "boolean" ||
    (value.available &&
      (!Array.isArray(value.ranges) ||
        value.ranges.length !== (value.headings as unknown[] | undefined)?.length ||
        !value.ranges.every(
          (r) =>
            object(r) &&
            typeof r.id === "string" &&
            Number.isSafeInteger(r.start) &&
            Number.isSafeInteger(r.end) &&
            Number(r.start) >= 0 &&
            Number(r.end) > Number(r.start),
        ) ||
        new Set(value.ranges.map((r) => r.id)).size !== value.ranges.length)) ||
    typeof value.hash !== "string" ||
    typeof value.markdownDigest !== "string" ||
    !headings(value.headings)
  )
    invalid()
  return value as unknown as Sections
}
