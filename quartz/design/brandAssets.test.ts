import assert from "node:assert/strict"
import test from "node:test"
import sharp from "sharp"
import { brandAssets, brandMarkPaths } from "./brandAssets"
import { dark, light } from "./tokens"

const expectedNames = [
  "xiaohui-mark.svg",
  "xiaohui-horizontal-light.svg",
  "xiaohui-horizontal-dark.svg",
  "xiaohui-monochrome.svg",
]

test("brand downloads have stable filenames, intrinsic sizes, and accessible names", () => {
  assert.deepEqual(
    brandAssets.map((asset) => asset.filename),
    expectedNames,
  )
  assert.equal(new Set(expectedNames).size, brandAssets.length)
  for (const asset of brandAssets) {
    assert.ok(asset.width > 0 && asset.height > 0)
    assert.match(asset.title, /晓灰/)
    assert.ok(asset.description.length > 10)
    assert.ok(asset.svg.includes(`viewBox="0 0 ${asset.width} ${asset.height}"`))
    assert.ok(asset.svg.includes(`width="${asset.width}" height="${asset.height}"`))
    assert.match(asset.svg, /role="img" aria-labelledby="[^"]+-title [^"]+-desc"/)
    assert.ok(asset.svg.includes(`>${asset.title}</title>`))
    assert.ok(asset.svg.includes(`>${asset.description}</desc>`))
    assert.ok(Buffer.byteLength(asset.svg) < 5_000, `${asset.filename} should remain lightweight`)
  }
})

test("assets are self-contained vectors with outlined lettering and token-derived colors", () => {
  const allowedPaints = new Set([
    "none",
    "currentColor",
    light["color-text-strong"],
    light["color-accent"],
    dark["color-text-strong"],
    dark["color-accent"],
  ])
  for (const asset of brandAssets) {
    assert.match(asset.svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    assert.doesNotMatch(
      asset.svg,
      /<(?:script|foreignObject|text|image|use|style|filter|animate)\b|\b(?:href|on\w+)\s*=/i,
    )
    assert.doesNotMatch(asset.svg, /@font-face|font-family|data:|url\(/i)
    assert.ok(asset.svg.includes(brandMarkPaths.dawn))
    assert.ok(asset.svg.includes(brandMarkPaths.pages))
    assert.ok(asset.svg.includes(brandMarkPaths.fold))
    for (const match of asset.svg.matchAll(/\b(?:fill|stroke|color)="([^"]+)"/g)) {
      assert.ok(allowedPaints.has(match[1]), `${asset.filename}: unexpected paint ${match[1]}`)
    }
  }
})

test("light and inverse lockups use their corresponding readable theme colors", () => {
  for (const [filename, palette] of [
    ["xiaohui-horizontal-light.svg", light],
    ["xiaohui-horizontal-dark.svg", dark],
  ] as const) {
    const asset = brandAssets.find((item) => item.filename === filename)!
    assert.ok(asset.svg.includes(`fill="${palette["color-accent"]}"`))
    assert.ok(asset.svg.includes(`fill="${palette["color-text-strong"]}"`))
    assert.ok(asset.svg.includes(`stroke="${palette["color-text-strong"]}"`))
  }
  const monochrome = brandAssets.find((item) => item.filename === "xiaohui-monochrome.svg")!
  assert.ok(monochrome.svg.includes(`color="${light["color-text-strong"]}"`))
  assert.ok(monochrome.svg.includes('fill="currentColor"'))
  assert.ok(monochrome.svg.includes('stroke="currentColor"'))
})

test("every download rasterizes at intrinsic size with transparent, unclipped borders", async () => {
  for (const asset of brandAssets) {
    const { data, info } = await sharp(Buffer.from(asset.svg)).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    })
    assert.equal(info.width, asset.width)
    assert.equal(info.height, asset.height)
    assert.equal(info.channels, 4)
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]
    for (let x = 0; x < info.width; x++) {
      assert.equal(alpha(x, 0), 0, `${asset.filename}: clipped top edge`)
      assert.equal(alpha(x, info.height - 1), 0, `${asset.filename}: clipped bottom edge`)
    }
    for (let y = 0; y < info.height; y++) {
      assert.equal(alpha(0, y), 0, `${asset.filename}: clipped left edge`)
      assert.equal(alpha(info.width - 1, y), 0, `${asset.filename}: clipped right edge`)
    }
    assert.ok(data.some((value, index) => index % 4 === 3 && value === 255))
  }
})

test("monochrome standalone rendering honors its ink fallback", async () => {
  const asset = brandAssets.find((item) => item.filename === "xiaohui-monochrome.svg")!
  const { data, info } = await sharp(Buffer.from(asset.svg)).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })
  const expected = [1, 3, 5].map((start) =>
    Number.parseInt(light["color-text-strong"].slice(start, start + 2), 16),
  )
  for (const [x, y] of [
    [32, 15],
    [32, 42],
  ]) {
    const offset = (y * info.width + x) * 4
    assert.deepEqual([...data.subarray(offset, offset + 4)], [...expected, 255])
  }
})
