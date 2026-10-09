import assert from "node:assert/strict"
import { File } from "node:buffer"
import { readFileSync } from "node:fs"
import { setImmediate } from "node:timers/promises"
import test from "node:test"
import { runInNewContext } from "node:vm"
import { transformSync } from "esbuild"
import { foundations, light } from "../../design/tokens"

const script = transformSync(
  readFileSync(new URL("./copyPage.inline.ts", import.meta.url), "utf8"),
  {
    loader: "ts",
    format: "cjs",
  },
).code

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

type PosterFormat = "short" | "long"
type ShareAction = "wechat" | "timeline" | "poster" | "copy"
type FileShareData = { files: File[]; title?: string; text?: string }

// Execute the production script, mocking only browser and renderer boundaries.
// Deferred promises deliberately let each test complete work in the wrong order.
function setupShare(
  options: { userAgent?: string; nativeShare?: boolean; fontsReady?: Promise<void> } = {},
) {
  type TestEvent = {
    type: string
    target: TestElement
    key?: string
    preventDefault: () => void
    stopPropagation: () => void
  }
  const downloads: Array<{ href: string; name: string }> = []
  let activeElement: TestElement | null = null
  class TestElement {
    className = ""
    dataset: Record<string, string> = {}
    style: Record<string, string> = {}
    attributes = new Map<string, string>()
    listeners = new Map<string, Set<(event: TestEvent) => void>>()
    children: TestElement[] = []
    parentElement: TestElement | null = null
    hidden = false
    href = ""
    src = ""
    alt = ""
    download = ""
    value = ""
    content = ""
    title = ""
    ariaLabel = ""
    ownText = ""
    html = ""
    constructor(readonly tagName: string) {}
    classList = {
      contains: (name: string) => this.className.split(" ").includes(name),
      toggle: (name: string, enabled?: boolean) => {
        const values = new Set(this.className.split(" ").filter(Boolean))
        const add = enabled ?? !values.has(name)
        if (add) values.add(name)
        else values.delete(name)
        this.className = [...values].join(" ")
        return add
      },
      add: (name: string) => this.classList.toggle(name, true),
      remove: (name: string) => this.classList.toggle(name, false),
    }
    get textContent(): string {
      return this.ownText + this.children.map((child) => child.textContent).join("")
    }
    set textContent(value: string) {
      this.replaceChildren()
      this.ownText = value
    }
    get innerHTML() {
      return this.html
    }
    set innerHTML(value: string) {
      this.html = value
      this.ownText = ""
      this.replaceChildren()
      // The fixture needs elements/attributes from the script's static markup,
      // not a second implementation of its panel or event handlers.
      const stack: TestElement[] = [this]
      for (const token of value.match(/<[^>]+>|[^<]+/g) ?? []) {
        if (token.startsWith("</")) {
          stack.pop()
        } else if (token.startsWith("<")) {
          const tag = token.match(/^<([\w-]+)/)?.[1]
          if (!tag) continue
          const element = new TestElement(tag)
          const attributes = token.slice(tag.length + 1, -1)
          for (const match of attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
            element.setAttribute(match[1], match[2] ?? "")
          }
          stack.at(-1)!.append(element)
          if (!/\/$/.test(attributes) && !["img", "meta", "link", "br", "input"].includes(tag)) {
            stack.push(element)
          }
        } else {
          stack.at(-1)!.ownText += token
        }
      }
    }
    matches(selector: string): boolean {
      const descendant = selector.lastIndexOf(" ")
      if (descendant >= 0) {
        return (
          this.matches(selector.slice(descendant + 1)) &&
          Boolean(this.parentElement?.closest(selector.slice(0, descendant)))
        )
      }
      const match = selector.match(
        /^([\w-]+)?(?:\.([\w-]+)|#([\w-]+))?(?:\[([\w-]+)(?:=["']([^"']*)["'])?\])?$/,
      )
      if (!match) throw new Error(`Unsupported test selector: ${selector}`)
      const [, tag, className, id, attribute, value] = match
      return (
        (!tag || tag === this.tagName) &&
        (!className || this.classList.contains(className)) &&
        (!id || this.attributes.get("id") === id) &&
        (!attribute ||
          (this.hasAttribute(attribute) &&
            (value === undefined || this.attributes.get(attribute) === value)))
      )
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
    closest(selector: string): TestElement | null {
      return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null)
    }
    contains(element: TestElement): boolean {
      return this === element || this.children.some((child) => child.contains(element))
    }
    append(...elements: TestElement[]) {
      for (const element of elements) {
        element.parentElement = this
        this.children.push(element)
      }
    }
    appendChild(element: TestElement) {
      this.append(element)
      return element
    }
    replaceChildren(...elements: TestElement[]) {
      this.children.forEach((child) => (child.parentElement = null))
      this.children = []
      this.append(...elements)
    }
    remove() {
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter((child) => child !== this)
      }
      this.parentElement = null
    }
    cloneNode(deep = false): TestElement {
      const clone = new TestElement(this.tagName)
      clone.className = this.className
      clone.ownText = this.ownText
      for (const [key, value] of this.attributes) clone.setAttribute(key, value)
      if (deep) clone.append(...this.children.map((child) => child.cloneNode(true)))
      return clone
    }
    setAttribute(key: string, value: string) {
      this.attributes.set(key, value)
      if (key === "class") this.className = value
      if (key === "hidden") this.hidden = true
      if (["href", "src", "alt", "download", "content"].includes(key)) {
        Object.assign(this, { [key]: value })
      }
      if (key.startsWith("data-")) {
        this.dataset[
          key.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
        ] = value
      }
    }
    removeAttribute(key: string) {
      this.attributes.delete(key)
      if (key === "src") this.src = ""
      if (key === "href") this.href = ""
    }
    getAttribute(key: string) {
      return this.attributes.get(key) ?? null
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
    emit(type: string, values: Partial<TestEvent> = {}, bubbles = false) {
      let stopped = false
      const event: TestEvent = {
        type,
        target: this,
        preventDefault() {},
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
      for (const element of path) {
        element.listeners.get(type)?.forEach((handler) => handler(event))
        if (stopped) break
      }
    }
    select() {}
    focus() {
      activeElement = this
    }
    blur() {
      if (activeElement === this) activeElement = null
    }
    click() {
      if (this.tagName === "a" && this.href && this.download) {
        downloads.push({ href: this.href, name: this.download })
      }
      this.emit("click", {}, true)
    }
  }
  const context = {
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillRect() {},
    fillText() {},
    drawImage() {},
    measureText: (value: string) => ({ width: value.length * 20 }),
  }
  const canvases: TestCanvas[] = []
  class TestCanvas extends TestElement {
    width = 0
    height = 0
    getContext() {
      return context
    }
    toBlob(callback: (blob: Blob) => void) {
      callback(new Blob([`short-${canvases.indexOf(this)}`], { type: "image/png" }))
    }
  }
  const document = Object.assign(new TestElement("document"), {
    title: "Browser title | AI Agent · MCP 实践者",
    body: new TestElement("body"),
    fonts: options.fontsReady ? { ready: options.fontsReady } : undefined,
    execCommand: (_command: string): boolean => true,
    createElement: (tag: string) => {
      if (tag !== "canvas") return new TestElement(tag)
      const canvas = new TestCanvas(tag)
      canvases.push(canvas)
      return canvas
    },
  })
  document.append(document.body)
  document.body.innerHTML = `
    <link rel="canonical" href="https://xiaohui.cool/essays/example" />
    <meta property="article:author" content="站点维护者" />
    <h1 class="article-title">测试长文</h1>
    <textarea id="copy-page-markdown-source"></textarea>
    <article data-share-author="小灰"><p>文章正文。</p></article>
  `
  document.querySelector("#copy-page-markdown-source")!.value =
    "---\ndescription: 分享摘要。\n---\n\n文章正文。"
  const qrRequests: Array<{ url: string; pending: ReturnType<typeof deferred<string>> }> = []
  const longRequests: Array<{
    input: { title: string; url: string; author?: string; article: TestElement }
    pending: ReturnType<typeof deferred<Blob>>
  }> = []
  const shareRequests: Array<{ data: FileShareData; pending: ReturnType<typeof deferred<void>> }> =
    []
  const clipboardRequests: Array<{ text: string; pending: ReturnType<typeof deferred<void>> }> = []
  const canShareRequests: FileShareData[] = []
  const errors: unknown[] = []
  const cleanups: Array<() => void> = []
  const timers = new Map<number, () => void>()
  let timerSequence = 0
  const objectUrls = new Map<string, Blob>()
  const revoked: string[] = []
  const navigator: {
    userAgent: string
    userActivation: { isActive: boolean }
    clipboard?: { writeText: (text: string) => Promise<void> }
    share?: (data: FileShareData) => Promise<void>
    canShare?: (data: FileShareData) => boolean
  } = {
    userAgent: options.userAgent ?? "Test Browser",
    userActivation: { isActive: true },
    clipboard: {
      writeText(text) {
        const pending = deferred<void>()
        clipboardRequests.push({ text, pending })
        return pending.promise
      },
    },
  }
  if (options.nativeShare) {
    navigator.canShare = (data) => {
      canShareRequests.push(data)
      return true
    }
    navigator.share = (data) => {
      const pending = deferred<void>()
      shareRequests.push({ data, pending })
      return pending.promise
    }
  }
  runInNewContext(script, {
    document,
    window: { addCleanup: (fn: () => void) => cleanups.push(fn) },
    navigator,
    location: new URL("https://xiaohui.cool/essays/example?tracking=ignored"),
    URL: {
      createObjectURL(blob: Blob) {
        const url = `blob:poster-${objectUrls.size + 1}`
        objectUrls.set(url, blob)
        return url
      },
      revokeObjectURL: (url: string) => revoked.push(url),
    },
    File,
    Image: class {
      onload?: () => void
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    },
    console: { error: (error: unknown) => errors.push(error) },
    setTimeout: (callback: () => void) => {
      timers.set(++timerSequence, callback)
      return timerSequence
    },
    clearTimeout: (id: number) => timers.delete(id),
    require: (id: string) => {
      if (id === "../../design/tokens") return { foundations, light }
      if (id === "qrcode")
        return {
          toDataURL(url: string) {
            const pending = deferred<string>()
            qrRequests.push({ url, pending })
            return pending.promise
          },
        }
      if (id === "./sharePoster")
        return {
          generateLongSharePoster(input: (typeof longRequests)[number]["input"]) {
            const pending = deferred<Blob>()
            longRequests.push({ input, pending })
            return pending.promise
          },
        }
      throw new Error(`Unexpected share import: ${id}`)
    },
    module: { exports: {} },
  })
  const nav = () => document.emit("nav")
  nav()
  const element = (selector: string) => {
    const result = document.querySelector(selector)
    assert.ok(result, `Missing share element: ${selector}`)
    return result
  }
  const sheet = element(".share-page-sheet")
  const button = element(".share-page-button")
  const close = element(".share-page-close")
  const preview = element(".share-page-poster")
  const image = element(".share-page-poster-image")
  const download = element(".share-page-poster-download")
  const status = element(".share-page-status")
  return {
    document,
    sheet,
    button,
    close,
    preview,
    image,
    download,
    status,
    navigator,
    qrRequests,
    longRequests,
    shareRequests,
    canShareRequests,
    clipboardRequests,
    objectUrls,
    revoked,
    downloads,
    errors,
    timers,
    canvases,
    element,
    nav,
    get activeElement() {
      return activeElement
    },
    open: () => button.click(),
    select: (format: PosterFormat) => element(`[data-poster-format="${format}"]`).click(),
    action: (action: ShareAction) => element(`[data-share-action="${action}"]`).click(),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
    async finishShort(index = 0) {
      await setImmediate()
      qrRequests[index].pending.resolve("data:image/png;base64,qr")
      await setImmediate()
    },
    async finishLong(index = 0) {
      await setImmediate()
      longRequests[index].pending.resolve(new Blob([`long-${index}`], { type: "image/png" }))
      await setImmediate()
    },
  }
}

test("share panel selects, previews and downloads the correct short and long posters", async () => {
  const h = setupShare()
  h.nav()
  assert.equal(h.document.querySelectorAll(".copy-page-control").length, 1)
  assert.equal(h.qrRequests.length, 0)
  h.open()
  assert.equal(h.sheet.hidden, false)
  assert.equal(h.document.body.classList.contains("share-sheet-open"), true)
  assert.equal(h.button.attributes.get("aria-expanded"), "true")
  assert.equal(h.activeElement, h.close)
  assert.equal(h.element(".share-page-preview-title").textContent, "测试长文")
  assert.equal(h.element(".share-page-preview-description").textContent, "分享摘要。")
  assert.equal(
    h.element(".share-page-preview-url").textContent,
    "https://xiaohui.cool/essays/example",
  )
  assert.equal(h.sheet.dataset.posterFormat, "short")
  await setImmediate()
  assert.deepEqual(h.errors, [])
  assert.equal(h.qrRequests[0].url, "https://xiaohui.cool/essays/example")
  await h.finishShort()
  const shortUrl = h.image.src
  assert.equal(h.preview.hidden, false)
  assert.equal(h.image.alt, "二维码短卡预览")
  assert.equal(h.download.href, shortUrl)
  assert.equal(h.download.download, "xiaohui-share.png")
  assert.deepEqual([h.canvases[0].width, h.canvases[0].height], [1144, 632])
  h.action("poster")
  await setImmediate()
  assert.deepEqual(h.downloads, [{ href: shortUrl, name: "xiaohui-share.png" }])

  h.select("long")
  assert.equal(h.sheet.dataset.posterFormat, "long")
  assert.equal(h.element('[data-poster-format="long"]').attributes.get("aria-pressed"), "true")
  assert.equal(h.element('[data-poster-format="short"]').attributes.get("aria-pressed"), "false")
  assert.equal(h.preview.hidden, true)
  assert.equal(h.image.src, "")
  assert.equal(h.download.href, "")
  assert.equal(h.longRequests[0].input.title, "测试长文")
  assert.equal(h.longRequests[0].input.url, "https://xiaohui.cool/essays/example")
  assert.equal(h.longRequests[0].input.author, "小灰")
  assert.equal(h.longRequests[0].input.article, h.element("article"))
  await h.finishLong()
  const longUrl = h.image.src
  assert.notEqual(longUrl, shortUrl)
  assert.equal(h.image.alt, "文章原文长图预览")
  assert.equal(h.download.href, longUrl)
  assert.equal(h.download.download, "xiaohui-long-share.png")
  h.action("poster")
  await setImmediate()
  assert.deepEqual(h.downloads[1], { href: longUrl, name: "xiaohui-long-share.png" })
  h.select("short")
  await setImmediate()
  assert.equal(h.image.src, shortUrl)
  assert.equal(h.download.download, "xiaohui-share.png")
  assert.equal(h.qrRequests.length, 1)
  assert.equal(h.longRequests.length, 1)
})

test("out-of-order generation never replaces the selected format", async () => {
  const h = setupShare()
  h.open()
  h.select("long")
  await h.finishLong()
  const longUrl = h.image.src
  await h.finishShort()
  assert.equal(h.image.src, longUrl)
  assert.equal(h.download.download, "xiaohui-long-share.png")
  assert.equal(h.status.textContent, "")
  assert.equal(h.downloads.length, 0)
  h.select("short")
  await setImmediate()
  assert.notEqual(h.image.src, longUrl)
  assert.equal(h.qrRequests.length, 1)
})

test("switching away and back shares one pending generation per format", async () => {
  const h = setupShare()
  h.open()
  h.select("long")
  h.select("short")
  await h.finishShort()
  const shortUrl = h.image.src
  await h.finishLong()
  assert.equal(h.image.src, shortUrl)
  assert.equal(h.image.alt, "二维码短卡预览")
  assert.equal(h.qrRequests.length, 1)
  assert.equal(h.longRequests.length, 1)
})

test("only the latest save click downloads when several actions await the same poster", async () => {
  const h = setupShare()
  h.open()
  h.select("long")
  h.action("poster")
  h.action("poster")
  h.action("poster")
  assert.equal(h.longRequests.length, 1)
  await h.finishLong()
  assert.deepEqual(h.downloads, [{ href: h.image.src, name: "xiaohui-long-share.png" }])
  assert.match(h.status.textContent, /分享图已生成/)
})

test("latest target wins while generation is pending and does not open native share asynchronously", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  h.action("wechat")
  h.action("timeline")
  await h.finishShort()
  assert.equal(h.shareRequests.length, 0)
  assert.match(h.status.textContent, /朋友圈/)
  assert.doesNotMatch(h.status.textContent, /微信好友/)
  assert.equal(h.preview.hidden, false)
})

test("format selection invalidates an older pending download", async () => {
  const h = setupShare()
  h.open()
  h.action("poster")
  h.select("long")
  await h.finishShort()
  assert.equal(h.downloads.length, 0)
  assert.equal(h.preview.hidden, true)
  assert.equal(h.image.src, "")
  await h.finishLong()
  assert.equal(h.preview.hidden, false)
  assert.equal(h.download.download, "xiaohui-long-share.png")
  assert.equal(h.downloads.length, 0)
})

for (const format of ["short", "long"] as const) {
  test(`${format} generation failure is reported and saving retries successfully`, async () => {
    const h = setupShare()
    h.open()
    if (format === "long") h.select(format)
    await setImmediate()
    const failed = new Error("renderer failed")
    const requests = format === "long" ? h.longRequests : h.qrRequests
    requests[0].pending.reject(failed)
    await setImmediate()
    assert.match(h.status.textContent, /生成失败/)
    assert.equal(h.preview.hidden, true)
    assert.equal(h.downloads.length, 0)
    assert.equal(h.objectUrls.size, 0)
    assert.equal(h.errors[0], failed)
    h.action("poster")
    await setImmediate()
    assert.equal(requests.length, 2)
    if (format === "long") await h.finishLong(1)
    else await h.finishShort(1)
    assert.equal(h.preview.hidden, false)
    assert.equal(h.downloads.length, 1)
    assert.match(h.status.textContent, /分享图已生成/)
  })
}

test("a stale generation failure cannot overwrite a newer format's successful preview", async () => {
  const h = setupShare()
  h.open()
  h.select("long")
  await h.finishLong()
  const longUrl = h.image.src
  h.qrRequests[0].pending.reject(new Error("old short generation failed"))
  await setImmediate()
  assert.equal(h.status.textContent, "")
  assert.equal(h.image.src, longUrl)
  assert.equal(h.errors.length, 0)
})

test("closing suppresses pending preview and download but reopening reuses the generated result", async () => {
  const h = setupShare()
  h.open()
  h.action("poster")
  h.close.click()
  const status = h.status.textContent
  assert.equal(h.sheet.hidden, true)
  assert.equal(h.button.attributes.get("aria-expanded"), "false")
  assert.equal(h.document.body.classList.contains("share-sheet-open"), false)
  assert.equal(h.activeElement, h.button)
  await h.finishShort()
  assert.equal(h.preview.hidden, true)
  assert.equal(h.image.src, "")
  assert.equal(h.status.textContent, status)
  assert.equal(h.downloads.length, 0)
  assert.equal(h.revoked.length, 0)
  h.open()
  await setImmediate()
  assert.equal(h.sheet.hidden, false)
  assert.equal(h.preview.hidden, false)
  assert.equal(h.qrRequests.length, 1)
  assert.equal(h.downloads.length, 0)
})

test("reopening before generation finishes installs a new continuation without reviving old actions", async () => {
  const h = setupShare()
  h.open()
  h.select("long")
  h.action("poster")
  h.close.click()
  h.open()
  assert.equal(h.sheet.dataset.posterFormat, "long")
  await h.finishLong()
  assert.equal(h.preview.hidden, false)
  assert.equal(h.download.download, "xiaohui-long-share.png")
  assert.equal(h.status.textContent, "")
  assert.equal(h.downloads.length, 0)
  assert.equal(h.longRequests.length, 1)
})

test("Escape and backdrop close invalidate in-flight save actions", async () => {
  for (const close of ["escape", "backdrop"] as const) {
    const h = setupShare()
    h.open()
    h.action("poster")
    if (close === "escape") h.document.emit("keydown", { key: "Escape" })
    else h.sheet.click()
    await h.finishShort()
    assert.equal(h.sheet.hidden, true)
    assert.equal(h.preview.hidden, true)
    assert.equal(h.downloads.length, 0)
  }
})

test("navigation cleanup revokes cached and late URLs once and prevents every late UI side effect", async () => {
  const h = setupShare()
  h.open()
  await h.finishShort()
  const shortUrl = h.image.src
  h.action("poster")
  await setImmediate()
  assert.equal(h.timers.size, 1)
  h.select("long")
  h.action("poster")
  const status = h.status.textContent
  h.cleanup()
  assert.deepEqual(h.revoked, [shortUrl])
  assert.equal(h.document.querySelector(".share-page-sheet"), null)
  assert.equal(h.document.body.classList.contains("share-sheet-open"), false)
  assert.equal(h.timers.size, 0)
  assert.equal(h.button.listeners.get("click")?.size, 0)
  assert.equal(h.sheet.listeners.get("click")?.size, 0)
  assert.equal(h.document.listeners.get("keydown")?.size, 0)
  await h.finishLong()
  assert.equal(h.objectUrls.size, 2)
  assert.deepEqual(h.revoked, [...h.objectUrls.keys()])
  assert.equal(new Set(h.revoked).size, 2)
  assert.equal(h.status.textContent, status)
  assert.equal(h.image.src, "")
  assert.equal(h.downloads.length, 1)
  assert.equal(h.timers.size, 0)
})

test("cached native sharing receives the selected long PNG and current article metadata", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  await h.finishShort()
  h.select("long")
  await h.finishLong()
  h.action("wechat")
  assert.equal(h.shareRequests.length, 1)
  assert.equal(h.canShareRequests.length, 1)
  const data = h.shareRequests[0].data
  assert.equal(data.files.length, 1)
  assert.equal(data.files[0].name, "xiaohui-long-share.png")
  assert.equal(data.files[0].type, "image/png")
  assert.equal(await data.files[0].text(), "long-0")
  assert.equal(h.canShareRequests[0].files[0], data.files[0])
  assert.equal(data.title, "测试长文")
  assert.equal(data.text, "分享摘要。")
  assert.equal(h.downloads.length, 0)
  h.shareRequests[0].pending.resolve()
  await setImmediate()
  assert.match(h.status.textContent, /已打开系统分享.*微信好友/)
  assert.equal(h.button.ariaLabel, "已打开系统分享")
})

