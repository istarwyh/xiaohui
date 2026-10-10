import { test, expect } from "@playwright/test"
import { build } from "esbuild"
import * as sass from "sass"
import { PNG } from "pngjs"
import jsQR from "jsqr"
import katex from "katex"
import { createServer } from "node:http"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repo = fileURLToPath(new URL("../../", import.meta.url))
let artifacts
let directory
let server
let imageServer
let imageBase
let base
let posterCanvas
const errorBuffers = new WeakMap()
// Chromium PNG toBlob may use 1s idle-start + 5.7s encoding watchdogs, in
// addition to bounded image/font loading. The 40s UI limit includes the renderer's
// 30s operation deadline plus native encoding and preview scheduling.
// https://chromium.googlesource.com/chromium/src/+/lkgr/third_party/blink/renderer/core/html/canvas/canvas_async_blob_creator.cc
const POSTER_READY_TIMEOUT = 40_000

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

// Test-only instrumentation snapshots the prepared DOM at native PNG encoding and
// intercepts explicit failure fixtures. It never replaces the renderer or layout.
// Canvas fillText records remain short-card telemetry; long-body assertions use DOM + pixels.
const instrumentation = `
const params = new URLSearchParams(location.search);
const fault = params.get('fault');
if (params.get('theme') === 'dark') {
  const applyTheme=()=>document.documentElement?.setAttribute('saved-theme','dark');
  applyTheme();document.addEventListener('DOMContentLoaded',applyTheme,{once:true});
}
window.qa = { exports: [], shares: [], pending: [], draws: new WeakMap(), snapshots: [] };
window.qa.snapshot = () => {
  const root = document.querySelector('.share-poster');
  if (!root) return null;
  const rect = root.getBoundingClientRect();
  const article = root.querySelector('.share-poster-article');
  const nodes = Array.from(root.querySelectorAll('h1,h2,h3,h4,p,strong,em,a,ol,ul,li,blockquote,pre,code,table,thead,tbody,tr,th,td,img,svg,.katex,.katex-html,.katex-mathml,.share-poster-footer,.share-poster-body,.share-poster-fade')).map(node => {
    const r = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {tag:node.tagName.toLowerCase(), class:node.className?.baseVal ?? node.className, text:node.textContent, html:node.outerHTML,
      x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height,
      naturalWidth:node.naturalWidth,naturalHeight:node.naturalHeight,
      style:{color:style.color,background:style.backgroundColor,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,fontFamily:style.fontFamily,display:style.display,whiteSpace:style.whiteSpace,overflow:style.overflow,listStyleType:style.listStyleType,borderLeftWidth:style.borderLeftWidth}};
  });
  const snapshot = {text:root.textContent,body:article?.textContent,html:article?.innerHTML,rootHtml:root.outerHTML,truncated:root.dataset.truncated,width:rect.width,height:rect.height,nodes};
  window.qa.snapshots.push(snapshot);
  return snapshot;
};
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
  const dom = window.qa.snapshot();
  const run = () => originalToBlob.call(canvas, blob => {
    window.qa.exports.push({width:canvas.width,height:canvas.height,size:blob?.size,dom,lines:window.qa.draws.get(canvas)||[]});
    callback(blob);
  }, ...args);
  if ((fault === 'fail' || (fault === 'fail-long' && canvas.width === 720)) && !failed) { failed=true; callback(null); return; }
  if (fault === 'delay' || (fault === 'delay-long' && canvas.width === 720)) { window.qa.pending.push(run); return; }
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
window.qa.createdUrls=[];window.qa.revokedUrls=[];
const createObjectURL=URL.createObjectURL.bind(URL);
const revokeObjectURL=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=createObjectURL(blob);window.qa.createdUrls.push(url);return url};
URL.revokeObjectURL=url=>{window.qa.revokedUrls.push(url);return revokeObjectURL(url)};
window.addCleanup = fn => (window.cleanups ||= []).push(fn);
`

