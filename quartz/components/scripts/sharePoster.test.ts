import assert from "node:assert/strict"
import test from "node:test"
import * as QRCode from "qrcode"
import { foundations, light } from "../../design/tokens"
import {
  displayPosterUrl,
  extractArticleBlocks,
  generateLongSharePoster,
  layoutSharePoster,
  MAX_POSTER_HEIGHT,
  paintSharePoster,
  POSTER_SCALE,
  POSTER_WIDTH,
  selectPosterExcerpt,
  wrapPosterText,
  type PosterBlock,
} from "./sharePoster"

class TextNode {
  nodeType = 3
  constructor(public textContent: string) {}
}

class ElementNode {
  nodeType = 1
  tagName: string
  childNodes: (ElementNode | TextNode)[]
  constructor(
    tag: string,
    public attributes: Record<string, string> = {},
    ...children: (ElementNode | string)[]
  ) {
    this.tagName = tag.toUpperCase()
    this.childNodes = children.map((child) =>
      typeof child === "string" ? new TextNode(child) : child,
    )
  }
  get children() {
    return this.childNodes.filter((child): child is ElementNode => child instanceof ElementNode)
  }
  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("")
  }
  get classList() {
    return { contains: (name: string) => (this.attributes.class ?? "").split(" ").includes(name) }
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null
  }
  hasAttribute(name: string) {
    return name in this.attributes
  }
  matches(selectors: string): boolean {
    return selectors.split(",").some((selector) => {
      if (selector.startsWith(".")) return this.classList.contains(selector.slice(1))
      const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/)
      if (attribute)
        return (
          this.hasAttribute(attribute[1]) &&
          (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2])
        )
      return this.tagName.toLowerCase() === selector.toLowerCase()
    })
  }
  querySelectorAll(selector: string): ElementNode[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ])
  }
  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null
  }
  asElement() {
    return this as unknown as Element
  }
}

const el = (tag: string, ...children: (ElementNode | string)[]) =>
  new ElementNode(tag, {}, ...children)
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const count = (text: string) => Array.from(segmenter.segment(text)).length
const paragraph = (text: string): PosterBlock => ({ kind: "paragraph", text })
const simpleMeasure = {
  measureText: (text: string) => ({ width: count(text) * 10 }) as TextMetrics,
}

function canvasContext() {
  const calls: {
    operation: string
    args: unknown[]
    fill?: string | CanvasGradient | CanvasPattern
    font?: string
  }[] = []
  const context = {
    font: "",
    fillStyle: "" as string | CanvasGradient | CanvasPattern,
    textBaseline: "top",
    measureText(text: string) {
      const size = Number(context.font.match(/([\d.]+)px/)?.[1] ?? 18)
      return {
        width: Array.from(segmenter.segment(text), ({ segment }) =>
          /[\u0000-\u007f]/.test(segment) ? size * 0.55 : size,
        ).reduce((sum, width) => sum + width, 0),
      } as TextMetrics
    },
    fillRect(...args: number[]) {
      calls.push({ operation: "fillRect", args, fill: context.fillStyle })
    },
    fillText(...args: [string, number, number]) {
      calls.push({ operation: "fillText", args, fill: context.fillStyle, font: context.font })
    },
    save() {
      calls.push({ operation: "save", args: [] })
    },
    restore() {
      calls.push({ operation: "restore", args: [] })
    },
    beginPath() {},
    rect(...args: number[]) {
      calls.push({ operation: "rect", args })
    },
    clip() {
      calls.push({ operation: "clip", args: [] })
    },
    scale(...args: number[]) {
      calls.push({ operation: "scale", args })
    },
    createLinearGradient(...args: number[]) {
      calls.push({ operation: "gradient", args })
      return {
        addColorStop: (...stop: unknown[]) => calls.push({ operation: "stop", args: stop }),
      } as unknown as CanvasGradient
    },
  }
  return { context: context as unknown as CanvasRenderingContext2D, calls }
}

