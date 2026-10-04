import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { brandAssets } from "./brandAssets"

const component = readFileSync("quartz/components/BrandKit.tsx", "utf8")
const emitter = readFileSync("quartz/plugins/emitters/brandPage.tsx", "utf8")

test("brand page is generated independently of the content feed and preserves the namespace", () => {
  assert.match(readFileSync("quartz.config.ts", "utf8"), /Plugin\.BrandPage\(\)/)
  assert.match(emitter, /const slug = "brand" as FullSlug/)
  assert.match(emitter, /BrandPage reserves \/brand and \/brand\/\*/)
  assert.match(emitter, /pageType: "brand"/)
  assert.match(readFileSync("quartz/components/Head.tsx", "utf8"), /pageType !== "brand"/)
  assert.match(readFileSync("quartz.layout.ts", "utf8"), /品牌资料: "\/brand"/)
})

test("all reference-page asset images have corresponding generated vector files", () => {
  const filenames = new Set(brandAssets.map((asset) => asset.filename))
  for (const match of component.matchAll(/src="\/brand\/([^"\n]+\.svg)"/g)) {
    assert.ok(filenames.has(match[1]), `Missing brand asset: ${match[1]}`)
  }
  assert.match(component, /brandAssets\.map/)
  assert.match(emitter, /for \(const asset of brandAssets\)/)
})

test("asset downloads bypass SPA and have accessible descriptions", () => {
  const downloadLinks = [...component.matchAll(/<a\s[^>]*download[\s\S]*?>/g)]
  assert.ok(downloadLinks.length >= 6)
  for (const [link] of downloadLinks) assert.match(link, /data-router-ignore/)
  assert.match(component, /alt="晓灰 Xiaohui 横向标识"/)
  assert.match(component, /role="status" aria-live="polite"/)
})

test("brand guide consumes shared palette and retains explicit copy failure feedback", () => {
  assert.match(component, /import \{ dark, foundations, light \} from "\.\.\/design\/tokens"/)
  assert.match(emitter, /Object\.entries\(light\)/)
  assert.match(emitter, /Object\.entries\(dark\)/)
  const script = readFileSync("quartz/components/scripts/brandKit.inline.ts", "utf8")
  assert.match(script, /navigator\.clipboard\.writeText\(text\)/)
  assert.match(script, /window\.addCleanup/)
  assert.match(script, /无法自动复制/)
  assert.doesNotMatch(script, /innerHTML|eval\(/)
})

test("brand code examples expose one visible copy action and downloads have unique names", () => {
  assert.match(component, /<pre data-clipboard-skip>/)
  assert.match(component, /aria-label=\{`下载\$\{asset.title\} SVG`\}/)
  const clipboard = readFileSync("quartz/components/scripts/clipboard.inline.ts", "utf8")
  assert.match(clipboard, /hasAttribute\("data-clipboard-skip"\)\) continue/)
})