test("native sharing rejection preserves the selected PNG and supplies the target-specific fallback", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  h.select("long")
  await h.finishLong()
  const longUrl = h.image.src
  h.action("timeline")
  h.shareRequests[0].pending.reject(
    Object.assign(new Error("permission denied"), { name: "NotAllowedError" }),
  )
  await setImmediate()
  assert.equal(h.preview.hidden, false)
  assert.equal(h.image.src, longUrl)
  assert.equal(h.download.href, longUrl)
  assert.equal(h.download.download, "xiaohui-long-share.png")
  assert.match(h.status.textContent, /长按图片保存后发到朋友圈/)
  assert.equal(h.errors.length, 0)
  assert.equal(h.downloads.length, 0)
})

test("canceling native share leaves the existing preview without reporting an error", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  await h.finishShort()
  const url = h.image.src
  h.action("wechat")
  h.shareRequests[0].pending.reject(Object.assign(new Error("canceled"), { name: "AbortError" }))
  await setImmediate()
  assert.equal(h.image.src, url)
  assert.equal(h.status.textContent, "")
  assert.equal(h.errors.length, 0)
  assert.equal(h.downloads.length, 0)
})

test("unsupported or unavailable native sharing falls back safely to the selected image", async () => {
  const conditions = [
    "absent",
    "unsupported",
    "inactive",
    "canShareThrows",
    "shareThrows",
    "wechat",
  ] as const
  for (const condition of conditions) {
    const h = setupShare({
      nativeShare: true,
      userAgent: condition === "wechat" ? "MicroMessenger" : undefined,
    })
    if (condition === "absent") delete h.navigator.share
    if (condition === "unsupported") h.navigator.canShare = () => false
    if (condition === "inactive") h.navigator.userActivation.isActive = false
    if (condition === "canShareThrows")
      h.navigator.canShare = () => {
        throw new Error("unavailable")
      }
    if (condition === "shareThrows")
      h.navigator.share = () => {
        throw Object.assign(new Error("blocked"), { name: "NotAllowedError" })
      }
    h.open()
    h.select("long")
    await h.finishLong()
    const url = h.image.src
    h.action("wechat")
    await setImmediate()
    assert.equal(h.shareRequests.length, 0, condition)
    assert.equal(h.image.src, url, condition)
    assert.equal(h.download.download, "xiaohui-long-share.png", condition)
    assert.match(h.status.textContent, /长按图片保存后发送给微信好友/, condition)
    assert.equal(h.downloads.length, 0, condition)
  }
})

