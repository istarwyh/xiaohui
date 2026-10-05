import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import { build, transformSync } from "esbuild"
import { renderToString } from "preact-render-to-string"

const feedScript = transformSync(
  readFileSync(new URL("./feedList.inline.ts", import.meta.url), "utf8"),
  {
    loader: "ts",
    format: "cjs",
  },
).code

type Handler = () => void
class FakeElement {
  hidden = false
  textContent = ""
  dataset: Record<string, string> = {}
  handlers = new Map<string, Set<Handler>>()
  addEventListener(type: string, callback: Handler) {
    const handlers = this.handlers.get(type) ?? new Set()
    handlers.add(callback)
    this.handlers.set(type, handlers)
  }
  removeEventListener(type: string, callback: Handler) {
    this.handlers.get(type)?.delete(callback)
  }
  emit(type: string) {
    this.handlers.get(type)?.forEach((callback) => callback())
  }
}

function setupFeed(
  options: {
    mode?: "button" | "infinite"
    count?: number
    batch?: string
    observer?: "available" | "missing" | "throws"
    storage?: Map<string, string>
    storageDenied?: boolean
    missingCopy?: boolean
    missingControls?: boolean
    hash?: string
    pathname?: string
    navigationType?: string
    pendingImage?: boolean
    imageAfterAnchor?: boolean
    pendingStylesheet?: boolean
    fontsLoading?: boolean
  } = {},
) {
  const pathname = options.pathname ?? "/"
  const storage = options.storage ?? new Map<string, string>()
  const cleanups: Handler[] = []
  const events: string[] = []
  const frames = new Map<number, FrameRequestCallback>()
  let frameId = 0
  let frameTime = 0
  let scrollTop = 0
  let layoutShift = 0
  const scrollBehaviors: ScrollBehavior[] = []
  const fonts = { status: options.fontsLoading ? "loading" : "loaded" }
  const stylesheet = Object.assign(new FakeElement(), { sheet: null, disabled: false })
  let nav: (event: { detail: { isBack: boolean } }) => void = () => {}
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {}
  let observerDisconnected = false
  const windowEvents = new FakeElement()
  const button = new FakeElement()
  const controls = new FakeElement()
  controls.hidden = true
  const sentinel = new FakeElement()
  sentinel.hidden = true
  const status = new FakeElement()
  const announcement = new FakeElement()
  const cards = Array.from({ length: options.count ?? 25 }, (_, index) => ({
    hidden: false,
    getBoundingClientRect: () => ({
      top: index * 100 + layoutShift - scrollTop,
      bottom: index * 100 + layoutShift + 80 - scrollTop,
    }),
    querySelector: () => ({
      focus: (options: { preventScroll: boolean }) =>
        events.push(`focus:${index}:${options.preventScroll}`),
      scrollIntoView: (options: { block: string }) =>
        events.push(`scroll:${index}:${options.block}`),
    }),
  }))
  let imageRemoved = false
  let rowRemoved = false
  const image = Object.assign(new FakeElement(), {
    complete: !options.pendingImage,
    naturalWidth: 128,
    compareDocumentPosition: () => (options.imageAfterAnchor ? 2 : 4),

    closest: (selector: string) =>
      selector === ".feed-card-images"
        ? {
            querySelector: () => (imageRemoved ? null : image),
            remove: () => {
              rowRemoved = true
            },
          }
        : {
            remove: () => {
              imageRemoved = true
            },
          },
  })
  const list = new FakeElement()
  list.dataset = {
    batchSize: options.batch ?? "10",
    enhancement: options.mode ?? "button",
    statusTemplate: "Showing {visible} of {total}; {remaining} remaining",
    completeTemplate: "All {total} articles are shown",
    addedTemplate: "Added {added}; showing {visible} of {total}",
  }
  if (options.missingCopy) delete list.dataset.addedTemplate
  const listNode = Object.assign(list, {
    querySelectorAll: (selector: string) => (selector === ".feed-card" ? cards : [image]),
  })
  const parts = new Map<string, unknown>([
    [".feed-list", listNode],
    [".feed-controls", controls],
    [".feed-load-more", button],
    [".feed-status", status],
    [".feed-announcement", announcement],
    [".feed-sentinel", sentinel],
  ])
  if (options.missingControls) parts.delete(".feed-controls")
  const container = { querySelector: (selector: string) => parts.get(selector) }
  const context: Record<string, unknown> = {
    document: {
      addEventListener: (_type: string, callback: typeof nav) => {
        nav = callback
      },
      querySelectorAll: (selector: string) => {
        if (selector === 'link[rel="stylesheet"]')
          return options.pendingStylesheet ? [stylesheet] : []
        if (selector === "img") return [image]
        return [container]
      },
      fonts,
    },
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    window: {
      location: { pathname, hash: options.hash ?? "" },
      sessionStorage: {
        getItem: (key: string) => {
          if (options.storageDenied) throw new Error("Denied")
          return storage.get(key) ?? null
        },
        setItem: (key: string, value: string) => {
          if (options.storageDenied) throw new Error("Denied")
          storage.set(key, value)
        },
      },
      performance: {
        getEntriesByType: () => (options.navigationType ? [{ type: options.navigationType }] : []),
      },
      addCleanup: (callback: Handler) => cleanups.push(callback),
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++frameId, callback)
        return frameId
      },
      cancelAnimationFrame: (id: number) => {
        frames.delete(id)
      },
      scrollBy: ({ top, behavior }: { top: number; behavior: ScrollBehavior }) => {
        scrollTop += top
        scrollBehaviors.push(behavior)
        events.push(`restore:${top}`)
      },
    },
  }
  if (options.observer !== "missing") {
    context.IntersectionObserver = class {
      constructor(callback: typeof intersect) {
        if (options.observer === "throws") throw new Error("Observer unavailable")
        intersect = callback
      }
      observe() {
        events.push("observe")
      }
      disconnect() {
        observerDisconnected = true
      }
    }
  }
  runInNewContext(feedScript, context)
  return {
    cards,
    button,
    controls,
    status,
    announcement,
    sentinel,
    list,
    image,
    events,
    scrollBehaviors,
    storage,
    fonts,
    stylesheet,
    windowEvents,
    start: (isBack = false) => nav({ detail: { isBack } }),
    cleanup: () => {
      cleanups.splice(0).forEach((callback) => callback())
    },
    click: () => button.emit("click"),
    intersect: () => intersect([{ isIntersecting: true }]),
    pagehide: () => windowEvents.emit("pagehide"),
    flushFrames: (elapsed = 16) => {
      frameTime += elapsed
      const scheduled = Array.from(frames.values())
      frames.clear()
      scheduled.forEach((callback) => callback(frameTime))
    },
    pendingFrames: () => frames.size,
    interrupt: (type: string) => windowEvents.emit(type),
    scrollTop: () => scrollTop,
    shiftLayout: (value: number) => {
      layoutShift += value
    },
    setScrollTop: (value: number) => {
      scrollTop = value
    },
    visible: () => cards.filter((card) => !card.hidden).length,
    imageRemoved: () => imageRemoved,
    rowRemoved: () => rowRemoved,
    observerDisconnected: () => observerDisconnected,
  }
}

