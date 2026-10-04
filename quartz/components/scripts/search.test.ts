import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { setImmediate } from "node:timers/promises"
import test from "node:test"
import { runInNewContext } from "node:vm"
import { transformSync } from "esbuild"
import * as helpers from "./search.helpers"
import { escapeHTML } from "../../util/escape"

const script = transformSync(readFileSync(new URL("./search.inline.ts", import.meta.url), "utf8"), {
  loader: "ts",
  format: "cjs",
}).code

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

// A small DOM boundary exercises the actual inline script, including its async
// lifecycle. No browser implementation or second copy of search logic is used.
function setupSearch() {
  type TestEvent = {
    type: string
    target?: TestElement
    defaultPrevented?: boolean
    preventDefault: () => void
    stopPropagation: () => void
    [key: string]: unknown
  }
  class TestElement {
    className = ""
    dataset: Record<string, string> = {}
    style: Record<string, string> = {}
    attributes = new Map<string, string>()
    listeners = new Map<string, Set<(event: TestEvent) => void>>()
    children: TestElement[] = []
    parentElement: TestElement | null = null
    textContent = ""
    innerHTML = ""
    value = ""
    href = ""
    nodeType = 1
    constructor(readonly tagName: string) {}
    classList = {
      contains: (name: string) => this.className.split(" ").includes(name),
      toggle: (name: string, enabled?: boolean) => {
        const values = new Set(this.className.split(" ").filter(Boolean))
        const add = enabled ?? !values.has(name)
        if (add) values.add(name)
        else values.delete(name)
        this.className = [...values].join(" ")
      },
      add: (name: string) => this.classList.toggle(name, true),
      remove: (name: string) => this.classList.toggle(name, false),
    }
    get isConnected(): boolean {
      return this === document || Boolean(this.parentElement?.isConnected)
    }
    get childNodes() {
      return this.children
    }
    get parentNode() {
      return this.parentElement
    }
    matches(selector: string): boolean {
      return selector.split(",").some((part) => {
        const value = part.trim()
        if (value.startsWith(".")) return this.classList.contains(value.slice(1))
        if (value === "a[href]") return this.tagName === "a" && Boolean(this.href)
        if (value === "a.result-card")
          return this.tagName === "a" && this.classList.contains("result-card")
        if (value === "[tabindex='0']") return this.attributes.get("tabindex") === "0"
        return this.tagName === value
      })
    }
    querySelectorAll(selector: string): TestElement[] {
      return this.children.flatMap((child) => [
        ...(child.matches(selector) ? [child] : []),
        ...child.querySelectorAll(selector),
      ])
    }
    querySelector(selector: string) {
      return this.querySelectorAll(selector)[0] ?? null
    }
    getElementsByClassName(name: string) {
      return this.querySelectorAll(`.${name}`)
    }
    closest(selector: string): TestElement | null {
      return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null)
    }
    contains(element: TestElement | null): boolean {
      return element === this || this.children.some((child) => child.contains(element))
    }
    append(...elements: TestElement[]) {
      for (const element of elements) {
        element.parentElement = this
        this.children.push(element)
      }
    }
    appendChild(element: TestElement) {
      this.append(element)
    }
    replaceChildren(...elements: TestElement[]) {
      this.children.forEach((child) => (child.parentElement = null))
      this.children = []
      this.append(...elements)
    }
    getClientRects() {
      return [{}]
    }
    setAttribute(key: string, value: string) {
      this.attributes.set(key, value)
    }
    hasAttribute(key: string) {
      return this.attributes.has(key)
    }
    addEventListener(type: string, handler: (event: TestEvent) => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type)!.add(handler)
    }
    removeEventListener(type: string, handler: (event: TestEvent) => void) {
      this.listeners.get(type)?.delete(handler)
    }
    emit(type: string, values: Record<string, unknown> = {}, bubbles = false) {
      let stopped = false
      const event: TestEvent = {
        type,
        target: this,
        preventDefault() {
          this.defaultPrevented = true
        },
        stopPropagation() {
          stopped = true
        },
        ...values,
      }
      const path: TestElement[] = [this]
      if (bubbles) {
        for (let parent = this.parentElement; parent; parent = parent.parentElement)
          path.push(parent)
      }
      for (const target of path) {
        target.listeners.get(type)?.forEach((handler) => handler(event))
        if (stopped) break
      }
      return event
    }
    focus() {
      activeElement = this
      this.emit("focusin", {}, true)
    }
    click() {
      this.emit("click", { button: 0 }, true)
    }
    scrollIntoView() {}
  }
  const document = new TestElement("document")
  let activeElement: TestElement | null = null
  const root = new TestElement("div")
  root.className = "search"
  root.dataset = {
    loading: "Loading index",
    ready: "Type a query",
    error: "Search failed",
    noResults: "No results",
    noResultsHint: "Try again",
    resultCount: "{count} results",
    previewError: "Preview failed",
  }
  const create = (tag: string, className: string, parent: TestElement) => {
    const element = new TestElement(tag)
    element.className = className
    parent.append(element)
    return element
  }
  document.append(root)
  const button = create("button", "search-button", root)
  const container = create("div", "search-container", root)
  const input = create("input", "search-bar", container)
  const close = create("button", "search-close", container)
  const status = create("p", "search-status", container)
  const layout = create("div", "search-layout", container)
  layout.dataset.preview = "true"
  const source = deferred<Record<string, unknown>>()
  const queries: Array<{ query: string; pending: ReturnType<typeof deferred<unknown>> }> = []
  const previews: Array<ReturnType<typeof deferred<unknown>>> = []
  const cleanups: Array<() => void> = []
  let indexed = 0
  const domDocument = Object.assign(document, {
    createElement: (tag: string) => new TestElement(tag),
    createDocumentFragment: () => new TestElement("fragment"),
    createTextNode: (text: string) =>
      Object.assign(new TestElement("text"), { nodeType: 3, nodeValue: text }),
  })
  Object.defineProperty(domDocument, "activeElement", { get: () => activeElement })

  runInNewContext(script, {
    document: domDocument,
    window: { addCleanup: (fn: () => void) => cleanups.push(fn), dispatchEvent() {} },
    location: new URL("https://example.com/"),
    URL,
    Event,
    Element: TestElement,
    HTMLElement: TestElement,
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    DOMParser: class {
      parseFromString() {
        const body = new TestElement("body")
        return { body, getElementsByClassName: () => [] }
      }
    },
    fetchData: source.promise,
    fetch: () => {
      const pending = deferred<unknown>()
      previews.push(pending)
      return pending.promise
    },
    require: (id: string) => {
      if (id === "flexsearch")
        return {
          Document: class {
            addAsync() {
              indexed++
              return Promise.resolve()
            }
            searchAsync({ query }: { query: string }) {
              const pending = deferred<unknown>()
              queries.push({ query, pending })
              return pending.promise
            }
          },
        }
      if (id === "../../util/path")
        return {
          resolveRelative: (_from: string, to: string) => `/${to}`,
          normalizeRelativeURLs() {},
        }
      if (id === "../../util/escape") return { escapeHTML }
      if (id === "./search.helpers") return helpers
      throw new Error(`Unexpected search import: ${id}`)
    },
  })
  const nav = () => document.emit("nav", { detail: { url: "index" } })
  nav()
  const load = async () => {
    source.resolve({
      first: { title: "First", content: "First content", tags: ["agent"] },
      second: { title: "Second", content: "Second content", tags: ["agent"] },
    })
    await setImmediate()
  }
  const type = (value: string, isComposing = false) => {
    input.value = value
    input.emit("input", { isComposing })
  }
  const key = (value: string, options: Record<string, unknown> = {}) =>
    document.emit("keydown", { key: value, ...options })
  const resolveQuery = async (at: number, ids: number[]) => {
    queries[at].pending.resolve([{ field: "title", result: ids }])
    await setImmediate()
  }
  return {
    document,
    root,
    button,
    container,
    input,
    close,
    status,
    layout,
    source,
    queries,
    previews,
    load,
    type,
    key,
    resolveQuery,
    nav,
    get activeElement() {
      return activeElement
    },
    get indexed() {
      return indexed
    },
    results: () => layout.querySelectorAll("a.result-card"),
    cleanup: () => {
      cleanups.splice(0).forEach((fn) => fn())
    },
  }
}

