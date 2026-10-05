import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { foundations, light, dark, designTokens, xiaohuiTheme } from "./tokens"
import { joinStyles } from "../util/theme"
import { paperGrain, paperTextureSvg } from "./paperTexture"

function luminance(hex: string): number {
  assert.match(hex, /^#[0-9a-f]{6}$/i, "Contrast checks require opaque sRGB tokens")
  const rgb = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const surfaces = [
  "color-canvas",
  "color-surface",
  "color-surface-raised",
  "color-surface-hover",
] as const
const foregrounds = [
  "color-text",
  "color-text-strong",
  "color-text-muted",
  "color-accent",
  "color-accent-hover",
] as const

for (const [mode, palette] of Object.entries({ light, dark })) {
  test(`${mode}: normal text, small metadata and links meet 4.5:1 on supported surfaces`, () => {
    for (const foreground of foregrounds) {
      for (const background of surfaces) {
        const ratio = contrast(palette[foreground], palette[background])
        assert.ok(ratio >= 4.5, `${mode} ${foreground}/${background}: ${ratio.toFixed(2)}:1`)
      }
    }
    for (const background of ["color-accent-soft", "color-selection", "color-mark"] as const) {
      assert.ok(contrast(palette["color-text"], palette[background]) >= 4.5)
      assert.ok(contrast(palette["color-accent-hover"], palette[background]) >= 4.5)
    }
  })

  test(`${mode}: focus/control boundaries meet 3:1; status text meets 4.5:1`, () => {
    for (const background of surfaces) {
      for (const foreground of ["color-focus", "color-border-strong"] as const) {
        assert.ok(
          contrast(palette[foreground], palette[background]) >= 3,
          `${mode} ${foreground}/${background}`,
        )
      }
      for (const foreground of ["color-positive", "color-warning", "color-danger"] as const) {
        assert.ok(
          contrast(palette[foreground], palette[background]) >= 4.5,
          `${mode} ${foreground}/${background}`,
        )
      }
    }
  })
}

test("light/dark have the same semantic contract and token references resolve without cycles", () => {
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort())
  for (const palette of [light, dark]) {
    const values: Record<string, string> = { ...designTokens.shared, ...palette }
    const visit = (name: string, parents: string[] = []): void => {
      assert.ok(name in values, `Undefined token: ${name}`)
      assert.ok(!parents.includes(name), `Circular token: ${[...parents, name].join(" → ")}`)
      for (const match of values[name].matchAll(/var\(--([\w-]+)\)/g)) {
        visit(match[1], [...parents, name])
      }
    }
    Object.keys(values).forEach((name) => visit(name))
  }
})

test("Quartz aliases, browser tokens, and OG colors share one source", () => {
  for (const [mode, palette] of [
    ["lightMode", light],
    ["darkMode", dark],
  ] as const) {
    const colors = xiaohuiTheme.colors[mode]
    assert.equal(colors.light, palette["color-canvas"])
    assert.equal(colors.gray, palette["color-text-muted"])
    assert.equal(colors.secondary, palette["color-accent"])
    assert.equal(colors.dark, palette["color-text-strong"])
  }
  const css = joinStyles(xiaohuiTheme)
  for (const [name, value] of Object.entries({ ...designTokens.shared, ...light })) {
    assert.ok(css.includes(`--${name}: ${value};`))
  }
  const darkCss = css.split(':root[saved-theme="dark"]')[1]
  for (const [name, value] of Object.entries(dark)) {
    assert.ok(darkCss.includes(`--${name}: ${value};`))
  }
  // Theme extension stays optional for upstream/alternate Quartz sites.
  const { tokens: _, ...upstreamTheme } = xiaohuiTheme
  assert.ok(!joinStyles(upstreamTheme).includes("--color-canvas"))
})

const migratedStyles = [
  "quartz/styles/custom.scss",
  ...[
    "brandKit",
    "terminalHome",
    "feedList",
    "search",
    "curatedQuotes",
    "exploreHint",
    "graph",
    "toc",
    "popover",
    "readingProgress",
  ].map((name) => `quartz/components/styles/${name}.scss`),
]

test("migrated surfaces cannot reintroduce raw colors, fonts, or undefined semantic tokens", () => {
  const definitions = new Set(Object.keys({ ...designTokens.shared, ...light }))
  for (const path of migratedStyles) {
    const source = readFileSync(path, "utf8").replace(/\/\/[^\n]*/g, "")
    assert.doesNotMatch(source, /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, path)
    for (const match of source.matchAll(/font-family:([^;]+);/g)) {
      assert.match(match[1].trim(), /^(var\(|inherit$)/, path)
    }
    for (const match of source.matchAll(
      /var\(--((?:color|font|space|radius|text|weight|leading|measure|duration|ease|shadow|focus|control|feed|layer|border|texture)-[\w-]+)\)/g,
    )) {
      assert.ok(definitions.has(match[1]), `${path}: undefined --${match[1]}`)
    }
  }
})

test("approved feed density and image geometry remain explicit", () => {
  assert.equal(foundations["feed-row-padding"], "var(--space-3) 0.4rem")
  assert.equal(foundations["feed-row-mobile-padding"], "0.65rem 0.2rem")
  assert.equal(foundations["feed-thumbnail-width"], "8rem")
  assert.equal(foundations["feed-thumbnail-ratio"], "4 / 3")
  const feed = readFileSync("quartz/components/styles/feedList.scss", "utf8")
  assert.match(feed, /contain: inline-size/)
  assert.match(feed, /repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(feed, /object-fit: contain/)
  assert.match(feed, /align-items: baseline/)
  assert.match(feed, /\.feed-card-heading\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;/)
  assert.match(feed, /-webkit-line-clamp: 2;/)
  assert.match(feed, /line-clamp: 2;/)
  assert.match(feed, /\.feed-list a\.feed-card-title/, "Titles must outrank upstream a.internal")
})

test("homepage display scales are separate from unchanged article and reading measures", () => {
  assert.equal(foundations["text-title"], "clamp(1.75rem, 1.4rem + 1vw, 2.25rem)")
  assert.equal(foundations["text-display"], "clamp(3.5rem, 4.8vw, 4.5rem)")
  assert.equal(foundations["text-display-mobile"], "clamp(2.25rem, 10.25vw, 2.75rem)")
  assert.equal(foundations["text-section"], "clamp(1.625rem, 2.25vw, 2.25rem)")
  assert.equal(foundations["measure-home"], "86.5rem")
  assert.equal(foundations["measure-reading"], "44rem")
  assert.equal(foundations["measure-brand"], "72rem")
  assert.equal(foundations["measure-page"], "100rem")
  assert.equal(foundations["text-body"], "1rem")
  assert.equal(foundations["leading-reading"], "1.85")
  const reading = readFileSync("quartz/styles/custom.scss", "utf8")
  assert.match(reading, /\.article-title\s*\{\s*font-size: var\(--text-title\);/)
  assert.doesNotMatch(reading, /var\(--(?:text-display(?:-mobile)?|text-section|measure-home)\)/)
  const feed = readFileSync("quartz/components/styles/feedList.scss", "utf8")
  assert.doesNotMatch(feed, /var\(--(?:text-display(?:-mobile)?|text-section|measure-home)\)/)
})

test("design documentation cannot enter the content feed, and a real skip target exists", () => {
  const config = readFileSync("quartz.config.ts", "utf8")
  assert.match(config, /"AGENTS.md"/)
  assert.match(config, /"CLAUDE.md"/)
  const page = readFileSync("quartz/components/renderPage.tsx", "utf8")
  assert.match(page, /href="#main-content" data-no-popover data-router-ignore/)
  assert.match(page, /<main class="center" id="main-content" tabIndex=\{-1\}/)
})

test("inline search styles cannot leak into the reparented modal results", () => {
  const terminal = readFileSync("quartz/components/styles/terminalHome.scss", "utf8")
  assert.match(terminal, /\.terminal-search-results \.terminal-search-layout \{/)
  assert.doesNotMatch(terminal, /^\.terminal-search-layout \{/m)
})

test("modal search highlights set a tested foreground instead of inheriting link/muted text", () => {
  const search = readFileSync("quartz/components/styles/search.scss", "utf8")
  assert.match(
    search,
    /& \.highlight \{\s*background: var\(--color-mark\);\s*color: var\(--color-text-strong\);/,
  )
  for (const palette of [light, dark]) {
    assert.ok(contrast(palette["color-text-strong"], palette["color-mark"]) >= 4.5)
  }
})

test("paper texture is static, self-contained, and preserves worst-case text contrast", () => {
  for (const mode of ["light", "dark"] as const) {
    const palette = mode === "light" ? light : dark
    const { channel, maxOpacity } = paperGrain[mode]
    const svg = paperTextureSvg(mode)
    assert.ok(Buffer.byteLength(svg) < 1024)
    assert.doesNotMatch(svg, /<script|<animate|<image|href=/)
    for (const background of surfaces) {
      const textured =
        "#" +
        [1, 3, 5]
          .map((start) => {
            const color = parseInt(palette[background].slice(start, start + 2), 16)
            return Math.round(color * (1 - maxOpacity) + channel * maxOpacity)
              .toString(16)
              .padStart(2, "0")
          })
          .join("")
      for (const foreground of foregrounds) {
        assert.ok(
          contrast(palette[foreground], textured) >= 4.5,
          `${mode} textured ${foreground}/${background}`,
        )
      }
    }
  }
})
