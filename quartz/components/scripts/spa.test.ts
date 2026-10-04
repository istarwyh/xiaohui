import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { setImmediate } from "node:timers/promises"
import test from "node:test"
import { runInNewContext } from "node:vm"
import { transformSync } from "esbuild"

// Execute the actual router with a deliberately asynchronous morph and a small
// DOM boundary. These tests protect lifecycle ordering without a browser or a
// second implementation of the router's URL/history logic.
const router = transformSync(readFileSync(new URL("./spa.inline.ts", import.meta.url), "utf8"), {
  loader: "ts",
  format: "cjs",
}).code

function setupRouter() {
  let location = new URL("https://example.com/brand")
  let incomingLang = "en-US"
  let incomingBuild: string | undefined = "same-build"
  let morph: () => Promise<void> = () => Promise.resolve()
  const events: string[] = []
  const navigations: boolean[] = []
  const fetched: string[] = []
  const assigned: string[] = []
  const pushed: string[] = []
  const errors: unknown[] = []
  const listeners = new Map<string, (event: unknown) => void>()
  const node = () => ({
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    textContent: "",
    appendChild() {},
    contains: () => false,
    querySelectorAll: () => [],
  })
  const document = {
    documentElement: { lang: "zh-CN" },
    body: node(),
    head: node(),
    title: "Brand",
    createElement: node,
    querySelector: (selector: string) =>
      selector.includes("quartz-build")
        ? { getAttribute: () => "same-build" }
        : { textContent: "Next page" },
    getElementById: () => ({ scrollIntoView: () => events.push("scroll-anchor") }),
    dispatchEvent: (event: Event) => {
      events.push(event.type)
      if (event.type === "nav") navigations.push((event as CustomEvent).detail.isBack)
    },
  }
  const window = {
    get location() {
      return Object.assign(location, {
        assign: (url: URL) => assigned.push(url.toString()),
      })
    },
    addEventListener: (type: string, handler: (event: unknown) => void) =>
      listeners.set(type, handler),
    scrollTo: () => events.push("scroll-top"),
    addCleanup: (_fn: () => void) => {},
    spaNavigate: async (_url: URL, _isBack?: boolean) => {},
  }

  runInNewContext(router, {
    window,
    document,
    URL,
    CustomEvent,
    setTimeout: () => 0,
    customElements: { get: () => true },
    console: { error: (error: unknown) => errors.push(error) },
    history: {
      pushState: (_state: unknown, _title: string, url: URL) => {
        location = new URL(url)
        pushed.push(url.toString())
      },
    },
    DOMParser: class {
      parseFromString() {
        return {
          ...document,
          documentElement: { lang: incomingLang },
          body: node(),
          head: node(),
          querySelector: (selector: string) =>
            selector.includes("quartz-build")
              ? incomingBuild
                ? { getAttribute: () => incomingBuild }
                : null
              : { textContent: "Next page" },
        }
      }
    },
    require: (id: string) => {
      if (id === "micromorph") {
        return () => {
          events.push("morph")
          return morph()
        }
      }
      if (id === "../../util/path") {
        return {
          getFullSlug: () => location.pathname.slice(1),
          normalizeRelativeURLs: () => {},
        }
      }
      if (id === "./util") {
        return {
          fetchCanonical: async (url: URL) => {
            fetched.push(url.toString())
            return {
              headers: { get: () => "text/html" },
              text: async () => "<html></html>",
            }
          },
        }
      }
      throw new Error(`Unexpected router import: ${id}`)
    },
  })
  events.length = 0 // Ignore the initial page's nav event.

  return {
    document,
    navigations,
    events,
    fetched,
    assigned,
    pushed,
    errors,
    window,
    setIncomingBuild: (build: string | undefined) => (incomingBuild = build),
    setIncomingLang: (lang: string) => (incomingLang = lang),
    setMorph: (next: () => Promise<void>) => (morph = next),
    popstate: async (path: string) => {
      location = new URL(path, location)
      listeners.get("popstate")?.({ target: window })
      await setImmediate()
    },
  }
}

