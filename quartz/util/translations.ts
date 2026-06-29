import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, joinSegments } from "./path"

export interface TranslationAlternate {
  lang: string
  slug?: FullSlug
  href?: string
}

const DEFAULT_SOURCE_LANG = "zh-CN"

export function normalizeLang(lang: unknown, fallback = DEFAULT_SOURCE_LANG): string {
  if (typeof lang !== "string" || lang.trim() === "") {
    return fallback
  }

  const normalized = lang.trim()
  if (normalized === "zh") return DEFAULT_SOURCE_LANG
  return normalized
}

export function languageLabel(lang: string): string {
  const normalized = normalizeLang(lang)
  if (normalized.startsWith("zh")) return "中文"
  if (normalized.startsWith("en")) return "English"
  if (normalized.startsWith("ja")) return "日本語"
  if (normalized.startsWith("ko")) return "한국어"
  if (normalized.startsWith("es")) return "Español"
  if (normalized.startsWith("fr")) return "Français"
  if (normalized.startsWith("de")) return "Deutsch"
  return normalized
}

function stripLocalSlug(value: string): FullSlug {
  return value
    .replace(/^https?:\/\/[^/]+\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/$/, "") as FullSlug
}

function localSlug(value: unknown): FullSlug | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const raw = value.trim()
  if (/^https?:\/\//.test(raw)) return undefined
  const stripped = stripLocalSlug(raw)
  return (stripped === "" ? "index" : stripped) as FullSlug
}

function translationKey(file: QuartzPluginData): string | undefined {
  const value = file.frontmatter?.translationKey
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function sourceSlug(file: QuartzPluginData): FullSlug | undefined {
  return localSlug(file.frontmatter?.source ?? file.frontmatter?.translatedFrom)
}

function fileLang(cfg: GlobalConfiguration, file: QuartzPluginData): string {
  return normalizeLang(file.frontmatter?.lang, cfg.locale ?? DEFAULT_SOURCE_LANG)
}

function addAlternate(
  alternates: Map<string, TranslationAlternate>,
  alternate: TranslationAlternate,
) {
  const lang = normalizeLang(alternate.lang)
  if (!alternates.has(lang)) {
    alternates.set(lang, { ...alternate, lang })
  }
}

function addExplicitTranslations(
  alternates: Map<string, TranslationAlternate>,
  translations: unknown,
) {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) return

  for (const [lang, rawHref] of Object.entries(translations as Record<string, unknown>)) {
    if (typeof rawHref !== "string" || rawHref.trim() === "") continue
    const href = rawHref.trim()
    addAlternate(alternates, {
      lang,
      slug: localSlug(href),
      href,
    })
  }
}

export function getTranslationAlternates(
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
): TranslationAlternate[] {
  const currentSlug = fileData.slug as FullSlug | undefined
  if (!currentSlug) return []

  const alternates = new Map<string, TranslationAlternate>()
  addAlternate(alternates, { lang: fileLang(cfg, fileData), slug: currentSlug })
  addExplicitTranslations(alternates, fileData.frontmatter?.translations)

  const currentSource = sourceSlug(fileData)
  const currentKey = translationKey(fileData)

  if (currentSource) {
    const sourceFile = allFiles.find((file) => file.slug === currentSource)
    addAlternate(alternates, {
      lang: fileLang(cfg, sourceFile ?? ({ frontmatter: { lang: DEFAULT_SOURCE_LANG } } as any)),
      slug: currentSource,
    })
  }

  for (const candidate of allFiles) {
    if (!candidate.slug || candidate.slug === currentSlug) continue

    const candidateSource = sourceSlug(candidate)
    const candidateKey = translationKey(candidate)
    const sameSource =
      (candidateSource && candidateSource === currentSlug) ||
      (currentSource && candidateSource === currentSource) ||
      (currentSource && candidate.slug === currentSource)
    const sameKey = currentKey && candidateKey && currentKey === candidateKey

    if (!sameSource && !sameKey) continue

    addAlternate(alternates, {
      lang: fileLang(cfg, candidate),
      slug: candidate.slug as FullSlug,
    })
  }

  return Array.from(alternates.values())
}

export function absolutePageUrl(cfg: GlobalConfiguration, slug: FullSlug, href?: string): string {
  const base = `https://${cfg.baseUrl ?? "example.com"}`
  if (href?.startsWith("http://") || href?.startsWith("https://")) return href
  if (href?.startsWith("/")) return joinSegments(base, href.slice(1))
  if (slug === "index") return `${base}/`
  return joinSegments(base, slug)
}
