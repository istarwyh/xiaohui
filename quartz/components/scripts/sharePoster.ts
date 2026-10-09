import * as QRCode from "qrcode"
import { foundations, light } from "../../design/tokens"

export interface SharePosterInput {
  title: string
  url: string
  author?: string
  article: Element
}

export interface PosterBlock {
  kind: "paragraph" | "heading" | "list" | "quote" | "code" | "table"
  text: string
  level?: number
  depth?: number
  marker?: string
  quoted?: boolean
}

// Logical pixels match a phone-sized page. The PNG has twice this resolution.
export const POSTER_WIDTH = 360
export const POSTER_SCALE = 2
export const MAX_POSTER_HEIGHT = 4000
export const POSTER_CHARACTER_TARGET = 800
const BLOCK_OVERRUN = 200
const rem = (value: string) => Number.parseFloat(value) * 16
const margin = rem(foundations["space-6"])
const contentWidth = POSTER_WIDTH - margin * 2
const bodySize = rem(foundations["text-h3"])
const bodyLeading = bodySize * Number(foundations["leading-reading"])
const gap = rem(foundations["space-4"])
const smallGap = rem(foundations["space-2"])

const omitted = [
  "script",
  "style",
  "noscript",
  "template",
  "button",
  "input",
  "textarea",
  "select",
  "svg",
  "nav",
  "footer",
  "aside",
  "iframe",
  "canvas",
  "audio",
  "video",
  "img",
  "[hidden]",
  '[aria-hidden="true"]',
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
  ".katex-html",
].join(",")
const blockTags = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "DIV",
  "SECTION",
  "ARTICLE",
  "FIGURE",
  "FIGCAPTION",
  "DETAILS",
  "SUMMARY",
  "DL",
  "DT",
  "DD",
  "HR",
])

function isOmitted(element: Element) {
  return (
    element.matches(omitted) ||
    /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(element.getAttribute("style") ?? "")
  )
}

function inlineText(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? ""
  if (node.nodeType !== 1) return ""
  const element = node as Element
  if (isOmitted(element)) return ""
  if (element.tagName === "BR") return "\n"
  // KaTeX exposes both visual and accessible trees; preserve the source only once.
  if (element.classList.contains("katex-mathml")) {
    return element.querySelector("annotation")?.textContent ?? element.textContent ?? ""
  }
  return Array.from(element.childNodes, inlineText).join("")
}

function cleanText(text: string, code = false) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")
  if (code) return normalized.replace(/^\n|\n$/g, "").replace(/\t/g, "  ")
  return normalized
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Read rendered article content in DOM order, without mutating it or copying controls. */
export function extractArticleBlocks(article: Element): PosterBlock[] {
  const result: PosterBlock[] = []
  type Scope = { depth?: number; marker?: string; quoted?: boolean }

  function emit(text: string, kind: PosterBlock["kind"], scope: Scope, level?: number) {
    const cleaned = cleanText(text, kind === "code")
    if (!cleaned.trim()) return
    result.push({ kind, text: cleaned, ...scope, ...(level ? { level } : {}) })
    scope.marker = undefined
  }

  function children(container: Element, scope: Scope = {}) {
    let pending = ""
    const flush = () => {
      emit(
        pending,
        scope.depth !== undefined ? "list" : scope.quoted ? "quote" : "paragraph",
        scope,
      )
      pending = ""
    }
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType !== 1) {
        pending += inlineText(node)
        continue
      }
      const element = node as Element
      if (isOmitted(element)) continue
      if (!blockTags.has(element.tagName)) {
        pending += inlineText(element)
        continue
      }
      flush()
      visit(element, scope)
    }
    flush()
  }

  function visit(element: Element, scope: Scope) {
    const tag = element.tagName
    if (tag === "UL" || tag === "OL") {
      const items = Array.from(element.children).filter((child) => child.tagName === "LI")
      const reversed = element.hasAttribute("reversed")
      let ordinal = Number(element.getAttribute("start") ?? (reversed ? items.length : 1))
      for (const item of items) {
        if (isOmitted(item)) continue
        if (item.hasAttribute("value")) ordinal = Number(item.getAttribute("value"))
        children(item, {
          ...scope,
          depth: (scope.depth ?? -1) + 1,
          marker: tag === "OL" ? `${ordinal}.` : "•",
        })
        ordinal += reversed ? -1 : 1
      }
    } else if (tag === "BLOCKQUOTE") {
      const quoteScope = { ...scope, quoted: true }
      children(element, quoteScope)
      scope.marker = quoteScope.marker
    } else if (tag === "PRE") {
      emit(inlineText(element), "code", scope)
    } else if (tag === "TABLE") {
      const caption = element.querySelector("caption")
      if (caption) emit(inlineText(caption), "paragraph", scope)
      for (const row of Array.from(element.querySelectorAll("tr"))) {
        if (isOmitted(row)) continue
        const cells = Array.from(row.children)
          .filter((cell) => /^(TH|TD)$/.test(cell.tagName) && !isOmitted(cell))
          .map((cell) => cleanText(inlineText(cell)))
        // A linear row is legible at phone width, unlike a miniature screenshot table.
        emit(cells.join(" | "), "table", scope)
      }
    } else if (/^H[1-6]$/.test(tag)) {
      emit(inlineText(element), "heading", scope, Number(tag[1]))
    } else if (tag !== "HR") {
      children(element, scope)
    }
  }

  children(article)
  return result
}

const graphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => part.segment,
    )
  }
  return Array.from(text)
}

/** Soft, source-text budget: keep complete blocks when reasonably close to 800 characters. */
export function selectPosterExcerpt(blocks: PosterBlock[], target = POSTER_CHARACTER_TARGET) {
  const selected: PosterBlock[] = []
  let count = 0
  let truncated = false
  for (const block of blocks) {
    if (count >= target && selected.at(-1)?.kind !== "heading") {
      truncated = true
      break
    }
    const units = graphemes(block.text)
    const remaining = Math.max(target - count, 80)
    if (units.length > remaining + BLOCK_OVERRUN) {
      let end = remaining
      // Prefer a sentence or explicit line boundary over a fixed character cutoff.
      for (
        let index = remaining;
        index < Math.min(units.length, remaining + BLOCK_OVERRUN);
        index++
      ) {
        if (/[。！？.!?\n]/u.test(units[index])) {
          end = index + 1
          break
        }
      }
      selected.push({ ...block, text: units.slice(0, end).join("").trimEnd() })
      truncated = true
      break
    }
    selected.push(block)
    count += units.length
  }
  return { blocks: selected, truncated }
}

type TextMeasurer = Pick<CanvasRenderingContext2D, "font" | "measureText">
export interface WrappedPosterText {
  lines: string[]
  truncated: boolean
}

/** Word-aware Latin wrapping, CJK wrapping, explicit newlines and intact emoji clusters. */
export function wrapPosterText(
  context: Pick<TextMeasurer, "measureText">,
  text: string,
  maxWidth: number,
  maxLines = Number.POSITIVE_INFINITY,
  preserveIndent = false,
): WrappedPosterText {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n")
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    let remaining = graphemes(paragraphs[paragraphIndex])
    if (remaining.length === 0) {
      if (lines.length >= maxLines) return { lines, truncated: true }
      lines.push("")
    }
    while (remaining.length > 0) {
      if (lines.length >= maxLines) return { lines, truncated: true }
      let end = 0
      while (
        end < remaining.length &&
        (context.measureText(remaining.slice(0, end + 1).join("")).width <= maxWidth || end === 0)
      ) {
        end++
      }
      if (end < remaining.length && !preserveIndent) {
        // CJK does not require spaces around Latin words. Find the entire word at
        // the proposed break, moving it to the next line if it fits there.
        const isWordUnit = (unit: string) => /^[\p{Script=Latin}\p{N}\p{M}'’_-]+$/u.test(unit)
        if (isWordUnit(remaining[end - 1]) && isWordUnit(remaining[end])) {
          let start = end - 1
          let wordEnd = end + 1
          while (start > 0 && isWordUnit(remaining[start - 1])) start--
          while (wordEnd < remaining.length && isWordUnit(remaining[wordEnd])) wordEnd++
          const word = remaining.slice(start, wordEnd).join("")
          // Only a token wider than an entire line falls back to grapheme breaks.
          if (start > 0 && context.measureText(word).width <= maxWidth) end = start
        }
        // Avoid introducing a line that starts with CJK closing punctuation.
        // Carry its preceding character/word forward rather than dropping text
        // or allowing punctuation to hang outside the body clipping rectangle.
        const isClosing = (unit: string) =>
          /^[，。！？；：、）》」』】〕〉〗〙〛…,.!?;:%)\]}>”’]+$/u.test(unit)
        if (isClosing(remaining[end])) {
          let boundary = end - 1
          while (boundary > 0 && isClosing(remaining[boundary])) boundary--
          if (isWordUnit(remaining[boundary])) {
            let wordStart = boundary
            let punctuationEnd = end
            while (wordStart > 0 && isWordUnit(remaining[wordStart - 1])) wordStart--
            while (punctuationEnd < remaining.length && isClosing(remaining[punctuationEnd]))
              punctuationEnd++
            if (
              wordStart > 0 &&
              context.measureText(remaining.slice(wordStart, punctuationEnd).join("")).width <=
                maxWidth
            ) {
              boundary = wordStart
            }
          }
          if (boundary > 0) end = boundary
        }
      }
      const line = remaining.slice(0, end).join("")
      lines.push(preserveIndent ? line : line.trimEnd())
      remaining = remaining.slice(end)
      if (!preserveIndent) while (/^\s$/u.test(remaining[0] ?? "")) remaining.shift()
    }
  }
  return { lines, truncated: false }
}