test("native fragment navigation and same-document Back/Forward preserve controls", async () => {
  const app = setupRouter()
  app.window.addCleanup(() => app.events.push("cleanup"))

  for (const path of ["#logos", "#colors", "#usage", "#colors", "/brand", "#colors"]) {
    await app.popstate(path)
  }

  assert.deepEqual(app.fetched, [])
  assert.equal(app.events.length, 0)
  assert.deepEqual(app.pushed, [])
})

test("path and query history changes still navigate, then establish the new document", async () => {
  const app = setupRouter()

  await app.popstate("/article#section")
  await app.popstate("/article?view=full#section")
  await app.popstate("/article?view=full#next-section")
  await app.popstate("/brand#colors")
  await app.popstate("/brand#logos")

  assert.deepEqual(app.fetched, [
    "https://example.com/article#section",
    "https://example.com/article?view=full#section",
    "https://example.com/brand#colors",
  ])
  assert.equal(app.events.filter((event) => event === "nav").length, 3)
  assert.deepEqual(app.pushed, [])
})

test("navigation waits for morph before scrolling, history and reinitializing controls", async () => {
  const app = setupRouter()
  let complete!: () => void
  app.setMorph(() => new Promise<void>((resolve) => (complete = resolve)))
  app.window.addCleanup(() => app.events.push("cleanup"))

  const navigating = app.window.spaNavigate(new URL("https://example.com/article#section"))
  await setImmediate()
  assert.deepEqual(app.events, ["prenav", "cleanup", "morph"])
  assert.deepEqual(app.pushed, [])

  complete()
  await navigating
  assert.deepEqual(app.events, ["prenav", "cleanup", "morph", "scroll-anchor", "nav"])
  assert.deepEqual(app.pushed, ["https://example.com/article#section"])
  await app.popstate("/article#another-section")
  assert.equal(app.fetched.length, 1)
})

test("a rejected morph uses the router's full-page fallback and releases navigation lock", async () => {
  const app = setupRouter()
  const failure = new Error("DOM update failed")
  app.setMorph(() => Promise.reject(failure))

  await app.window.spaNavigate(new URL("https://example.com/article"))
  assert.deepEqual(app.errors, [failure])
  assert.deepEqual(app.assigned, ["https://example.com/article"])
  assert.deepEqual(app.pushed, [])
  assert.equal(app.events.includes("nav"), false)

  app.setMorph(() => Promise.resolve())
  await app.window.spaNavigate(new URL("https://example.com/next"))
  assert.deepEqual(app.pushed, ["https://example.com/next"])
  assert.equal(app.events.at(-1), "nav")
})

test("navigation updates document language after morph and preserves it on fragment history", async () => {
  const app = setupRouter()
  let complete!: () => void
  app.setMorph(() => new Promise<void>((resolve) => (complete = resolve)))
  const navigating = app.window.spaNavigate(new URL("https://example.com/en/"))
  await setImmediate()
  assert.equal(app.document.documentElement.lang, "zh-CN")
  complete()
  await navigating
  assert.equal(app.document.documentElement.lang, "en-US")
  await app.popstate("/en/#about")
  assert.equal(app.document.documentElement.lang, "en-US")
  app.setMorph(() => Promise.resolve())
  app.setIncomingLang("zh-CN")
  await app.window.spaNavigate(new URL("https://example.com/"))
  assert.equal(app.document.documentElement.lang, "zh-CN")
})

test("nav history flag applies only to that navigation", async () => {
  const app = setupRouter()
  await app.popstate("/previous")
  await app.window.spaNavigate(new URL("https://example.com/next"))
  assert.deepEqual(app.navigations, [false, true, false])
})

test("a different release falls back before cleaning up or morphing existing controls", async () => {
  const app = setupRouter()
  app.window.addCleanup(() => app.events.push("cleanup"))
  app.setIncomingBuild("new-build")
  await app.window.spaNavigate(new URL("https://example.com/new-release"))
  assert.deepEqual(app.assigned, ["https://example.com/new-release"])
  assert.equal(app.events.length, 0)
  assert.deepEqual(app.pushed, [])
  assert.equal(app.document.documentElement.lang, "zh-CN")

  app.setIncomingBuild(undefined)
  await app.window.spaNavigate(new URL("https://example.com/legacy-page"))
  assert.ok(app.events.includes("cleanup"))
  assert.equal(app.events.at(-1), "nav")
})
