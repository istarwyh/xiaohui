import { test, expect } from "@playwright/test"
import { build } from "esbuild"
import * as sass from "sass"
import { PNG } from "pngjs"
import jsQR from "jsqr"
import { createServer } from "node:http"
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repo = fileURLToPath(new URL("../../", import.meta.url))
const artifacts = path.join(repo, "test-results/share-posters")
let directory
let server
let base
let posterCanvas
const errorBuffers = new WeakMap()
// Chromium PNG toBlob may use 1s idle-start + 5.7s encoding watchdogs, in
// addition to the renderer's 1.2s font wait. This bounds readiness, not quality.
// https://chromium.googlesource.com/chromium/src/+/lkgr/third_party/blink/renderer/core/html/canvas/canvas_async_blob_creator.cc
const POSTER_READY_TIMEOUT = 15_000

test.use({ trace: "retain-on-failure", screenshot: "only-on-failure" })

const samples = {
  short:
    "<p>清楚的作者、可读的内容、可靠的结构和克制的细节。这是用于验证原文分享的短文。中文标点自然换行，English words stay readable，emoji 👩🏽‍💻 不能截断。</p><p>SHORT-END 完整原文。</p>",
  near: `<p>近800字边界：${"文".repeat(775)}NEAR-END</p>`,
  long: `<h2>一、先读原文</h2><p>${"晓灰的博客持续积累个人知识与作品。工程、Agent 和个人观察共享稳定的作者身份，分享时应保留真实的原文语义与段落。".repeat(30)}</p><p>LONG-FINAL-MARKER</p>`,
  structures: `<h2>列表、引用与代码</h2><p>文章原文在图中保持结构。</p><ol><li>第一步：准备输入。</li><li>第二步：验证输出。</li></ol><blockquote><p>引用段落内容。“自然换行，保持可读。”</p></blockquote><pre><code>const title = "晓灰";\nconst words = ["原文", "结构", "分享"];\nconsole.log(words.join(" / "));\n${"veryLongUnbrokenToken_".repeat(12)}</code></pre><p>STRUCTURE-END 文章末尾。</p>`,
  paragraph: `<p>${"LONGPARAGRAPHabcdefghijklmnopqrstuvwxyz0123456789长段落内容必须可靠换行，不能撑开容器。".repeat(90)}</p><p>PARAGRAPH-END</p>`,
}
const canonical = (sample) => new URL(`https://xiaohui.cool/笔记/长文分享-${sample}`).href
const escape = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

// Test-only instrumentation observes actual canvas drawing and intercepts only explicit
// failure fixtures. It never replaces the production renderer or its layout algorithm.
const instrumentation = `
const params = new URLSearchParams(location.search);
const fault = params.get('fault');
if (params.get('theme') === 'dark') document.documentElement.setAttribute('saved-theme', 'dark');
window.qa = { exports: [], shares: [], pending: [], draws: new WeakMap() };
const originalFillText = CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
  const lines = window.qa.draws.get(this.canvas) || [];
  lines.push({text, x:args[0], y:args[1], font:this.font});
  window.qa.draws.set(this.canvas, lines);
  return originalFillText.call(this,text,...args);
};
const originalToBlob = HTMLCanvasElement.prototype.toBlob;
let failed = false;
HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  const canvas = this;
  const run = () => originalToBlob.call(canvas, blob => {
    window.qa.exports.push({width:canvas.width,height:canvas.height,size:blob?.size,lines:window.qa.draws.get(canvas)||[]});
    callback(blob);
  }, ...args);
  if (fault === 'fail' && !failed) { failed=true; callback(null); return; }
  if (fault === 'delay') { window.qa.pending.push(run); return; }
  run();
};
if (fault === 'cancel' || fault === 'reject') {
  Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
  Object.defineProperty(navigator,'share',{value:data=>{
    window.qa.shares.push(data.files.map(file=>({name:file.name,size:file.size})));
    return Promise.reject(new DOMException('QA simulated '+fault, fault==='cancel'?'AbortError':'NotAllowedError'));
  },configurable:true});
} else {
  // Stable no-Web-Share fixture exercises the supported save-image fallback.
  Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
}
window.addCleanup = fn => (window.cleanups ||= []).push(fn);
`