test("search opens while index is pending, accepts a query, and surfaces load failure", async () => {
  const app = setupSearch()
  app.button.click()
  assert.ok(app.container.classList.contains("active"))
  assert.equal(app.status.textContent, "Loading index")
  app.type("agent")
  assert.equal(app.queries.length, 0)
  await app.load()
  assert.equal(app.queries[0].query, "agent")
  await app.resolveQuery(0, [0, 1])
  assert.equal(app.results().length, 2)
  assert.equal(app.status.textContent, "2 results")

  const failed = setupSearch()
  failed.button.click()
  failed.source.reject(new Error("offline"))
  await setImmediate()
  assert.equal(failed.status.textContent, "Search failed")
  failed.close.click()
  failed.button.click()
  assert.equal(failed.status.textContent, "Search failed")
})

test("arrows, Tab, Escape, repeated shortcut and close button preserve focus", async () => {
  const app = setupSearch()
  await app.load()
  app.button.focus()
  app.button.click()
  app.type("agent")
  await app.resolveQuery(0, [0, 1])
  app.key("ArrowDown")
  assert.equal(app.activeElement, app.results()[0])
  app.key("ArrowUp")
  assert.equal(app.activeElement, app.input)
  app.key("Tab", { shiftKey: true })
  assert.equal(app.activeElement, app.results()[1])
  app.key("Tab")
  assert.equal(app.activeElement, app.input)
  app.key("Escape")
  assert.equal(app.activeElement, app.button)
  app.input.focus()
  assert.equal(app.key("Escape", { repeat: true }).defaultPrevented, undefined)
  assert.equal(app.activeElement, app.input)
  app.key("k", { ctrlKey: true })
  app.key("k", { ctrlKey: true, repeat: true })
  assert.ok(app.container.classList.contains("active"))
  app.close.click()
  assert.equal(app.container.classList.contains("active"), false)
})

