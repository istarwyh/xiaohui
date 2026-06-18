import { createHash } from "crypto"
import { h } from "preact"
import { Element, Root } from "hast"
import { toString } from "hast-util-to-string"
import { visit } from "unist-util-visit"
import { getDate } from "../../components/Date"
import { GlobalConfiguration } from "../../cfg"
import { unescapeHTML } from "../../util/escape"
import { stripFrontmatter as removeFrontmatter } from "../../util/frontmatter"
import { FilePath, FullSlug, SimpleSlug, joinSegments, simplifySlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { write } from "./helpers"

type DateInfo = {
  created?: string
  modified?: string
  published?: string
  default?: string
}

type HeadingInfo = {
  depth: number
  text: string
  id?: string
  url?: string
}

type AgentPage = {
  slug: FullSlug
  filePath: FilePath
  title: string
  url: string
  markdownUrl: string
  tags: string[]
  links: SimpleSlug[]
  dates: DateInfo
  description: string
  headings: HeadingInfo[]
  text: string
  markdown: string
  hash: string
}

type Options = {
  siteDescription: string
  llmsSlug: FullSlug
  llmsFullSlug: FullSlug
  manifestSlug: FullSlug
  searchIndexSlug: FullSlug
  pagesPrefix: FullSlug
}

const defaultOptions: Options = {
  siteDescription:
    "A public digital garden about AI Agents, MCP, software engineering, learning, society, and personal reflections.",
  llmsSlug: "llms" as FullSlug,
  llmsFullSlug: "llms-full" as FullSlug,
  manifestSlug: "agent/manifest" as FullSlug,
  searchIndexSlug: "agent/search-index" as FullSlug,
  pagesPrefix: "agent/pages" as FullSlug,
}

function absoluteUrl(cfg: GlobalConfiguration, path: string): string {
  return `https://${joinSegments(cfg.baseUrl ?? "", encodeURI(path))}`
}

function canonicalUrl(cfg: GlobalConfiguration, slug: FullSlug): string {
  return absoluteUrl(cfg, simplifySlug(slug))
}

function markdownUrl(cfg: GlobalConfiguration, opts: Options, slug: FullSlug): string {
  return absoluteUrl(cfg, `${joinSegments(opts.pagesPrefix, slug)}.md`)
}

function serializeDateValue(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (typeof value === "number") return new Date(value).toISOString()
  if (value instanceof Date) return value.toISOString()
  return undefined
}

function serializedDate(
  file: ProcessedContent[1],
  key: keyof DateInfo,
  fallback?: Date,
): string | undefined {
  return serializeDateValue(file.data.frontmatter?.[key]) ?? fallback?.toISOString()
}

function dateInfo(cfg: GlobalConfiguration, file: ProcessedContent[1]): DateInfo {
  const dates = file.data.dates
  const defaultDateType = cfg.defaultDateType

  return {
    created: serializedDate(file, "created", dates?.created),
    modified: serializedDate(file, "modified", dates?.modified),
    published: serializedDate(file, "published", dates?.published),
    default:
      defaultDateType === "created" ||
      defaultDateType === "modified" ||
      defaultDateType === "published"
        ? serializedDate(file, defaultDateType, getDate(cfg, file.data))
        : getDate(cfg, file.data)?.toISOString(),
  }
}

function stripFrontmatter(source: string): string {
  return removeFrontmatter(source).trim()
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}

function yamlArray(key: string, values: string[]): string[] {
  if (values.length === 0) return [`${key}: []`]

  return [`${key}:`, ...values.map((value) => `  - ${yamlString(value)}`)]
}

function extractHeadings(tree: Root, pageUrl: string): HeadingInfo[] {
  const headings: HeadingInfo[] = []

  visit(tree, "element", (node: Element) => {
    const match = /^h([1-6])$/.exec(node.tagName)
    if (!match) return

    const text = toString(node).trim()
    if (!text) return

    const rawId = node.properties?.id
    const id = typeof rawId === "string" ? rawId : undefined
    headings.push({
      depth: Number(match[1]),
      text,
      id,
      url: id ? `${pageUrl}#${encodeURIComponent(id)}` : pageUrl,
    })
  })

  return headings
}

function buildAgentMarkdown(page: AgentPage): string {
  const frontmatter = [
    "---",
    `title: ${yamlString(page.title)}`,
    `url: ${yamlString(page.url)}`,
    `markdownUrl: ${yamlString(page.markdownUrl)}`,
    `slug: ${yamlString(page.slug)}`,
    `sourcePath: ${yamlString(page.filePath)}`,
    ...yamlArray("tags", page.tags),
    page.dates.created ? `created: ${yamlString(page.dates.created)}` : undefined,
    page.dates.modified ? `modified: ${yamlString(page.dates.modified)}` : undefined,
    page.dates.published ? `published: ${yamlString(page.dates.published)}` : undefined,
    `hash: ${yamlString(page.hash)}`,
    "---",
  ].filter((line): line is string => line !== undefined)

  return `${frontmatter.join("\n")}\n\n${page.markdown}\n`
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function truncate(value: string, maxLength: number): string {
  const normalized = singleLine(value)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function primaryDate(page: AgentPage): string | undefined {
  return page.dates.published ?? page.dates.modified ?? page.dates.created ?? page.dates.default
}

function buildPageDirectory(pages: AgentPage[]): string {
  const groupedPages = new Map<string, AgentPage[]>()

  for (const page of pages) {
    const group = page.slug.includes("/") ? page.slug.split("/")[0] : "root"
    const groupPages = groupedPages.get(group) ?? []
    groupPages.push(page)
    groupedPages.set(group, groupPages)
  }

  return Array.from(groupedPages)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupPages]) => {
      const entries = groupPages
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((page) => {
          const date = primaryDate(page)?.slice(0, 10)
          const description = page.description ? ` — ${truncate(page.description, 120)}` : ""
          const tags = page.tags.length > 0 ? ` — tags: ${page.tags.join(", ")}` : ""
          const dateLabel = date ? ` — date: ${date}` : ""

          return `- [${page.title}](${page.url})${dateLabel}${tags}${description} — markdown: ${page.markdownUrl}`
        })
        .join("\n")

      return `### ${group}\n\n${entries}`
    })
    .join("\n\n")
}

