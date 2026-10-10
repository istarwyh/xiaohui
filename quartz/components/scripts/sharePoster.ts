import * as QRCode from "qrcode"
import { toBlob } from "html-to-image"
import { foundations, light } from "../../design/tokens"
import { sharePosterStyles } from "./sharePosterStyles"
import {
  SharePosterError,
  PosterResources,
  snapshotFontSources,
  embedPosterFonts,
  embedPosterImages,
} from "./sharePosterResources"

export { SharePosterError } from "./sharePosterResources"

export interface SharePosterInput {
  title: string
  url: string
  author?: string
  article: Element
  signal?: AbortSignal
}

// Logical pixels match a phone-sized page. The PNG has twice this resolution.
export const POSTER_WIDTH = 360
export const POSTER_SCALE = 2
export const MAX_POSTER_HEIGHT = 4000
export const POSTER_CHARACTER_TARGET = 800
const BLOCK_OVERRUN = 200
const GENERATION_TIMEOUT = 30000
const MAX_BODY_HEIGHT = 2900
const SVG_NS = "http://www.w3.org/2000/svg"
const omitted = [
  "script",
  "style",
  "noscript",
  "template",
  "button",
  "input",
  "textarea",
  "select",
  "form",
  "nav",
  "footer",
  "aside",
  "iframe",
  "object",
  "embed",
  "canvas",
  "audio",
  "video",
  "source",
  "link",
  "meta",
  "[hidden]",
  '[role="button"]',
  '[role="navigation"]',
  '[role="toolbar"]',
  '[role="dialog"]',
  "[data-share-exclude]",
  ".copy-page-control",
  ".clipboard-button",
  ".share-page-sheet",
  ".anchor",
  ".footnote-backref",
  ".katex-mathml",
].join(",")
const htmlTags = new Set(
  "article section div span p br wbr h1 h2 h3 h4 h5 h6 strong b em i u s del ins mark small sub sup abbr q cite a code pre kbd samp var blockquote ul ol li dl dt dd figure figcaption img picture table thead tbody tfoot tr th td caption colgroup col hr details summary math mrow mi mo mn mfrac msup msub msqrt mtext semantics annotation".split(
    " ",
  ),
)
const svgTags = new Set(
  "svg g image foreignobject path rect circle ellipse line polyline polygon text tspan defs marker clippath mask use symbol title desc lineargradient radialgradient stop".split(
    " ",
  ),
)
const passiveAttributes = new Set(
  "class title lang dir start reversed value colspan rowspan scope alt viewBox width height d x y x1 y1 x2 y2 cx cy r rx ry points fill fill-rule stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray opacity transform preserveAspectRatio xmlns offset stop-color stop-opacity markerWidth markerHeight markerUnits refX refY orient marker-start marker-mid marker-end clip-path clipPathUnits mask maskUnits maskContentUnits gradientUnits gradientTransform text-anchor dominant-baseline"
    .toLowerCase()
    .split(" "),
)
const inlineProperties = new Set([
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
  "text-indent",
  "white-space",
  "vertical-align",
  "color",
  "background-color",
  "--shiki-light",
  "--shiki-light-bg",
  "--shiki-dark",
  "--shiki-dark-bg",
])

