import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date as DateComponent } from "./Date"
import { classNames } from "../util/lang"

// @ts-ignore
import script from "./scripts/feedList.inline"
import style from "./styles/feedList.scss"

interface Options {
  /** 初始可见卡片数，同时也是每次滚动追加的批量大小 */
  batchSize: number
  /** 需要从 feeds 流中排除的 slug */
  excludeSlugs: string[]
  /** 摘要最大字数 */
  summaryLength: number
}

const defaultOptions: Options = {
  batchSize: 10,
  excludeSlugs: ["index", "en", "404"],
  summaryLength: 120,
}

const SENTENCE_BOUNDARIES = ["。", "？", "！", "；", ".", "?", "!"]

/**
 * 截取摘要：优先在句子边界截断，最多 maxLen 字，末尾补「…」。
 * 若最近的句子边界过于靠前（不足 maxLen 的一半），则直接硬截断。
 */
export function extractSummary(text: string | undefined, maxLen: number = 120): string {
  if (!text) return ""
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length === 0) return ""
  if (normalized.length <= maxLen) return normalized

  const truncated = normalized.slice(0, maxLen)
  const lastBoundary = Math.max(
    ...SENTENCE_BOUNDARIES.map((boundary) => truncated.lastIndexOf(boundary)),
  )
  const cut = lastBoundary > maxLen * 0.5 ? lastBoundary + 1 : maxLen
  return normalized.slice(0, cut).trim() + "…"
}

/** 时间优先取 modified，其次 published，最后 created */
function getFeedDate(page: QuartzPluginData): Date | undefined {
  return page.dates?.modified ?? page.dates?.published ?? page.dates?.created
}

/** 封面图：socialImage / image / cover，有则用，没有就不渲染 */
function getCoverImage(page: QuartzPluginData): string | undefined {
  const frontmatter = page.frontmatter as Record<string, unknown> | undefined
  const raw = frontmatter?.socialImage ?? frontmatter?.image ?? frontmatter?.cover
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined
}

export default ((userOpts?: Partial<Options>) => {
  const FeedList: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const excluded = new Set(opts.excludeSlugs)

    const pages = allFiles
      .filter((page) => {
        const slug = page.slug
        if (!slug) return false
        if (excluded.has(slug)) return false
        if (slug.endsWith("/index")) return false
        if (slug.startsWith("tags/")) return false
        const title = page.frontmatter?.title
        return typeof title === "string" && title.trim().length > 0
      })
      .sort((a, b) => {
        const aTime = getFeedDate(a)?.getTime() ?? 0
        const bTime = getFeedDate(b)?.getTime() ?? 0
        if (bTime !== aTime) return bTime - aTime
        return (a.frontmatter?.title ?? "").localeCompare(b.frontmatter?.title ?? "")
      })

    return (
      <div class={classNames(displayClass, "feed-list-container")}>
        <div class="feed-list" id="feed-list" data-batch-size={opts.batchSize}>
          {pages.map((page, i) => {
            const title = page.frontmatter!.title!
            const summary = extractSummary(
              page.frontmatter?.description ?? page.description,
              opts.summaryLength,
            )
            const imageUrl = getCoverImage(page)
            const date = getFeedDate(page)
            const href = resolveRelative(fileData.slug!, page.slug!)

            return (
              <article
                class={`feed-card${i >= opts.batchSize ? " feed-card--hidden" : ""}`}
                data-index={i}
              >
                {imageUrl && (
                  <a href={href} class="feed-card-image-link" aria-hidden="true" tabIndex={-1}>
                    <img class="feed-card-image" src={imageUrl} alt="" loading="lazy" />
                  </a>
                )}
                <div class="feed-card-body">
                  <a href={href} class="feed-card-title internal">
                    {title}
                  </a>
                  {summary && <p class="feed-card-summary">{summary}</p>}
                  {date && (
                    <span class="feed-card-date">
                      <DateComponent date={date} locale={cfg.locale} />
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
        <div class="feed-sentinel" id="feed-sentinel" aria-hidden="true"></div>
      </div>
    )
  }

  FeedList.css = style
  FeedList.afterDOMLoaded = script
  return FeedList
}) satisfies QuartzComponentConstructor