function fixture(sample, body, css) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><title>长文分享测试：${sample}</title><meta name="author" content="不应冒充作者的网站名"><meta name="description" content="META-DESCRIPTION-NOT-ARTICLE"><link rel="canonical" href="${canonical(sample)}"><style>${css}</style></head><body><h1 class="article-title">长文分享测试：${sample}</h1><article${sample === "structures" ? ' data-share-author="晓灰"' : ""}>${body}</article><textarea hidden id="copy-page-markdown-source">${escape(body.replace(/<[^>]+>/g, "\n"))}</textarea><script>${instrumentation}</script><script src="/share.js"></script><script>document.dispatchEvent(new CustomEvent('nav'));</script></body></html>`
}

test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "xiaohui-share-browser-"))
  await mkdir(artifacts, { recursive: true })
  await build({
    entryPoints: [path.join(repo, "quartz/components/scripts/copyPage.inline.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: path.join(directory, "share.js"),
  })
  await build({
    entryPoints: [path.join(repo, "quartz/components/scripts/sharePoster.ts")],
    bundle: true,
    format: "iife",
    globalName: "SharePosterQA",
    platform: "browser",
    outfile: path.join(directory, "renderer.js"),
  })
  const tokenFile = path.join(directory, "tokens.mjs")
  await build({
    entryPoints: [path.join(repo, "quartz/design/tokens.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: tokenFile,
  })
  const { designTokens, xiaohuiTheme } = await import(pathToFileURL(tokenFile).href)
  const variables = {
    ...designTokens.shared,
    ...designTokens.light,
    ...xiaohuiTheme.colors.lightMode,
  }
  const tokens = Object.entries(variables)
    .map(([key, value]) => `--${key}:${value}`)
    .join(";")
  posterCanvas = designTokens.light["color-canvas"]
  const darkVariables = { ...designTokens.dark, ...xiaohuiTheme.colors.darkMode }
  const darkTokens = Object.entries(darkVariables)
    .map(([key, value]) => `--${key}:${value}`)
    .join(";")
  const componentCss = sass.compile(path.join(repo, "quartz/components/styles/copyPage.scss")).css
  const css = `:root{${tokens}}:root[saved-theme="dark"]{${darkTokens}}body{margin:0;padding:16px;box-sizing:border-box;color:var(--color-text);background:var(--color-canvas);font-family:var(--font-body);font-size:16px}article{max-width:700px;overflow-wrap:anywhere}h1{font-size:28px}pre{white-space:pre-wrap}button,a{-webkit-tap-highlight-color:transparent}${componentCss}`
  const fixtureSamples = { ...samples, shortNoEmoji: samples.short.replace("👩🏽‍💻", "开发者") }
  for (const [sample, body] of Object.entries(fixtureSamples)) {
    await writeFile(path.join(directory, sample + ".html"), fixture(sample, body, css))
  }
  await writeFile(
    path.join(directory, "frames.html"),
    '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>320 and 390 pixel viewports</title><style>body{margin:0;display:flex;gap:16px;background:#ddd}iframe{border:0;height:900px;flex:none}</style><iframe id="view320" title="320 pixel viewport" width="320" src="/structures.html"></iframe><iframe id="view390" title="390 pixel viewport" width="390" src="/structures.html"></iframe>',
  )
  server = createServer(async (req, res) => {
    const requested = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
    const built = requested.startsWith("/built/")
    const root =
      built && process.env.SHARE_QA_SITE_DIRECTORY
        ? path.resolve(repo, process.env.SHARE_QA_SITE_DIRECTORY)
        : directory
    const name = built ? requested.slice("/built/".length) : requested.slice(1)
    const filename = path.resolve(root, name || "index.html")
    if (!filename.startsWith(root + path.sep) || (built && !process.env.SHARE_QA_SITE_DIRECTORY)) {
      res.writeHead(404)
      res.end()
      return
    }
    try {
      const bytes = await readFile(filename)
      const types = {
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
      }
      res.setHeader("Content-Type", types[path.extname(filename)] || "text/html; charset=utf-8")
      res.end(bytes)
    } catch {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

test.afterAll(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  if (directory) await rm(directory, { recursive: true, force: true })
})

function observeErrors(page) {
  if (errorBuffers.has(page)) return errorBuffers.get(page)
  const errors = []
  errorBuffers.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  observeErrors(page)
  await page.addInitScript(() => {
    const canvases = new WeakMap()
    window.shareCanvasStages = []
    window.shareCanvasRefs = []
    window.shareFontStages = [
      { at: performance.now(), event: "init", status: document.fonts.status },
    ]
    document.fonts.ready.then(() =>
      window.shareFontStages.push({
        at: performance.now(),
        event: "ready",
        status: document.fonts.status,
      }),
    )
    for (const type of ["loading", "loadingdone", "loadingerror"])
      document.fonts.addEventListener(type, () =>
        window.shareFontStages.push({
          at: performance.now(),
          event: type,
          status: document.fonts.status,
        }),
      )
    const canvasRecord = (canvas) => {
      if (!canvases.has(canvas)) {
        const record = { created: performance.now(), draws: 0 }
        canvases.set(canvas, record)
        window.shareCanvasStages.push(record)
        window.shareCanvasRefs.push(canvas)
      }
      const record = canvases.get(canvas)
      record.width = canvas.width
      record.height = canvas.height
      return record
    }
    const fillText = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      const record = canvasRecord(this.canvas)
      record.draws += 1
      record.lastDraw = performance.now()
      record.lastText = args[0]
      return fillText.apply(this, args)
    }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      const record = canvasRecord(this)
      record.toBlobCalled = performance.now()
      return toBlob.call(
        this,
        (blob) => {
          record.toBlobCompleted = performance.now()
          record.blobSize = blob?.size
          callback(blob)
        },
        ...args,
      )
    }
    const log = (entry) => {
      const events = (window.shareDiagnostics ||= [])
      events.push({ at: performance.now(), ...entry })
      if (events.length > 150) events.shift()
    }
    const state = () => {
      const sheet = document.querySelector(".share-page-sheet")
      const image = document.querySelector(".share-page-poster-image")
      return {
        hidden: sheet?.hidden,
        format: sheet?.dataset.posterFormat,
        status: document.querySelector(".share-page-status")?.textContent,
        src: image?.getAttribute("src"),
        naturalWidth: image?.naturalWidth,
      }
    }
    for (const eventType of ["pointerdown", "pointerup", "click"]) {
      for (const capture of [true, false])
        document.addEventListener(
          eventType,
          (event) => {
            const target = event.target
            log({
              eventType,
              capture,
              target:
                target instanceof Element
                  ? `${target.tagName}.${target.className}`
                  : String(target),
              formatTarget:
                target instanceof Element
                  ? target.closest("[data-poster-format]")?.getAttribute("data-poster-format")
                  : null,
              ...state(),
            })
          },
          capture,
        )
    }
    document.addEventListener("DOMContentLoaded", () => {
      new MutationObserver((mutations) => {
        if (
          mutations.some(
            (mutation) =>
              mutation.target instanceof Element &&
              (mutation.target.matches(
                ".share-page-sheet,.share-page-poster,.share-page-poster-image,.share-page-status",
              ) ||
                mutation.target.closest(".share-page-status")),
          )
        )
          log({ eventType: "mutation", ...state() })
      }).observe(document.body, {
        subtree: true,
        attributes: true,
        childList: true,
        characterData: true,
        attributeFilter: ["hidden", "src", "data-poster-format"],
      })
    })
  })
})

async function ready(page, width) {
  try {
    await expect
      .poll(
        () => page.locator(".share-page-poster-image").evaluate((image) => image.naturalWidth),
        { timeout: POSTER_READY_TIMEOUT },
      )
      .toBe(width)
    await expect(page.locator(".share-page-poster")).toBeVisible()
    await page.evaluate((width) => {
      const readyAt = performance.now()
      const click = window.shareDiagnostics?.findLast(
        (event) => event.eventType === "click" && event.capture,
      )
      const canvas = window.shareCanvasStages?.findLast((entry) => entry.width === width)
      const cached = canvas?.toBlobCompleted < click?.at
      ;(window.shareReadiness ||= []).push({
        width,
        readyAt,
        clickAt: click?.at,
        callbackAt: canvas?.toBlobCompleted,
        encodingStartedAt: canvas?.toBlobCalled,
        cached,
        clickToReadyMs: click ? readyAt - click.at : null,
        clickToCallbackMs:
          click && canvas?.toBlobCompleted && !cached ? canvas.toBlobCompleted - click.at : null,
        nativeEncodingMs: canvas?.toBlobCompleted
          ? canvas.toBlobCompleted - canvas.toBlobCalled
          : null,
      })
    }, width)
  } catch (error) {
    const name = `${test.info().title.replace(/[^a-zA-Z0-9_-]+/g, "-")}-ready-${width}`
    const diagnostics = await page
      .evaluate(() => {
        const sheet = document.querySelector(".share-page-sheet")
        const image = document.querySelector(".share-page-poster-image")
        const download = document.querySelector(".share-page-poster-download")
        return {
          url: location.href,
          title: document.title,
          activeElement: document.activeElement?.outerHTML,
          sheetHidden: sheet?.hidden,
          posterHidden: document.querySelector(".share-page-poster")?.hidden,
          status: document.querySelector(".share-page-status")?.textContent,
          format: sheet?.dataset.posterFormat,
          image: {
            src: image?.getAttribute("src"),
            width: image?.naturalWidth,
            height: image?.naturalHeight,
            complete: image?.complete,
          },
          download: {
            href: download?.getAttribute("href"),
            name: download?.getAttribute("download"),
          },
          buttons: Array.from(document.querySelectorAll("[data-poster-format]"), (button) => ({
            format: button.dataset.posterFormat,
            pressed: button.getAttribute("aria-pressed"),
          })),
          exports: window.qa?.exports,
          pending: window.qa?.pending.length,
          shares: window.qa?.shares,
          events: window.shareDiagnostics,
          sheetHtml: sheet?.outerHTML,
          fontStatus: document.fonts.status,
          fontStages: window.shareFontStages,
          canvasStages: window.shareCanvasStages,
          readiness: window.shareReadiness,
        }
      })
      .catch((diagnosticError) => ({ captureError: String(diagnosticError) }))
    await writeFile(
      path.join(artifacts, name + ".json"),
      JSON.stringify(
        { expectedWidth: width, errors: observeErrors(page), ...diagnostics },
        null,
        2,
      ),
    )
    await page.screenshot({ path: path.join(artifacts, name + ".png") }).catch(() => {})
    throw error
  }
}

async function openLong(page) {
  await page.locator(".share-page-button").click()
  await ready(page, 1144)
  await page.getByRole("button", { name: "长文分享图", exact: true }).click()
  await ready(page, 720)
}

async function exportImage(page, name, width, expectedUrl) {
  const pending = page.waitForEvent("download")
  await page.getByRole("button", { name: "保存图片", exact: true }).click()
  const download = await pending
  const filename = path.join(artifacts, name + ".png")
  await download.saveAs(filename)
  const png = PNG.sync.read(await readFile(filename))
  expect(png.width).toBe(width)
  expect(png.height).toBeGreaterThan(0)
  expect(png.height).toBeLessThanOrEqual(8000)
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  expect(decoded?.data, "Exported PNG QR must decode to the complete canonical URL").toBe(
    expectedUrl,
  )
  const stages = await page.evaluate(() => ({
    fonts: window.shareFontStages,
    canvases: window.shareCanvasStages,
    readiness: window.shareReadiness,
  }))
  await writeFile(path.join(artifacts, name + "-generation.json"), JSON.stringify(stages, null, 2))
  return { width: png.width, height: png.height, filename, stages }
}

for (const width of [320, 390, 1280]) {
  test(`actual canvas PNG and responsive UI at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: 900 })
    const errors = observeErrors(page)
    const evidence = []
    for (const sample of Object.keys(samples)) {
      await page.goto(`${base}/${sample}.html`)
      await openLong(page)
      await expect(page.getByRole("button", { name: "长文分享图", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        page: document.documentElement.scrollWidth,
        panel: document.querySelector(".share-page-panel").getBoundingClientRect().width,
        image: document.querySelector(".share-page-poster-image").getBoundingClientRect().width,
      }))
      expect(dimensions.page).toBeLessThanOrEqual(width)
      expect(dimensions.panel).toBeLessThanOrEqual(width)
      expect(dimensions.image).toBeGreaterThan(width === 1280 ? 360 : width - 70)
      const drawn = await page.evaluate(() =>
        window.qa.exports
          .findLast((entry) => entry.width === 720)
          .lines.map((line) => line.text)
          .join(""),
      )
      expect(drawn).not.toContain("META-DESCRIPTION-NOT-ARTICLE")
      expect(drawn).not.toContain("不应冒充作者的网站名")
      if (sample === "short") expect(drawn).toContain("SHORT-END")
      if (sample === "near") expect(drawn).toContain("NEAR-END")
      if (sample === "structures") {
        expect(drawn).toContain("作者：晓灰")
        for (const text of ["1.", "2.", "引用段落内容", "const title", "STRUCTURE-END"])
          expect(drawn).toContain(text)
      } else expect(drawn).not.toContain("作者：")
      if (["long", "paragraph"].includes(sample)) {
        expect(drawn).toContain("正文未完，扫码继续阅读")
        expect(drawn).not.toContain(sample === "long" ? "LONG-FINAL-MARKER" : "PARAGRAPH-END")
      } else expect(drawn).not.toContain("正文未完")
      evidence.push({
        sample,
        dimensions,
        ...(await exportImage(page, `${sample}-${width}`, 720, canonical(sample))),
      })
      await page.locator(".share-page-close").focus()
      await page.screenshot({ path: path.join(artifacts, `${sample}-${width}-panel.png`) })
      for (let index = 0; index < 3; index++) {
        await page.getByRole("button", { name: "二维码短卡", exact: true }).click()
        await ready(page, 1144)
        if (index === 0 && sample === "short")
          await exportImage(page, `short-card-${width}`, 1144, canonical(sample))
        await page.getByRole("button", { name: "长文分享图", exact: true }).click()
        await ready(page, 720)
      }
      await page.getByRole("button", { name: "关闭分享面板" }).click()
      await expect(page.locator(".share-page-sheet")).toBeHidden()
      await page.locator(".share-page-button").click()
      await ready(page, 720)
      await page.getByRole("button", { name: "微信好友", exact: true }).click()
      await expect(page.locator(".share-page-status")).toContainText("已生成分享图")
    }
    expect(errors).toEqual([])
    await writeFile(
      path.join(artifacts, `evidence-${width}.json`),
      JSON.stringify(evidence, null, 2),
    )
  })
}