for (const outcome of ["success", "failure"] as const) {
  test(`stale native-share ${outcome} cannot overwrite a newly selected format`, async () => {
    const h = setupShare({ nativeShare: true })
    h.open()
    await h.finishShort()
    h.action("wechat")
    h.select("long")
    await h.finishLong()
    const url = h.image.src
    if (outcome === "success") h.shareRequests[0].pending.resolve()
    else h.shareRequests[0].pending.reject(new Error("late native failure"))
    await setImmediate()
    assert.equal(h.image.src, url)
    assert.equal(h.download.download, "xiaohui-long-share.png")
    assert.equal(h.status.textContent, "")
    assert.equal(h.button.ariaLabel, "打开分享面板")
    assert.equal(h.errors.length, 0)
    assert.equal(h.timers.size, 0)
  })
}

test("only the latest of overlapping native-share callbacks changes status", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  await h.finishShort()
  h.action("wechat")
  h.action("timeline")
  h.shareRequests[1].pending.resolve()
  await setImmediate()
  const status = h.status.textContent
  assert.match(status, /已打开系统分享.*朋友圈/)
  h.shareRequests[0].pending.reject(new Error("older request failed"))
  await setImmediate()
  assert.equal(h.status.textContent, status)
  assert.equal(h.errors.length, 0)
})

