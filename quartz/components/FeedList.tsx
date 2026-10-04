import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date as DateComponent } from "./Date"
import { classNames } from "../util/lang"
import { getFeedImages } from "../util/feedImage"

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

export default ((userOpts?: Partial<Options>) => {
  const FeedList: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
    ctx,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const excluded = new Set(opts.excludeSlugs)
    const availableAssets = new Set<string>(ctx.allSlugs)

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
            const images = getFeedImages(page, fileData.slug!, availableAssets)
            const date = getFeedDate(page)
            const href = resolveRelative(fileData.slug!, page.slug!)

            return (
              <article
                class={`feed-card${i >= opts.batchSize ? " feed-card--hidden" : ""}`}
                data-index={i}
              >
                <div class="feed-card-body">
                  <div class="feed-card-heading">
                    <a href={href} class="feed-card-title internal">
                      {title}
                    </a>
                    {date && (
                      <span class="feed-card-date">
                        <DateComponent date={date} locale={cfg.locale} />
                      </span>
                    )}
                  </div>
                  {summary && <p class="feed-card-summary">{summary}</p>}
                  {images.length > 0 && (
                    <div class="feed-card-images">
                      {images.map((image) => (
                        <a
                          key={image.src}
                          href={href}
                          class="feed-card-image-link internal"
                          aria-label={title}
                          tabIndex={-1}
                        >
                          <img
                            class="feed-card-image"
                            src={image.src}
                            alt={image.alt}
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                      ))}
                    </div>
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