test("static links remain visible until initialization succeeds", () => {
  for (const options of [{}, { missingCopy: true }, { missingControls: true }]) {
    const app = setupFeed(options)
    assert.equal(app.visible(), 25)
    assert.equal(app.controls.hidden, true)
    if (options.missingCopy || options.missingControls) {
      app.start()
      assert.equal(app.visible(), 25)
      assert.equal(app.controls.hidden, true)
      assert.equal(app.button.handlers.get("click")?.size ?? 0, 0)
    }
  }
})

test("button mode reveals batches, announces counts and focuses the first new title", () => {
  const app = setupFeed()
  app.start()
  assert.equal(app.visible(), 10)
  assert.equal(app.sentinel.hidden, true)
  assert.equal(app.status.textContent, "Showing 10 of 25; 15 remaining")
  app.click()
  assert.equal(app.visible(), 20)
  assert.equal(app.announcement.textContent, "Added 10; showing 20 of 25")
  assert.deepEqual(app.events, ["focus:10:true", "scroll:10:nearest"])
  app.click()
  assert.equal(app.visible(), 25)
  assert.equal(app.button.hidden, true)
  assert.equal(app.status.textContent, "All 25 articles are shown")
  assert.deepEqual(app.events.slice(-2), ["focus:20:true", "scroll:20:nearest"])
})

