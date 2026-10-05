import type { QuartzPluginData } from "../plugins/vfile"
import { type FilePath, type FullSlug, resolveRelative, slugifyFilePath } from "./path"
import { normalizeLang } from "./translations"

export type HomeLocale = "zh-CN" | "en"
export type HomeUiLocale = "zh-CN" | "en-US"
export type FeedLanguageScope = "page" | "all"
export type HomeTarget =
  | { kind: "page"; slug: string }
  | { kind: "external"; href: string }
  | { kind: "mailto"; href: string }

export interface CuratedHomeItem {
  id: string
  target: HomeTarget
  label?: string
  note?: string
  required?: boolean
}

export interface ResolvedHomeItem {
  id: string
  kind: HomeTarget["kind"]
  href: string
  label: string
  note?: string
  slug?: FullSlug
  locale?: HomeLocale
  page?: QuartzPluginData
}

export interface HomeDiagnostic {
  level: "warning" | "error"
  code: "missing-language" | "missing-page" | "invalid-target" | "duplicate-item"
  location: string
  message: string
}

export interface FeedPageOptions {
  page?: QuartzPluginData
  languageScope?: FeedLanguageScope
  excludeSlugs?: readonly string[]
  diagnostics?: HomeDiagnostic[]
}

export interface HomeResolutionOptions {
  location?: string
  diagnostics?: HomeDiagnostic[]
}

export class HomeLinkResolutionError extends Error {
  constructor(public readonly diagnostics: HomeDiagnostic[]) {
    super(diagnostics.map((item) => `${item.location}: ${item.message}`).join("\n"))
    this.name = "HomeLinkResolutionError"
  }
}

/** A home layout requires both the explicit marker and one of its two reserved slugs. */
export function isHomePage(page: QuartzPluginData): boolean {
  return page.frontmatter?.pageType === "home" && (page.slug === "index" || page.slug === "en")
}

function hasLanguage(page: QuartzPluginData): boolean {
  return typeof page.frontmatter?.lang === "string" && page.frontmatter.lang.trim() !== ""
}

/** Homepage-only path fallback; it does not change the vault's translation rules. */
export function getPageLanguage(page: QuartzPluginData): string {
  const fallback = page.slug === "en" || page.slug?.startsWith("en/") ? "en" : "zh-CN"
  return normalizeLang(page.frontmatter?.lang, fallback)
}

export function getPageLocale(page: QuartzPluginData): HomeLocale {
  return /^en(?:-|$)/i.test(getPageLanguage(page)) ? "en" : "zh-CN"
}

export function getHomeUiLocale(page: QuartzPluginData): HomeUiLocale {
  return getPageLocale(page) === "en" ? "en-US" : "zh-CN"
}

/** Preserve the pipeline's real dates; an unknown/invalid date stays unknown. */
export function getFeedDate(page: QuartzPluginData): Date | undefined {
  return [page.dates?.modified, page.dates?.published, page.dates?.created].find(
    (date): date is Date => date instanceof Date && Number.isFinite(date.getTime()),
  )
}

