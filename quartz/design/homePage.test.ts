import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { build } from "esbuild"
import { pathToFileURL } from "node:url"
import { slugifyFilePath } from "../util/path"
import { getHomeContent } from "../components/home/homeContent"
import { foundations, light, xiaohuiTheme } from "./tokens"

const bundle = build({
  stdin: {
    contents: `export { default as HomePage } from "./quartz/components/HomePage"; export { default as HomeHeader } from "./quartz/components/HomeHeader"; export { renderPage, pageResources } from "./quartz/components/renderPage"; export { default as Head } from "./quartz/components/Head"; export { ContentPage } from "./quartz/plugins/emitters/contentPage"`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  packages: "external",
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "static-resources",
      setup(b) {
        b.onResolve({ filter: /\.scss$|\.inline$/ }, (args) => ({
          path: args.path,
          namespace: "static-resource",
        }))
        b.onLoad({ filter: /.*/, namespace: "static-resource" }, () => ({
          contents: 'export default ""',
          loader: "js",
        }))
      },
    },
  ],
}).then(async ({ outputFiles }) => {
  const dir = mkdtempSync(path.join(process.cwd(), ".home-tests-"))
  try {
    const file = path.join(dir, "components.mjs")
    writeFileSync(file, outputFiles[0].text)
    return await import(pathToFileURL(file).href)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

const cfg = {
  locale: "zh-CN",
  pageTitle: "晓灰",
  baseUrl: "xiaohui.cool",
  theme: xiaohuiTheme,
}
const empty = () => null
const resources = { css: [], js: [], additionalHead: [] }
const contentPages = ["zh-CN", "en"].flatMap((locale) => {
  const c = getHomeContent(locale as "zh-CN" | "en")
  return [...c.featured, ...c.paths, ...c.aboutLinks].flatMap((item) =>
    item.target.kind === "page"
      ? [
          {
            slug: slugifyFilePath(item.target.slug as any),
            frontmatter: {
              title: item.label ?? item.id,
              lang: item.target.slug.startsWith("en/") ? "en" : "zh-CN",
            },
            dates: { modified: new Date("2025-03-01") },
          },
        ]
      : [],
  )
})
const allFiles = [...new Map(contentPages.map((page) => [page.slug, page])).values()]

for (const locale of ["zh-CN", "en"] as const) {
  test(`editorial ${locale} renders one semantic homepage with unique controls, static links and valid anchors`, async () => {
    const { HomePage, HomeHeader, Head, renderPage, pageResources } = await bundle
    const fileData = {
      slug: locale === "en" ? "en" : "index",
      frontmatter: {
        title: "The Sun Will Rise",
        pageType: "home",
        lang: locale,
        translationKey: "home",
      },
    }
    const ctx = {
      buildId: "release-A",
      cfg: { configuration: cfg, plugins: { emitters: [] } },
      allSlugs: [],
      argv: {},
    }
    const props = {
      fileData,
      allFiles: [...allFiles, fileData],
      ctx,
      cfg,
      tree: { type: "root", children: [] },
      externalResources: pageResources(".", resources, ctx.buildId),
      children: [],
    }
    const layout = {
      layoutVariant: "home",
      head: Head(),
      header: [HomeHeader()],
      beforeBody: [],
      pageBody: HomePage(),
      afterBody: [],
      left: [],
      right: [],
      footer: empty,
    }
    const html = renderPage(cfg, fileData.slug, props, layout, props.externalResources)
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
    assert.equal([...html.matchAll(/<main\b/g)].length, 1)
    assert.equal([...html.matchAll(/class="search"/g)].length, 1)
    assert.equal([...html.matchAll(/class="feed-list"/g)].length, 1)
    assert.ok(html.indexOf('<header class="home-header"') < html.indexOf("<main"))
    assert.doesNotMatch(
      html,
      /right-sidebar|class="left sidebar"|terminal-home|RecentSection|SearchAction/,
    )
    assert.match(html, /name="quartz-build" content="release-A"/)
    assert.match(html, /index\.css\?v=release-A/)
    assert.match(html, /prescript\.js\?v=release-A/)
    assert.match(html, /postscript\.js\?v=release-A/)
    assert.match(html, /application\/ld\+json/)
    assert.match(html, /rel="canonical"/)
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
    assert.equal(new Set(ids).size, ids.length)
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g))
      assert.ok(ids.includes(target), target)
    assert.match(html, locale === "en" ? /All writing/ : /所有文章/)
    assert.match(html, locale === "en" ? /Subscribe via RSS/ : /RSS 订阅/)
    assert.doesNotMatch(html, /feed-card--hidden/)
  })
}

test("resource versions change across builds for every nested asset URL", async () => {
  const { pageResources } = await bundle
  const first = pageResources("../..", resources, "release A")
  const second = pageResources("../..", resources, "release-B")
  assert.equal(first.css[0].content, "../../index.css?v=release%20A")
  assert.notEqual(first.css[0].content, second.css[0].content)
  assert.match(
    first.js.find((r: any) => r.contentType === "inline").script,
    /contentIndex\.json\?v=release%20A/,
  )
  assert.ok(
    first.js
      .filter((r: any) => r.contentType === "external")
      .every((r: any) => r.src.endsWith("?v=release%20A")),
  )
})

test("partial emits refresh homes after article and asset add/change/delete but leave docs indexes as articles", async () => {
  const { ContentPage } = await bundle
  const { h } = await import("preact")
  const dir = mkdtempSync(path.join(tmpdir(), "home-emitter-"))
  const body = (props: any) =>
    h("p", {}, `${props.allFiles.length} pages; ${props.ctx.allSlugs.length} assets`)
  const layout = {
    head: empty,
    header: [],
    beforeBody: [],
    pageBody: body,
    afterBody: [],
    left: [],
    right: [],
    footer: empty,
  }
  const emitter = ContentPage({ ...layout, homeLayout: { ...layout, layoutVariant: "home" } })
  const ctx = {
    buildId: "fixture",
    argv: { output: dir },
    cfg: { configuration: cfg },
    allSlugs: ["image.png"],
  }
  const root = { type: "root", children: [] }
  const make = (slug: string, home = false) => [
    root,
    {
      data: { slug, frontmatter: { title: slug, ...(home ? { pageType: "home" } : {}) } },
      value: "",
    },
  ]
  const homes = [make("index", true), make("en", true)]
  try {
    for (const type of ["add", "change", "delete"]) {
      const output = []
      for await (const result of emitter.partialEmit(ctx, [...homes, make("post")], resources, [
        { type, path: "post.md" },
      ]))
        output.push(result)
      assert.equal(output.length, 2, `${type} without parsed file refreshes both homes`)
      assert.match(readFileSync(path.join(dir, "index.html"), "utf8"), /3 pages; 1 assets/)
    }
    ctx.allSlugs = []
    for await (const _ of emitter.partialEmit(ctx, homes, resources, [
      { type: "delete", path: "image.png" },
    ])) {
      /* consume real writes */
    }
    assert.match(readFileSync(path.join(dir, "index.html"), "utf8"), /2 pages; 0 assets/)
    for await (const _ of emitter.emit(ctx, [make("index")], resources)) {
      /* docs index */
    }
    assert.match(readFileSync(path.join(dir, "index.html"), "utf8"), /data-layout="article"/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("editorial styles consume shared tokens without changing compact-feed rules", () => {
  const keys = new Set([...Object.keys(foundations), ...Object.keys(light)])
  for (const filename of ["homePage.scss", "homeHeader.scss"]) {
    const css = readFileSync(`quartz/components/styles/${filename}`, "utf8")
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|!important|transition:\s*all|saved-theme=/i)
    for (const [, token] of css.matchAll(/var\(--([a-z0-9-]+)/g)) assert.ok(keys.has(token), token)
    assert.doesNotMatch(css, /\.feed-card|\.feed-card-image/)
  }
})

test("legacy generator cannot overwrite or produce card data for an editorial home even with FORCE", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "home-generator-"))
  try {
    mkdirSync(path.join(dir, "scripts"))
    mkdirSync(path.join(dir, "content"))
    const source = readFileSync("scripts/update-homepage.js", "utf8")
    writeFileSync(path.join(dir, "scripts/update-homepage.mjs"), source)
    const original = "---\npageType: home\n---\nEditorial content\n"
    writeFileSync(path.join(dir, "content/index.md"), original)
    execFileSync(process.execPath, [path.join(dir, "scripts/update-homepage.mjs")], {
      env: { ...process.env, FORCE_UPDATE_INDEX: "1" },
    })
    assert.equal(readFileSync(path.join(dir, "content/index.md"), "utf8"), original)
    assert.throws(() => readFileSync(path.join(dir, "scripts/cards-data.json")))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