test("optional infinite loading never moves focus and retains the manual button", () => {
  const app = setupFeed({ mode: "infinite" })
  app.start()
  assert.equal(app.button.hidden, false)
  assert.equal(app.sentinel.hidden, false)
  app.intersect()
  assert.equal(app.visible(), 20)
  assert.equal(
    app.events.some((event) => event.startsWith("focus:")),
    false,
  )
  app.intersect()
  assert.equal(app.visible(), 25)
  assert.equal(app.observerDisconnected(), true)
})

test("missing or failing IntersectionObserver still leaves every article reachable by button", () => {
  for (const observer of ["missing", "throws"] as const) {
    const app = setupFeed({ mode: "infinite", observer })
    app.start()
    assert.equal(app.visible(), 10)
    assert.equal(app.sentinel.hidden, true)
    app.click()
    app.click()
    assert.equal(app.visible(), 25)
  }
})

test("invalid batch metadata and denied or malformed storage do not break pagination", () => {
  for (const batch of ["0", "NaN", "-1", "3.5", ""]) {
    const app = setupFeed({ batch, storageDenied: true })
    app.start()
    assert.equal(app.visible(), 10)
    app.click()
    assert.equal(app.visible(), 20)
  }
  for (const raw of ["bad json", "null", '{"visible":-9}', '{"visible":"20"}', '{"visible":2.5}']) {
    const app = setupFeed({ storage: new Map([["quartz-feed:/", raw]]) })
    app.start()
    assert.equal(app.visible(), 10)
  }
})

test("expanded count is path-scoped and restored without jumping ordinary home navigation", () => {
  const storage = new Map<string, string>()
  const first = setupFeed({ storage })
  first.start()
  first.click()
  first.setScrollTop(1200)
  first.cleanup()
  const next = setupFeed({ storage })
  next.start()
  next.flushFrames()
  assert.equal(next.visible(), 20)
  assert.deepEqual(next.events, [])
  const otherLanguage = setupFeed({ storage, pathname: "/en" })
  otherLanguage.start()
  assert.equal(otherLanguage.visible(), 10)
})