function buildRecentDirectory(pages: AgentPage[], limit: number): string {
  return pages
    .toSorted((a, b) => (primaryDate(b) ?? "").localeCompare(primaryDate(a) ?? ""))
    .slice(0, limit)
    .map((page) => {
      const date = primaryDate(page)?.slice(0, 10) ?? "unknown"
      return `- ${date}: [${page.title}](${page.url}) — markdown: ${page.markdownUrl}`
    })
    .join("\n")
}

function buildLlmsTxt(cfg: GlobalConfiguration, opts: Options, pages: AgentPage[]): string {
  const base = `https://${cfg.baseUrl ?? ""}`
  const groups = new Map<string, number>()

  for (const page of pages) {
    const group = page.slug.includes("/") ? page.slug.split("/")[0] : "root"
    groups.set(group, (groups.get(group) ?? 0) + 1)
  }

  const topicMap = Array.from(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, count]) => `- ${group}: ${count} pages`)
    .join("\n")

  return `# ${cfg.pageTitle}

> ${opts.siteDescription}

This is the Agent entry point for ${base}. The site is a public Quartz digital garden in ${cfg.locale}. It exposes all published pages that are not drafts and are not excluded by the Quartz ignore patterns.

## Recommended Agent workflow

1. Fetch the manifest first: ${absoluteUrl(cfg, `${opts.manifestSlug}.json`)}
2. Search the whole knowledge base locally with: ${absoluteUrl(cfg, `${opts.searchIndexSlug}.json`)}
3. For deep reading, fetch the \`markdownUrl\` of a matching result.
4. When citing, prefer the canonical \`url\` field, not the Markdown retrieval URL.
5. If a heading match is available, cite the heading URL from \`headings[].url\`.

## CLI search example

\`\`\`bash
curl -s ${absoluteUrl(cfg, `${opts.searchIndexSlug}.json`)} \
  | jq -r '.pages[] | select((.title + " " + .description + " " + (.tags | join(" ")) + " " + .text) | test("YOUR_KEYWORD"; "i")) | [.title, .url, .markdownUrl] | @tsv'
\`\`\`

## Entry points

- Manifest: ${absoluteUrl(cfg, `${opts.manifestSlug}.json`)}
- Search index: ${absoluteUrl(cfg, `${opts.searchIndexSlug}.json`)}
- Full text bundle: ${absoluteUrl(cfg, `${opts.llmsFullSlug}.txt`)}
- Existing Quartz content index: ${absoluteUrl(cfg, "static/contentIndex.json")}
- Sitemap: ${absoluteUrl(cfg, "sitemap.xml")}
- RSS: ${absoluteUrl(cfg, "index.xml")}

## Topic map

${topicMap}

## Recently updated

${buildRecentDirectory(pages, 30)}

## Page directory

This compact directory is included so agents can find pages from \`llms.txt\` alone before downloading the larger JSON search index.

${buildPageDirectory(pages)}
`
}

function buildLlmsFullTxt(cfg: GlobalConfiguration, opts: Options, pages: AgentPage[]): string {
  const header = `# ${cfg.pageTitle} full public knowledge base

${opts.siteDescription}

Generated for Agents. Search with /agent/search-index.json when possible; use this full bundle when a single-file corpus is more convenient. Cite canonical URLs from each page's metadata.
`

  const entries = pages.map((page) => {
    const tags = page.tags.length > 0 ? page.tags.join(", ") : "none"
    return `\n---\n\n# ${page.title}\n\n- URL: ${page.url}\n- Markdown URL: ${page.markdownUrl}\n- Source path: ${page.filePath}\n- Tags: ${tags}\n- Created: ${page.dates.created ?? "unknown"}\n- Modified: ${page.dates.modified ?? "unknown"}\n- Hash: ${page.hash}\n\n${page.markdown}\n`
  })

  return `${header}${entries.join("\n")}`
}