test("extracts ordered headings, inline content and paragraphs without controls or duplicate text", () => {
  const article = el(
    "article",
    el("h2", "标题", new ElementNode("a", { class: "anchor" }, "#")),
    el("p", "前文 ", el("strong", "强调"), " 和 ", el("code", "inline()"), el("br"), "下一行"),
    el("div", el("p", "后一段")),
    el("button", "复制"),
    el("script", "hidden()"),
    new ElementNode("div", { "aria-hidden": "true" }, "不可见"),
    new ElementNode("div", { hidden: "" }, "隐藏"),
    new ElementNode("p", { style: "display: none" }, "样式隐藏"),
    el("nav", "导航"),
    el("aside", "相关文章"),
    new ElementNode("span", { class: "clipboard-button" }, "Copy code"),
  )
  const blocks = extractArticleBlocks(article.asElement())
  assert.deepEqual(
    blocks.map(({ kind, text }) => ({ kind, text })),
    [
      { kind: "heading", text: "标题" },
      { kind: "paragraph", text: "前文 强调 和 inline()\n下一行" },
      { kind: "paragraph", text: "后一段" },
    ],
  )
  assert.equal(article.textContent.includes("复制"), true, "extraction must not mutate the article")
})

test("nested lists retain depth, numbering and paragraph order without duplicating descendants", () => {
  const article = el(
    "article",
    new ElementNode(
      "ol",
      { start: "3" },
      el("li", "第一项", el("ul", el("li", "嵌套项")), el("p", "第一项补充")),
      new ElementNode("li", { value: "8" }, el("p", "第二项")),
      el("li", "第三项"),
    ),
  )
  const blocks = extractArticleBlocks(article.asElement())
  assert.deepEqual(
    blocks.map(({ text, marker, depth }) => ({ text, marker, depth })),
    [
      { text: "第一项", marker: "3.", depth: 0 },
      { text: "嵌套项", marker: "•", depth: 1 },
      { text: "第一项补充", marker: undefined, depth: 0 },
      { text: "第二项", marker: "8.", depth: 0 },
      { text: "第三项", marker: "9.", depth: 0 },
    ],
  )
  const reversed = extractArticleBlocks(
    new ElementNode(
      "article",
      {},
      new ElementNode("ol", { reversed: "" }, el("li", "a"), el("li", "b")),
    ).asElement(),
  )
  assert.deepEqual(
    reversed.map((block) => block.marker),
    ["2.", "1."],
  )
})

test("preserves quoted blocks, code indentation and readable table rows in source order", () => {
  const article = el(
    "article",
    el("blockquote", el("p", "引文一"), el("p", "引文二")),
    el("pre", el("code", "  function f() {\n    return 1\n  }\n"), el("button", "复制代码")),
    el(
      "table",
      el("caption", "比较表"),
      el("thead", el("tr", el("th", "名称"), el("th", "说明"))),
      el("tbody", el("tr", el("td", "A"), el("td", "内容"))),
    ),
    el("p", "最后"),
  )
  assert.deepEqual(
    extractArticleBlocks(article.asElement()).map(({ kind, text }) => [kind, text]),
    [
      ["quote", "引文一"],
      ["quote", "引文二"],
      ["code", "  function f() {\n    return 1\n  }"],
      ["paragraph", "比较表"],
      ["table", "名称 | 说明"],
      ["table", "A | 内容"],
      ["paragraph", "最后"],
    ],
  )
})

test("a quoted first paragraph consumes the list marker exactly once", () => {
  const article = el(
    "article",
    el("ol", el("li", el("blockquote", el("p", "开头引文")), el("p", "列表项后续正文"))),
  )
  const blocks = extractArticleBlocks(article.asElement())
  assert.deepEqual(
    blocks.map(({ text, marker, quoted }) => ({ text, marker, quoted })),
    [
      { text: "开头引文", marker: "1.", quoted: true },
      { text: "列表项后续正文", marker: undefined, quoted: undefined },
    ],
  )
})

test("math text is included once using its source rather than duplicated KaTeX trees", () => {
  const article = el(
    "article",
    el(
      "p",
      "公式 ",
      new ElementNode(
        "span",
        { class: "katex" },
        new ElementNode(
          "span",
          { class: "katex-mathml" },
          el("math", el("semantics", el("mi", "x"), el("annotation", "x^2"))),
        ),
        new ElementNode("span", { class: "katex-html" }, "xx22"),
      ),
    ),
  )
  assert.equal(extractArticleBlocks(article.asElement())[0].text, "公式 x^2")
})