function fixture(sample, body, css) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><title>长文分享测试：${sample}</title><meta name="author" content="不应冒充作者的网站名"><meta name="description" content="META-DESCRIPTION-NOT-ARTICLE"><link rel="canonical" href="${canonical(sample)}"><style>${css}</style></head><body><h1 class="article-title">长文分享测试：${sample}</h1><article${sample === "structures" ? ' data-share-author="晓灰"' : ""}>${body}</article><textarea hidden id="copy-page-markdown-source">${escape(body.replace(/<[^>]+>/g, "\n"))}</textarea><script>${instrumentation}</script><script src="/share.js"></script><script>document.dispatchEvent(new CustomEvent('nav'));</script></body></html>`
}

test.beforeAll(async ({}, info) => {
  artifacts = path.join(
    repo,
    "test-results",
    process.env.SHARE_QA_RUN || "fixtures",
    "share-posters",
    info.project.name,
  )
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
  const articleCss = sass.compile(path.join(repo, "quartz/styles/base.scss")).css
  const componentCss = sass.compile(path.join(repo, "quartz/components/styles/copyPage.scss")).css
  const css = `:root{${tokens};--bodyFont:var(--font-body);--headerFont:var(--font-heading);--codeFont:var(--font-code)}:root[saved-theme="dark"]{${darkTokens}}body{margin:0;padding:16px;box-sizing:border-box;color:var(--color-text);background:var(--color-canvas);font-family:var(--font-body);font-size:16px}article{max-width:700px;overflow-wrap:anywhere}h1{font-size:28px}pre{white-space:pre-wrap}button,a{-webkit-tap-highlight-color:transparent}${articleCss}${componentCss}`
  const fixtureSamples = { ...samples, shortNoEmoji: samples.short.replace("👩🏽‍💻", "开发者") }
  const image = new PNG({ width: 96, height: 64 })
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 96; x++) {
      const offset = (y * 96 + x) * 4
      const color = x < 48 ? [220, 25, 160, 255] : [15, 180, 215, 255]
      color.forEach((v, i) => (image.data[offset + i] = v))
    }
  const tallImage = new PNG({ width: 320, height: 2400 })
  for (let y = 0; y < 2400; y++)
    for (let x = 0; x < 320; x++) {
      const color = y < 1200 ? [220, 25, 160, 255] : [15, 180, 215, 255]
      color.forEach((value, index) => (tallImage.data[(y * 320 + x) * 4 + index] = value))
    }
  await writeFile(path.join(directory, "tall-image.png"), PNG.sync.write(tallImage))
  const imageBytes = PNG.sync.write(image)
  await writeFile(path.join(directory, "actual-image.png"), imageBytes)
  const realImage = await readFile(path.join(repo, "tests/browser/fixtures/vector-euclidean.png"))
  expect(realImage.length).toBe(13962)
  expect(createHash("sha256").update(realImage).digest("hex")).toBe(
    "092cc26b171edad61bd0ba5fe131cba98f04dea36e3a2b93efb7dbc2345677f4",
  )
  await writeFile(path.join(directory, "vector-euclidean.png"), realImage)
  imageServer = createServer((req, res) => {
    if (req.url.startsWith("/cors")) res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Content-Type", "image/png")
    res.end(imageBytes)
  })
  await new Promise((resolve) => imageServer.listen(0, "127.0.0.1", resolve))
  imageBase = `http://127.0.0.1:${imageServer.address().port}`
  for (const [sample, body] of Object.entries(fixtureSamples)) {
    await writeFile(path.join(directory, sample + ".html"), fixture(sample, body, css))
  }
  await writeFile(
    path.join(directory, "frames.html"),
    '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>320 and 390 pixel viewports</title><style>body{margin:0;display:flex;gap:16px;background:#ddd}iframe{border:0;height:900px;flex:none}</style><iframe id="view320" title="320 pixel viewport" width="320" src="/structures.html"></iframe><iframe id="view390" title="390 pixel viewport" width="390" src="/structures.html"></iframe>',
  )
  server = createServer(async (req, res) => {
    const requested = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
    if (requested.startsWith("/katex/")) {
      const filename = path.resolve(repo, "node_modules/katex/dist", requested.slice(7))
      const allowed = path.resolve(repo, "node_modules/katex/dist") + path.sep
      if (!filename.startsWith(allowed)) {
        res.writeHead(404)
        res.end()
        return
      }
      try {
        const bytes = await readFile(filename)
        res.setHeader("Content-Type", filename.endsWith(".css") ? "text/css" : "font/woff2")
        res.end(bytes)
      } catch {
        res.writeHead(404)
        res.end()
      }
      return
    }
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
  if (imageServer) await new Promise((resolve) => imageServer.close(resolve))
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
  const prepared = await page.evaluate(
    () => window.qa?.exports.findLast((entry) => entry.width === 720)?.dom,
  )
  if (width === 720) {
    expect(prepared, "DOM snapshot exists at native PNG encoding").toBeTruthy()
    const body = prepared.nodes.find((node) => node.class?.includes("share-poster-body"))
    expect(
      pixelInk(png, body),
      "PNG contains actual body pixels, not just the QR/footer",
    ).toBeGreaterThan(0.015)
    expect(prepared.text).not.toContain(expectedUrl)
    const footer = prepared.nodes.find((node) => node.class?.includes("share-poster-footer"))
    const qr = prepared.nodes.find((node) => node.class?.includes("share-poster-qr"))
    expect(footer.height).toBeLessThanOrEqual(170)
    expect(qr.x).toBeLessThan(prepared.width / 2)
    expect(qr.y).toBeGreaterThanOrEqual(footer.y)
    for (const node of prepared.nodes.filter((node) =>
      ["pre", "table", "img", "svg"].includes(node.tag),
    )) {
      expect(node.width, `Readable positive width: ${node.tag}`).toBeGreaterThan(0)
      expect(node.x + node.width, `No horizontal overflow: ${node.tag}`).toBeLessThanOrEqual(
        prepared.width + 1,
      )
    }
    const fade = prepared.nodes.find((node) => node.class?.includes("share-poster-fade"))
    if (fade) expect(fade.y + fade.height).toBeLessThanOrEqual(footer.y + 1)
    await writeFile(
      path.join(artifacts, name + "-prepared-dom.json"),
      JSON.stringify(prepared, null, 2),
    )
  }
  const stages = await page.evaluate(() => ({
    fonts: window.shareFontStages,
    canvases: window.shareCanvasStages,
    readiness: window.shareReadiness,
  }))
  await writeFile(path.join(artifacts, name + "-generation.json"), JSON.stringify(stages, null, 2))
  return { width: png.width, height: png.height, filename, stages }
}

function pixelInk(png, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return 0
  let ink = 0,
    total = 0
  const background = Array.from(png.data.subarray(0, 3))
  const scale = png.width / 360
  for (
    let y = Math.max(0, Math.floor(rect.y * scale));
    y < Math.min(png.height, Math.ceil((rect.y + rect.height) * scale));
    y += 2
  ) {
    for (
      let x = Math.max(0, Math.floor(rect.x * scale));
      x < Math.min(png.width, Math.ceil((rect.x + rect.width) * scale));
      x += 2
    ) {
      const offset = (y * png.width + x) * 4
      total++
      if (background.some((value, i) => Math.abs(png.data[offset + i] - value) > 28)) ink++
    }
  }
  return ink / Math.max(total, 1)
}

async function saveDirectImage(result, name, expectedUrl) {
  const bytes = Buffer.from(result.bytes)
  const png = PNG.sync.read(bytes)
  await writeFile(path.join(artifacts, name + ".png"), bytes)
  await writeFile(
    path.join(artifacts, name + "-prepared-dom.json"),
    JSON.stringify(result.prepared, null, 2),
  )
  expect(png.width).toBe(720)
  expect(png.height).toBeGreaterThan(200)
  expect(png.height).toBeLessThanOrEqual(8000)
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(expectedUrl)
  const body = result.prepared.nodes.find((node) => node.class?.includes("share-poster-body"))
  expect(pixelInk(png, body)).toBeGreaterThan(0.015)
  return { png, bytes }
}

async function renderMarkup(page, html, options = {}) {
  return page.evaluate(
    async ({ html, options }) => {
      const article = options.detached
        ? document.createElement("article")
        : document.querySelector("article")
      article.innerHTML = html
      try {
        const blob = await window.SharePosterQA.generateLongSharePoster({
          title: "结构保真与资源验证",
          url: document.querySelector('link[rel="canonical"]').href,
          article,
        })
        return {
          bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
          prepared: window.qa.exports.findLast((entry) => entry.width === 720)?.dom,
        }
      } catch (error) {
        return {
          error: { name: error.name, message: error.message },
          hosts: document.querySelectorAll(".share-poster-host").length,
        }
      }
    },
    { html, options },
  )
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
      const prepared = await page.evaluate(
        () => window.qa.exports.findLast((entry) => entry.width === 720)?.dom,
      )
      expect(
        prepared,
        "The real DOM capture must remain inspectable while its PNG is encoding",
      ).toBeTruthy()
      const drawn = prepared.text
      expect(drawn).not.toContain("META-DESCRIPTION-NOT-ARTICLE")
      expect(drawn).not.toContain("不应冒充作者的网站名")
      if (sample === "short") expect(drawn).toContain("SHORT-END")
      if (sample === "near") expect(drawn).toContain("NEAR-END")
      if (sample === "structures") {
        expect(drawn).toContain("作者：晓灰")
        expect(prepared.nodes.filter((node) => node.tag === "li")).toHaveLength(2)
        expect(prepared.nodes.find((node) => node.tag === "ol").style.listStyleType).toBe("decimal")
        expect(prepared.nodes.find((node) => node.tag === "pre").style.whiteSpace).toBe("pre-wrap")
        for (const text of ["引用段落内容", "const title", "STRUCTURE-END"])
          expect(drawn).toContain(text)
      } else expect(drawn).not.toContain("作者：")
      if (["long", "paragraph"].includes(sample)) {
        expect(drawn).toContain("正文未完，继续阅读")
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

const builtArticles =
  process.env.SHARE_QA_REAL_ARTICLES === "1"
    ? [
        { slug: "program/学习-思考-冷静/DDD.html", title: "DDD", key: "ddd" },
        { slug: "program/llm/vector-database.html", title: "vector-database", key: "vector" },
      ]
    : [
        {
          slug: process.env.SHARE_QA_ARTICLE_PATH || "index.html",
          title: process.env.SHARE_QA_ARTICLE_TITLE || "Welcome to Quartz",
          key: "docs",
        },
      ]

async function loadBuilt(page, article) {
  expect(
    process.env.SHARE_QA_SITE_DIRECTORY,
    "A fresh Quartz build is required; never silently skip real integration",
  ).toBeTruthy()
  await page.addInitScript(instrumentation)
  const remoteRequests = []
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(base).origin) remoteRequests.push(url.href)
    if (url.hostname === "plausible.io")
      return route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
    // The browser loads all other production resources itself. In particular,
    // images are never fetched through Node or fulfilled to manufacture CORS.
    return route.continue()
  })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${base}/built/${article.slug}`, { waitUntil: "domcontentloaded" })
  await expect(page.locator(".article-title")).toContainText(article.title)
  return {
    remoteRequests,
    canonicalUrl: new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href,
  }
}

for (const article of builtArticles) {
  test(`built Quartz article ${article.key} exports its actual opening and canonical QR`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { remoteRequests, canonicalUrl } = await loadBuilt(page, article)
    await openLong(page)
    const prepared = await page.evaluate(
      () => window.qa.exports.findLast((entry) => entry.width === 720)?.dom,
    )
    expect(prepared?.body.length).toBeGreaterThan(100)
    expect(prepared.body).not.toContain("META-DESCRIPTION-NOT-ARTICLE")
    if (article.key === "ddd") {
      expect(prepared.html).toContain("<strong")
      expect(prepared.html).toContain("<blockquote")
      expect(prepared.body).toContain("通用语言")
    }
    if (article.key === "vector") {
      expect(prepared.html).toContain("<pre")
      expect(prepared.html).toContain("<code")
      expect(prepared.body).toContain("from vectordb import Memory")
    }
    await exportImage(page, `built-${article.key}-390`, 720, canonicalUrl)
    await page.getByRole("button", { name: "关闭分享面板" }).focus()
    await page.screenshot({ path: path.join(artifacts, `built-${article.key}-390-panel.png`) })
    await page.keyboard.press("Escape")
    await expect(page.locator(".share-page-sheet")).toBeHidden()
    await expect(page.locator(".share-page-button")).toBeFocused()
    await writeFile(
      path.join(artifacts, `built-${article.key}-network.json`),
      JSON.stringify({ canonicalUrl, remoteRequests, errors: observeErrors(page) }, null, 2),
    )
    // Remote resources outside the selected excerpt may fail independently.
    // Export readiness, actual excerpt pixels, and QR remain strict assertions.
    expect(
      observeErrors(page).filter((error) => !error.startsWith("Failed to load resource:")),
    ).toEqual([])
  })
}

if (process.env.SHARE_QA_REAL_ARTICLES === "1") {
  for (const section of ["euclidean", "jaccard"]) {
    test(`built Quartz article vector real ${section} section excerpt retains rich layout`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      const { canonicalUrl } = await loadBuilt(
        page,
        builtArticles.find((article) => article.key === "vector"),
      )
      await page.addScriptTag({ url: `${base}/renderer.js` })
      // A local copy of the installed KaTeX stylesheet/fonts makes formula
      // rendering deterministic; formulas themselves come from the fresh build.
      await page.addStyleTag({ url: `${base}/katex/katex.min.css` })
      const result = await page.evaluate(
        async ({ section, canonicalUrl, base }) => {
          const source = document.querySelector("article")
          const heading = Array.from(source.querySelectorAll("h4")).find((node) =>
            node.textContent.includes(section === "euclidean" ? "欧几里得距离" : "Jaccard系数"),
          )
          if (!heading) throw new Error("Required real article section not found")
          const excerpt = document.createElement("article")
          excerpt.className = source.className
          let include = section === "euclidean"
          for (let node = heading; node; node = node.nextElementSibling) {
            if (node !== heading && /^H[1-4]$/.test(node.tagName)) break
            // The Jaccard section exceeds the share budget. This explicitly
            // labeled excerpt begins at its real Dice/F1 comparison paragraph,
            // preserving the article's original order through the complete table.
            if (section === "jaccard" && node.textContent.startsWith("可以看出")) include = true
            if (node === heading || include) excerpt.append(node.cloneNode(true))
          }
          // Preserve the exact published diagram pixels while making this fixture
          // same-origin; this is explicitly separate from real CORS tests below.
          for (const image of excerpt.querySelectorAll("img")) {
            if (image.src.endsWith("/202311220110685.png")) {
              image.removeAttribute("srcset")
              image.src = base + "/vector-euclidean.png"
            }
          }
          document.body.append(excerpt)
          const sourceHtml = excerpt.innerHTML
          try {
            const blob = await window.SharePosterQA.generateLongSharePoster({
              title: "vector-database · 真实章节节选",
              url: canonicalUrl,
              article: excerpt,
            })
            return {
              bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
              prepared: window.qa.exports.findLast((entry) => entry.width === 720)?.dom,
              sourceHtml,
            }
          } finally {
            excerpt.remove()
          }
        },
        { section, canonicalUrl, base },
      )
      const image = await saveDirectImage(result, `built-vector-${section}-excerpt`, canonicalUrl)
      expect(result.prepared.html).toContain('class="katex')
      expect(result.prepared.html).toContain("mfrac")
      const formula = result.prepared.nodes.find((node) => node.class === "katex")
      expect(
        pixelInk(image.png, formula),
        "Formula has visible mathematical glyphs in the PNG",
      ).toBeGreaterThan(0.02)
      expect(
        result.prepared.nodes.some(
          (node) => node.class?.includes("katex") && node.width > 0 && node.height > 0,
        ),
      ).toBe(true)
      if (section === "euclidean") {
        const diagram = result.prepared.nodes.find(
          (node) => node.tag === "img" && !node.class.includes("share-poster-qr"),
        )
        expect(diagram?.naturalWidth).toBeGreaterThan(1)
        // This published line diagram has only 2.2% dark source pixels.
        expect(pixelInk(image.png, diagram)).toBeGreaterThan(0.01)
      } else {
        expect(result.prepared.html).toContain("<table")
        expect(
          result.prepared.nodes.filter((node) => node.tag === "tr").length,
        ).toBeGreaterThanOrEqual(4)
      }
      await writeFile(
        path.join(artifacts, `built-vector-${section}-excerpt-source.html`),
        result.sourceHtml,
      )
    })
  }
}

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
    expect(result.exports.findLast((entry) => entry.width === 720)?.dom.body).toContain("SHORT-END")
  }
  expect(errors).toEqual([])
})

test("nested inline semantics, safe SVG, images and grapheme truncation survive DOM rasterization", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  const markup = `<h2>保留原始结构</h2><p><strong>粗体 <em>嵌套斜体</em></strong> <a href="https://xiaohui.cool/">原文链接</a> <code>inlineCode()</code> 👩🏽‍💻 é</p><ol start="3"><li>第三项<ul><li>嵌套列表</li></ul></li><li value="8">第八项</li></ol><blockquote><p>真实引用结构</p></blockquote><pre><code data-theme="github-light github-dark"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583">const</span> answer = 42;</code></pre><table><thead><tr><th>方法</th><th>特点</th></tr></thead><tbody><tr><td>DOM</td><td>结构保真</td></tr></tbody></table><p><img src="/actual-image.png" alt="两色测试图片" width="96" height="64"></p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40"><rect width="100" height="40" fill="#168F64"/></svg>`
  const result = await renderMarkup(page, markup)
  expect(result.error).toBeUndefined()
  const { png } = await saveDirectImage(result, "rich-structure", canonical("short"))
  const dom = result.prepared
  for (const tag of ["strong", "em", "a", "ol", "ul", "blockquote", "pre", "code", "table", "svg"])
    expect(
      dom.nodes.some((node) => node.tag === tag && node.width > 0 && node.height > 0),
      tag,
    ).toBe(true)
  expect(
    Number(dom.nodes.find((node) => node.tag === "strong").style.fontWeight),
  ).toBeGreaterThanOrEqual(600)
  expect(dom.nodes.find((node) => node.tag === "em").style.fontStyle).toBe("italic")
  expect(dom.html).toContain('start="3"')
  expect(dom.html).toContain('value="8"')
  expect(dom.html).toContain("👩🏽‍💻")
  expect(dom.html).toContain("é")
  const image = dom.nodes.find(
    (node) => node.tag === "img" && !node.class.includes("share-poster-qr"),
  )
  expect(image.naturalWidth).toBe(96)
  expect(image.width / image.height).toBeCloseTo(1.5, 1)
  const sample = (xFraction) => {
    const x = Math.round((image.x + image.width * xFraction) * 2)
    const y = Math.round((image.y + image.height * 0.5) * 2)
    return Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3))
  }
  expect(sample(0.25)).toEqual([220, 25, 160])
  expect(sample(0.75)).toEqual([15, 180, 215])
  const long = await renderMarkup(page, `<p>${"👩🏽‍💻é".repeat(650)}</p><p>HIDDEN-END</p>`)
  expect(long.error).toBeUndefined()
  expect(long.prepared.truncated).toBe("true")
  expect(long.prepared.body).not.toContain("HIDDEN-END")
  const text = long.prepared.body.replace(/[…\s]/g, "")
  expect(text.replace(/(?:👩🏽‍💻|é)/gu, "")).toBe("")
  await saveDirectImage(long, "grapheme-boundary", canonical("short"))
})

test("sanitization removes active content and controls without flattening safe content", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  const result = await renderMarkup(
    page,
    `<p id="unsafe-id" onclick="window.exploited=true">安全<strong>强调</strong><a href="javascript:window.exploited=true">链接</a></p><script>window.exploited=true</script><iframe srcdoc="unsafe"></iframe><button>CONTROL-SECRET</button><p hidden>HIDDEN-SECRET</p><p data-share-exclude>EXCLUDED-SECRET</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><script>window.exploited=true</script><foreignObject><div>静态图形标签</div><iframe srcdoc="unsafe">ACTIVE-SECRET</iframe></foreignObject><rect width="20" height="20" fill="#168F64" onload="window.exploited=true"/></svg>`,
    { detached: true },
  )
  expect(result.error).toBeUndefined()
  expect(await page.evaluate(() => window.exploited)).toBeUndefined()
  expect(result.prepared.html).not.toMatch(
    /<script|<iframe|<button|onclick=|onload=|javascript:|CONTROL-SECRET|HIDDEN-SECRET|EXCLUDED-SECRET|ACTIVE-SECRET/i,
  )
  expect(result.prepared.html).toContain("<strong")
  expect(result.prepared.html).toContain("<rect")
  expect(result.prepared.body).toContain("静态图形标签")
  await saveDirectImage(result, "sanitized-structure", canonical("short"))
})

test("actual browser CORS fetch succeeds only with permission and failure is retryable", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  // Separate loopback port is a genuinely different origin. No route.fulfill,
  // request-context fetch, or Node proxy is allowed on these image requests.
  const allowed = await renderMarkup(
    page,
    `<p>跨域图片</p><img src="${imageBase}/cors.png" width="96" height="64">`,
  )
  expect(allowed.error).toBeUndefined()
  await saveDirectImage(allowed, "cors-image-allowed", canonical("short"))
  const denied = await renderMarkup(
    page,
    `<p>缺少跨域许可</p><img src="${imageBase}/denied.png" width="96" height="64">`,
  )
  expect(denied.error?.name).toBe("SharePosterError")
  expect(denied.error?.message).toMatch(/图片|资源|跨域/)
  expect(denied.hosts).toBe(0)
  const retry = await renderMarkup(
    page,
    `<p>修复后重试</p><img src="${imageBase}/cors-retry.png" width="96" height="64">`,
  )
  expect(retry.error).toBeUndefined()
  await saveDirectImage(retry, "cors-image-retry", canonical("short"))
  await writeFile(path.join(artifacts, "cors-failure.json"), JSON.stringify(denied, null, 2))
})

test("a required web font failure reports an error and leaves generation retryable", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  const style = await page.addStyleTag({
    content: `@font-face{font-family:"Noto Sans SC";src:url("${base}/missing-required-font.woff2") format("woff2");font-weight:100 900;}`,
  })
  const result = await renderMarkup(page, "<p>必须使用的字体加载失败不能生成缺字图片。</p>")
  expect(result.error?.name).toBe("SharePosterError")
  expect(result.error?.message).toMatch(/字体|资源/)
  expect(result.hosts).toBe(0)
  await style.evaluate((node) => node.remove())
  const retry = await renderMarkup(page, "<p>允许使用系统后备字体的页面可以重新生成。</p>")
  expect(retry.error).toBeUndefined()
  await saveDirectImage(retry, "font-failure-retry", canonical("short"))
  await writeFile(path.join(artifacts, "font-failure.json"), JSON.stringify(result, null, 2))
})

test("long-image encoder failure is visible and saving retries with a real PNG", async ({
  page,
}) => {
  await page.goto(`${base}/short.html?fault=fail-long`)
  await page.locator(".share-page-button").click()
  await ready(page, 1144)
  await page.getByRole("button", { name: "长文分享图", exact: true }).click()
  await expect(page.locator(".share-page-status")).toContainText("失败")
  await expect(page.locator(".share-page-poster")).toBeHidden()
  await exportImage(page, "long-error-retry", 720, canonical("short"))
  await ready(page, 720)
  await expect(page.locator(".share-poster-host")).toHaveCount(0)
})

test("SPA cleanup releases late exports and cancels a pending download", async ({ page }) => {
  const downloads = []
  page.on("download", (download) => downloads.push(download.suggestedFilename()))
  await page.goto(`${base}/short.html?fault=delay-long`)
  await page.locator(".share-page-button").click()
  await ready(page, 1144)
  await page.getByRole("button", { name: "长文分享图", exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.qa.pending.length)).toBe(1)
  await page.getByRole("button", { name: "保存图片", exact: true }).click()
  await page.evaluate(() => {
    window.cleanups.splice(0).forEach((fn) => fn())
    document.querySelector(".copy-page-control")?.remove()
    document.querySelector(".article-title").textContent = "下一篇文章"
    document.querySelector("article").innerHTML = "<p>SPA 新页面</p>"
    document.dispatchEvent(new CustomEvent("nav"))
    window.qa.pending.splice(0).forEach((fn) => fn())
  })
  await expect
    .poll(() =>
      page.evaluate(() => window.qa.exports.filter((entry) => entry.width === 720).length),
    )
    .toBe(1)
  await expect(page.locator(".share-page-sheet")).toBeHidden()
  await expect(page.locator(".share-poster-host")).toHaveCount(0)
  const urls = await page.evaluate(() => ({
    created: window.qa.createdUrls,
    revoked: window.qa.revokedUrls,
  }))
  expect(urls.created.every((url) => urls.revoked.includes(url))).toBe(true)
  expect(downloads).toEqual([])
  await page.locator(".share-page-button").click()
  await ready(page, 1144)
  await expect(page.locator(".share-page-preview-title")).toContainText("下一篇文章")
})

test("display math retains fraction, radical and superscript geometry in actual PNG pixels", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  await page.addStyleTag({ url: `${base}/katex/katex.min.css` })
  const formula = katex.renderToString(
    String.raw`\frac{\sqrt{a_1^2+a_2^2+a_3^2}}{1+\frac{b_i}{c^{2}}}=\sum_{i=1}^{n}\frac{x_i^2}{y_i}`,
    { displayMode: true, output: "html" },
  )
  const result = await renderMarkup(
    page,
    `<h2>分式、根号与上下标</h2>${formula}<p>公式保持独立而清晰。</p>`,
  )
  expect(result.error).toBeUndefined()
  const { png } = await saveDirectImage(result, "display-math-geometry", canonical("short"))
  expect(result.prepared.html).toContain("mfrac")
  expect(result.prepared.html).toContain("sqrt")
  expect(result.prepared.html).toContain("msupsub")
  const box = result.prepared.nodes.find((node) => node.class === "katex")
  expect(box.height).toBeGreaterThan(30)
  expect(box.x).toBeGreaterThanOrEqual(23)
  expect(box.x + box.width).toBeLessThanOrEqual(337)
  expect(pixelInk(png, box)).toBeGreaterThan(0.02)
})

test("height protection preserves a complete tall image and avoids orphan section titles", async ({
  page,
}) => {
  await page.goto(`${base}/short.html`)
  await page.addScriptTag({ url: `${base}/renderer.js` })
  const result = await renderMarkup(
    page,
    `<h2>完整高图</h2><img src="/tall-image.png" alt="上下两色完整图片"><h2>后续代码</h2><pre><code>${"x\n".repeat(180)}</code></pre><h2>ORPHAN-SECTION</h2><p>最后的说明。</p>`,
  )
  expect(result.error).toBeUndefined()
  const { png } = await saveDirectImage(result, "height-protection", canonical("short"))
  expect(result.prepared.truncated).toBe("true")
  const body = result.prepared.nodes.find((node) => node.class?.includes("share-poster-body"))
  const image = result.prepared.nodes.find(
    (node) => node.tag === "img" && !node.class.includes("share-poster-qr"),
  )
  expect(image.naturalHeight).toBe(2400)
  expect(image.width / image.height).toBeCloseTo(320 / 2400, 2)
  expect(image.y + image.height).toBeLessThanOrEqual(body.y + body.height + 1)
  const last = result.prepared.html.trim()
  expect(last).not.toMatch(/<h[1-6][^>]*>[^<]*<\/h[1-6]>$/)
  expect(result.prepared.body).not.toContain("ORPHAN-SECTION")
  const x = Math.round((image.x + image.width / 2) * 2)
  const y = Math.round((image.y + image.height * 0.75) * 2)
  expect(
    Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)),
  ).toEqual([15, 180, 215])
})
