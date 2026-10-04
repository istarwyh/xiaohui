import type { Element, Root } from "hast"
import type { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, joinSegments, pathToRoot, simplifySlug } from "./path"

interface FeedImage {
  src: string
  alt: string
}

// A fixed origin is only used to resolve paths, never emitted in the page.
const PATH_ORIGIN = "https://feed.invalid"

function imageSource(
  raw: unknown,
  sourceSlug: FullSlug,
  currentSlug: FullSlug,
): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined
  const src = raw.trim()
  if (src.startsWith("#")) return undefined

  try {
    const sourcePath = simplifySlug(sourceSlug).replace(/^\//, "")
    const url = new URL(src, `${PATH_ORIGIN}/${sourcePath}`)
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    if (url.origin !== PATH_ORIGIN) return src
    return joinSegments(pathToRoot(currentSlug), url.pathname) + url.search + url.hash
  } catch {
    return undefined
  }
}

/** Prefer an explicit cover, then the first real image in the rendered article. */
export function getFeedImage(page: QuartzPluginData, currentSlug: FullSlug): FeedImage | undefined {
  const frontmatter = page.frontmatter as Record<string, unknown> | undefined
  for (const field of ["socialImage", "image", "cover"]) {
    const raw = frontmatter?.[field]
    // Cover paths have historically been relative to the site root. Explicit
    // ./ and ../ paths are relative to the source article, as body images are.
    const sourceSlug =
      typeof raw === "string" && /^\.{1,2}\//.test(raw) ? page.slug! : ("index" as FullSlug)
    const src = imageSource(raw, sourceSlug, currentSlug)
    if (src) return { src, alt: "" }
  }

  if (!page.slug || !page.htmlAst) return undefined

  function findImage(node: Root | Element): FeedImage | undefined {
    if (node.type === "element") {
      const props = node.properties
      if (props.hidden || String(props.ariaHidden) === "true") return undefined
      if (["script", "style", "noscript", "template"].includes(node.tagName)) return undefined
      if (node.tagName === "img") {
        // Skip tracking pixels instead of choosing them as the article preview.
        if ([props.width, props.height].some((size) => size !== undefined && Number(size) <= 1)) {
          return undefined
        }
        const src = imageSource(props.src, page.slug!, currentSlug)
        if (src) return { src, alt: typeof props.alt === "string" ? props.alt : "" }
      }
    }

    for (const child of node.children) {
      if (child.type !== "element") continue
      const image = findImage(child)
      if (image) return image
    }
  }

  return findImage(page.htmlAst)
}
