import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { build, transformSync } from "esbuild"
import sharp from "sharp"
import { runInNewContext } from "node:vm"
import { pathToFileURL } from "node:url"
import { slugifyFilePath, resolveRelative, type FullSlug } from "../util/path"
import type { QuartzPluginData } from "../plugins/vfile"
import { getFeedPages, type CuratedHomeItem } from "../util/homePageModel"
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
const originalPortrait =
  "https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260618165805272.png"
const portraitMaskFile = "home-portrait-mask-cb27f3ad.png"
// Include page targets nested in work evidence and supporting reading as well as
// top-level navigation. Synthetic pages isolate SSR; the production build still
// resolves these destinations against the published content vault.
function curatedItems(value: unknown): CuratedHomeItem[] {
  if (Array.isArray(value)) return value.flatMap(curatedItems)
  if (!value || typeof value !== "object") return []
  if ("target" in value && "id" in value) return [value as CuratedHomeItem]
  return Object.values(value).flatMap(curatedItems)
}

const contentPages = ["zh-CN", "en"].flatMap((locale) => {
  const c = getHomeContent(locale as "zh-CN" | "en")
  return curatedItems(c).flatMap((item) =>
    item.target.kind === "page"
      ? [
          {
            slug: slugifyFilePath(item.target.slug as any),
            frontmatter: {
              title: item.label ?? item.id,
              tags: [],
              lang: item.target.slug.startsWith("en/") ? "en" : "zh-CN",
            },
            dates: {
              created: new Date("2025-03-01"),
              published: new Date("2025-03-01"),
              modified: new Date("2025-03-01"),
            },
          },
        ]
      : [],
  )
})
const allFiles: QuartzPluginData[] = [
  ...new Map(contentPages.map((page) => [page.slug, page])).values(),
]

async function renderHome(locale: "zh-CN" | "en", extraFiles: QuartzPluginData[] = []) {
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
    allFiles: [...allFiles, ...extraFiles, fileData],
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
  return renderPage(cfg, fileData.slug, props, layout, props.externalResources) as string
}

function section(html: string, id: string): string {
  const match = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</section>`))
  assert.ok(match, `Missing semantic section #${id}`)
  return match[0]
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#(?:x([a-f0-9]+)|(\d+));/gi, (_, hex, decimal) =>
      String.fromCodePoint(parseInt(hex ?? decimal, hex ? 16 : 10)),
    )
    .replace(/\s+/g, " ")
    .trim()
}

test("the three themes use six distinct authored source articles with labeled language fallbacks", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    const content = getHomeContent(locale)
    assert.deepEqual(
      content.paths.map(({ id }) => id),
      ["engineering", "learning", "investing"],
    )
    assert.equal(content.featured.length, 6)
    const targets = new Set<string>()
    for (const theme of content.paths) {
      const articles = content.featured.filter(({ id }) => id.startsWith(`${theme.id}-`))
      assert.equal(articles.length, 2, `Keep two authored articles for ${locale}/${theme.id}`)
      for (const article of articles) {
        assert.equal(article.target.kind, "page")
        if (article.target.kind !== "page") continue
        assert.ok(article.required, `${article.id} must fail loudly if its source disappears`)
        assert.ok(readFileSync(path.join("content", `${article.target.slug}.md`), "utf8").trim())
        targets.add(article.target.slug)
        if (locale === "en" && !article.target.slug.startsWith("en/")) {
          assert.match(article.label ?? "", /中文|Chinese/, "Label untranslated entry points")
        }
      }
    }
    assert.equal(targets.size, 6, "Do not duplicate an article to fill a theme")
  }
})

