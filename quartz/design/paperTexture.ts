/** Static, tileable paper grain. One tiny SVG; no canvas, animation or runtime work. */
export const paperGrain = {
  light: { channel: 0, maxOpacity: 0.045 },
  dark: { channel: 255, maxOpacity: 0.018 },
} as const

export function paperTextureSvg(mode: keyof typeof paperGrain): string {
  const { channel, maxOpacity } = paperGrain[mode]
  const offset = channel / 255
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78 .94" numOctaves="3" seed="8" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${offset} 0 0 0 0 ${offset} 0 0 0 0 ${offset} 0 0 0 ${maxOpacity} 0"/></filter><rect width="192" height="192" filter="url(#grain)"/></svg>`
}

export function paperTextureCss(mode: keyof typeof paperGrain): string {
  return `url("data:image/svg+xml,${encodeURIComponent(paperTextureSvg(mode))}")`
}