test("closing and reopening invalidates native-share callbacks even in the same format", async () => {
  const h = setupShare({ nativeShare: true })
  h.open()
  await h.finishShort()
  h.action("wechat")
  h.close.click()
  h.open()
  await setImmediate()
  h.shareRequests[0].pending.resolve()
  await setImmediate()
  assert.equal(h.status.textContent, "")
  assert.equal(h.button.ariaLabel, "打开分享面板")
  assert.equal(h.timers.size, 0)
})

test("copying the canonical link wins over an older pending poster action", async () => {
  const h = setupShare()
  h.open()
  h.action("poster")
  h.action("copy")
  assert.equal(h.clipboardRequests[0].text, "https://xiaohui.cool/essays/example")
  h.clipboardRequests[0].pending.resolve()
  await setImmediate()
  await h.finishShort()
  assert.equal(h.status.textContent, "链接已复制。")
  assert.equal(h.button.ariaLabel, "链接已复制")
  assert.equal(h.downloads.length, 0)
})

test("a clipboard callback after close cannot alter a reopened panel", async () => {
  const h = setupShare()
  h.open()
  await h.finishShort()
  h.action("copy")
  h.close.click()
  h.open()
  await setImmediate()
  h.clipboardRequests[0].pending.resolve()
  await setImmediate()
  assert.equal(h.status.textContent, "")
  assert.equal(h.button.ariaLabel, "打开分享面板")
})