test("soft character threshold keeps short articles and complete nearby paragraphs", () => {
  const short = [paragraph("甲".repeat(300)), paragraph("乙".repeat(400))]
  assert.deepEqual(selectPosterExcerpt(short), { blocks: short, truncated: false })
  const near = [paragraph("甲".repeat(450)), paragraph("乙".repeat(420)), paragraph("后续")]
  assert.deepEqual(selectPosterExcerpt(near), { blocks: near.slice(0, 2), truncated: true })
  assert.equal(selectPosterExcerpt(near.slice(0, 2)).truncated, false)
})

test("oversized paragraphs prefer a sentence boundary and preserve complete emoji graphemes", () => {
  const sentence = "甲".repeat(820) + "。" + "乙".repeat(1000)
  const excerpt = selectPosterExcerpt([paragraph(sentence)])
  assert.equal(excerpt.blocks[0].text, "甲".repeat(820) + "。")
  assert.equal(excerpt.truncated, true)
  const emoji = "👩🏽‍💻"
  const fallback = selectPosterExcerpt([paragraph(emoji.repeat(1500))])
  assert.equal(fallback.blocks[0].text, emoji.repeat(800))
})

test("headings near the soft boundary retain the following content", () => {
  const blocks: PosterBlock[] = [
    paragraph("甲".repeat(795)),
    { kind: "heading", level: 2, text: "接下来的一节" },
    paragraph("这一节的正文"),
    paragraph("后续正文"),
  ]
  const excerpt = selectPosterExcerpt(blocks)
  assert.equal(excerpt.blocks.at(-1)?.text, "这一节的正文")
  assert.equal(excerpt.truncated, true)
})

test("wrapping respects words, newlines, code whitespace and grapheme boundaries", () => {
  assert.deepEqual(wrapPosterText(simpleMeasure, "one two three", 50).lines, [
    "one",
    "two",
    "three",
  ])
  assert.deepEqual(wrapPosterText(simpleMeasure, "中文阅读内容", 30).lines, ["中文阅", "读内容"])
  assert.deepEqual(wrapPosterText(simpleMeasure, "一\n\n二", 100).lines, ["一", "", "二"])
  assert.deepEqual(wrapPosterText(simpleMeasure, "  x\n    y", 100, Infinity, true).lines, [
    "  x",
    "    y",
  ])
  assert.deepEqual(wrapPosterText(simpleMeasure, "👩🏽‍💻👨‍👩‍👧‍👦中文", 20).lines, ["👩🏽‍💻👨‍👩‍👧‍👦", "中文"])
  assert.deepEqual(wrapPosterText(simpleMeasure, "abcdefgh", 30).lines, ["abc", "def", "gh"])
})

test("wrapping reports truncation only when source remains, including explicit blank lines", () => {
  assert.deepEqual(wrapPosterText(simpleMeasure, "abc", 30, 1), {
    lines: ["abc"],
    truncated: false,
  })
  assert.deepEqual(wrapPosterText(simpleMeasure, "abcdef", 30, 1), {
    lines: ["abc"],
    truncated: true,
  })
  assert.deepEqual(wrapPosterText(simpleMeasure, "abc\n", 30, 1), {
    lines: ["abc"],
    truncated: true,
  })
  assert.deepEqual(wrapPosterText(simpleMeasure, "text", 30, 0), { lines: [], truncated: true })
})

test("Latin words stay intact at CJK boundaries without requiring whitespace", () => {
  assert.deepEqual(wrapPosterText(simpleMeasure, "长文分享测试：structures", 120).lines, [
    "长文分享测试：",
    "structures",
  ])
  assert.deepEqual(wrapPosterText(simpleMeasure, "中文English words中文", 80).lines, [
    "中文",
    "English",
    "words中文",
  ])
  assert.deepEqual(wrapPosterText(simpleMeasure, "中文don't café", 60).lines, [
    "中文",
    "don't",
    "café",
  ])
  assert.deepEqual(wrapPosterText(simpleMeasure, "中文veryLongUnbrokenToken", 50).lines, [
    "中文ver",
    "yLong",
    "Unbro",
    "kenTo",
    "ken",
  ])
  assert.deepEqual(
    wrapPosterText(simpleMeasure, "中文English", 60, Infinity, true).lines,
    ["中文Engl", "ish"],
    "code keeps its existing grapheme wrapping",
  )
})