function createPage(
  ctxCfg: GlobalConfiguration,
  opts: Options,
  [tree, file]: ProcessedContent,
): AgentPage {
  const slug = file.data.slug!
  const url = canonicalUrl(ctxCfg, slug)
  const markdown = stripFrontmatter(String(file.value ?? ""))
  const text = unescapeHTML(file.data.text ?? "")
  const description = unescapeHTML(file.data.description ?? "")
  const tags = (file.data.frontmatter?.tags ?? []).map(String)
  const title = file.data.frontmatter?.title?.toString() ?? slug
  const filePath = file.data.relativePath!
  const contentHash = hashContent(`${title}\n${markdown}\n${text}`)

  return {
    slug,
    filePath,
    title,
    url,
    markdownUrl: markdownUrl(ctxCfg, opts, slug),
    tags,
    links: file.data.links ?? [],
    dates: dateInfo(ctxCfg, file),
    description,
    headings: extractHeadings(tree as Root, url),
    text,
    markdown,
    hash: contentHash,
  }
}

export const AgentIndex: QuartzEmitterPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "AgentIndex",
    async *emit(ctx, content) {
      const cfg = ctx.cfg.configuration
      const generatedAt = new Date().toISOString()
      const pages = content
        .map((entry) => createPage(cfg, opts, entry))
        .sort((a, b) => a.slug.localeCompare(b.slug))

      const manifestPages = pages.map((page) => ({
        slug: page.slug,
        filePath: page.filePath,
        title: page.title,
        url: page.url,
        markdownUrl: page.markdownUrl,
        tags: page.tags,
        links: page.links,
        dates: page.dates,
        description: page.description,
        headings: page.headings,
        contentLength: page.markdown.length,
        textLength: page.text.length,
        hash: page.hash,
      }))

      const manifest = {
        schemaVersion: "1.0",
        generatedAt,
        site: {
          title: cfg.pageTitle,
          titleSuffix: cfg.pageTitleSuffix,
          description: opts.siteDescription,
          baseUrl: `https://${cfg.baseUrl ?? ""}`,
          locale: cfg.locale,
        },
        entrypoints: {
          llms: absoluteUrl(cfg, `${opts.llmsSlug}.txt`),
          llmsFull: absoluteUrl(cfg, `${opts.llmsFullSlug}.txt`),
          manifest: absoluteUrl(cfg, `${opts.manifestSlug}.json`),
          searchIndex: absoluteUrl(cfg, `${opts.searchIndexSlug}.json`),
          contentIndex: absoluteUrl(cfg, "static/contentIndex.json"),
          sitemap: absoluteUrl(cfg, "sitemap.xml"),
          rss: absoluteUrl(cfg, "index.xml"),
        },
        usage: {
          search:
            "Download entrypoints.searchIndex and search title, description, tags, headings.text, and text locally. Then fetch markdownUrl for the best matches.",
          citation:
            "Cite the canonical url field. Use headings[].url for section-level citations when relevant. markdownUrl is for retrieval, not citation.",
        },
        pageCount: manifestPages.length,
        pages: manifestPages,
      }

      const searchIndex = {
        schemaVersion: "1.0",
        generatedAt,
        site: manifest.site,
        pages: pages.map((page) => ({
          slug: page.slug,
          title: page.title,
          url: page.url,
          markdownUrl: page.markdownUrl,
          tags: page.tags,
          dates: page.dates,
          description: page.description,
          headings: page.headings,
          text: page.text,
          hash: page.hash,
        })),
      }

      yield write({
        ctx,
        content: buildLlmsTxt(cfg, opts, pages),
        slug: opts.llmsSlug,
        ext: ".txt",
      })

      yield write({
        ctx,
        content: buildLlmsFullTxt(cfg, opts, pages),
        slug: opts.llmsFullSlug,
        ext: ".txt",
      })

      yield write({
        ctx,
        content: JSON.stringify(manifest, null, 2),
        slug: opts.manifestSlug,
        ext: ".json",
      })

      yield write({
        ctx,
        content: JSON.stringify(searchIndex),
        slug: opts.searchIndexSlug,
        ext: ".json",
      })

      for (const page of pages) {
        yield write({
          ctx,
          content: buildAgentMarkdown(page),
          slug: joinSegments(opts.pagesPrefix, page.slug) as FullSlug,
          ext: ".md",
        })
      }
    },
    externalResources: (ctx) => {
      const cfg = ctx.cfg.configuration
      return {
        additionalHead: [
          h("link", {
            rel: "alternate",
            type: "text/plain",
            title: "llms.txt",
            href: absoluteUrl(cfg, `${opts.llmsSlug}.txt`),
          }),
          h("link", {
            rel: "alternate",
            type: "text/plain",
            title: "llms-full.txt",
            href: absoluteUrl(cfg, `${opts.llmsFullSlug}.txt`),
          }),
          h("link", {
            rel: "alternate",
            type: "application/json",
            title: "Agent manifest",
            href: absoluteUrl(cfg, `${opts.manifestSlug}.json`),
          }),
          h("link", {
            rel: "alternate",
            type: "application/json",
            title: "Agent search index",
            href: absoluteUrl(cfg, `${opts.searchIndexSlug}.json`),
          }),
        ],
      }
    },
  }
}
