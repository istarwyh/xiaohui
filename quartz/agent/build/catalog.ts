import { createHash } from "node:crypto"
import type { Catalog, Note } from "../contracts/notes"

export function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

/** Called only with the emitter's already-filtered public collection. */
export function buildCatalog(pages: Note[], searchMetadata: unknown): Catalog {
  const sorted = [...pages].sort((a, b) => a.slug.localeCompare(b.slug))
  return {
    schemaVersion: "1.0",
    revision: digest(JSON.stringify([sorted, searchMetadata])),
    pages: sorted,
  }
}