test("inserted normal-text line breaks keep CJK closing punctuation with preceding text", () => {
  for (const punctuation of [
    "，",
    "。",
    "！",
    "？",
    "；",
    "：",
    "、",
    "）",
    "》",
    "」",
    "』",
    "】",
    "〕",
    "〉",
    "”",
    "’",
  ]) {
    const source = `甲乙丙丁${punctuation}尾`
    const wrapped = wrapPosterText(simpleMeasure, source, 40).lines
    assert.deepEqual(wrapped, ["甲乙丙", `丁${punctuation}尾`])
    assert.equal(wrapped.join(""), source)
    assert.ok(wrapped.every((line) => simpleMeasure.measureText(line).width <= 40))
  }
  assert.deepEqual(wrapPosterText(simpleMeasure, "甲乙丙丁。”尾", 40).lines, ["甲乙丙", "丁。”尾"])
  assert.deepEqual(wrapPosterText(simpleMeasure, "甲乙Word，尾", 60).lines, ["甲乙", "Word，尾"])
  assert.deepEqual(
    wrapPosterText(simpleMeasure, "甲乙丙丁，尾", 40, Infinity, true).lines,
    ["甲乙丙丁", "，尾"],
    "code wrapping is unchanged",
  )
})

test("footer URL decodes Unicode paths but preserves canonical query and fragment semantics", () => {
  const canonical =
    "https://xiaohui.cool/%E7%AC%94%E8%AE%B0/%E9%95%BF%E6%96%87?next=%2F%E9%A1%B5#%E7%AB%A0"
  assert.equal(
    displayPosterUrl(canonical),
    "https://xiaohui.cool/笔记/长文?next=%2F%E9%A1%B5#%E7%AB%A0",
  )
  assert.equal(
    displayPosterUrl("https://xiaohui.cool/a%2Fb%3Fc%23d%20e%0A"),
    "https://xiaohui.cool/a%2Fb%3Fc%23d%20e%0A",
  )
  assert.equal(
    displayPosterUrl("https://xiaohui.cool/invalid%E7%AC"),
    "https://xiaohui.cool/invalid%E7%AC",
  )
  assert.equal(
    displayPosterUrl("https://xiaohui.cool/invalid%ZZ"),
    "https://xiaohui.cool/invalid%ZZ",
  )
  assert.equal(
    displayPosterUrl("https://xiaohui.cool?next=%E7%AC%94#%E8%AE%B0"),
    "https://xiaohui.cool?next=%E7%AC%94#%E8%AE%B0",
  )
  assert.equal(displayPosterUrl("not an absolute URL"), "not an absolute URL")
})

test("short article layout contains all body text, dynamic title/author, QR and complete URL", () => {
  const { context } = canvasContext()
  const blocks = [paragraph("第一段的完整内容。"), paragraph("第二段的完整内容。")]
  const input = {
    title: "长标题".repeat(15),
    author: "晓灰",
    url: "https://xiaohui.cool/notes/a-long-canonical-address",
    blocks,
    qrSize: 120,
  }
  const layout = layoutSharePoster(context, input)
  assert.equal(layout.width, 360)
  assert.equal(layout.truncated, false)
  assert.equal(layout.fade, undefined)
  assert.equal(
    layout.body
      .flatMap((block) => block.lines)
      .map((line) => line.text)
      .join(""),
    blocks.map((block) => block.text).join(""),
  )
  assert.ok(layout.header.some((line) => line.text === "作者：晓灰"))
  assert.ok(layout.header.filter((line) => /长标题/.test(line.text)).length > 1)
  assert.ok(layout.body[0].lines[0].font.includes("18px"))
  assert.ok(layout.body[0].lines[0].font.includes(foundations["font-body"]))
  assert.ok(layout.footerTop > layout.bodyBottom)
  assert.ok(layout.qr.y > layout.footerTop)
  const url = layout.footer
    .filter((line) => line.y > layout.qr.y + layout.qr.size)
    .map((line) => line.text)
    .join("")
  assert.equal(url, input.url)
  assert.ok(layout.height < MAX_POSTER_HEIGHT)
})

test("long article fades only the body, with an unfaded continuation message and QR below", () => {
  const { context } = canvasContext()
  const layout = layoutSharePoster(context, {
    title: "长文",
    url: "https://xiaohui.cool/long",
    blocks: [paragraph("原文内容".repeat(400))],
    qrSize: 120,
  })
  assert.equal(layout.truncated, true)
  assert.ok(layout.fade)
  assert.ok(layout.fade.y >= layout.bodyTop)
  assert.equal(layout.fade.y + layout.fade.height, layout.bodyBottom)
  const notice = layout.footer.find((line) => line.text.includes("正文未完"))!
  assert.ok(notice.y > layout.bodyBottom)
  assert.ok(layout.footerTop > notice.y)
  assert.ok(layout.qr.y > layout.footerTop)
  assert.ok(layout.height < MAX_POSTER_HEIGHT)
})

