import assert from "node:assert/strict"
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { once } from "node:events"
import test from "node:test"
import chokidar from "chokidar"

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")

test("runtime pins and installation requirements stay aligned", async () => {
  const pin = (await read(".node-version")).trim()
  assert.equal((await read(".nvmrc")).trim(), pin)
  const [major, minor] = pin.split(".").map(Number)
  assert.ok(major === 22 && minor >= 22)
  const pkg = JSON.parse(await read("package.json"))
  const lock = JSON.parse(await read("package-lock.json"))
  assert.equal(pkg.engines.node, ">=22.22.0")
  assert.deepEqual(lock.packages[""].engines, pkg.engines)
  assert.equal(pkg.dependencies.chokidar, "^6.0.0")
  assert.equal(lock.packages["node_modules/chokidar"].version, "6.0.0")
  assert.match(await read(".npmrc"), /^engine-strict=true$/m)
  for (const file of [".github/workflows/ci.yaml", ".github/workflows/build-preview.yaml"]) {
    const workflow = await read(file)
    assert.doesNotMatch(workflow, /node-version:/)
    assert.match(workflow, /node-version-file: \.node-version/)
  }
  const docker = await read("Dockerfile")
  for (const line of docker.split("\n").filter((line) => line.startsWith("FROM node:"))) {
    assert.ok(line.startsWith(`FROM node:${pin}-slim`))
  }
})

test(
  "chokidar 6 observes a file added after ready and closes cleanly",
  { timeout: 10000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "quartz-watch-"))
    const watcher = chokidar.watch(directory, { ignoreInitial: true })
    try {
      await once(watcher, "ready")
      const added = once(watcher, "add")
      const file = path.join(directory, "note.md")
      await writeFile(file, "# Runtime smoke\n")
      assert.equal((await added)[0], file)
    } finally {
      await watcher.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
)
