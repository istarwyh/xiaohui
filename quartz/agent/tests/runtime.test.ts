import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, readdirSync } from "node:fs"
import { parseHTML } from "linkedom"
import { build } from "esbuild"
import { runInNewContext } from "node:vm"
import { registerTools } from "../webmcp/adapter/registration"
import { createNavigation } from "../browser/context/navigation"
import { bootstrap } from "../webmcp/runtime/bootstrap"

function host(failAt = -1) {
  const tools = new Map<string, WebMCP.ModelContextTool>()
  let attempts = 0
  return {
    tools,
    context: {
      async registerTool(
        tool: WebMCP.ModelContextTool,
        options?: WebMCP.ModelContextRegisterToolOptions,
      ) {
        if (attempts++ === failAt) throw new Error("permission denied")
        if (tools.has(tool.name)) throw new Error("duplicate")
        tools.set(tool.name, tool)
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true })
      },
    },
  }
}

function dom() {
  const { document, window } = parseHTML(
    '<html><head><meta name="quartz-build" content="test-build"></head><body data-slug="program/note" data-agent-page-kind="article"></body></html>',
  )
  Object.defineProperty(window, "location", {
    value: new URL("https://preview.test/program/note"),
    configurable: true,
  })
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })
  return {
    document: document as unknown as Document,
    window: window as unknown as Window,
    Event: window.Event,
  }
}

test("registration rolls back partial installation and supports complete uninstall", async () => {
  const tools: WebMCP.ModelContextTool[] = ["one", "two", "three"].map((name) => ({
    name,
    description: name,
    execute: async () => ({ name }),
  }))
  const rejected = host(1)
  await assert.rejects(registerTools(rejected.context, tools), /permission/)
  assert.equal(rejected.tools.size, 0)
  const working = host()
  const dispose = await registerTools(working.context, tools)
  assert.equal(working.tools.size, 3)
  dispose()
  dispose()
  assert.equal(working.tools.size, 0)
})

function dispatch(document: Document, event: Event) {
  const target = document as unknown as EventTarget
  target.dispatchEvent(event)
}

test("navigation snapshot follows prenav/nav without capture of the initial article", () => {
  const { document, window, Event } = dom()
  const navigation = createNavigation(document, window)
  assert.equal(navigation.snapshot().generation, 0)
  dispatch(document, new Event("prenav"))
  assert.equal(navigation.snapshot().navigating, true)
  document.body.dataset.slug = "program/new"
  dispatch(document, new Event("nav"))
  assert.equal(navigation.snapshot().slug, "program/new")
  assert.equal(navigation.snapshot().generation, 1)
  assert.equal(navigation.snapshot().navigating, false)
  navigation.dispose()
  dispatch(document, new Event("prenav"))
  assert.equal(navigation.snapshot().generation, 1)
})

test("bootstrap installs once, makes no content requests, survives SPA and bfcache", async () => {
  const { document, window, Event } = dom()
  const registered = host()
  Object.defineProperty(document, "modelContext", { value: registered.context, configurable: true })
  const originalFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => {
    requests++
    throw new Error("unexpected eager fetch")
  }
  try {
    await Promise.all([bootstrap(document, window), bootstrap(document, window)])
    assert.deepEqual(
      [...registered.tools.keys()],
      ["search-notes", "read-note", "get-current-note"],
    )
    dispatch(document, new Event("prenav"))
    dispatch(document, new Event("nav"))
    assert.equal(registered.tools.size, 3)
    const persisted = new Event("pagehide")
    Object.assign(persisted, { persisted: true })
    window.dispatchEvent(persisted)
    assert.equal(registered.tools.size, 3)
    assert.equal(requests, 0)
    window.dispatchEvent(new Event("pagehide"))
    assert.equal(registered.tools.size, 0)
  } finally {
    window.dispatchEvent(new Event("pagehide"))
    globalThis.fetch = originalFetch
  }
})

test("unsupported browser remains inert and failed startup can retry", async () => {
  const { document, window, Event } = dom()
  await bootstrap(document, window)
  const rejected = host(1)
  Object.defineProperty(document, "modelContext", { value: rejected.context, configurable: true })
  const warn = console.warn
  console.warn = () => {}
  try {
    await bootstrap(document, window)
  } finally {
    console.warn = warn
  }
  assert.equal(rejected.tools.size, 0)
  const working = host()
  Object.defineProperty(document, "modelContext", { value: working.context, configurable: true })
  await bootstrap(document, window)
  assert.equal(working.tools.size, 3)
  window.dispatchEvent(new Event("pagehide"))
})

test("actual browser bundle has no Node imports and safely executes with no native API", async () => {
  const result = await build({
    entryPoints: ["quartz/components/scripts/webmcp.inline.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    metafile: true,
  })
  assert.equal(
    Object.keys(result.metafile!.inputs).some((p) => p.includes("agent/build/")),
    false,
  )
  assert.equal(
    Object.keys(result.metafile!.inputs).some((p) => p.includes("node_modules/flexsearch")),
    false,
  )
  let fetches = 0
  runInNewContext(result.outputFiles[0].text, {
    document: {},
    window: { isSecureContext: true },
    console,
    fetch: () => {
      fetches++
    },
  })
  assert.equal(fetches, 0)
})

test("module boundaries keep browser, build, protocols and DOM separate", () => {
  const root = new URL("../", import.meta.url)
  function visit(dir: URL): URL[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? visit(new URL(entry.name + "/", dir))
        : entry.name.endsWith(".ts")
          ? [new URL(entry.name, dir)]
          : [],
    )
  }
  for (const file of visit(root).filter((u) => !u.pathname.includes("/tests/"))) {
    const source = readFileSync(file, "utf8")
    if (file.pathname.includes("/browser/") || file.pathname.includes("/contracts/")) {
      assert.doesNotMatch(source, /from ["'](?:node:|.*\/build\/|.*webmcp)/, file.pathname)
    }
    if (file.pathname.includes("/webmcp/tools/") || file.pathname.includes("/webmcp/adapter/")) {
      assert.doesNotMatch(source, /querySelector|document\.|window\./, file.pathname)
    }
    if (file.pathname.includes("/contracts/"))
      assert.doesNotMatch(source, /\b(?:Document|Window|WebMCP|preact)\b/, file.pathname)
  }
})