test("320/390 iframe viewport screenshots use full-width readable long previews", async ({
  page,
}) => {
  const errors = observeErrors(page)
  await page.setViewportSize({ width: 900, height: 950 })
  await page.goto(`${base}/frames.html`)
  for (const width of [320, 390]) {
    const frame = page.frameLocator(`#view${width}`)
    await frame.locator(".share-page-button").click()
    await frame.getByRole("button", { name: "长文分享图", exact: true }).click()
    await expect
      .poll(
        () => frame.locator(".share-page-poster-image").evaluate((image) => image.naturalWidth),
        { timeout: POSTER_READY_TIMEOUT },
      )
      .toBe(720)
    expect(await frame.locator("body").evaluate(() => innerWidth)).toBe(width)
    expect(
      await frame
        .locator(".share-page-panel")
        .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
    ).toBe(true)
  }
  await page.screenshot({ path: path.join(artifacts, "mobile-iframe-viewports.png") })
  expect(errors).toEqual([])
})

test("generation failure retries; delayed format switches and close/reopen ignore stale completions", async ({
  page,
}) => {
  const errors = observeErrors(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${base}/short.html?fault=fail`)
  await page.locator(".share-page-button").click()
  await expect(page.locator(".share-page-status")).toContainText("分享图生成失败")
  await exportImage(page, "error-retry", 1144, canonical("short"))
  await ready(page, 1144)
  expect(errors.every((error) => error.includes("Unable to render share image."))).toBe(true)
  errors.length = 0
  await page.goto(`${base}/long.html?fault=delay`)
  await page.locator(".share-page-button").click()
  await expect.poll(() => page.evaluate(() => window.qa.pending.length)).toBe(1)
  await page.getByRole("button", { name: "长文分享图", exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.qa.pending.length)).toBe(2)
  await page.evaluate(() =>
    window.qa.pending
      .splice(0)
      .reverse()
      .forEach((complete) => complete()),
  )
  await ready(page, 720)
  await expect.poll(() => page.evaluate(() => window.qa.exports.length)).toBe(2)
  await expect(page.locator(".share-page-poster-download")).toHaveAttribute(
    "download",
    "xiaohui-long-share.png",
  )
  await page.screenshot({ path: path.join(artifacts, "delayed-switch-panel.png") })
  await page.goto(`${base}/long.html?fault=delay`)
  await page.locator(".share-page-button").click()
  await expect.poll(() => page.evaluate(() => window.qa.pending.length)).toBe(1)
  await page.getByRole("button", { name: "关闭分享面板" }).click()
  await page.evaluate(() => window.qa.pending.splice(0).forEach((complete) => complete()))
  await expect.poll(() => page.evaluate(() => window.qa.exports.length)).toBe(1)
  await expect(page.locator(".share-page-sheet")).toBeHidden()
  await page.locator(".share-page-button").click()
  await ready(page, 1144)
  expect(errors).toEqual([])
})

for (const fault of ["cancel", "reject"]) {
  test(`file-share ${fault} keeps the image and avoids false success`, async ({ page }) => {
    const errors = observeErrors(page)
    await page.goto(`${base}/short.html?fault=${fault}`)
    await openLong(page)
    await page.getByRole("button", { name: "微信好友", exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.qa.shares.length)).toBe(1)
    expect(await page.evaluate(() => window.qa.shares[0][0].name)).toBe("xiaohui-long-share.png")
    await expect(page.locator(".share-page-status")).not.toContainText("已打开系统分享")
    if (fault === "reject")
      await expect(page.locator(".share-page-status")).toContainText("已生成分享图")
    await ready(page, 720)
    expect(errors).toEqual([])
  })
}

test("dark page keeps paper-colored export and keyboard dismissal returns focus", async ({
  page,
}) => {
  const errors = observeErrors(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${base}/structures.html?theme=dark`)
  await expect(page.locator("html")).toHaveAttribute("saved-theme", "dark")
  await page.locator(".share-page-button").click()
  await expect(page.getByRole("button", { name: "关闭分享面板" })).toBeFocused()
  await ready(page, 1144)
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "二维码短卡", exact: true })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "长文分享图", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await ready(page, 720)
  const exported = await exportImage(page, "dark-page-390", 720, canonical("structures"))
  const png = PNG.sync.read(await readFile(exported.filename))
  const expected = posterCanvas
    .replace("#", "")
    .match(/../g)
    .map((part) => Number.parseInt(part, 16))
  expect(Array.from(png.data.subarray(0, 3))).toEqual(expected)
  await page.getByRole("button", { name: "长文分享图", exact: true }).focus()
  await page.screenshot({ path: path.join(artifacts, "dark-page-390-panel.png") })
  await page.keyboard.press("Escape")
  await expect(page.locator(".share-page-sheet")).toBeHidden()
  await expect(page.locator(".share-page-button")).toBeFocused()
  await page.keyboard.press("Enter")
  await ready(page, 720)
  await expect(page.getByRole("button", { name: "关闭分享面板" })).toBeFocused()
  expect(errors).toEqual([])
})