test("cleanup revokes every cached format without waiting for another generation", async () => {
  const h = setupShare()
  h.open()
  await h.finishShort()
  h.select("long")
  await h.finishLong()
  assert.equal(h.objectUrls.size, 2)
  assert.equal(h.revoked.length, 0)
  h.cleanup()
  assert.deepEqual(h.revoked, [...h.objectUrls.keys()])
  assert.equal(new Set(h.revoked).size, 2)
})

for (const outcome of ["success", "failure"] as const) {
  test(`native-share ${outcome} after navigation cannot update disposed elements or timers`, async () => {
    const h = setupShare({ nativeShare: true })
    h.open()
    await h.finishShort()
    h.action("wechat")
    const status = h.status.textContent
    const label = h.button.ariaLabel
    const image = h.image.src
    h.cleanup()
    if (outcome === "success") h.shareRequests[0].pending.resolve()
    else h.shareRequests[0].pending.reject(new Error("share finished after navigation"))
    await setImmediate()
    assert.equal(h.status.textContent, status)
    assert.equal(h.button.ariaLabel, label)
    assert.equal(h.image.src, image)
    assert.equal(h.timers.size, 0)
    assert.equal(h.errors.length, 0)
    assert.equal(h.downloads.length, 0)
    assert.deepEqual(h.revoked, [image])
  })
}

