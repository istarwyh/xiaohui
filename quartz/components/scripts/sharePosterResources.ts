/** html-to-image intentionally tolerates missing resources. Export must not. */
export class SharePosterError extends Error {
  override name = "SharePosterError"
}

const RESOURCE_TIMEOUT = 10000
const MAX_RESOURCE_BYTES = 20 * 1024 * 1024
const MAX_TOTAL_BYTES = 64 * 1024 * 1024

export interface FontSourceSnapshot {
  rules: { css: string; base: string }[]
  stylesheets: string[]
}

/** Capture the source lists now; a later SPA navigation must not replace them. */
export function snapshotFontSources(document: Document): FontSourceSnapshot {
  const rules: { css: string; base: string }[] = []
  const stylesheets = new Set<string>()
  const seen = new Set<CSSStyleSheet>()
  function visit(sheet: CSSStyleSheet) {
    if (seen.has(sheet)) return
    seen.add(sheet)
    try {
      const visitRules = (entries: CSSRuleList) => {
        for (const rule of Array.from(entries)) {
          if (rule.type === 5)
            rules.push({ css: rule.cssText, base: sheet.href ?? document.baseURI })
          else if (rule.type === 3) {
            const imported = (rule as CSSImportRule).styleSheet
            if (imported) visit(imported)
            else
              stylesheets.add(
                new URL((rule as CSSImportRule).href, sheet.href ?? document.baseURI).href,
              )
          } else if ("cssRules" in rule) visitRules((rule as CSSGroupingRule).cssRules)
        }
      }
      visitRules(sheet.cssRules)
    } catch {
      if (sheet.href) stylesheets.add(sheet.href)
      else throw new SharePosterError("无法读取文章字体样式，请刷新页面后重试。")
    }
  }
  for (const sheet of Array.from(document.styleSheets)) visit(sheet)
  return { rules, stylesheets: [...stylesheets] }
}

export class PosterResources {
  private bytes = 0
  private cache = new Map<string, Promise<string>>()
  constructor(readonly signal: AbortSignal) {}