test("built Quartz article exports and decodes its real canonical QR", async ({ page }) => {
  expect(
    process.env.SHARE_QA_SITE_DIRECTORY,
    "Set SHARE_QA_SITE_DIRECTORY to the fresh docs build; this integration smoke must not be silently skipped",
  ).toBeTruthy()
  const errors = observeErrors(page)
  const blockedRemoteRequests = []
  await page.route("**/*", async (route) => {
    const request = route.request()
    if (new URL(request.url()).origin === new URL(base).origin) return route.continue()
    // Use the production Mermaid SDK bytes for real articles with diagrams;
    // an empty JavaScript stub would cause an unrelated initialize error.
    if (request.url().startsWith("https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/")) {
      const response = await fetch(request.url(), { signal: AbortSignal.timeout(30_000) })
      return route.fulfill({
        status: response.status,
        contentType: response.headers.get("content-type") || "application/javascript",
        body: Buffer.from(await response.arrayBuffer()),
      })
    }
    blockedRemoteRequests.push(request.url())
    // Empty, typed local responses prevent analytics/network access without manufacturing
    // unrelated ERR_BLOCKED_BY_CLIENT or stylesheet MIME errors in the acceptance result.
    const image = request.resourceType() === "image"
    await route.fulfill({
      status: 200,
      contentType: image
        ? "image/svg+xml"
        : request.resourceType() === "stylesheet"
          ? "text/css"
          : "application/javascript",
      body: image ? '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' : "",
    })
  })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${base}/built/${process.env.SHARE_QA_ARTICLE_PATH || "index.html"}`)
  await expect(page.locator(".article-title")).toContainText(
    process.env.SHARE_QA_ARTICLE_TITLE || "Welcome to Quartz",
  )
  const canonicalUrl = new URL(await page.locator('link[rel="canonical"]').getAttribute("href"))
    .href
  await openLong(page)
  await exportImage(page, "built-quartz-docs-390", 720, canonicalUrl)
  await page.getByRole("button", { name: "关闭分享面板" }).focus()
  await page.screenshot({ path: path.join(artifacts, "built-quartz-docs-390-panel.png") })
  await page.keyboard.press("Escape")
  await expect(page.locator(".share-page-sheet")).toBeHidden()
  await expect(page.locator(".share-page-button")).toBeFocused()
  await writeFile(
    path.join(artifacts, "built-quartz-docs-network.json"),
    JSON.stringify({ canonicalUrl, blockedRemoteRequests }, null, 2),
  )
  expect(errors).toEqual([])
})

test("direct renderer exports original text with and without a color emoji", async ({ page }) => {
  const errors = observeErrors(page)
  for (const sample of ["shortNoEmoji", "short"]) {
    await page.goto(`${base}/${sample}.html`)
    await page.addScriptTag({ url: `${base}/renderer.js` })
    let result
    try {
      result = await page.evaluate(async () => {
        const blob = await window.SharePosterQA.generateLongSharePoster({
          title: document.querySelector(".article-title").textContent,
          url: document.querySelector('link[rel="canonical"]').href,
          article: document.querySelector("article"),
        })
        return {
          bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
          exports: window.qa.exports,
        }
      })
    } catch (error) {
      await writeFile(
        path.join(artifacts, `direct-${sample}-error.json`),
        JSON.stringify(
          {
            error: String(error),
            errors,
            diagnostics: await page.evaluate(() => ({
              exports: window.qa.exports,
              events: window.shareDiagnostics,
              fonts: window.shareFontStages,
              canvases: window.shareCanvasStages,
            })),
          },
          null,
          2,
        ),
      )
      throw error
    }
    const bytes = Buffer.from(result.bytes)
    await writeFile(path.join(artifacts, `direct-${sample}.png`), bytes)
    await writeFile(
      path.join(artifacts, `direct-${sample}-generation.json`),
      JSON.stringify(
        await page.evaluate(() => ({
          fonts: window.shareFontStages,
          canvases: window.shareCanvasStages,
        })),
        null,
        2,
      ),
    )
    const png = PNG.sync.read(bytes)
    expect(png.width).toBe(720)
    expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(
      canonical(sample),
    )
    expect(
      result.exports
        .findLast((entry) => entry.width === 720)
        .lines.map((line) => line.text)
        .join(""),
    ).toContain("SHORT-END")
  }
  expect(errors).toEqual([])
})
