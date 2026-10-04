import { dark, light } from "./tokens"

/**
 * Original Xiaohui brand-kit artwork. Geometry is local; colors stay in tokens.ts.
 * These transparent SVGs are downloads/reference assets, not a favicon replacement.
 * Name outlines: Noto Sans CJK SC Bold; Latin: Noto Sans CJK SC Regular (SIL OFL 1.1).
 * Only the pictured glyph contours are included, never fonts or runtime dependencies.
 * The monochrome SVG uses currentColor with a presentation-attribute ink fallback:
 * when inlined, set `color` on the SVG to recolor it; an <img> retains its fallback.
 */
export interface BrandAsset {
  filename: string
  title: string
  description: string
  svg: string
  width: number
  height: number
}

/** 64-unit mark: a dawn above two open notebook pages. Keep the proportions intact. */
export const brandMarkPaths = {
  dawn: "M22 20a10 10 0 0 1 20 0Z",
  pages: "M12 27c8 0 14 2 20 7 6-5 12-7 20-7v19c-8 0-14 2-20 7-6-5-12-7-20-7Z",
  fold: "M32 34v19",
} as const

// Outlined wordmarks preserve exact lettering in offline SVG viewers and design tools.
const nameOutline =
  "M105.19 38.61V47.61H100.57V38.61ZM105.19 33.6H100.57V24.66H105.19ZM96 19.55V56.65H100.57V52.71H109.86V19.55ZM117.83 16.78C117.93 18.58 118.12 20.38 118.42 22.08L111.61 22.71L112.39 27.52L119.53 26.84C120.22 29.03 120.99 31.03 121.97 32.82C118.47 34.19 114.58 35.21 110.68 35.94C111.71 37.05 113.31 39.39 114.04 40.6C117.69 39.68 121.38 38.47 124.84 36.96C127.22 39.58 129.99 41.14 133.1 41.14C136.8 41.14 138.3 39.92 139.13 34.67C137.82 34.23 136.16 33.41 135.1 32.44C134.85 35.16 134.51 36.03 133.39 36.03C132.23 36.03 131.01 35.5 129.84 34.48C133.34 32.48 136.36 30.1 138.64 27.28L133.73 25.43L138.06 25L137.33 20.28L123.72 21.54C123.42 20.04 123.23 18.43 123.13 16.78ZM124.93 26.31 133.39 25.43C131.74 27.43 129.5 29.13 126.83 30.59C126.15 29.32 125.47 27.86 124.93 26.31ZM111.32 42.11V47.02H117.54C117.01 51.98 115.5 54.95 108.79 56.8C110 57.96 111.56 60.3 112.1 61.81C120.6 59.03 122.7 54.22 123.33 47.02H126.29V55.05C126.29 59.52 127.27 60.98 131.69 60.98C132.57 60.98 134.32 60.98 135.24 60.98C138.55 60.98 139.91 59.42 140.4 54.17C138.94 53.78 136.7 53 135.58 52.23C135.48 55.78 135.29 56.46 134.56 56.46C134.27 56.46 133.1 56.46 132.86 56.46C132.13 56.46 132.03 56.31 132.03 55V47.02H138.99V42.11ZM161.94 33.94C161.3 37.4 160.09 41.43 158.58 44.15L163.54 46.1C164.95 43.42 166.02 39.1 166.7 35.6ZM180.9 33.41C179.93 36.33 178.03 40.17 176.52 42.6L180.95 44.88C182.46 42.55 184.3 39.1 185.86 35.84ZM155.27 16 154.84 21.35H144.29V26.99H154.21C152.6 38.22 149.44 47.22 142.88 52.86C144.24 53.98 146.72 56.51 147.54 57.72C154.89 50.67 158.44 40.17 160.33 26.99H187.08V21.35H161.01L161.45 16.39ZM169.23 29.03C168.89 43.04 168.65 52.37 154.98 57.23C156.2 58.3 157.8 60.54 158.44 62C166.07 59.13 170.15 54.85 172.39 49.26C175.41 54.56 179.39 58.84 184.4 61.51C185.23 60.05 186.93 57.96 188.19 56.94C181.82 54.03 177.01 48.34 174.34 41.67C174.87 37.83 175.07 33.65 175.21 29.03Z"
