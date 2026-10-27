/** A published share slug is an immutable root-level entry, not the canonical slug. */
export function parseShareSlug(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "string" || !/^[a-z]+(?:-[a-z]+)*$/.test(value)) {
    throw new Error("shareSlug must contain lowercase English words separated by single hyphens")
  }
  return value
}
