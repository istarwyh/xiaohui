import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { Date as DateComponent } from "./Date"
import { classNames } from "../util/lang"
import { getFeedImages } from "../util/feedImage"
import { getFeedDate, getFeedPages, getHomeUiLocale } from "../util/homePageModel"

// @ts-ignore
import script from "./scripts/feedList.inline"
import style from "./styles/feedList.scss"

export interface FeedListOptions {
  /** 初始可见卡片数，同时也是每次追加的批量大小 */
  batchSize: number
  /** 需要从 feeds 流中排除的 slug */
  excludeSlugs: string[]
  /** 摘要最大字数 */
  summaryLength: number
  /** Keep historical callers bilingual; editorial homes opt into their page language. */
  languageScope: "page" | "all"
  /** The explicit button remains usable even when automatic loading is enabled. */
  enhancement: "button" | "infinite"
}

const defaultOptions: FeedListOptions = {
  batchSize: 10,
  excludeSlugs: ["index", "en", "404"],
  summaryLength: 120,
  languageScope: "all",
  enhancement: "infinite",
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

export default ((userOpts?: Partial<FeedListOptions>) => {
  const FeedList: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    ctx,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const availableAssets = new Set<string>(ctx.allSlugs)
    const pages = getFeedPages(allFiles, {
      page: fileData,
      languageScope: opts.languageScope,
      excludeSlugs: opts.excludeSlugs,
    })
    const uiLocale = getHomeUiLocale(fileData)
    const copy =
      uiLocale === "en-US"
        ? {
            more: "Load more articles",
            status: "Showing {visible} of {total} articles · {remaining} remaining",
            added: "{added} more articles shown. {visible} of {total} articles are visible.",
            complete: "All {total} articles are shown",
            empty: "No articles in this language yet.",
          }
        : {
            more: "加载更多文章",
            status: "已显示 {visible} / {total} 篇，还剩 {remaining} 篇",
            added: "新增 {added} 篇文章，已显示 {visible} / {total} 篇。",
            complete: "已显示全部 {total} 篇文章",
            empty: "暂时还没有这个语言的文章。",
          }

    return (
      <div class={classNames(displayClass, "feed-list-container")}>
        <div
          class="feed-list"
          id="feed-list"
          data-batch-size={opts.batchSize}
          data-enhancement={opts.enhancement}
          data-status-template={copy.status}
          data-added-template={copy.added}
          data-complete-template={copy.complete}
        >
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
              <article class="feed-card" data-index={i}>
                <div class="feed-card-body">
                  <div class="feed-card-heading">
                    <a href={href} class="feed-card-title internal">
                      {title}
                    </a>
                    {date && (
                      <span class="feed-card-date">
                        <DateComponent date={date} locale={uiLocale} />
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
                            width={128}
                            height={96}
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
        {pages.length === 0 && <p class="feed-empty">{copy.empty}</p>}
        <div class="feed-controls" hidden>
          <p class="feed-status"></p>
          <button class="feed-load-more" type="button" aria-controls="feed-list">
            {copy.more}
          </button>
          <p class="feed-announcement" role="status" aria-live="polite" aria-atomic="true"></p>
        </div>
        <div class="feed-sentinel" aria-hidden="true" hidden></div>
      </div>
    )
  }

  FeedList.css = style
  FeedList.afterDOMLoaded = script
  return FeedList
}) satisfies QuartzComponentConstructor