const latinOutline =
  "M98 85.81H99.42L100.94 82.94C101.22 82.41 101.49 81.87 101.8 81.22H101.86C102.2 81.87 102.49 82.41 102.77 82.94L104.35 85.81H105.83L102.71 80.39L105.61 75.19H104.2L102.78 77.9C102.52 78.39 102.32 78.84 102.03 79.46H101.97C101.62 78.84 101.41 78.39 101.13 77.9L99.68 75.19H98.2L101.1 80.32ZM109.82 85.81H111.16V75.19H109.82ZM114.96 85.81H116.31L117.34 82.57H121.22L122.24 85.81H123.66L120.05 75.19H118.56ZM117.67 81.51 118.19 79.87C118.57 78.67 118.92 77.52 119.25 76.28H119.31C119.66 77.51 119.99 78.67 120.38 79.87L120.89 81.51ZM131.39 86C134.06 86 135.93 83.87 135.93 80.46C135.93 77.06 134.06 75 131.39 75C128.73 75 126.86 77.06 126.86 80.46C126.86 83.87 128.73 86 131.39 86ZM131.39 84.83C129.48 84.83 128.23 83.12 128.23 80.46C128.23 77.81 129.48 76.17 131.39 76.17C133.31 76.17 134.55 77.81 134.55 80.46C134.55 83.12 133.31 84.83 131.39 84.83ZM140.53 85.81H141.87V80.8H146.82V85.81H148.17V75.19H146.82V79.64H141.87V75.19H140.53ZM157.15 86C159.31 86 160.96 84.84 160.96 81.43V75.19H159.67V81.46C159.67 84.01 158.56 84.83 157.15 84.83C155.76 84.83 154.67 84.01 154.67 81.46V75.19H153.34V81.43C153.34 84.84 154.98 86 157.15 86ZM166.13 85.81H167.47V75.19H166.13Z"

function mark(ink: string, accent: string): string {
  return `<path fill="${accent}" d="${brandMarkPaths.dawn}"/>
  <g fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="${brandMarkPaths.pages}"/>
    <path d="${brandMarkPaths.fold}"/>
  </g>`
}

function horizontal(ink: string, accent: string): string {
  return `<g transform="translate(8 8) scale(1.25)">${mark(ink, accent)}</g>
  <path fill="${ink}" d="${nameOutline}"/>
  <path fill="${ink}" d="${latinOutline}"/>`
}

function asset(
  filename: string,
  title: string,
  description: string,
  width: number,
  height: number,
  artwork: string,
  color?: string,
): BrandAsset {
  const id = filename.replace(/\.svg$/, "")
  return {
    filename,
    title,
    description,
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc"${color ? ` color="${color}"` : ""}>
  <title id="${id}-title">${title}</title>
  <desc id="${id}-desc">${description}</desc>
  ${artwork}
</svg>`,
  }
}

/** Emit each SVG at /brand/{filename}; dimensions are the original artboard size. */
export const brandAssets: readonly BrandAsset[] = [
  asset(
    "xiaohui-mark.svg",
    "晓灰 · 图形标记",
    "初升的太阳与翻开的两页笔记。铜色与墨色，透明背景，适合浅色表面。",
    64,
    64,
    mark(light["color-text-strong"], light["color-accent"]),
  ),
  asset(
    "xiaohui-horizontal-light.svg",
    "晓灰 · 浅色横式组合",
    "图形标记、晓灰与 XIAOHUI 字样。文字已转为路径，透明背景，适合浅色表面。",
    224,
    96,
    horizontal(light["color-text-strong"], light["color-accent"]),
  ),
  asset(
    "xiaohui-horizontal-dark.svg",
    "晓灰 · 深色横式组合",
    "图形标记、晓灰与 XIAOHUI 字样。文字已转为路径，透明背景，适合深色表面。",
    224,
    96,
    horizontal(dark["color-text-strong"], dark["color-accent"]),
  ),
  asset(
    "xiaohui-monochrome.svg",
    "晓灰 · 单色图形",
    "初升的太阳与翻开的两页笔记。单色透明版本，内联时可通过 color 设置颜色。",
    64,
    64,
    mark("currentColor", "currentColor"),
    light["color-text-strong"],
  ),
]
