import assert from "node:assert/strict"
import test from "node:test"
import { createSearchRuntime, installSearchRuntime } from "../browser/runtime"
import type { SearchData, SearchRuntime } from "../contracts/runtime"

const data: SearchData = {
  "program/上下文工程": {
    title: "上下文工程与 MCP",
    content: "使用 OneAgent 与 MCP 创建领域智能体。",
    tags: ["Agent"],
    hash: "first",
  },
  "invest/可持续分红": {
    title: "可持续分红",
    content: "我的投资线索筛选方法。",
    tags: ["投资"],
    hash: "second",
  },
}

test("UI and agent share one data load and one lazily constructed index", async () => {
  let loads = 0
  const service = createSearchRuntime(async () => {
    loads++
    return data
  })
  const [ui, agent] = await Promise.all([service.load(), service.load()])
  assert.equal(ui, agent)
  const result = await service.search({
    query: "上下文工程",
    limit: 10,
    index: ["title", "content"],
  })
  assert.equal(result.data, ui)
  assert.ok(result.fields.some((f) => f.field === "title" && f.result.includes(0)))
  assert.equal(loads, 1)
  assert.ok((await service.search({ query: "Agent", limit: 10, index: ["tags"] })).fields.length)
})

test("index construction yields within its time budget and retries failed data loads", async () => {
  let attempts = 0,
    ticks = 0,
    yields = 0
  const service = createSearchRuntime(
    async () => {
      if (attempts++ === 0) throw new Error("offline")
      return data
    },
    {
      now: () => (ticks += 9),
      yieldTask: async () => {
        yields++
      },
    },
  )
  await assert.rejects(service.load(), /offline/)
  await service.load()
  assert.equal(attempts, 2)
  assert.equal(yields, 2)
})

test("query results and data come from the same snapshot during concurrent reload", async () => {
  let loads = 0
  const service = createSearchRuntime(async () =>
    loads++ === 0 ? data : { new: { title: "New page", content: "new content", tags: [] } },
  )
  const first = await service.search({ query: "MCP", limit: 10, index: ["title"] })
  await service.reload()
  assert.equal(first.data, data)
  assert.ok(first.fields.some((f) => f.result.includes(0)))
  const second = await service.search({ query: "New", limit: 10, index: ["title"] })
  assert.deepEqual(Object.keys(second.data), ["new"])
})

test("installing a resource twice preserves the existing shared runtime", () => {
  const host = {} as { quartzSearch: SearchRuntime }
  installSearchRuntime(host, async () => data)
  const first = host.quartzSearch
  installSearchRuntime(host, async () => ({}))
  assert.equal(host.quartzSearch, first)
})

test("concurrent refresh requests share one reload and discard an obsolete in-progress build", async () => {
  let loads = 0
  let finish!: (value: SearchData) => void
  const service = createSearchRuntime(async () => {
    if (loads++ === 0)
      return new Promise<SearchData>((resolve) => {
        finish = resolve
      })
    return data
  })
  const old = service.load()
  const [first, second] = await Promise.all([service.reload(), service.reload()])
  assert.equal(loads, 2)
  assert.equal(first, second)
  finish({ obsolete: { title: "Old", content: "old", tags: [] } })
  assert.equal(await old, data)
})

test("revalidation keeps the original absolute index URL after navigating to another depth", async () => {
  const { searchDataScript } = await import("../build/loader")
  const { createContext, runInContext } = await import("node:vm")
  const requests: string[] = []
  const document = { baseURI: "https://preview.test/program/llm/note" }
  const context = createContext({
    document,
    URL,
    fetch: (url: string) => {
      requests.push(url)
      return Promise.resolve({ json: async () => ({}) })
    },
  })
  runInContext(searchDataScript("../../static/contentIndex.json?v=build"), context)
  document.baseURI = "https://preview.test/index"
  await runInContext("fetchSearchData(true)", context)
  assert.deepEqual(requests, [
    "https://preview.test/static/contentIndex.json?v=build",
    "https://preview.test/static/contentIndex.json?v=build",
  ])
})
