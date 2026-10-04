import type { Element, Root } from "hast"
import type { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, joinSegments, pathToRoot, simplifySlug } from "./path"

interface FeedImage {
  src: string
  alt: string
}

// A fixed origin is only used to resolve paths, never emitted in the page.
const PATH_ORIGIN = "https://feed.invalid"
const MAX_IMAGES = 3

function imageSource(
  raw: unknown,
  sourceSlug: FullSlug,
  currentSlug: FullSlug,
  availableAssets?: ReadonlySet<string>,
): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined
  const src = raw.trim()
  if (src.startsWith("#")) return undefined

  try {
    const sourcePath = simplifySlug(sourceSlug).replace(/^\//, "")
    const url = new URL(src, `${PATH_ORIGIN}/${sourcePath}`)
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    if (url.origin !== PATH_ORIGIN) return src
    const asset = decodeURIComponent(url.pathname).replace(/^\//, "")
    if (availableAssets && !asset.startsWith("static/") && !availableAssets.has(asset)) {
      return undefined
    }
    return joinSegments(pathToRoot(currentSlug), url.pathname) + url.search + url.hash
  } catch {
    return undefined
  }
}

/** Up to three unique images: an explicit cover first, then rendered body images. */
export function getFeedImages(
  page: QuartzPluginData,
  currentSlug: FullSlug,
  availableAssets?: ReadonlySet<string>,
): FeedImage[] {
  const images: FeedImage[] = []
  const seen = new Set<string>()
  const addImage = (src: string | undefined, alt = "") => {
    if (!src || images.length >= MAX_IMAGES) return
    const key = src.split("#", 1)[0]
    if (seen.has(key)) return
    seen.add(key)
    images.push({ src, alt })
  }

  const frontmatter = page.frontmatter as Record<string, unknown> | undefined
  for (const field of ["socialImage", "image", "cover"]) {
    const raw = frontmatter?.[field]
    // Cover paths have historically been relative to the site root. Explicit
    // ./ and ../ paths are relative to the source article, as body images are.
    const sourceSlug =
      typeof raw === "string" && /^\.{1,2}\//.test(raw) ? page.slug! : ("index" as FullSlug)
    addImage(imageSource(raw, sourceSlug, currentSlug, availableAssets))
    if (images.length) break
  }

  if (!page.slug || !page.htmlAst) return images

  function collectImages(node: Root | Element): void {
    if (images.length >= MAX_IMAGES) return
    if (node.type === "element") {
      const props = node.properties
      if (props.hidden || String(props.ariaHidden) === "true") return
      if (["script", "style", "noscript", "template"].includes(node.tagName)) return
      if (node.tagName === "img") {
        // Skip tracking pixels instead of choosing them as article previews.
        if ([props.width, props.height].some((size) => size !== undefined && Number(size) <= 1)) {
          return
        }
        addImage(
          imageSource(props.src, page.slug!, currentSlug, availableAssets),
          typeof props.alt === "string" ? props.alt : "",
        )
      }
    }

    for (const child of node.children) {
      if (images.length >= MAX_IMAGES) break
      if (child.type === "element") collectImages(child)
    }
  }

  collectImages(page.htmlAst)
  return images
}
