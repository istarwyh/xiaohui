import type { Root, Element } from "hast"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { visit } from "unist-util-visit"
import { stripFrontmatter } from "../../util/frontmatter"
import type { Heading, Sections } from "../contracts/notes"
import { digest } from "./catalog"

/** Join actual final heading IDs to parser positions, never re-create IDs from text. */
export function buildSections(
  source: string,
  tree: Root,
  headings: Heading[],
  hash: string,
  revision: string,
): Sections {
  const body = stripFrontmatter(source)
  const markdown = body.trim()
  const base = source.length - body.length + body.length - body.trimStart().length
  const parsed = unified().use(remarkParse).parse(markdown)
  const sourceHeadings = new Map<number, number>()
  visit(parsed, "heading", (node) => {
    if (node.position?.start.offset !== undefined)
      sourceHeadings.set(node.position.start.offset, node.depth)
  })
  const positions: Array<{ id: string; start: number; depth: number }> = []
  let reliable = true
  visit(tree, "element", (node: Element) => {
    const match = /^h([1-6])$/.exec(node.tagName)
    if (!match) return
    const id = node.properties?.id
    const offset = node.position?.start.offset
    const start = offset === undefined ? -1 : offset - base
    const depth = Number(match[1])
    if (
      typeof id !== "string" ||
      !id ||
      sourceHeadings.get(start) !== depth ||
      (positions.length && start <= positions[positions.length - 1].start)
    ) {
      reliable = false
    }
    positions.push({ id: typeof id === "string" ? id : "", start, depth })
  })
  reliable = Boolean(
    reliable &&
    positions.length &&
    positions.length === sourceHeadings.size &&
    positions.length === headings.length &&
    new Set(positions.map((p) => p.id)).size === positions.length,
  )
  const ranges = reliable
    ? positions.map((p, i) => {
        const next = positions.slice(i + 1).find((n) => n.depth <= p.depth)
        return {
          id: p.id,
          start: Array.from(markdown.slice(0, p.start)).length,
          end: Array.from(markdown.slice(0, next?.start ?? markdown.length)).length,
        }
      })
    : []
  return {
    schemaVersion: "1.0",
    revision,
    hash,
    headings,
    markdownDigest: digest(markdown),
    available: reliable,
    ranges,
  }
}
