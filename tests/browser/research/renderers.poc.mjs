import { createServer } from "node:http"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
const root = path.resolve(process.env.SHARE_QA_SITE_DIRECTORY || ".quartz-cache/share-production")
const articlePath = process.env.SHARE_QA_ARTICLE_PATH || "program/学习-思考-冷静/DDD.html"
const output = path.resolve("test-results/renderer-research")
await mkdir(output, { recursive: true })
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
}
const server = createServer(async (req, res) => {
  try {
    const filename = path.resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    )
    if (!filename.startsWith(root + path.sep)) {
      res.writeHead(403).end()
      return
    }
    const data = await readFile(filename)
    res
      .writeHead(200, {
        "Content-Type": mime[path.extname(filename)] || "application/octet-stream",
      })
      .end(data)
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
let browser
const results = []
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] })
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await page.route("**/*", async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.hostname === "127.0.0.1") return route.continue()
    if (/clarity|userdesk|plausible|analytics|googletag/.test(url.hostname))
      return route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
    try {
      const r = await fetch(req.url(), { signal: AbortSignal.timeout(30000) })
      await route.fulfill({
        status: r.status,
        headers: Object.fromEntries(r.headers),
        body: Buffer.from(await r.arrayBuffer()),
      })
    } catch {
      await route.abort()
    }
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/${articlePath}`, {
    waitUntil: "domcontentloaded",
  })
  await page.locator("article").first().waitFor()
  const sources = [
    ["html-to-image", "1.11.13", "dist/html-to-image.js"],
    ["html2canvas", "1.4.1", "dist/html2canvas.min.js"],
  ]
  for (const [library, version, source] of sources) {
    const url = `https://unpkg.com/${library}@${version}/${source}`
    const js = await (await fetch(url, { signal: AbortSignal.timeout(30000) })).text()
    await page.addScriptTag({ content: js })
    for (const variant of ["full", "bounded"]) {
      const start = Date.now()
      try {
        const r = await page.evaluate(
          async ({ library, variant }) => {
            const source = document.querySelector("article")
            const clone = source.cloneNode(true)
            clone
              .querySelectorAll(
                "button, nav, aside, .clipboard-button, .anchor, [data-share-exclude]",
              )
              .forEach((e) => e.remove())
            if (variant === "bounded") {
              let chars = 0
              for (const node of [...clone.children]) {
                if (chars >= 800) node.remove()
                else chars += (node.textContent || "").length
              }
            }
            clone.style.cssText +=
              ";width:360px;max-width:360px;box-sizing:border-box;background:white;color:#111;padding:24px;"
            document.body.append(clone)
            try {
              const canvas =
                library === "html-to-image"
                  ? await window.htmlToImage.toCanvas(clone, { pixelRatio: 2 })
                  : await window.html2canvas(clone, { scale: 2, useCORS: true, logging: false })
              return {
                width: canvas.width,
                height: canvas.height,
                data: canvas.toDataURL("image/png"),
                characters: clone.textContent.length,
                overflow: clone.scrollWidth > clone.clientWidth,
              }
            } finally {
              clone.remove()
            }
          },
          { library, variant },
        )
        const data = Buffer.from(r.data.split(",")[1], "base64")
        await writeFile(path.join(output, `${library}-${variant}.png`), data)
        results.push({
          library,
          version,
          variant,
          success: true,
          width: r.width,
          height: r.height,
          characters: r.characters,
          horizontalOverflow: r.overflow,
          pngBytes: data.length,
          elapsedMs: Date.now() - start,
        })
      } catch (e) {
        results.push({
          library,
          version,
          variant,
          success: false,
          error: String(e).slice(0, 600),
          elapsedMs: Date.now() - start,
        })
      }
    }
  }
  console.log(JSON.stringify(results, null, 2))
  await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2) + "\n")
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
