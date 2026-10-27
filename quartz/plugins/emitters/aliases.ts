import { escapeHTML, unescapeHTML } from "../../util/escape"
import { absolutePageUrl } from "../../util/translations"
import { StaticResources } from "../../util/resources"
import { renderToString } from "preact-render-to-string"
import { validateShareRoutes } from "../../util/shareRoutes"
import { FullSlug, isRelativeURL, resolveRelative, simplifySlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { VFile } from "vfile"
import path from "path"

async function* processFile(ctx: BuildCtx, file: VFile, resources: StaticResources) {
  const ogSlug = simplifySlug(file.data.slug!)

  for (const aliasTarget of file.data.aliases ?? []) {
    const aliasTargetSlug = (
      isRelativeURL(aliasTarget)
        ? path.normalize(path.join(ogSlug, "..", aliasTarget))
        : aliasTarget
    ) as FullSlug

    const redirUrl = resolveRelative(aliasTargetSlug, ogSlug)
    const isShare = aliasTarget === file.data.frontmatter?.shareSlug
    const title = isShare ? file.data.frontmatter!.title : ogSlug
    const description =
      file.data.frontmatter?.socialDescription ??
      file.data.frontmatter?.description ??
      unescapeHTML(file.data.description?.trim() ?? "")
    const canonical = isShare ? absolutePageUrl(ctx.cfg.configuration, file.data.slug!) : redirUrl
    // Reuse emitter-provided OG image metadata, including custom/generated images.
    const social = isShare
      ? `
      <meta property="og:title" content="${escapeHTML(title)}">
      <meta property="og:description" content="${escapeHTML(description)}">
      <meta property="og:type" content="article">
      <meta property="og:url" content="${escapeHTML(canonical)}">
      ${resources.additionalHead.map((head) => renderToString(typeof head === "function" ? head(file.data) : head)).join("")}
    `
      : ""
    yield write({
      ctx,
      content: `
        <!DOCTYPE html>
        <html lang="en-us">
        <head>
        <title>${escapeHTML(title)}</title>
        <link rel="canonical" href="${escapeHTML(canonical)}">
        <meta name="robots" content="noindex">
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="0; url=${escapeHTML(redirUrl)}">
        ${social}
        </head>
        <body><a href="${escapeHTML(redirUrl)}">Continue to article</a></body>
        </html>
        `,
      slug: aliasTargetSlug,
      ext: ".html",
    })
  }
}

export const AliasRedirects: QuartzEmitterPlugin = () => ({
  name: "AliasRedirects",
  async *emit(ctx, content, resources) {
    await validateShareRoutes(ctx, content)
    for (const [_tree, file] of content) {
      yield* processFile(ctx, file, resources)
    }
  },
  async *partialEmit(ctx, content, resources, changeEvents) {
    await validateShareRoutes(ctx, content)
    for (const changeEvent of changeEvents) {
      if (!changeEvent.file) continue
      if (changeEvent.type === "add" || changeEvent.type === "change") {
        // add new ones if this file still exists
        yield* processFile(ctx, changeEvent.file, resources)
      }
    }
  },
})