test("native sharing works when optional capability and activation APIs are absent", async () => {
  const h = setupShare({ nativeShare: true })
  delete h.navigator.canShare
  Reflect.deleteProperty(h.navigator, "userActivation")
  h.open()
  await h.finishShort()
  h.action("wechat")
  assert.equal(h.shareRequests.length, 1)
  assert.equal(h.shareRequests[0].data.files[0].name, "xiaohui-share.png")
  assert.equal(await h.shareRequests[0].data.files[0].text(), "short-0")
  h.shareRequests[0].pending.resolve()
  await setImmediate()
  assert.match(h.status.textContent, /已打开系统分享.*微信好友/)
})

test("the long renderer only receives an explicit article author, never the site's meta author", () => {
  const h = setupShare()
  h.element('meta[property="article:author"]').content = "Site maintainer"
  h.element("article").setAttribute("data-share-author", "Original author")
  h.open()
  h.select("long")
  assert.equal(h.longRequests[0].input.author, "Original author")

  const withoutAuthor = setupShare()
  withoutAuthor.element("article").removeAttribute("data-share-author")
  withoutAuthor.open()
  withoutAuthor.select("long")
  assert.equal(withoutAuthor.longRequests[0].input.author, undefined)
})

test("short poster generation waits for article fonts before laying out text", async () => {
  const ready = deferred<void>()
  const h = setupShare({ fontsReady: ready.promise })
  h.open()
  await setImmediate()
  assert.equal(h.qrRequests.length, 0)
  assert.equal(h.canvases.length, 0)
  assert.equal(h.preview.hidden, true)
  ready.resolve()
  await h.finishShort()
  assert.equal(h.qrRequests.length, 1)
  assert.equal(h.preview.hidden, false)
})

test("legacy clipboard fallback reports success only when execCommand actually copies", async () => {
  for (const succeeded of [false, true]) {
    const h = setupShare()
    delete h.navigator.clipboard
    const commands: string[] = []
    h.document.execCommand = (command) => {
      commands.push(command)
      return succeeded
    }
    h.open()
    await h.finishShort()
    h.action("copy")
    await setImmediate()
    assert.deepEqual(commands, ["copy"])
    assert.equal(h.document.querySelectorAll("textarea").length, 1)
    assert.equal(
      h.status.textContent,
      succeeded ? "链接已复制。" : "复制失败，请从上方选取文章链接。",
    )
    assert.equal(h.button.ariaLabel, succeeded ? "链接已复制" : "打开分享面板")
    assert.equal(h.errors.length, succeeded ? 0 : 1)
  }
})