test("Back restores the visible count and stable card offset without moving keyboard focus", () => {
  const storage = new Map([
    ["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })],
  ])
  const app = setupFeed({ storage })
  app.start(true)
  assert.equal(app.visible(), 20)
  app.flushFrames()
  assert.deepEqual(app.events, ["restore:1220"])
})

test("Back restores instantly and rechecks a later native history scroll", () => {
  const app = setupFeed({
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  assert.deepEqual(app.scrollBehaviors, ["instant"])
  assert.equal(app.cards[12].getBoundingClientRect().top, -20)

  // The browser can restore its old numeric scroll position after our first frame.
  app.setScrollTop(100)
  app.flushFrames()
  assert.equal(app.cards[12].getBoundingClientRect().top, -20)
  assert.deepEqual(app.events, ["restore:1220", "restore:1120"])
  assert.deepEqual(app.scrollBehaviors, ["instant", "instant"])
  app.flushFrames()
  app.flushFrames()
  assert.equal(app.pendingFrames(), 0)
})

test("Back cancels an in-flight smooth scroll even if the first frame is already aligned", () => {
  const app = setupFeed({
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.setScrollTop(1220)
  app.start(true)
  app.flushFrames()
  assert.deepEqual(app.events, ["restore:0"])
  assert.deepEqual(app.scrollBehaviors, ["instant"])
})

test("hidden lazy images later in the feed do not delay restoration settling", () => {
  const app = setupFeed({
    pendingImage: true,
    imageAfterAnchor: true,
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  app.flushFrames()
  app.flushFrames()
  assert.equal(app.pendingFrames(), 0)
  assert.equal(app.image.handlers.get("load")?.size ?? 0, 0)
})

test("Back remeasures layout until pending styles, fonts and earlier images settle", () => {
  const app = setupFeed({
    pendingImage: true,
    pendingStylesheet: true,
    fontsLoading: true,
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  app.flushFrames()
  app.flushFrames()
  assert.equal(app.pendingFrames(), 1)

  app.shiftLayout(540)
  app.stylesheet.emit("load")
  app.flushFrames(100)
  assert.equal(app.cards[12].getBoundingClientRect().top, -20)

  // A failed thumbnail removes its row above the saved card.
  app.shiftLayout(-96)
  app.image.emit("error")
  app.flushFrames(100)
  assert.equal(app.rowRemoved(), true)
  assert.equal(app.cards[12].getBoundingClientRect().top, -20)

  app.shiftLayout(30)
  app.fonts.status = "loaded"
  app.flushFrames(100)
  app.flushFrames()
  app.flushFrames()
  assert.deepEqual(app.events, ["restore:1220", "restore:540", "restore:-96", "restore:30"])
  assert.equal(app.pendingFrames(), 0)
  assert.equal(app.windowEvents.handlers.get("wheel")?.size, 0)
  assert.equal(app.stylesheet.handlers.get("load")?.size, 0)
})

test("Back restoration yields to user input, fragment history and another navigation", () => {
  for (const type of [
    "wheel",
    "touchstart",
    "pointerdown",
    "keydown",
    "click",
    "popstate",
    "hashchange",
  ]) {
    for (const alreadyStarted of [false, true]) {
      const app = setupFeed({
        pendingImage: true,
        storage: new Map([
          ["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })],
        ]),
      })
      app.start(true)
      if (alreadyStarted) app.flushFrames()
      app.interrupt(type)
      app.setScrollTop(500)
      app.shiftLayout(80)
      app.image.emit("load")
      app.flushFrames()
      assert.equal(app.scrollTop(), 500, `${type} must cancel restoration`)
      assert.equal(app.pendingFrames(), 0)
      assert.equal(app.windowEvents.handlers.get(type)?.size, 0)
      assert.deepEqual(app.events, alreadyStarted ? ["restore:1220"] : [])
    }
  }
})

test("cleanup cancels queued restoration and later resource callbacks", () => {
  const app = setupFeed({
    pendingImage: true,
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  app.cleanup()
  app.events.length = 0
  app.setScrollTop(400)
  app.image.emit("error")
  app.start() // Ordinary navigation must never restart the cancelled scroll.
  app.flushFrames()
  assert.equal(app.scrollTop(), 400)
  assert.deepEqual(app.events, [])
  assert.equal(app.pendingFrames(), 0)
})

test("a stalled layout resource cannot keep scroll restoration alive indefinitely", () => {
  const app = setupFeed({
    pendingImage: true,
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  for (let index = 0; index < 3; index++) {
    app.shiftLayout(20)
    app.flushFrames(250)
  }
  app.flushFrames(250)
  assert.equal(app.cards[12].getBoundingClientRect().top, -20)
  assert.equal(app.pendingFrames(), 0)
  app.setScrollTop(200)
  app.image.emit("load")
  app.flushFrames()
  assert.equal(app.scrollTop(), 200)
})

test("a suspended animation frame cannot restore after the deadline", () => {
  const app = setupFeed({
    pendingImage: true,
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  app.setScrollTop(500)
  app.shiftLayout(80)
  app.flushFrames(2000)
  assert.equal(app.scrollTop(), 500)
  assert.deepEqual(app.events, ["restore:1220"])
  assert.equal(app.pendingFrames(), 0)
})

test("Back from an article restores expanded feed offset even when home has a section hash", () => {
  const app = setupFeed({
    hash: "#writing",
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start(true)
  app.flushFrames()
  assert.equal(app.visible(), 20)
  assert.deepEqual(app.events, ["restore:1220"])
})

test("a hard Back's performance entry does not cause later ordinary SPA visits to jump", () => {
  const app = setupFeed({
    navigationType: "back_forward",
    storage: new Map([["quartz-feed:/", JSON.stringify({ visible: 20, anchor: 12, offset: -20 })]]),
  })
  app.start()
  app.flushFrames()
  assert.deepEqual(app.events, ["restore:1220"])
  app.cleanup()
  app.events.length = 0
  app.start()
  app.flushFrames()
  assert.deepEqual(app.events, [])
})

test("out-of-range saved state is clamped and invalid anchors are ignored", () => {
  const app = setupFeed({
    storage: new Map([["quartz-feed:/", '{"visible":1000,"anchor":999,"offset":0}']]),
  })
  app.start(true)
  app.flushFrames()
  assert.equal(app.visible(), 25)
  assert.deepEqual(app.events, [])
})

test("broken thumbnails collapse their rows and listeners are cleaned across SPA visits", () => {
  const app = setupFeed({ mode: "infinite" })
  app.start()
  app.start() // A duplicate nav event must not bind a second handler.
  assert.equal(app.button.handlers.get("click")?.size, 1)
  app.image.emit("error")
  assert.equal(app.imageRemoved(), true)
  assert.equal(app.rowRemoved(), true)
  app.cleanup()
  assert.equal(app.button.handlers.get("click")?.size, 0)
  assert.equal(app.image.handlers.get("error")?.size, 0)
  assert.equal(app.observerDisconnected(), true)
  assert.equal(app.list.dataset.feedInitialized, undefined)
  app.start()
  assert.equal(app.button.handlers.get("click")?.size, 1)
  app.click()
  assert.equal(app.visible(), 20)
})

test("empty and short lists do not show unusable load-more controls", () => {
  const empty = setupFeed({ count: 0 })
  empty.start()
  assert.equal(empty.controls.hidden, true)
  const short = setupFeed({ count: 3 })
  short.start()
  assert.equal(short.visible(), 3)
  assert.equal(short.button.hidden, true)
  assert.equal(short.status.textContent, "All 3 articles are shown")
})

test("real FeedList SSR exposes every article, localized dates and accessible progressive controls", async () => {
  const { outputFiles } = await build({
    entryPoints: ["quartz/components/FeedList.tsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "static-resources",
        setup(build) {
          build.onResolve({ filter: /\.scss$|\.inline$/ }, (args) => ({
            path: args.path,
            namespace: "static",
          }))
          build.onLoad({ filter: /.*/, namespace: "static" }, () => ({
            contents: 'export default ""',
            loader: "js",
          }))
        },
      },
    ],
  })
  const { default: createFeed } = await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
  )
  const files = Array.from({ length: 25 }, (_, index) => ({
    slug: `en/article-${index}`,
    frontmatter: {
      title: `Article ${index}`,
      lang: "en",
      tags: [],
      description: "An article summary",
    },
    dates: { modified: new Date(2026, 9, 4, 12) },
  }))
  const html = renderToString(
    createFeed({ languageScope: "page", enhancement: "button" })({
      allFiles: [
        ...files,
        { slug: "chinese", frontmatter: { title: "中文", lang: "zh-CN", tags: [] } },
      ],
      fileData: { slug: "en", frontmatter: { lang: "en" } },
      cfg: { locale: "zh-CN" },
      ctx: { allSlugs: [] },
    }),
  )
  assert.equal([...html.matchAll(/<article\b/g)].length, 25)
  assert.equal([...html.matchAll(/class="feed-card-title internal"/g)].length, 25)
  assert.doesNotMatch(html, /<article[^>]*(?:hidden|feed-card--hidden)/)
  assert.doesNotMatch(html, /href="[^\"]*chinese"/)
  assert.match(html, /Oct 04, 2026/)
  assert.match(html, /Load more articles/)
  assert.match(html, /<button[^>]*type="button"[^>]*aria-controls="feed-list"/)
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/)
  assert.match(html, /class="feed-controls" hidden/)

  const textOnly = renderToString(
    createFeed()({
      allFiles: [{ slug: "text-only", frontmatter: { title: "Only text", tags: [] } }],
      fileData: { slug: "index" },
      cfg: { locale: "zh-CN" },
      ctx: { allSlugs: [] },
    }),
  )
  assert.doesNotMatch(textOnly, /<time|<img|feed-card-summary/)
  assert.match(textOnly, /data-enhancement="infinite"/)
  assert.match(textOnly, /加载更多文章/)

  const illustrated = renderToString(
    createFeed()({
      allFiles: [
        {
          slug: "illustrated",
          frontmatter: { title: "Real figures", tags: [] },
          htmlAst: {
            type: "root",
            children: Array.from({ length: 4 }, (_, index) => ({
              type: "element",
              tagName: "img",
              properties: {
                src: `https://example.com/figure-${index}.png`,
                alt: `Figure ${index}`,
              },
              children: [],
            })),
          },
        },
      ],
      fileData: { slug: "index" },
      cfg: { locale: "zh-CN" },
      ctx: { allSlugs: [] },
    }),
  )
  assert.equal([...illustrated.matchAll(/<img\b/g)].length, 3)
  for (const [image] of illustrated.matchAll(/<img[^>]*>/g)) {
    assert.match(image, /loading="lazy"/)
    assert.match(image, /width="128" height="96"/)
  }
})
