import assert from "node:assert/strict"
import test from "node:test"
import type { GlobalConfiguration } from "../cfg"
import type { QuartzPluginData } from "../plugins/vfile"
import { getPageUiLocale } from "./translations"

const config = { locale: "zh-CN" } as GlobalConfiguration
const page = (lang?: string) => ({ frontmatter: { lang } }) as QuartzPluginData

test("page language determines Chinese and English UI controls", () => {
  for (const lang of ["en", "en-US", "en-GB", " EN-us "]) {
    assert.equal(getPageUiLocale(page(lang), config), "en-US")
  }
  for (const lang of ["zh", "zh-CN", "zh-TW"]) {
    assert.equal(getPageUiLocale(page(lang), { ...config, locale: "en-US" }), "zh-CN")
  }
})

test("missing and unrelated page languages preserve the configured UI locale", () => {
  const french = { ...config, locale: "fr-FR" } as GlobalConfiguration
  assert.equal(getPageUiLocale(undefined, french), "fr-FR")
  assert.equal(getPageUiLocale(page(), { ...config, locale: "en-GB" }), "en-GB")
  for (const lang of [undefined, "", "ja", "engineering"]) {
    assert.equal(getPageUiLocale(page(lang), french), "fr-FR")
  }
})

test("rendered controls use page language, including icon-only and dynamic search labels", async () => {
  const { build } = await import("esbuild")
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import { renderToString } from "preact-render-to-string"
        import Search from "./quartz/components/Search"
        import Darkmode from "./quartz/components/Darkmode"
        import RssLink from "./quartz/components/RssLink"
        import LanguageSwitcher from "./quartz/components/LanguageSwitcher"
        export function render(lang) {
          const props = {
            cfg: {locale: "zh-CN"},
            fileData: {slug: lang === "en" ? "en" : "index", frontmatter: {lang, translations: {"en": "en", "zh-CN": "index"}}},
            allFiles: [],
          }
          return [Search, Darkmode, RssLink, LanguageSwitcher].map(create => renderToString(create()(props)))
        }
      `,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "static-controls-resources",
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
  const { render } = await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
  )
  const [enSearch, enTheme, enRss, enLanguage] = render("en") as string[]
  assert.match(enSearch, /class="search-button"[^>]*aria-label="Search"/)
  assert.match(enSearch, /aria-label="Close search"/)
  assert.match(enSearch, /data-no-results="No results"/)
  assert.match(enSearch, /data-error="Search is unavailable/)
  assert.match(enSearch, /role="status"/)
  assert.match(enTheme, /data-dark-label="Dark mode"/)
  assert.match(enRss, /<title>Subscribe via RSS<\/title>/)
  assert.match(enLanguage, /aria-label="Language versions"/)
  const [zhSearch, zhTheme, zhRss, zhLanguage] = render("zh-CN") as string[]
  assert.match(zhSearch, /aria-label="搜索"/)
  assert.match(zhSearch, /aria-label="关闭搜索"/)
  assert.match(zhSearch, /data-no-results="没有找到结果"/)
  assert.match(zhTheme, /data-dark-label="暗色模式"/)
  assert.match(zhRss, /<title>RSS 订阅<\/title>/)
  assert.match(zhLanguage, /aria-label="语言版本"/)
})
