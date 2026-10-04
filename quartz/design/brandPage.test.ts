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

test("the rendered showcase has one title, valid section targets, and all ten usable downloads", async () => {
  // Render the real component, stubbing only build-time stylesheet/script imports.
  const { build } = await import("esbuild")
  const { renderToString } = await import("preact-render-to-string")
  const { outputFiles } = await build({
    entryPoints: ["quartz/components/BrandKit.tsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "component-static-resources",
        setup(build) {
          build.onResolve({ filter: /\.scss$|\.inline$/ }, (args) => ({
            path: args.path,
            namespace: "static-resource",
          }))
          build.onLoad({ filter: /.*/, namespace: "static-resource" }, () => ({
            contents: 'export default ""',
            loader: "js",
          }))
        },
      },
    ],
  })
  const { default: createBrandKit } = await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
  )
  const html = renderToString(createBrandKit()({ cfg: { locale: "zh-CN" } }))
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
  assert.match(html, /写代码，<br\s*\/>也写字/)
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length, "DOM IDs must be unique")
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(target), `Missing section target ${target}`)
  }
  const downloads = [...html.matchAll(/<a\s[^>]*\bdownload="([^"]+)"[^>]*>/g)]
  assert.equal(downloads.length, 10)
  assert.equal(new Set(downloads.map((match) => match[1])).size, 10)
  for (const [link] of downloads) assert.match(link, /data-router-ignore/)
  const expectedDownloads = [
    ...brandAssets.map(({ filename }) => [filename, filename]),
    ["xiaohui-mark.png", "xiaohui-mark.png"],
    ["xiaohui-horizontal-light.png", "xiaohui-horizontal-light.png"],
    ["xiaohui-social.png", "xiaohui-social.png"],
    ["palette.json", "xiaohui-palette.json"],
    ["README.txt", "xiaohui-brand-readme.txt"],
    ["paper-light.svg", "xiaohui-paper-light.svg"],
  ]
  for (const [source, filename] of expectedDownloads) {
    const link = downloads.find(([, name]) => name === filename)?.[0]
    assert.ok(
      link?.includes(`href="/brand/${source}"`),
      `Incorrect download target for ${filename}`,
    )
  }
  assert.equal([...html.matchAll(/data-brand-copy=/g)].length, 11)
  assert.equal([...html.matchAll(/id="darkmode-toggle"/g)].length, 1)
  assert.match(html, /id="brand-type"/)
  for (const { filename } of brandAssets) {
    assert.ok(
      html.includes(`src="/brand/${filename}"`),
      `Missing visual download preview ${filename}`,
    )
  }
})

test("article feedback keeps tags below the body and aligns the reading column with its title", () => {
  const layout = readFileSync("quartz.layout.ts", "utf8")
  const readingStyle = readFileSync("quartz/styles/custom.scss", "utf8")
  assert.match(
    layout,
    /const articleTags = Component\.ConditionalRender\(\{[\s\S]*?component: Component\.TagList\(\),[\s\S]*?condition: \(page\) => !isHomePage\(page\)/,
  )
  assert.match(layout, /afterBody: \[homepageFeed, articleTags, bottomBreadcrumbs\]/)
  const beforeBody = layout.split("beforeBody: [")[1].split("afterBody:")[0]
  assert.doesNotMatch(beforeBody, /TagList|articleTags/)
  assert.match(
    readingStyle,
    /body:not\(\[data-slug="index"\]\):not\(\[data-slug="en"\]\) \.center > article \{\s*margin-inline: 0;/,
  )
  assert.match(readingStyle, /max-width: var\(--measure-reading\)/)
})
