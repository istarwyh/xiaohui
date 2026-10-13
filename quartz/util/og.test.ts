import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import satori, { type SatoriNode, type SatoriOptions } from "satori"
import sharp from "sharp"
import { defaultImage, type ImageOptions } from "./og"
import { xiaohuiTheme } from "../design/tokens"

// Offline, licensed subsets include every character used by these fixtures.
const fonts: SatoriOptions["fonts"] = ([400, 700] as const).map((weight) => ({
  name: "Noto Sans SC",
  data: readFileSync(
    new URL(
      `../../tests/fixtures/og/QuartzOGFixture-${weight === 400 ? "Regular" : "Bold"}.otf`,
      import.meta.url,
    ),
  ),
  weight,
  style: "normal",
}))
const iconBase64 = `data:image/png;base64,${readFileSync(
  new URL("../static/icon.png", import.meta.url),
).toString("base64")}`
const fixtures = [
  {
    name: "homepage",
    title: "太阳总会升起 | AI Agent · MCP 实践者",
    description:
      "晓灰的数字花园 · AI Agent 与 MCP 实践者 · 关于 Agent 架构、上下文工程、工程实践、投资系统与长期学习。",
  },
  {
    name: "long-chinese-title",
    title: "2025年终总结：两年不上班，我才发现自己一直在装 | AI Agent · MCP 实践者",
    description:
      "一眨眼2025年又结束了，翻看历年年度总结，我发现第一个五年、第二个五年的总结都很合适：梳理了重点，形成了方法论，也有阶段发展建议。".repeat(
        3,
      ),
  },
  {
    name: "english-homepage",
    title: "The Sun Will Rise | AI Agent · MCP 实践者",
    description:
      "Xiaohui's digital garden · AI Agent and MCP practitioner · Agent architecture, context engineering, engineering practice, and reflective writing.",
  },
]

for (const fixture of fixtures) {
  test(`Satori OG ${fixture.name} keeps content and metadata inside the actual canvas`, async () => {
    const nodes: SatoriNode[] = []
    const styleErrors: Error[] = []
    const cfg = {
      theme: xiaohuiTheme,
      locale: "zh-CN",
      defaultDateType: "created",
      baseUrl: "xiaohui.cool",
    } as ImageOptions["cfg"]
    const fileData = {
      dates: { created: new Date("2026-01-07T12:00:00Z") },
      text: "Reading practice ".repeat(100),
      frontmatter: { tags: ["Agent", "MCP"] },
    } as ImageOptions["fileData"]
    const svg = await satori(
      defaultImage({
        cfg,
        userOpts: { width: 1200, height: 630, colorScheme: "lightMode", excludeRoot: false },
        ...fixture,
        fonts,
        fileData,
        iconBase64,
      }),
      {
        width: 1200,
        height: 630,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
        onStyleError: (error) => styleErrors.push(error),
      },
    )
    assert.deepEqual(styleErrors, [])
    const root = nodes[0]
    assert.deepEqual([root.left, root.top, root.width, root.height], [0, 0, 1200, 630])
    const title = nodes.find((node) => node.type === "h1")!
    const description = nodes.find((node) => node.type === "p")!
    const footer = nodes.find((node) => node.props.style?.borderTop)!
    assert.ok(title && description && footer, "Title, description and metadata are rendered")
    for (const [label, node] of Object.entries({ title, description, footer })) {
      assert.ok(node.width > 0 && node.height > 0, `${label} remains visible`)
      assert.ok(node.left >= 40 && node.left + node.width <= 1160, `${label} respects side insets`)
      assert.ok(
        node.top >= 40 && node.top + node.height <= 590,
        `${label} respects vertical insets`,
      )
    }
    assert.ok(
      description.top + description.height <= footer.top,
      "Description cannot cover metadata",
    )
    assert.ok(footer.height >= 60, "Footer retains room for its border, padding and metadata")

    // Use the production rasterizer as well as Satori's measured boxes. Textless
    // or clipped-away footers must not pass just because the outer image is valid.
    const webp = await sharp(Buffer.from(svg)).webp({ quality: 40 }).toBuffer()
    const metadata = await sharp(webp).metadata()
    assert.equal(metadata.width, 1200)
    assert.equal(metadata.height, 630)
    // Crop each label after its icon. Icons alone must not satisfy this check.
    for (const [label, left, width] of [
      ["date", 80, 180],
      ["reading time", 340, 140],
    ] as const) {
      const { data, info } = await sharp(webp)
        .extract({ left, top: Math.ceil(footer.top + 33), width, height: 35 })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      let ink = 0
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180) ink++
      }
      assert.ok(ink > 150, `The actual WebP contains the ${label} text, not only its icon`)
    }
    if (process.env.OG_QA_OUTPUT) {
      mkdirSync(process.env.OG_QA_OUTPUT, { recursive: true })
      writeFileSync(path.join(process.env.OG_QA_OUTPUT, `${fixture.name}.webp`), webp)
      writeFileSync(path.join(process.env.OG_QA_OUTPUT, `${fixture.name}.svg`), svg)
    }
  })
}