  async deadline<T>(operation: Promise<T>, message: string): Promise<T> {
    if (this.signal.aborted) throw new SharePosterError(message)
    let timer: ReturnType<typeof setTimeout> | undefined
    let aborted: () => void = () => undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SharePosterError(message)), RESOURCE_TIMEOUT)
      aborted = () => reject(new SharePosterError(message))
      this.signal.addEventListener("abort", aborted, { once: true })
    })
    try {
      return await Promise.race([operation, timeout])
    } finally {
      clearTimeout(timer)
      this.signal.removeEventListener("abort", aborted)
    }
  }

  async fetch(url: string, kind: "图片" | "字体" | "字体样式"): Promise<Blob> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    this.signal.addEventListener("abort", abort, { once: true })
    const timer = setTimeout(abort, RESOURCE_TIMEOUT)
    try {
      if (this.signal.aborted) controller.abort()
      const parsed = new URL(url)
      if (!["https:", "http:", "data:", "blob:"].includes(parsed.protocol))
        throw new Error("Invalid resource URL")
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
      })
      if (!response.ok || response.type === "opaque") throw new Error("Unreadable resource")
      const declared = Number(response.headers.get("content-length") ?? 0)
      if (declared > MAX_RESOURCE_BYTES) throw new Error("Resource too large")
      const blob = await response.blob()
      this.bytes += blob.size
      if (!blob.size || blob.size > MAX_RESOURCE_BYTES || this.bytes > MAX_TOTAL_BYTES)
        throw new Error("Resource too large")
      return blob
    } catch {
      throw new SharePosterError(`文章${kind}加载失败或不允许导出，请检查网络后重试。`)
    } finally {
      clearTimeout(timer)
      this.signal.removeEventListener("abort", abort)
    }
  }

  dataUrl(url: string, kind: "图片" | "字体"): Promise<string> {
    const existing = this.cache.get(url)
    if (existing) return existing
    const pending = this.fetch(url, kind).then(async (blob) => {
      if (kind === "图片" && blob.type && !blob.type.startsWith("image/")) {
        throw new SharePosterError("文章图片格式无法导出，请检查原图后重试。")
      }
      if (kind === "图片" && (blob.type.includes("svg") || /\.svg(?:[?#]|$)/i.test(url))) {
        const svg = await blob.text()
        const parsed = new DOMParser().parseFromString(svg, "image/svg+xml")
        if (
          parsed.querySelector("parsererror,script,foreignObject,iframe,object,embed") ||
          /@import|@font-face|<\?xml-stylesheet/i.test(svg)
        ) {
          throw new SharePosterError("文章 SVG 图片含有无法安全导出的内容，请使用自包含图片。")
        }
        for (const element of Array.from(parsed.querySelectorAll("*"))) {
          for (const attribute of Array.from(element.attributes)) {
            if (
              /^on/i.test(attribute.name) ||
              (/^(?:href|xlink:href)$/i.test(attribute.name) &&
                !/^(?:#|data:)/i.test(attribute.value)) ||
              hasExternalCssUrl(attribute.value)
            ) {
              throw new SharePosterError("文章 SVG 图片依赖外部资源，暂时无法完整导出。")
            }
          }
        }
        for (const style of Array.from(parsed.querySelectorAll("style"))) {
          if (hasExternalCssUrl(style.textContent ?? "")) {
            throw new SharePosterError("文章 SVG 图片依赖外部资源，暂时无法完整导出。")
          }
        }
      }
      return this.deadline(
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new SharePosterError(`文章${kind}读取失败，请重试。`))
          reader.readAsDataURL(blob)
        }),
        `文章${kind}读取超时，请重试。`,
      )
    })
    this.cache.set(url, pending)
    return pending
  }

  async image(image: HTMLImageElement) {
    const source = image.dataset.shareSource
    if (source) {
      image.src = await this.dataUrl(source, "图片")
      delete image.dataset.shareSource
    }
    if (!image.src) throw new SharePosterError("文章图片地址缺失，请刷新页面后重试。")
    await this.deadline(
      image.decode().catch(() => {
        throw new SharePosterError("文章图片解码失败，请检查原图后重试。")
      }),
      "文章图片解码超时，请重试。",
    )
    if (!image.naturalWidth || !image.naturalHeight)
      throw new SharePosterError("文章图片未完整加载，请重试。")
  }
}

async function parallel<T>(items: T[], operation: (item: T) => Promise<void>) {
  let index = 0
  await Promise.all(
    Array.from({ length: Math.min(6, items.length) }, async () => {
      while (index < items.length) await operation(items[index++])
    }),
  )
}

export async function embedPosterImages(root: HTMLElement, resources: PosterResources) {
  await parallel(Array.from(root.querySelectorAll("img")), (image) => resources.image(image))
  await parallel(
    Array.from(root.querySelectorAll<SVGImageElement>("svg image")),
    async (element) => {
      const source = (element as unknown as HTMLElement).dataset.shareSource
      if (!source) throw new SharePosterError("文章图形图片地址缺失，请重试。")
      const image = root.ownerDocument.createElement("img")
      image.dataset.shareSource = source
      await resources.image(image)
      element.setAttribute("href", image.src)
      delete (element as unknown as HTMLElement).dataset.shareSource
    },
  )
}

interface FontFaceRule {
  body: string
  base: string
  family: string
  weight: string
  style: string
  range: string
  source: string
}
function descriptor(body: string, name: string): string {
  // A data URL can contain semicolons; only split declarations outside strings/functions.
  let quote = ""
  let depth = 0
  let start = 0
  for (let index = 0; index <= body.length; index++) {
    const character = body[index]
    if (quote) {
      if (character === quote && body[index - 1] !== "\\") quote = ""
    } else if (character === '"' || character === "'") quote = character
    else if (character === "(") depth++
    else if (character === ")") depth--
    else if ((character === ";" && depth === 0) || index === body.length) {
      const declaration = body.slice(start, index)
      const separator = declaration.indexOf(":")
      if (declaration.slice(0, separator).trim().toLowerCase() === name)
        return declaration.slice(separator + 1).trim()
      start = index + 1
    }
  }
  return ""
}

function hasExternalCssUrl(value: string) {
  return Array.from(value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)).some(
    (match) => !/^(?:#|data:)/i.test(match[2].trim()),
  )
}
const familyName = (name: string) =>
  name
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase()

function fontFaces(css: string, base: string): FontFaceRule[] {
  return Array.from(css.matchAll(/@font-face\s*\{([^}]+)\}/gi), (match) => {
    const body = match[1]
    return {
      body,
      base,
      family: familyName(descriptor(body, "font-family")),
      weight: descriptor(body, "font-weight") || "400",
      style: descriptor(body, "font-style") || "normal",
      range: descriptor(body, "unicode-range"),
      source: descriptor(body, "src"),
    }
  })
}

function matchesRange(range: string, text: string) {
  if (!range) return true
  const intervals = range.split(",").map((part) => {
    const value = part.trim().replace(/^U\+/i, "")
    const [start, end] = value.includes("?")
      ? [value.replace(/\?/g, "0"), value.replace(/\?/g, "F")]
      : value.split("-")
    return [parseInt(start, 16), parseInt(end ?? start, 16)]
  })
  return Array.from(text).some((character) => {
    const code = character.codePointAt(0)!
    return intervals.some(([start, end]) => code >= start && code <= end)
  })
}

function weightNumber(weight: string) {
  return weight === "normal" ? 400 : weight === "bold" ? 700 : Number.parseInt(weight, 10)
}