test("hard height guard bounds pathological newlines and keeps the footer outside the body", () => {
  const { context } = canvasContext()
  const layout = layoutSharePoster(context, {
    title: "标题".repeat(100),
    author: "作者".repeat(100),
    url: "https://xiaohui.cool/" + "a".repeat(300),
    blocks: [{ kind: "code", text: "x\n".repeat(400) }],
    qrSize: 120,
  })
  assert.equal(layout.truncated, true)
  assert.ok(layout.height <= MAX_POSTER_HEIGHT, `${layout.height} exceeds the canvas guard`)
  for (const block of layout.body) assert.ok(block.y + block.height <= layout.bodyBottom)
  assert.ok(layout.qr.y > layout.bodyBottom)
  assert.ok(layout.qr.y + layout.qr.size < layout.height)
  for (const line of layout.footer) assert.ok(line.y < layout.height)
})

test("paint uses semantic tokens, body-only clipping, and a four-module QR quiet zone", () => {
  const { context, calls } = canvasContext()
  const qr = QRCode.create("https://xiaohui.cool/test", { errorCorrectionLevel: "M" })
  const moduleSize = 2
  const qrSize = (qr.modules.size + 8) * moduleSize
  const layout = layoutSharePoster(context, {
    title: "测试",
    url: "https://xiaohui.cool/test",
    blocks: [paragraph("正文".repeat(1000))],
    qrSize,
  })
  paintSharePoster(context, layout, qr)
  assert.deepEqual(calls[0], {
    operation: "fillRect",
    args: [0, 0, POSTER_WIDTH, layout.height],
    fill: light["color-canvas"],
  })
  const restore = calls.findIndex((call) => call.operation === "restore")
  const gradient = calls.findIndex((call) => call.operation === "gradient")
  const notice = calls.findIndex(
    (call) => call.operation === "fillText" && String(call.args[0]).includes("正文未完"),
  )
  assert.ok(gradient > 0 && gradient < restore && restore < notice)
  const background = calls.findIndex(
    (call) => call.operation === "fillRect" && call.fill === light["color-surface-raised"],
  )
  const modules = calls.slice(background + 1)
  assert.ok(modules.length > 0)
  for (const call of modules) {
    assert.equal(call.fill, light["color-text-strong"])
    assert.ok(Number(call.args[0]) >= layout.qr.x + moduleSize * 4)
    assert.ok(Number(call.args[1]) >= layout.qr.y + moduleSize * 4)
    assert.ok(Number(call.args[0]) + moduleSize <= layout.qr.x + layout.qr.size - moduleSize * 4)
    assert.ok(Number(call.args[1]) + moduleSize <= layout.qr.y + layout.qr.size - moduleSize * 4)
  }
})

test("QR origin and module edges stay on physical pixel boundaries at 2x resolution", () => {
  const { context, calls } = canvasContext()
  const qr = QRCode.create("https://xiaohui.cool/" + "path/".repeat(60), {
    errorCorrectionLevel: "M",
  })
  const qrSize = ((qr.modules.size + 8) * 3) / POSTER_SCALE
  const layout = layoutSharePoster(context, {
    title: "带换行的较长标题".repeat(4),
    url: "https://xiaohui.cool/test",
    blocks: [paragraph("短文。")],
    qrSize,
  })
  paintSharePoster(context, layout, qr)
  assert.equal(Number.isInteger(layout.qr.x * POSTER_SCALE), true)
  assert.equal(Number.isInteger(layout.qr.y * POSTER_SCALE), true)
  assert.equal(
    calls.some((call) => call.operation === "gradient"),
    false,
    "short articles must remain unfaded",
  )
  const background = calls.findIndex(
    (call) => call.operation === "fillRect" && call.fill === light["color-surface-raised"],
  )
  for (const call of calls.slice(background + 1)) {
    for (const coordinate of call.args)
      assert.equal(Number.isInteger(Number(coordinate) * POSTER_SCALE), true)
  }
})