for (const locale of ["zh-CN", "en"] as const) {
  test(`editorial ${locale} renders one semantic homepage with unique controls, static links and valid anchors`, async () => {
    const html = await renderHome(locale)
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
    assert.equal([...html.matchAll(/<main\b/g)].length, 1)
    assert.equal([...html.matchAll(/class="search"/g)].length, 1)
    assert.equal([...html.matchAll(/class="feed-list"/g)].length, 1)
    assert.doesNotMatch(html, /最近文章|Latest posts/i, "Keep one complete article stream")
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
    assert.doesNotMatch(html, /feed-card--hidden|<noscript/)
    assert.match(html, /class="home-tools" hidden/)
  })

  test(`outcome ${locale} renders the approved three-part hero and accessible real portrait`, async () => {
    const html = await renderHome(locale)
    const hero = html.match(/<section\b[^>]*class="home-hero"[^>]*>[\s\S]*?<\/section>/)?.[0]
    assert.ok(hero, "The homepage must render its own hero")
    const h1 = hero.match(/<h1\b[^>]*id="home-title"[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    assert.ok(h1, "The hero must own the page's semantic h1")
    const spans = [...h1.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/g)]
    assert.equal(spans.length, 3, "Keep the approved three-part display hierarchy")
    assert.match(spans[2][1], /class="[^"]*\bhome-display-accent\b/)
    assert.doesNotMatch(h1, /aria-hidden|<img|<svg/)
    if (locale === "zh-CN") {
      assert.deepEqual(
        spans.map((span) => visibleText(span[2])),
        ["把 Agent 做进", "真实业务、", "个人成长与投资"],
      )
      assert.equal(visibleText(h1), "把 Agent 做进真实业务、个人成长与投资")
    } else {
      const title = visibleText(h1)
      for (const meaning of [/agents?/i, /business|work/i, /growth/i, /invest(?:ing|ment)/i])
        assert.match(title, meaning)
      assert.doesNotMatch(title, /[\u3400-\u9fff]/, "The English hero must be localized")
    }
    const portraits = [...hero.matchAll(/<img\b[^>]*class="[^"]*\bhome-portrait\b[^"-]*"[^>]*>/g)]
    assert.equal(portraits.length, 1, "Render one actual portrait, not a decorative logo")
    const portrait = portraits[0][0]
    assert.equal(
      portrait.match(/\bsrc="([^"]+)"/)?.[1],
      originalPortrait,
      "Display the untouched original photo; a generated cutout may only supply its alpha mask",
    )
    assert.match(portrait, /width="1254"/)
    assert.match(portrait, /height="1254"/)
    assert.doesNotMatch(hero, /<picture\b|\bsrcset=/, "Do not substitute regenerated face pixels")
    const mask = "/static/" + portraitMaskFile
    for (const route of ["/", "/en", "/program/deep/article"]) {
      assert.equal(new URL(mask, "https://preview.test" + route).pathname, mask)
    }
    assert.ok(portrait.match(/\bstyle="([^"]+)"/)?.[1].includes(`mask-image:url(${mask})`))
    assert.equal([...hero.matchAll(/<img\b/g)].length, 1, "Keep the talk photo in public work only")
    assert.match(portrait, /src="[^"\s]+\.(?:jpe?g|png|webp)(?:\?[^"]*)?"/)
    assert.match(portrait, locale === "en" ? /alt="[^"]*Xiaohui[^"]*"/i : /alt="[^"]*晓灰[^"]*"/)
    assert.doesNotMatch(portrait, /aria-hidden="true"|alt="\s*"/)
    assert.match(hero, /class="[^"]*\bhome-portrait-frame\b/)
    assert.doesNotMatch(hero, /ENGINEER\s*(?:·|&middot;|&#183;)?\s*BUILDER/i)
    assert.doesNotMatch(hero, /home-hero-note|home-field-note|XIAOHUI \/ FIELD NOTES/)
  })

  test(`outcome ${locale} keeps ordered, named work, public evidence, paths, writing and about sections`, async () => {
    const html = await renderHome(locale)
    const sectionIds = ["featured", "public-work", "paths", "writing", "about"]
    let previous = -1
    for (const id of sectionIds) {
      const markup = section(html, id)
      assert.match(markup, /tabindex="-1"/i, `#${id} must receive native anchor focus`)
      const label = markup.match(/aria-labelledby="([^"]+)"/)?.[1]
      assert.ok(label, `#${id} requires a named section`)
      const heading = markup.match(new RegExp(`<h2\\b[^>]*id="${label}"[^>]*>(.*?)</h2>`))
      assert.ok(heading && visibleText(heading[1]), `#${id} needs its own visible h2`)
      if (locale === "en") assert.doesNotMatch(visibleText(heading[1]), /[\u3400-\u9fff]/)
      const position = html.indexOf(markup)
      assert.ok(position > previous, `#${id} must follow the previous section`)
      previous = position
    }
    const paths = section(html, "paths")
    assert.equal([...paths.matchAll(/<a\b[^>]*class="[^"]*\bhome-path\b[^"-]*"/g)].length, 3)
    const themes = [
      ...paths.matchAll(/<article\b[^>]*class="home-path-column"[^>]*>[\s\S]*?<\/article>/g),
    ]
    assert.equal(themes.length, 3, "Each theme needs its own reading group")
    for (const [theme] of themes) {
      assert.equal([...theme.matchAll(/<a\b[^>]*class="[^"]*\bhome-featured-item\b/g)].length, 2)
    }
    for (const item of getHomeContent(locale).paths) {
      assert.equal(item.target.kind, "page")
      if (item.target.kind !== "page") continue
      const href = resolveRelative(
        (locale === "en" ? "en" : "index") as FullSlug,
        slugifyFilePath(item.target.slug as any),
      )
      assert.ok(paths.includes(`href="${href}"`), `Keep the canonical ${item.id} reading path`)
    }
    const beforeWriting = html.slice(0, html.indexOf(section(html, "writing")))
    assert.equal(
      getHomeContent(locale).featured.length,
      6,
      "Three themes each retain two authored entry points",
    )
    for (const item of getHomeContent(locale).featured) {
      assert.equal(item.target.kind, "page")
      if (item.target.kind !== "page") continue
      const href = resolveRelative(
        (locale === "en" ? "en" : "index") as FullSlug,
        slugifyFilePath(item.target.slug as any),
      )
      assert.ok(paths.includes(`href="${href}"`), `Retain ${item.id} within its reading theme`)
    }
    assert.doesNotMatch(beforeWriting, /class="feed-list"|class="feed-card"/)
    assert.equal([...section(html, "writing").matchAll(/class="feed-list"/g)].length, 1)
  })

  test(`outcome ${locale} shows sourced work, million-scale insurance impact and public talk proof`, async () => {
    const html = await renderHome(locale)
    const featured = section(html, "featured")
    const lead = featured.match(
      /<article\b[^>]*class="[^"]*\bhome-lead-case\b[^>]*>[\s\S]*?<\/article>/,
    )?.[0]
    assert.ok(lead, "AI Speeds must be the lead work case")
    assert.match(lead, /AI Speeds/)
    assert.match(lead, /AI API/)
    assert.match(lead, /cc4pm/)
    assert.match(lead, /href="https:\/\/aispeeds\.me\/?"/)
    assert.match(lead, /<img\b[^>]*alt="[^"\s][^"]*"/)
    const insurance = featured.match(
      /<article\b[^>]*id="home-project-insurance"[^>]*>[\s\S]*?<\/article>/,
    )?.[0]
    assert.ok(insurance, "The insurance Agent needs its own sourced project")
    assert.match(insurance, locale === "en" ? /insurance/i : /保险快查/)
    assert.match(insurance, locale === "en" ? /million/i : /百万/)
    assert.match(insurance, /MAU|monthly active/i)
    assert.match(insurance, /<a\b[^>]*href="[^"#][^"]*"/)
    const mcp = featured.match(
      /<article\b[^>]*id="home-project-mcpadvisor"[^>]*>[\s\S]*?<\/article>/,
    )?.[0]
    assert.ok(mcp, "MCPAdvisor needs its own project and public repository")
    assert.match(mcp, /MCPAdvisor/)
    assert.match(mcp, /href="https:\/\/github\.com\/istarwyh\/mcpadvisor\/?"/)
    assert.match(mcp, /OceanBase/)
    assert.match(mcp, /2025/)
    assert.match(mcp, locale === "en" ? /second|2nd/i : /二等奖/)
    assert.doesNotMatch(
      visibleText(html),
      /800\s*万|8[\s,]?000[\s,]?000|\b8\s*m(?:illion)?\b|eight\s+million/i,
      "Do not reintroduce the unsupported eight-million claim",
    )
    const publicWork = section(html, "public-work")
    assert.match(publicWork, /AI Maker/)
    assert.match(publicWork, locale === "en" ? /Shanghai/i : /上海/)
    assert.match(publicWork, /Agent Native/)
    assert.match(
      publicWork,
      /href="https:\/\/aispeeds\.me\/shares\/agent-native-product-ai-maker-shanghai"/,
    )
    assert.match(publicWork, /<img\b[^>]*alt="[^"\s][^"]*"/)
  })

  test(`outcome ${locale} keeps all same-language feed rows visible without JS and caps real thumbnails`, async () => {
    const fixtures: QuartzPluginData[] = ["zh-CN", "en"].flatMap((lang) =>
      Array.from({ length: 12 }, (_, index) => ({
        slug: `fixture-${lang}-${index}` as FullSlug,
        frontmatter: { title: `Fixture ${lang} ${index}`, tags: [], lang },
        dates: {
          created: new Date("2025-04-01"),
          published: new Date("2025-04-02"),
          modified: new Date("2025-04-03"),
        },
        htmlAst: {
          type: "root" as const,
          children: Array.from({ length: index % 5 }, (_, image) => ({
            type: "element" as const,
            tagName: "img",
            properties: { src: `https://example.com/image-${image}.jpg`, alt: `Image ${image}` },
            children: [],
          })),
        },
      })),
    )
    const html = await renderHome(locale, fixtures)
    const writing = section(html, "writing")
    const rows = [...writing.matchAll(/<article\b[^>]*class="feed-card"[^>]*>[\s\S]*?<\/article>/g)]
    const pages = getFeedPages([...allFiles, ...fixtures], {
      page: { slug: (locale === "en" ? "en" : "index") as FullSlug },
      languageScope: "page",
    })
    assert.ok(rows.length > 10, "The fixture must exercise content beyond the enhanced first batch")
    assert.equal(rows.length, pages.length, "Every published, same-language row must exist in SSR")
    assert.match(writing, /data-enhancement="button"/)
    assert.match(writing, /data-batch-size="10"/)
    assert.match(writing, /class="feed-controls" hidden/)
    assert.doesNotMatch(writing, /feed-card--hidden|<noscript/)
    for (const [index, row] of rows.entries()) {
      assert.doesNotMatch(row[0], /<article[^>]*\bhidden\b/)
      assert.ok(
        row[0].includes(
          `href="${resolveRelative((locale === "en" ? "en" : "index") as FullSlug, pages[index].slug!)}"`,
        ),
      )
      const heading = row[0].match(/<div class="feed-card-heading">([\s\S]*?)<\/div>/)?.[1]
      assert.ok(heading)
      assert.match(heading, /class="feed-card-title internal"/)
      assert.match(heading, /class="feed-card-date"/)
      const images = [...row[0].matchAll(/<img\b[^>]*class="feed-card-image"[^>]*>/g)]
      assert.ok(images.length <= 3, "No row may contain more than three real images")
      for (const [image] of images) {
        assert.match(image, /width="128"/)
        assert.match(image, /height="96"/)
        assert.match(image, /loading="lazy"/)
        assert.match(image, /decoding="async"/)
      }
    }
    for (let index = 0; index < 12; index++) {
      const row = rows.find(([markup]) => markup.includes(`Fixture ${locale} ${index}</a>`))
      assert.ok(row, `No-JS readers must reach fixture ${index}`)
      assert.equal([...row[0].matchAll(/class="feed-card-image"/g)].length, Math.min(index % 5, 3))
    }
    assert.doesNotMatch(writing, locale === "en" ? /Fixture zh-CN/ : /Fixture en/)
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

test("the homepage consumes its display scale locally and preserves the article stream width", () => {
  const css = readFileSync("quartz/components/styles/homePage.scss", "utf8")
  assert.match(css, /var\(--measure-home\)/)
  assert.match(css, /font-size: var\(--text-display\)/)
  assert.match(css, /font-size: var\(--text-section\)/)
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*font-size: var\(--text-display-mobile\)/)
  assert.match(css, /\.home-writing(?:-feed)?\s*\{[^}]*max-width: var\(--measure-reading\)/)
  assert.doesNotMatch(css, /overflow-x:\s*(?:hidden|clip)/, "Do not mask mobile overflow")
})

test("the portrait uses a registered alpha mask without replacing or distorting original pixels", async () => {
  const source = readFileSync("quartz/components/HomePage.tsx", "utf8")
  assert.ok(source.includes(originalPortrait))
  assert.ok(source.includes(`static/${portraitMaskFile}`))
  assert.match(source, /class="home-portrait"[\s\S]*?style=\{\{ maskImage:[\s\S]*?src=\{portrait\}/)
  assert.doesNotMatch(source, /home-field-note/)
  const css = readFileSync("quartz/components/styles/homePage.scss", "utf8")
  const portraitStyles = css.match(/\.home-page \.home-portrait\s*\{([^}]*)\}/)?.[1]
  assert.ok(portraitStyles)
  assert.match(portraitStyles, /object-fit: contain;/)
  assert.match(portraitStyles, /mask-size: 100% 100%;/)
  assert.match(portraitStyles, /mask-repeat: no-repeat;/)
  assert.match(portraitStyles, /aspect-ratio: 1;/)
  assert.doesNotMatch(portraitStyles, /(?:^|[;\s])content:/)
  assert.doesNotMatch(css, /home-field-note/)

  const bytes = readFileSync(path.join("quartz/static", portraitMaskFile))
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8)
  assert.equal(portraitMaskFile, `home-portrait-mask-${hash}.png`)
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.width, 1254, "Mask and original portrait must share the same geometry")
  assert.equal(metadata.height, 1254)
  assert.equal(metadata.hasAlpha, true)
  const alpha = (await sharp(bytes).stats()).channels[3]
  assert.ok(alpha, "The mask must have an actual alpha channel")
  assert.equal(alpha.min, 0, "The mask removes the original background through transparency")
  assert.equal(alpha.max, 255, "The retained portrait has opaque pixels")
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

// Quartz a.internal sets its own padding and highlight. Home compositions must
// override that selector explicitly, rather than relying on stylesheet order.
test("editorial anchors retain authored surface and padding over upstream internal links", () => {
  const page = readFileSync("quartz/components/styles/homePage.scss", "utf8")
  const header = readFileSync("quartz/components/styles/homeHeader.scss", "utf8")
  assert.match(page, /\.home-page a\.home-featured-item\s*\{/)
  assert.match(page, /\.home-page a\.home-path\s*\{/)
  assert.match(page, /a\.home-secondary\s*\{[\s\S]*?background: transparent/)
  assert.match(header, /a\.home-wordmark\s*\{[\s\S]*?background: transparent/)
})

test("home toolbar enhances fresh and SPA-restored markup without noscript parsing", () => {
  const code = transformSync(
    readFileSync("quartz/components/scripts/homeHeader.inline.ts", "utf8"),
    {
      loader: "ts",
      format: "cjs",
    },
  ).code
  let tools = { hidden: true }
  let initialize = () => {}
  const cleanups: Array<() => void> = []
  const menu = {
    querySelector: () => ({ focus() {} }),
    addEventListener() {},
    removeEventListener() {},
  }
  runInNewContext(code, {
    document: {
      addEventListener(type: string, callback: () => void) {
        if (type === "nav") initialize = callback
      },
      removeEventListener() {},
      querySelector(selector: string) {
        if (selector === ".home-tools") return tools
        if (selector === ".home-menu") return menu
        return null
      },
    },
    window: { addCleanup: (callback: () => void) => cleanups.push(callback) },
  })
  initialize()
  assert.equal(tools.hidden, false)
  cleanups.splice(0).forEach((cleanup) => cleanup())
  tools = { hidden: true }
  initialize()
  assert.equal(tools.hidden, false, "Back must enhance the new DOM node")
  assert.match(
    readFileSync("quartz/components/styles/homeHeader.scss", "utf8"),
    /\.home-tools\[hidden\]\s*\{\s*display: none;/,
  )
})

test("home composition overrides the upstream header margin and viewport scrollbar width", () => {
  const header = readFileSync("quartz/components/styles/homeHeader.scss", "utf8")
  const page = readFileSync("quartz/components/styles/homePage.scss", "utf8")
  assert.match(header, /\.home-header\s*\{[\s\S]*?margin:\s*0;/)
  assert.match(page, /html:has\(body\[data-layout="home"\]\)\s*\{\s*width:\s*100%;/)
  assert.match(
    page,
    /\.home-hero-visual\s*\{[\s\S]*?width:\s*138%;[\s\S]*?max-width:\s*36rem;[\s\S]*?justify-self:\s*end;/,
  )
  assert.match(
    page,
    /@media \(max-width: 1000px\)[\s\S]*?\.home-hero-visual\s*\{[\s\S]*?width:\s*min\(100%,\s*28rem\);/,
  )
})

test("narrow English menus wrap complete navigation labels instead of splitting words", () => {
  const header = readFileSync("quartz/components/styles/homeHeader.scss", "utf8")
  assert.match(
    header,
    /@media \(max-width: 1000px\)[\s\S]*?nav:not\(\.language-switcher\)\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?a\s*\{\s*white-space:\s*nowrap;/,
  )
})

test("home art stacks before intermediate-width text can collide with portrait decoration", () => {
  const header = readFileSync("quartz/components/styles/homeHeader.scss", "utf8")
  const page = readFileSync("quartz/components/styles/homePage.scss", "utf8")
  assert.match(header, /@media \(max-width: 1000px\)[\s\S]*?\.home-nav\s*\{\s*display:\s*none;/)
  assert.match(header, /\.home-nav a\s*\{\s*white-space:\s*nowrap;/)
  assert.match(
    page,
    /@media \(max-width: 1000px\)[\s\S]*?\.home-hero\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
  )
  assert.match(readFileSync("quartz/styles/variables.scss", "utf8"), /mobile:\s*800px/)
})