/** Copy passive content only. Images hold a source URL, never initiate an unvetted clone request. */
export function snapshotArticle(article: Element): HTMLElement {
  const document = article.ownerDocument
  const view = document.defaultView
  const result = document.createElement("article")
  result.className = "share-poster-article"
  const ids = new Map<string, string>()
  const prefix = `share-poster-${Date.now()}-`
  let nodes = 0
  function copy(node: Node, into: Node, math = false, svg = false) {
    if (++nodes > 30000) throw new SharePosterError("文章内容过于复杂，暂时无法生成分享图。")
    if (node.nodeType === 3) {
      into.appendChild(document.createTextNode(node.textContent ?? ""))
      return
    }
    if (node.nodeType !== 1) return
    const source = node as HTMLElement
    if (source.matches(omitted)) return
    const tag = source.localName.toLowerCase()
    const isMath = math || source.classList.contains("katex")
    if (source.getAttribute("aria-hidden") === "true" && !isMath && source.namespaceURI !== SVG_NS)
      return
    const computed =
      typeof view?.getComputedStyle === "function" ? view.getComputedStyle(source) : undefined
    if (computed?.display === "none" || computed?.visibility === "hidden") return
    const isSvg =
      source.namespaceURI === SVG_NS ||
      (svg && source.namespaceURI !== "http://www.w3.org/1999/xhtml")
    if (!(isSvg ? svgTags : htmlTags).has(tag)) {
      // Unknown passive wrappers contribute their readable children, never their behavior.
      if (/^(animate|animatetransform|set)$/i.test(tag)) return
      if (isSvg) throw new SharePosterError("文章图形含有暂不支持的内容，无法保证完整导出。")
      for (const child of Array.from(source.childNodes)) copy(child, into, isMath, isSvg)
      return
    }
    const cloned = (
      isSvg ? document.createElementNS(SVG_NS, source.tagName) : document.createElement(tag)
    ) as HTMLElement
    for (const attribute of Array.from(source.attributes)) {
      const name = attribute.name.toLowerCase()
      if (
        passiveAttributes.has(name) ||
        /^data-(?:line(?:-numbers(?:-max-digits)?)?|highlighted-(?:line|chars)|rehype-pretty-code-(?:figure|title)|language|theme)$/.test(
          name,
        )
      ) {
        if (!/url\(/i.test(attribute.value) || /^url\(#[^)]+\)$/.test(attribute.value))
          cloned.setAttribute(attribute.name, attribute.value)
      }
    }
    if (source.id) {
      const id = prefix + source.id
      ids.set(source.id, id)
      cloned.id = id
    }
    if (tag === "a") {
      const href = source.getAttribute("href")
      if (href && /^(?:https?:|mailto:|#|\/|\.?\.?\/)/i.test(href))
        cloned.setAttribute("href", href)
    }
    if (isSvg && tag === "use") {
      const href = source.getAttribute("href") ?? source.getAttribute("xlink:href")
      if (!href?.startsWith("#"))
        throw new SharePosterError("文章图形含有外部引用，暂时无法完整导出。")
      cloned.setAttribute("href", href)
    }
    if (tag === "img" || (isSvg && tag === "image")) {
      const image = source as HTMLImageElement
      const url =
        image.currentSrc ||
        image.getAttribute("src") ||
        source.getAttribute("href") ||
        source.getAttribute("xlink:href")
      if (url) {
        try {
          cloned.dataset.shareSource = new URL(
            url,
            document.baseURI || "https://xiaohui.cool/",
          ).href
        } catch {
          throw new SharePosterError("文章图片地址无效，请刷新页面后重试。")
        }
      }
      if (tag === "img") {
        cloned.removeAttribute("width")
        cloned.removeAttribute("height")
      }
    }
    if (tag === "details") cloned.setAttribute("open", "")
    if (tag === "ol" && source.hasAttribute("reversed") && !source.hasAttribute("start"))
      cloned.setAttribute("start", String(source.children.length))
    // KaTeX and SVG geometry comes from the rendered source, including its visual tree.
    // Ordinary prose uses the share-scoped reading rules, never desktop pixel widths.
    const inGraphic = svg || isSvg
    if ((isMath || inGraphic) && computed) {
      for (const property of Array.from(computed)) {
        const computedValue = computed.getPropertyValue(property)
        const value = computedValue.replace(
          /url\(\s*(["']?)(.*?)\1\s*\)/gi,
          (original, _quote: string, reference: string) => {
            try {
              const resource = new URL(reference, document.baseURI)
              const page = new URL(document.baseURI)
              return resource.hash &&
                resource.origin === page.origin &&
                resource.pathname === page.pathname &&
                resource.search === page.search
                ? `url(${resource.hash})`
                : original
            } catch {
              return original
            }
          },
        )
        if (
          (!/url\(/i.test(value) || /^url\(#[^)]+\)$/.test(value)) &&
          !property.startsWith("--") &&
          ![
            "color",
            "background-color",
            "background-image",
            "font-size",
            "width",
            "height",
            "min-width",
            "max-width",
          ].includes(property)
        ) {
          cloned.style.setProperty(property, value)
        }
      }
      // Preserve relative KaTeX sizing (superscripts, vlist struts) from its original CSS.
      for (const property of ["font-size", "width", "height", "min-width", "max-width"]) {
        const value =
          inGraphic && tag !== "svg"
            ? computed.getPropertyValue(property)
            : source.style.getPropertyValue(property)
        if (value && !/url\(/i.test(value)) cloned.style.setProperty(property, value)
      }
      if (isMath) {
        cloned.style.color = light["color-text-strong"]
        if (computed.fontSize) cloned.style.fontSize = computed.fontSize
      }
    }
    if (!isMath && !inGraphic && computed) {
      if (computed.textIndent && computed.textIndent !== "0px")
        cloned.style.textIndent = computed.textIndent
      if (["center", "right", "justify"].includes(computed.textAlign))
        cloned.style.textAlign = computed.textAlign
    }
    for (const property of Array.from(source.style ?? [])) {
      const value = source.style.getPropertyValue(property)
      if (
        (inlineProperties.has(property) || (isMath && !/url\(/i.test(value))) &&
        !/url\(|expression\(/i.test(value)
      )
        cloned.style.setProperty(property, value)
    }
    if (source.style?.getPropertyValue("--shiki-light"))
      cloned.style.color = source.style.getPropertyValue("--shiki-light")
    if (source.style?.getPropertyValue("--shiki-light-bg"))
      cloned.style.backgroundColor = source.style.getPropertyValue("--shiki-light-bg")
    into.appendChild(cloned)
    for (const child of Array.from(source.childNodes)) copy(child, cloned, isMath, inGraphic)
  }
  for (const node of Array.from(article.childNodes)) copy(node, result)
  for (const element of Array.from(result.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      let value = attribute.value.replace(/url\(#([^)]+)\)/g, (original, id: string) =>
        ids.has(id) ? `url(#${ids.get(id)})` : original,
      )
      if (attribute.name === "href" && value.startsWith("#") && ids.has(value.slice(1)))
        value = `#${ids.get(value.slice(1))}`
      if (value !== attribute.value) element.setAttribute(attribute.name, value)
    }
  }
  return result
}

const segments = (text: string) =>
  typeof Intl.Segmenter === "function"
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
        (part) => part.segment,
      )
    : Array.from(text)

/** UTF-16 endpoint, at a nearby sentence boundary or a complete grapheme. */
export function posterTextBoundary(text: string, target = POSTER_CHARACTER_TARGET): number {
  const units = segments(text)
  if (units.length <= target + BLOCK_OVERRUN) return text.length
  let end = Math.min(target, units.length)
  for (let index = end; index < Math.min(units.length, target + BLOCK_OVERRUN); index++) {
    if (/[。！？.!?\n]/u.test(units[index])) {
      end = index + 1
      break
    }
  }
  return units.slice(0, end).join("").length
}

function trimText(element: HTMLElement, limit: number) {
  let remaining = posterTextBoundary(element.textContent ?? "", limit)
  let stopped = false
  function trim(parent: Node) {
    for (const child of Array.from(parent.childNodes)) {
      if (stopped) {
        parent.removeChild(child)
        continue
      }
      if (child.nodeType === 3) {
        const text = child.textContent ?? ""
        if (text.length > remaining) {
          child.textContent = text.slice(0, remaining)
          stopped = true
        }
        remaining -= Math.min(remaining, text.length)
      } else if (child.nodeType === 1) {
        const current = child as HTMLElement
        // Mathematical expressions and visual assets are indivisible, even at the boundary.
        if (current.matches(".katex,svg,img"))
          remaining -= Math.min(remaining, current.textContent?.length ?? 0)
        else trim(current)
      }
      if (remaining === 0) stopped = true
    }
  }
  trim(element)
}

/** Select real DOM blocks, retaining their inline ancestors and nearby natural endings. */
export function selectPosterExcerpt(article: HTMLElement, target = POSTER_CHARACTER_TARGET) {
  const selected = article.cloneNode(true) as HTMLElement
  let count = 0
  let stopped = false
  let truncated = false
  let headingNeedsBody = false
  function visit(parent: HTMLElement) {
    for (const child of Array.from(parent.childNodes)) {
      const meaningful =
        Boolean(child.textContent?.trim()) ||
        (child.nodeType === 1 &&
          Boolean(
            (child as Element).querySelector("img,svg") || (child as Element).matches("img,svg,hr"),
          ))
      if (stopped || (count >= target && !headingNeedsBody)) {
        if (meaningful) truncated = true
        child.remove()
        continue
      }
      if (child.nodeType !== 1) {
        count += segments(child.textContent ?? "").length
        continue
      }
      const element = child as HTMLElement
      const text = element.textContent ?? ""
      const length = segments(text).length
      const heading = /^H[1-6]$/.test(element.tagName)
      const structural = /^(DIV|SECTION|ARTICLE|DETAILS|UL|OL|BLOCKQUOTE|TBODY|THEAD|TFOOT)$/.test(
        element.tagName,
      )
      if (
        structural &&
        element.children.length &&
        length > Math.max(target - count, 80) + BLOCK_OVERRUN
      ) {
        visit(element)
        continue
      }
      const remaining = Math.max(target - count, 80)
      if (!heading && length > remaining + BLOCK_OVERRUN) {
        trimText(element, remaining)
        count += segments(element.textContent ?? "").length
        truncated = true
        stopped = true
      } else {
        count += length
        if (meaningful) headingNeedsBody = heading
      }
    }
  }
  visit(selected)
  return { article: selected, truncated }
}

/** Retained for consumers which need a human-readable canonical URL. */
export function displayPosterUrl(url: string): string {
  const parts = url.match(/^(https?:\/\/[^/?#]+)([^?#]*)(.*)$/i)
  if (!parts) return url
  try {
    const path = decodeURI(parts[2]).replace(/[\u0000-\u0020\u007f]/g, encodeURIComponent)
    return `${parts[1]}${path}${parts[3]}`
  } catch {
    return url
  }
}

function createText(document: Document, tag: string, className: string, text: string) {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = text
  return element
}

function prepareTables(article: HTMLElement) {
  for (const table of Array.from(article.querySelectorAll("table"))) {
    const rows = Array.from(table.rows)
    const columns = Math.max(
      0,
      ...rows.map((row) => Array.from(row.cells).reduce((total, cell) => total + cell.colSpan, 0)),
    )
    if (columns <= 3) continue
    if (
      rows.some((row) => Array.from(row.cells).some((cell) => cell.colSpan > 1 || cell.rowSpan > 1))
    ) {
      throw new SharePosterError("文章表格含有复杂合并单元格，暂时无法清晰导出。")
    }
    table.classList.add("share-poster-table-wide")
    const headings =
      rows[0] && Array.from(rows[0].cells).every((cell) => cell.tagName === "TH")
        ? Array.from(rows[0].cells).map((cell) => cell.textContent ?? "")
        : []
    for (const row of rows.slice(headings.length ? 1 : 0)) {
      Array.from(row.cells).forEach((cell, index) => {
        if (headings[index])
          cell.prepend(
            createText(article.ownerDocument, "span", "share-poster-cell-label", headings[index]),
          )
      })
    }
  }
}

function clearDecorativeResources(root: HTMLElement) {
  const view = root.ownerDocument.defaultView!
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    if (!element.style) continue
    const computed = view.getComputedStyle(element)
    for (const property of [
      "background-image",
      "mask-image",
      "-webkit-mask-image",
      "border-image-source",
      "list-style-image",
    ]) {
      if (/url\(/i.test(computed.getPropertyValue(property))) {
        if (element.namespaceURI === SVG_NS && property.includes("mask")) {
          // The SDK re-fetches CSS mask URLs, even local fragments, and swallows failures.
          throw new SharePosterError("文章图形使用了特殊蒙版，暂时无法保证完整导出。")
        }
        element.style.setProperty(property, "none")
      }
    }
  }
}

/** Prefer whole rendered blocks/rows before using the emergency single-block guard. */
function fitBodyHeight(article: HTMLElement, maximum: number): boolean {
  if (article.getBoundingClientRect().height <= maximum) return false
  const bottom = article.getBoundingClientRect().top + maximum
  let clipped = false
  let keptContent = false
  function fit(container: HTMLElement) {
    let stopped = false
    for (const node of Array.from(container.childNodes)) {
      if (stopped) {
        node.remove()
        continue
      }
      if (node.nodeType !== 1) continue
      const element = node as HTMLElement
      const rect = element.getBoundingClientRect()
      if (rect.bottom <= bottom + 0.5) {
        if (
          element.textContent?.trim() ||
          element.querySelector("img,svg") ||
          element.matches("img,svg")
        )
          keptContent = true
        continue
      }
      if (
        /^(DIV|SECTION|ARTICLE|BLOCKQUOTE|UL|OL|TABLE|THEAD|TBODY|TFOOT)$/.test(element.tagName) &&
        element.children.length
      ) {
        fit(element)
        if (!element.textContent?.trim() && !element.querySelector("img,svg")) element.remove()
      } else if (
        !keptContent &&
        element.matches("p,pre") &&
        !element.querySelector("img,svg,.katex")
      ) {
        // A pathological first paragraph/code block can contain hundreds of blank lines.
        const height = Math.floor(bottom - rect.top)
        if (height < 160) throw new SharePosterError("文章开头内容过高，暂时无法清晰导出。")
        element.style.maxHeight = `${height}px`
        element.style.overflow = "hidden"
        keptContent = true
      } else {
        element.remove()
      }
      clipped = true
      stopped = true
    }
    // A section heading cannot be the last thing before the continuation fade.
    while (container.lastElementChild && /^H[1-6]$/.test(container.lastElementChild.tagName))
      container.lastElementChild.remove()
  }
  fit(article)
  if (!article.textContent?.trim() && !article.querySelector("img,svg"))
    throw new SharePosterError("文章开头内容过高，暂时无法清晰导出。")
  return clipped
}

export async function generateLongSharePoster(input: SharePosterInput): Promise<Blob> {
  // All source content and stylesheet references are frozen before the first await.
  if (input.signal?.aborted) throw new SharePosterError("分享图生成已取消。")
  const snapshot = snapshotArticle(input.article)
  const excerpt = selectPosterExcerpt(snapshot)
  const document = input.article.ownerDocument
  const fontSources = snapshotFontSources(document)
  const title = String(input.title)
  const author = input.author ? String(input.author) : undefined
  const url = String(input.url)
  const controller = new AbortController()
  const resources = new PosterResources(controller.signal)
  const host = document.createElement("div")
  host.className = "share-poster-host"
  host.setAttribute("aria-hidden", "true")
  const root = document.createElement("section")
  root.className = "share-poster"
  root.dataset.truncated = String(excerpt.truncated)
  for (const [name, value] of Object.entries({ ...foundations, ...light }))
    root.style.setProperty(`--${name}`, value)
  for (const [alias, token] of Object.entries({
    light: "color-canvas",
    lightgray: "color-border",
    gray: "color-text-muted",
    darkgray: "color-text",
    dark: "color-text-strong",
    secondary: "color-accent",
    tertiary: "color-accent-hover",
    highlight: "color-accent-soft",
    textHighlight: "color-mark",
    bodyFont: "font-body",
    headerFont: "font-body",
    codeFont: "font-code",
  }))
    root.style.setProperty(`--${alias}`, `var(--${token})`)
  const style = document.createElement("style")
  style.textContent = sharePosterStyles
  const header = document.createElement("header")
  header.className = "share-poster-header"
  header.append(
    createText(document, "p", "share-poster-brand", "晓灰 · xiaohui.cool"),
    createText(document, "h1", "share-poster-title", title),
  )
  if (author) header.append(createText(document, "p", "share-poster-author", `作者：${author}`))
  const body = document.createElement("div")
  body.className = "share-poster-body"
  body.append(excerpt.article)
  const footer = document.createElement("footer")
  footer.className = "share-poster-footer"
  const qr = document.createElement("img")
  qr.className = "share-poster-qr"
  qr.alt = "扫码阅读全文"
  const copy = document.createElement("div")
  copy.className = "share-poster-footer-copy"
  const note = createText(
    document,
    "p",
    "share-poster-footer-note",
    excerpt.truncated ? "正文未完，继续阅读" : "打开原文，查看完整内容",
  )
  copy.append(
    createText(document, "p", "share-poster-footer-label", "扫码阅读全文"),
    note,
    createText(document, "p", "share-poster-footer-site", "晓灰 · xiaohui.cool"),
  )
  footer.append(qr, copy)
  root.append(header, body, footer)
  host.append(style, root)
  prepareTables(excerpt.article)

  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectAborted: (error: Error) => void = () => undefined
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = reject
  })
  const cancel = () => {
    controller.abort()
    host.remove()
    rejectAborted(new SharePosterError("分享图生成已取消。"))
  }
  input.signal?.addEventListener("abort", cancel, { once: true })
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      host.remove()
      reject(new SharePosterError("分享图生成超时，请检查网络后重试。"))
    }, GENERATION_TIMEOUT)
  })
  async function render() {
    const code = QRCode.create(url, { errorCorrectionLevel: "M" })
    const modules = code.modules.size + 8
    const modulePixels = Math.max(3, Math.ceil((104 * POSTER_SCALE) / modules))
    const qrSize = (modules * modulePixels) / POSTER_SCALE
    if (qrSize > 260) throw new SharePosterError("文章链接过长，无法生成清晰的二维码。")
    qr.style.width = `${qrSize}px`
    qr.style.height = `${qrSize}px`
    if (qrSize > 140) {
      footer.style.flexDirection = "column"
      copy.style.borderLeft = "0"
      copy.style.paddingLeft = "0"
      copy.style.alignSelf = "center"
      copy.style.textAlign = "center"
    }
    qr.src = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 4,
      scale: modulePixels,
      color: { dark: light["color-text-strong"], light: light["color-surface-raised"] },
    })
    if (controller.signal.aborted) throw new SharePosterError("分享图生成超时，请重试。")
    document.body.append(host)
    clearDecorativeResources(root)
    const [, fontEmbedCSS] = await Promise.all([
      embedPosterImages(root, resources),
      embedPosterFonts(root, fontSources, resources),
    ])
    if (controller.signal.aborted) throw new SharePosterError("分享图生成超时，请重试。")
    // Fit indivisible display formulae instead of horizontally clipping them.
    for (const formula of Array.from(
      root.querySelectorAll<HTMLElement>(".katex-display > .katex"),
    )) {
      const available = formula.parentElement!.clientWidth
      if (formula.scrollWidth > available) {
        const ratio = available / formula.scrollWidth
        if (ratio < 0.75) throw new SharePosterError("文章公式过宽，暂时无法在分享图中清晰呈现。")
        const width = formula.scrollWidth
        const height = formula.getBoundingClientRect().height
        const fitted = document.createElement("span")
        fitted.className = "share-poster-math-fit"
        fitted.style.display = "block"
        fitted.style.width = `${available}px`
        fitted.style.height = `${Math.ceil(height * ratio)}px`
        fitted.style.overflow = "hidden"
        formula.replaceWith(fitted)
        fitted.append(formula)
        formula.style.width = `${width}px`
        formula.style.transformOrigin = "top left"
        formula.style.transform = `scale(${ratio})`
      }
    }
    const fixedHeight =
      header.getBoundingClientRect().height + footer.getBoundingClientRect().height + 96
    const maximum = Math.min(MAX_BODY_HEIGHT, MAX_POSTER_HEIGHT - fixedHeight)
    if (maximum < 240) throw new SharePosterError("文章标题或署名过长，暂时无法生成清晰分享图。")
    if (fitBodyHeight(excerpt.article, maximum)) {
      root.dataset.truncated = "true"
      note.textContent = "正文未完，继续阅读"
    }
    if (root.dataset.truncated === "true") {
      const fade = document.createElement("div")
      fade.className = "share-poster-fade"
      body.append(fade)
    }
    // A missed layout case must fail visibly rather than silently cutting off content.
    if (excerpt.article.scrollWidth > excerpt.article.clientWidth + 1)
      throw new SharePosterError("文章中有超宽内容，暂时无法完整生成分享图。")
    // Keep the QR's module grid on physical pixels even when flex alignment has a fraction.
    const qrRect = qr.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    const qrX = qrRect.left - rootRect.left
    const qrY = qrRect.top - rootRect.top
    qr.style.transform = `translate(${Math.round(qrX * POSTER_SCALE) / POSTER_SCALE - qrX}px, ${Math.round(qrY * POSTER_SCALE) / POSTER_SCALE - qrY}px)`
    const height = Math.ceil(root.getBoundingClientRect().height)
    if (height > MAX_POSTER_HEIGHT)
      throw new SharePosterError("文章内容过长，暂时无法生成清晰分享图。")
    const blob = await toBlob(root, {
      width: POSTER_WIDTH,
      height,
      pixelRatio: POSTER_SCALE,
      backgroundColor: light["color-canvas"],
      fontEmbedCSS,
      skipFonts: !fontEmbedCSS,
      includeQueryParams: true,
      cacheBust: false,
      fetchRequestInit: { mode: "cors", credentials: "omit", signal: controller.signal },
      onImageErrorHandler: () => {
        throw new SharePosterError("文章图片未能完整绘制，请重试。")
      },
    })
    if (!blob || blob.type !== "image/png") throw new SharePosterError("分享图编码失败，请重试。")
    return blob
  }
  try {
    return await Promise.race([render(), timeout, aborted])
  } catch (error) {
    if (error instanceof SharePosterError) throw error
    throw new SharePosterError("分享图生成失败，请刷新页面后重试。")
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener("abort", cancel)
    controller.abort()
    host.remove()
  }
}
