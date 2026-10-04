import path from "path"
import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { pathToRoot } from "../../util/path"
import { defaultContentPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { Content } from "../../components"
import { styleText } from "util"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { Node } from "unist"
import { StaticResources } from "../../util/resources"
import { QuartzPluginData } from "../vfile"
import { isHomePage } from "../../util/homePageModel"

async function processContent(
  ctx: BuildCtx,
  tree: Node,
  fileData: QuartzPluginData,
  rawMarkdown: string,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  const slug = fileData.slug!
  const cfg = ctx.cfg.configuration
  const externalResources = pageResources(pathToRoot(slug), resources, ctx.buildId)
  const componentData: QuartzComponentProps = {
    ctx,
    fileData,
    externalResources,
    cfg,
    children: [],
    tree,
    allFiles,
    rawMarkdown,
  }

  const content = renderPage(cfg, slug, componentData, opts, externalResources)
  return write({
    ctx,
    content,
    slug,
    ext: ".html",
  })
}

interface ContentPageOptions extends Partial<FullPageLayout> {
  homeLayout?: FullPageLayout
}

export const ContentPage: QuartzEmitterPlugin<ContentPageOptions> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultContentPageLayout,
    pageBody: Content(),
    ...userOpts,
  }

  const homeLayout = userOpts?.homeLayout
  const layoutFor = (file: QuartzPluginData) => (homeLayout && isHomePage(file) ? homeLayout : opts)
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "ContentPage",
    getQuartzComponents() {
      const components = [opts, ...(homeLayout ? [homeLayout] : [])].flatMap((layout) => [
        layout.head,
        Header,
        Body,
        ...layout.header,
        ...layout.beforeBody,
        layout.pageBody,
        ...layout.afterBody,
        ...layout.left,
        ...layout.right,
        layout.footer,
      ])
      return [...new Set(components)]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      let containsIndex = false

      for (const [tree, file] of content) {
        const slug = file.data.slug!
        if (slug === "index") {
          containsIndex = true
        }

        // only process home page, non-tag pages, and non-index pages
        if (slug.endsWith("/index") || slug.startsWith("tags/")) continue
        yield processContent(
          ctx,
          tree,
          file.data,
          String(file.value ?? ""),
          allFiles,
          layoutFor(file.data),
          resources,
        )
      }

      if (!containsIndex) {
        console.log(
          styleText(
            "yellow",
            `\nWarning: you seem to be missing an \`index.md\` home page file at the root of your \`${ctx.argv.directory}\` folder (\`${path.join(ctx.argv.directory, "index.md")} does not exist\`). This may cause errors when deploying.`,
          ),
        )
      }
    },
    async *partialEmit(ctx, content, resources, changeEvents) {
      const allFiles = content.map((c) => c[1].data)

      // find all slugs that changed or were added
      const changedSlugs = new Set<string>()
      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue
        if (changeEvent.type === "add" || changeEvent.type === "change") {
          changedSlugs.add(changeEvent.file.data.slug!)
        }
      }

      for (const [tree, file] of content) {
        const slug = file.data.slug!
        // Both homes depend on the entire published collection and asset inventory.
        // Deletion events may not carry a parsed file, but must still rebuild feeds.
        if (!changedSlugs.has(slug) && !(changeEvents.length > 0 && isHomePage(file.data))) continue
        if (slug.endsWith("/index") || slug.startsWith("tags/")) continue

        yield processContent(
          ctx,
          tree,
          file.data,
          String(file.value ?? ""),
          allFiles,
          layoutFor(file.data),
          resources,
        )
      }
    },
  }
}
