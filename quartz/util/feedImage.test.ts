import assert from "node:assert/strict"
import { test } from "node:test"
import type { Element, Root } from "hast"
import type { QuartzPluginData } from "../plugins/vfile"
import type { FullSlug } from "./path"
import { getFeedImages } from "./feedImage"

const getFeedImage = (...args: Parameters<typeof getFeedImages>) => getFeedImages(...args)[0]

const home = "index" as FullSlug
const img = (src: string, properties: Element["properties"] = {}): Element => ({
  type: "element",
  tagName: "img",
  properties: { src, ...properties },
  children: [],
})
const article = (children: Root["children"] = [], slug = "notes/article"): QuartzPluginData => ({
  slug: slug as FullSlug,
  htmlAst: { type: "root", children },
})

test("text-only articles have no image or placeholder", () => {
  assert.equal(getFeedImage(article([{ type: "text", value: "Only text" }]), home), undefined)
  assert.equal(getFeedImage({ slug: "article" as FullSlug }, home), undefined)
})

test("uses the first rendered body image and preserves its alt text", () => {
  const page = article([
    {
      type: "element",
      tagName: "p",
      properties: {},
      children: [img("https://images.example.com/one.webp", { alt: "Architecture diagram" })],
    },
    img("https://images.example.com/two.webp"),
  ])
  assert.deepEqual(getFeedImage(page, home), {
    src: "https://images.example.com/one.webp",
    alt: "Architecture diagram",
  })
})

test("explicit frontmatter images take priority over the body", () => {
  const page = article([img("https://images.example.com/body.jpg")])
  page.frontmatter = {
    title: "Article",
    tags: [],
    socialImage: "https://images.example.com/social.jpg",
    image: "https://images.example.com/image.jpg",
    cover: "https://images.example.com/cover.jpg",
  }
  assert.equal(getFeedImage(page, home)?.src, "https://images.example.com/social.jpg")
  page.frontmatter.socialImage = " "
  assert.equal(getFeedImage(page, home)?.src, "https://images.example.com/image.jpg")
  page.frontmatter.image = "data:image/png;base64,invalid"
  assert.equal(getFeedImage(page, home)?.src, "https://images.example.com/cover.jpg")
})

test("rebases already-resolved nested Markdown and Obsidian image paths", () => {
  assert.equal(
    getFeedImage(article([img("../../assets/figure.png")], "program/llm/article"), home)?.src,
    "./assets/figure.png",
  )
  assert.equal(getFeedImage(article([img("./figure.png")]), home)?.src, "./notes/figure.png")
})

test("folder-index articles retain the source directory", () => {
  assert.equal(
    getFeedImage(article([img("./figure.png")], "notes/index"), home)?.src,
    "./notes/figure.png",
  )
})

test("local images remain correct from English and nested homepages", () => {
  const page = article([img("../assets/figure.png")])
  assert.equal(getFeedImage(page, "en" as FullSlug)?.src, "./assets/figure.png")
  assert.equal(getFeedImage(page, "en/index" as FullSlug)?.src, "../assets/figure.png")
})

test("preserves queries, fragments, and encoded characters in local image URLs", () => {
  assert.equal(
    getFeedImage(article([img("/assets/a%20b.png?size=large#preview")]), home)?.src,
    "./assets/a%20b.png?size=large#preview",
  )
})

test("protocol-relative external images are preserved", () => {
  assert.equal(
    getFeedImage(article([img("//images.example.com/figure.png")]), home)?.src,
    "//images.example.com/figure.png",
  )
})

test("frontmatter root paths and explicit relative paths use their respective bases", () => {
  const page = article()
  page.frontmatter = { title: "Article", tags: [], cover: "assets/cover.png" }
  assert.equal(getFeedImage(page, home)?.src, "./assets/cover.png")
  page.frontmatter.cover = "./cover.png"
  assert.equal(getFeedImage(page, home)?.src, "./notes/cover.png")
})

test("skips invalid images, tracking pixels, and hidden content", () => {
  const page = article([
    img(" "),
    img("javascript:alert(1)"),
    img("data:image/png;base64,invalid"),
    img("https://images.example.com/pixel.png", { width: "1", height: 1 }),
    img("https://images.example.com/hidden.png", { hidden: true }),
    {
      type: "element",
      tagName: "div",
      properties: { ariaHidden: "true" },
      children: [img("https://images.example.com/hidden-child.png")],
    },
    img("https://images.example.com/visible.png"),
  ])
  assert.equal(getFeedImage(page, home)?.src, "https://images.example.com/visible.png")
})

test("does not modify the source article AST", () => {
  const page = article([img("../assets/figure.png")])
  const original = structuredClone(page)
  getFeedImage(page, home)
  assert.deepEqual(page, original)
})

test("returns zero, one, two, or at most three unique images in source order", () => {
  for (let count = 0; count <= 4; count++) {
    const sources = Array.from({ length: count }, (_, i) => `https://images.example.com/${i}.png`)
    const images = getFeedImages(article(sources.map((src) => img(src))), home)
    assert.deepEqual(
      images.map((image) => image.src),
      sources.slice(0, 3),
    )
  }
})

test("deduplicates the cover and body images before applying the three-image limit", () => {
  const page = article([
    img("../assets/cover.png"),
    img("https://images.example.com/one.png"),
    img("https://images.example.com/one.png#same-image"),
    img("https://images.example.com/two.png"),
    img("https://images.example.com/three.png"),
  ])
  page.frontmatter = { title: "Article", tags: [], cover: "assets/cover.png" }
  assert.deepEqual(
    getFeedImages(page, home).map((image) => image.src),
    [
      "./assets/cover.png",
      "https://images.example.com/one.png",
      "https://images.example.com/two.png",
    ],
  )
})

test("skips missing local assets and falls back to usable body images", () => {
  const page = article([img("../missing.png"), img("../assets/figure.png")])
  assert.equal(getFeedImage(page, home, new Set(["assets/figure.png"]))?.src, "./assets/figure.png")
  assert.deepEqual(getFeedImages(page, home, new Set()), [])
  assert.equal(
    getFeedImage(article([img("https://images.example.com/remote.png")]), home, new Set())?.src,
    "https://images.example.com/remote.png",
  )
  assert.equal(
    getFeedImage(article([img("../static/figure.png")]), home, new Set())?.src,
    "./static/figure.png",
  )
})