test("IME composition neither searches nor consumes editing/navigation keys", async () => {
  const app = setupSearch()
  await app.load()
  app.button.click()
  app.input.emit("compositionstart")
  app.type("智能", true)
  assert.equal(app.queries.length, 0)
  assert.equal(app.key("Enter", { isComposing: true }).defaultPrevented, undefined)
  assert.equal(app.key("Escape", { keyCode: 229 }).defaultPrevented, undefined)
  assert.ok(app.container.classList.contains("active"))
  app.input.emit("compositionend")
  assert.equal(app.queries[0].query, "智能")
})

test("out-of-order searches and previews cannot replace newer results", async () => {
  const app = setupSearch()
  await app.load()
  app.button.click()
  app.type("old")
  app.type("new")
  await app.resolveQuery(1, [1])
  await app.resolveQuery(0, [0])
  assert.equal(app.results()[0].dataset.slug, "second")
  app.type("next")
  await app.resolveQuery(2, [0])
  app.previews[1].resolve({ ok: true, text: async () => "<html></html>" })
  await setImmediate()
  assert.ok(app.layout.querySelector(".preview-inner"))
  const currentPreview = app.layout.querySelector(".preview-inner")
  app.previews[0].resolve({ ok: true, text: async () => "<html></html>" })
  await setImmediate()
  assert.equal(app.layout.querySelector(".preview-inner"), currentPreview)
  assert.equal(app.layout.querySelector(".preview-container")?.children[0].textContent, "")
})

test("cleanup is immediate even before loading; revisiting keeps one handler and index", async () => {
  const app = setupSearch()
  app.button.click()
  app.type("stale")
  app.cleanup()
  app.nav()
  await app.load()
  assert.equal(app.queries.length, 0)
  assert.equal(app.indexed, 2)
  assert.equal(app.document.listeners.get("keydown")?.size, 1)
  app.button.click()
  app.type("live")
  await app.resolveQuery(0, [])
  assert.equal(app.results().length, 0)
  assert.equal(app.layout.querySelector(".no-match")?.tagName, "div")
  assert.equal(app.status.textContent, "No results")
  app.cleanup()
  assert.equal(app.document.listeners.get("keydown")?.size, 0)
})

test("Enter activates a result without awaiting its preview, and late preview failure stays hidden", async () => {
  const app = setupSearch()
  await app.load()
  app.button.click()
  app.type("agent")
  await app.resolveQuery(0, [0])
  app.key("Enter")
  assert.equal(app.container.classList.contains("active"), false)
  assert.equal(app.status.textContent, "")
  app.previews[0].reject(new Error("late preview failure"))
  await setImmediate()
  assert.equal(app.layout.querySelector(".preview-container")?.children.length, 0)
  assert.equal(app.status.textContent, "")
})
