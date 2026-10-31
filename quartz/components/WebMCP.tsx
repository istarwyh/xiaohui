// @ts-ignore — shared resource is bundled once by Quartz.
import searchRuntime from "./scripts/searchRuntime.inline"
import type { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore — Quartz bundles *.inline.ts into the shared browser resource.
import script from "./scripts/webmcp.inline"

export default (() => {
  const WebMCP: QuartzComponent = () => null
  WebMCP.afterDOMLoaded = [searchRuntime, script]
  return WebMCP
}) satisfies QuartzComponentConstructor