test("browser API returns a PNG Blob with bounded 2x dimensions and no object URL ownership", async () => {
  const { context, calls } = canvasContext()
  const png = new Blob(["test PNG"], { type: "image/png" })
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: BlobCallback, type: string) => {
      assert.equal(type, "image/png")
      callback(png)
    },
  }
  const article = Object.assign(el("article", el("p", "完整正文")), {
    ownerDocument: { createElement: () => canvas },
  })
  const blob = await generateLongSharePoster({
    title: "标题",
    url: "https://xiaohui.cool/test",
    article: article.asElement(),
  })
  assert.equal(blob, png)
  assert.equal(canvas.width, POSTER_WIDTH * POSTER_SCALE)
  assert.ok(canvas.height > 0 && canvas.height <= MAX_POSTER_HEIGHT * POSTER_SCALE)
  assert.ok(calls.some((call) => call.operation === "scale" && call.args[0] === POSTER_SCALE))
})

test("browser API rejects missing canvas and failed PNG encoding", async () => {
  const article = el("article", el("p", "正文"))
  const input = { title: "标题", url: "https://xiaohui.cool/test", article: article.asElement() }
  Object.assign(article, { ownerDocument: { createElement: () => ({ getContext: () => null }) } })
  await assert.rejects(generateLongSharePoster(input), /Canvas is not supported/)
  Object.assign(article, {
    ownerDocument: {
      createElement: () => ({
        getContext: () => canvasContext().context,
        toBlob: (callback: BlobCallback) => callback(null),
      }),
    },
  })
  await assert.rejects(generateLongSharePoster(input), /Unable to render/)
})

test("browser API snapshots article content before waiting for fonts", async () => {
  const { context, calls } = canvasContext()
  let fontsReady!: () => void
  const ready = new Promise<void>((resolve) => {
    fontsReady = resolve
  })
  const paragraphElement = el("p", "生成开始时的原文")
  const article = Object.assign(el("article", paragraphElement), {
    ownerDocument: {
      fonts: { ready },
      createElement: () => ({
        getContext: () => context,
        toBlob: (callback: BlobCallback) => callback(new Blob(["PNG"], { type: "image/png" })),
      }),
    },
  })
  const promise = generateLongSharePoster({
    title: "标题",
    url: "https://xiaohui.cool/test",
    article: article.asElement(),
  })
  ;(paragraphElement.childNodes[0] as TextNode).textContent = "导航后的新页面"
  fontsReady()
  await promise
  const text = calls
    .filter((call) => call.operation === "fillText")
    .map((call) => call.args[0])
    .join("")
  assert.ok(text.includes("生成开始时的原文"))
  assert.equal(text.includes("导航后的新页面"), false)
})

test("mixed CJK/Latin/emoji short fixture exports fully without author or fade", async () => {
  const { context, calls } = canvasContext()
  const source =
    "清楚的作者、可读的内容、可靠的结构和克制的细节。这是用于验证原文分享的短文。中文标点自然换行，English words stay readable，emoji 👩🏽‍💻 不能截断。"
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: BlobCallback) => callback(new Blob(["PNG"], { type: "image/png" })),
  }
  const article = Object.assign(el("article", el("p", source), el("p", "SHORT-END 完整原文。")), {
    ownerDocument: { fonts: { ready: Promise.resolve() }, createElement: () => canvas },
  })
  const url = new URL("https://xiaohui.cool/笔记/长文分享-short").href
  const blob = await generateLongSharePoster({
    title: "长文分享测试：short",
    url,
    article: article.asElement(),
  })
  assert.equal(blob.type, "image/png")
  assert.equal(canvas.width, 720)
  assert.ok(Number.isInteger(canvas.height) && canvas.height > 0 && canvas.height <= 8000)
  const text = calls
    .filter((call) => call.operation === "fillText")
    .map((call) => call.args[0])
    .join("")
  assert.ok(text.includes("SHORT-END"))
  assert.ok(text.includes("👩🏽‍💻"))
  assert.ok(text.includes(displayPosterUrl(url)))
  assert.equal(text.includes("作者："), false)
  assert.equal(text.includes("正文未完"), false)
  assert.equal(
    calls.some((call) => call.operation === "gradient"),
    false,
  )
  for (const call of calls.filter((call) => ["fillRect", "fillText"].includes(call.operation))) {
    assert.ok(
      call.args.every((argument) => typeof argument !== "number" || Number.isFinite(argument)),
    )
  }
})