interface TextLine {
  text: string
  x: number
  y: number
  font: string
  color: string
}
interface PlacedBlock {
  lines: TextLine[]
  x: number
  y: number
  width: number
  height: number
  kind: PosterBlock["kind"]
  quoted: boolean
}
export interface PosterLayout {
  width: number
  height: number
  header: TextLine[]
  body: PlacedBlock[]
  footer: TextLine[]
  bodyTop: number
  bodyBottom: number
  footerTop: number
  truncated: boolean
  fade?: { x: number; y: number; width: number; height: number }
  qr: { x: number; y: number; size: number }
}

function font(size: number, weight: string = foundations["weight-regular"], code = false) {
  return `${weight} ${size}px ${foundations[code ? "font-code" : "font-body"]}`
}

function fitEllipsis(context: TextMeasurer, text: string, width: number) {
  const units = graphemes(text)
  while (units.length && context.measureText(`${units.join("")}…`).width > width) units.pop()
  return `${units.join("")}…`
}

/** Human-readable path only; QR data and query/fragment escapes remain canonical. */
export function displayPosterUrl(url: string): string {
  const parts = url.match(/^(https?:\/\/[^/?#]+)([^?#]*)(.*)$/i)
  if (!parts) return url
  try {
    // decodeURI retains escaped URL delimiters such as %2F, %3F and %23. Keep
    // control characters and spaces escaped so they cannot look like new lines.
    const path = decodeURI(parts[2]).replace(/[\u0000-\u0020\u007f]/g, encodeURIComponent)
    return `${parts[1]}${path}${parts[3]}`
  } catch {
    // A malformed escape must not prevent a perfectly usable QR from rendering.
    return url
  }
}

/** Pure measured layout keeps footer/QR outside the clipped or faded article body. */
export function layoutSharePoster(
  context: TextMeasurer,
  input: { title: string; url: string; author?: string; blocks: PosterBlock[]; qrSize: number },
): PosterLayout {
  const header: TextLine[] = []
  const footer: TextLine[] = []
  const body: PlacedBlock[] = []
  let y = margin
  function place(
    into: TextLine[],
    text: string,
    size: number,
    color: string,
    weight: string = foundations["weight-regular"],
    maxLines = Number.POSITIVE_INFINITY,
    lineHeight = size * Number(foundations["leading-ui"]),
  ) {
    context.font = font(size, weight)
    const wrapped = wrapPosterText(context, text, contentWidth, maxLines)
    if (wrapped.truncated && wrapped.lines.length) {
      wrapped.lines[wrapped.lines.length - 1] = fitEllipsis(
        context,
        wrapped.lines.at(-1)!,
        contentWidth,
      )
    }
    for (const line of wrapped.lines) {
      into.push({ text: line, x: margin, y, font: context.font, color })
      y += lineHeight
    }
  }
  place(
    header,
    "晓灰 · xiaohui.cool",
    rem(foundations["text-small"]),
    light["color-accent"],
    foundations["weight-strong"],
  )
  y += gap
  // Article title uses the lower end of the shared 28–36px article title scale.
  place(
    header,
    cleanText(input.title) || "晓灰",
    28,
    light["color-text-strong"],
    foundations["weight-heading"],
    8,
    28 * Number(foundations["leading-tight"]),
  )
  if (input.author?.trim()) {
    y += smallGap
    place(
      header,
      `作者：${cleanText(input.author)}`,
      rem(foundations["text-small"]),
      light["color-text-muted"],
      foundations["weight-regular"],
      2,
    )
  }
  y += rem(foundations["space-8"])
  const bodyTop = y

  // Measure the entire canonical URL first, reserving its space before any body text.
  const footerSize = rem(foundations["text-caption"])
  const footerLeading = footerSize * Number(foundations["leading-ui"])
  context.font = font(footerSize)
  const urlLines = wrapPosterText(context, displayPosterUrl(input.url), contentWidth).lines
  const footerReserve =
    gap + bodyLeading + gap + gap + input.qrSize + gap + urlLines.length * footerLeading + margin
  const bodyLimit = MAX_POSTER_HEIGHT - footerReserve
  const excerpt = selectPosterExcerpt(input.blocks)
  let truncated = excerpt.truncated

  for (let index = 0; index < excerpt.blocks.length; index++) {
    const block = excerpt.blocks[index]
    const code = block.kind === "code"
    const heading = block.kind === "heading"
    const size = heading
      ? rem(foundations[block.level === 1 || block.level === 2 ? "text-h2" : "text-h3"])
      : bodySize
    const lineHeight =
      size *
      Number(foundations[heading ? "leading-tight" : code ? "leading-code" : "leading-reading"])
    const padding = code || block.kind === "table" ? smallGap : 0
    const quoted = block.quoted === true || block.kind === "quote"
    const indent = Math.min(block.depth ?? 0, 4) * gap + (quoted ? gap : 0)
    const markerWidth = block.marker
      ? Math.max(gap, String(block.marker).length * bodySize * 0.6) + smallGap
      : block.depth !== undefined
        ? gap + smallGap
        : 0
    const x = margin + indent + padding + markerWidth
    const width = Math.max(bodySize * 4, contentWidth - indent - padding * 2 - markerWidth)
    const spaceBefore = body.length ? (heading ? gap : smallGap) : 0
    const available = bodyLimit - y - spaceBefore - padding * 2
    const maxLines = Math.floor(available / lineHeight)
    if (maxLines < (heading ? 2 : 1)) {
      truncated = true
      break
    }
    context.font = font(
      size,
      heading ? foundations["weight-heading"] : foundations["weight-regular"],
      code,
    )
    const wrapped = wrapPosterText(context, block.text, width, maxLines, code)
    y += spaceBefore
    const top = y
    const lines: TextLine[] = wrapped.lines.map((text, lineIndex) => ({
      text,
      x,
      y: top + padding + lineIndex * lineHeight,
      font: context.font,
      color: light[heading ? "color-text-strong" : "color-text"],
    }))
    if (block.marker)
      lines.push({
        text: block.marker,
        x: x - markerWidth,
        y: top + padding,
        font: font(bodySize),
        color: light["color-text-muted"],
      })
    y += wrapped.lines.length * lineHeight + padding * 2
    body.push({
      lines,
      x: margin + indent,
      y: top,
      width: contentWidth - indent,
      height: y - top,
      kind: block.kind,
      quoted,
    })
    if (wrapped.truncated) {
      truncated = true
      break
    }
  }
  // Do not leave a heading hanging at the height boundary without the content it introduces.
  if (truncated && body.at(-1)?.kind === "heading") {
    y = body.pop()!.y
  }
  const bodyBottom = y
  const fadeHeight = Math.min(bodyLeading * 3, bodyBottom - bodyTop)
  const fade =
    truncated && fadeHeight > 0
      ? { x: margin, y: bodyBottom - fadeHeight, width: contentWidth, height: fadeHeight }
      : undefined
  y += gap
  if (truncated) {
    place(
      footer,
      "正文未完，扫码继续阅读",
      bodySize,
      light["color-accent"],
      foundations["weight-strong"],
    )
    y += gap
  }
  const footerTop = y
  y += gap
  if (!truncated) {
    place(footer, "扫码查看原文", rem(foundations["text-small"]), light["color-text-muted"])
    y += smallGap
  }
  y = Math.ceil(y * POSTER_SCALE) / POSTER_SCALE
  const qr = {
    x: Math.round(((POSTER_WIDTH - input.qrSize) * POSTER_SCALE) / 2) / POSTER_SCALE,
    y,
    size: input.qrSize,
  }
  y += input.qrSize + gap
  context.font = font(footerSize)
  for (const line of urlLines) {
    footer.push({ text: line, x: margin, y, font: context.font, color: light["color-text-muted"] })
    y += footerLeading
  }
  return {
    width: POSTER_WIDTH,
    height: Math.ceil(y + margin),
    header,
    body,
    footer,
    bodyTop,
    bodyBottom,
    footerTop,
    truncated,
    fade,
    qr,
  }
}

/** Draw in logical pixels; callers provide the high-DPI canvas transform. */
export function paintSharePoster(
  context: CanvasRenderingContext2D,
  layout: PosterLayout,
  qr: ReturnType<typeof QRCode.create>,
) {
  context.fillStyle = light["color-canvas"]
  context.fillRect(0, 0, layout.width, layout.height)
  context.textBaseline = "top"
  const drawText = (line: TextLine) => {
    context.font = line.font
    context.fillStyle = line.color
    context.fillText(line.text, line.x, line.y)
  }
  layout.header.forEach(drawText)
  context.save()
  context.beginPath()
  context.rect(margin, layout.bodyTop, contentWidth, layout.bodyBottom - layout.bodyTop)
  context.clip()
  for (const block of layout.body) {
    if (block.kind === "code" || block.kind === "table") {
      context.fillStyle = light["color-surface"]
      context.fillRect(block.x, block.y, block.width, block.height)
    }
    if (block.quoted) {
      context.fillStyle = light["color-border-strong"]
      context.fillRect(block.x - smallGap, block.y, 2, block.height)
    }
    block.lines.forEach(drawText)
  }
  if (layout.fade) {
    const fade = layout.fade
    const gradient = context.createLinearGradient(0, fade.y, 0, fade.y + fade.height)
    gradient.addColorStop(0, `${light["color-canvas"]}00`)
    gradient.addColorStop(0.6, `${light["color-canvas"]}b3`)
    gradient.addColorStop(1, light["color-canvas"])
    context.fillStyle = gradient
    context.fillRect(fade.x, fade.y, fade.width, fade.height)
  }
  context.restore()
  context.fillStyle = light["color-border"]
  context.fillRect(margin, layout.footerTop, contentWidth, 1)
  layout.footer.forEach(drawText)
  const quietZone = 4
  const moduleSize = layout.qr.size / (qr.modules.size + quietZone * 2)
  context.fillStyle = light["color-surface-raised"]
  context.fillRect(layout.qr.x, layout.qr.y, layout.qr.size, layout.qr.size)
  context.fillStyle = light["color-text-strong"]
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        context.fillRect(
          layout.qr.x + (column + quietZone) * moduleSize,
          layout.qr.y + (row + quietZone) * moduleSize,
          moduleSize,
          moduleSize,
        )
      }
    }
  }
}

export async function generateLongSharePoster(input: SharePosterInput): Promise<Blob> {
  // Snapshot before awaiting fonts: SPA navigation must never change an in-flight article.
  const blocks = extractArticleBlocks(input.article)
  const document = input.article.ownerDocument
  const qr = QRCode.create(input.url, { errorCorrectionLevel: "M" })
  const modules = qr.modules.size + 8
  const modulePixels = Math.max(3, Math.ceil((112 * POSTER_SCALE) / modules))
  const qrSize = (modules * modulePixels) / POSTER_SCALE
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not supported in this browser.")
  if (document.fonts?.ready) {
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      document.fonts.ready.catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1200)
      }),
    ])
    clearTimeout(timer)
  }
  const layout = layoutSharePoster(context, { ...input, blocks, qrSize })
  if (layout.height > MAX_POSTER_HEIGHT || qrSize > contentWidth) {
    throw new Error("The article URL is too large for a readable share image.")
  }
  canvas.width = layout.width * POSTER_SCALE
  canvas.height = layout.height * POSTER_SCALE
  context.scale(POSTER_SCALE, POSTER_SCALE)
  paintSharePoster(context, layout, qr)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unable to render share image."))),
      "image/png",
    )
  })
}