/** Embed only faces actually used in this excerpt, including KaTeX and Unicode subsets. */
export async function embedPosterFonts(
  root: HTMLElement,
  snapshot: FontSourceSnapshot,
  resources: PosterResources,
): Promise<string> {
  const document = root.ownerDocument
  const view = document.defaultView!
  const faces = snapshot.rules.flatMap((rule) => fontFaces(rule.css, rule.base))
  const visited = new Set<string>()
  async function readSheet(url: string) {
    if (visited.has(url)) return
    visited.add(url)
    const css = await (await resources.fetch(url, "字体样式")).text()
    faces.push(...fontFaces(css, url))
    const imports = Array.from(
      css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi),
    )
    await parallel(imports, async (match) => readSheet(new URL(match[1], url).href))
  }
  await parallel(snapshot.stylesheets, readSheet)

  type Use = { family: string; weight: number; style: string; text: string }
  const uses: Use[] = []
  const elements = [root, ...root.querySelectorAll<HTMLElement>("*")]
  for (const element of elements) {
    const text = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join("")
    if (!text.trim()) continue
    const computed = view.getComputedStyle(element)
    for (const family of computed.fontFamily.split(",")) {
      uses.push({
        family: familyName(family),
        weight: weightNumber(computed.fontWeight),
        style: computed.fontStyle,
        text,
      })
    }
  }

  // Pick the available weight nearest the browser request; ranges cover variable fonts.
  function distance(face: FontFaceRule, weight: number) {
    const bounds = face.weight.split(/\s+/).map(weightNumber)
    return weight < bounds[0]
      ? bounds[0] - weight
      : weight > (bounds[1] ?? bounds[0])
        ? weight - (bounds[1] ?? bounds[0])
        : 0
  }
  const selected = new Set<FontFaceRule>()
  for (const use of uses) {
    const family = faces.filter((face) => face.family === use.family)
    const style = family.some((face) => face.style === use.style) ? use.style : "normal"
    const candidates = family.filter(
      (face) => face.style === style && matchesRange(face.range, use.text),
    )
    const byRange = new Map<string, FontFaceRule[]>()
    for (const face of candidates)
      byRange.set(face.range, [...(byRange.get(face.range) ?? []), face])
    for (const group of byRange.values()) {
      const minimum = Math.min(...group.map((face) => distance(face, use.weight)))
      group
        .filter((face) => distance(face, use.weight) === minimum)
        .forEach((face) => selected.add(face))
    }
  }
  const embedded: string[] = []
  await parallel([...selected], async (face) => {
    const sources = Array.from(
      face.source.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)\s*(?:format\(\s*(['"]?)(.*?)\3\s*\))?/gi),
    )
    const source = sources.find((match) => /woff2/i.test(match[4] ?? match[2])) ?? sources[0]
    if (!source) throw new SharePosterError("文章字体无法嵌入图片，请刷新页面后重试。")
    const data = await resources.dataUrl(new URL(source[2], face.base).href, "字体")
    const format = source[4] ? ` format("${source[4]}")` : ""
    const optional = [
      "font-stretch",
      "font-feature-settings",
      "font-variation-settings",
      "ascent-override",
      "descent-override",
      "line-gap-override",
      "size-adjust",
    ]
      .map((name) => [name, descriptor(face.body, name)] as const)
      .filter(([, value]) => value && !/url\(/i.test(value))
      .map(([name, value]) => `${name}:${value};`)
      .join("")
    embedded.push(
      `@font-face {font-family:"${face.family}";font-weight:${face.weight};font-style:${face.style};${face.range ? `unicode-range:${face.range};` : ""}${optional}src:url("${data}")${format};}`,
    )
  })
  const css = embedded.join("\n")
  if (css) {
    // Give these faces private names to avoid changing fonts on the live page.
    const prefix = `SharePoster${Date.now()}_`
    const families = new Map(
      [...selected].map((face) => [face.family, prefix + face.family.replace(/[^a-z0-9_]/gi, "_")]),
    )
    const privateCss = css.replace(
      /font-family\s*:\s*([^;}]+)/gi,
      (_all, family: string) =>
        `font-family: "${families.get(familyName(family)) ?? familyName(family)}"`,
    )
    // Freeze font stacks before installing the export-only face names.
    const fontStacks = elements.map(
      (element) => [element, view.getComputedStyle(element).fontFamily] as const,
    )
    const style = document.createElement("style")
    style.textContent = privateCss
    root.prepend(style)
    for (const [element, stack] of fontStacks) {
      element.style.fontFamily = stack
        .split(",")
        .map((family) =>
          families.has(familyName(family)) ? `"${families.get(familyName(family))}"` : family,
        )
        .join(",")
    }
    const loads = uses.map((use) => {
      const family = families.get(use.family)
      return family
        ? document.fonts
            .load(`${use.style} ${use.weight} 18px "${family}"`, use.text)
            .then((loaded) => {
              if (!loaded.length) throw new SharePosterError("文章字体未完整加载，请重试。")
            })
        : Promise.resolve()
    })
    await resources.deadline(Promise.all(loads), "文章字体加载超时，请检查网络后重试。")
    return privateCss
  }
  return ""
}