function languageGroup(page: QuartzPluginData): string {
  return getPageLanguage(page).toLowerCase().split("-", 1)[0]
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Use only emitter-supplied, already-published files; never scan the vault here. */
export function getFeedPages(
  allFiles: readonly QuartzPluginData[],
  options: FeedPageOptions = {},
): QuartzPluginData[] {
  const excluded = new Set(["index", "en", "404", ...(options.excludeSlugs ?? [])])
  const locale = options.page ? languageGroup(options.page) : "zh"
  const pages = allFiles.filter((page) => {
    const slug = page.slug
    if (!slug || excluded.has(slug) || isHomePage(page)) return false
    if (slug.endsWith("/index") || slug === "tags" || slug.startsWith("tags/")) return false
    if (/^(?:AGENTS|CLAUDE)(?:\.md)?$/i.test(slug.split("/").at(-1) ?? "")) return false
    if (page.frontmatter?.feed === false || page.frontmatter?.pageType === "home") return false
    const title = page.frontmatter?.title
    if (typeof title !== "string" || title.trim() === "") return false
    if (slug.startsWith("en/") && !hasLanguage(page)) {
      options.diagnostics?.push({
        level: "warning",
        code: "missing-language",
        location: slug,
        message: "Missing frontmatter.lang; homepage language falls back to the en/ path.",
      })
    }
    return options.languageScope !== "page" || languageGroup(page) === locale
  })

  return pages.sort((a, b) => {
    const aTime = getFeedDate(a)?.getTime()
    const bTime = getFeedDate(b)?.getTime()
    if (aTime === undefined && bTime !== undefined) return 1
    if (bTime === undefined && aTime !== undefined) return -1
    if (aTime !== undefined && bTime !== undefined && aTime !== bTime) return bTime - aTime
    return compareText(a.frontmatter!.title, b.frontmatter!.title) || compareText(a.slug!, b.slug!)
  })
}

function targetPage(
  slug: string,
  allFiles: readonly QuartzPluginData[],
): QuartzPluginData | undefined {
  const raw = slug.trim().replace(/^\/+|\/+$/g, "") || "index"
  if (
    raw.includes(":") ||
    raw.includes("?") ||
    raw.includes("#") ||
    raw.split("/").includes("..")
  ) {
    return undefined
  }
  const canonical = slugifyFilePath(raw as FilePath)
  return allFiles.find((page) => page.slug === raw || page.slug === canonical)
}

function safeExternalHref(target: Exclude<HomeTarget, { kind: "page" }>): string | undefined {
  const href = target.href.trim()
  if (/[\u0000-\u0020\u007f]/.test(href)) return undefined
  try {
    const url = new URL(href)
    if (target.kind === "mailto") {
      return url.protocol === "mailto:" && url.pathname.includes("@") ? href : undefined
    }
    return /^https?:\/\//i.test(href) &&
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? href
      : undefined
  } catch {
    return undefined
  }
}

/** Resolve in authored order. Optional failures warn and disappear; required failures stop build. */
export function resolveHomeItems(
  items: readonly CuratedHomeItem[],
  allFiles: readonly QuartzPluginData[],
  currentSlug: FullSlug,
  options: HomeResolutionOptions = {},
): ResolvedHomeItem[] {
  const resolved: ResolvedHomeItem[] = []
  const diagnostics: HomeDiagnostic[] = []
  const seenIds = new Set<string>()
  const seenTargets = new Set<string>()
  for (const [index, item] of items.entries()) {
    const location = `${options.location ?? "home"}[${index}] (${item.id})`
    const page = item.target.kind === "page" ? targetPage(item.target.slug, allFiles) : undefined
    const href =
      item.target.kind === "page"
        ? page?.slug
          ? resolveRelative(currentSlug, page.slug)
          : undefined
        : safeExternalHref(item.target)
    const label = item.label?.trim() || page?.frontmatter?.title?.trim()
    if (!href || !label || !item.id.trim()) {
      diagnostics.push({
        level: item.required ? "error" : "warning",
        code: item.target.kind === "page" && !page ? "missing-page" : "invalid-target",
        location,
        message:
          item.target.kind === "page" && !page
            ? `Published page not found: ${item.target.slug}`
            : "Expected a stable id, a label, and an explicitly allowed URL.",
      })
      continue
    }
    const targetKey = page?.slug ?? href
    if (seenIds.has(item.id) || seenTargets.has(targetKey)) {
      diagnostics.push({
        level: "warning",
        code: "duplicate-item",
        location,
        message: "Duplicate curated id or destination was omitted.",
      })
      continue
    }
    seenIds.add(item.id)
    seenTargets.add(targetKey)
    resolved.push({
      id: item.id,
      kind: item.target.kind,
      href,
      label,
      note: item.note,
      ...(page ? { slug: page.slug, locale: getPageLocale(page), page } : {}),
    })
  }
  options.diagnostics?.push(...diagnostics)
  const errors = diagnostics.filter((diagnostic) => diagnostic.level === "error")
  if (errors.length) throw new HomeLinkResolutionError(errors)
  return resolved
}
