import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/search.scss"
// @ts-ignore
import script from "./scripts/search.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { getPageUiLocale } from "../util/translations"

export interface SearchOptions {
  enablePreview: boolean
}

const defaultOptions: SearchOptions = {
  enablePreview: true,
}

export default ((userOpts?: Partial<SearchOptions>) => {
  const Search: QuartzComponent = ({ displayClass, cfg, fileData }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const locale = getPageUiLocale(fileData, cfg)
    const labels = i18n(locale).components.search
    const messages = locale.startsWith("zh")
      ? {
          close: "关闭搜索",
          loading: "正在加载搜索索引…",
          ready: "输入关键词以搜索文章",
          searching: "正在搜索…",
          error: "搜索暂时不可用，请刷新页面后重试",
          noResults: "没有找到结果",
          noResultsHint: "试试其他关键词？",
          resultCount: "找到 {count} 条结果",
          previewError: "预览暂时不可用，仍可打开文章",
        }
      : {
          close: "Close search",
          loading: "Loading search index…",
          ready: "Type to search articles",
          searching: "Searching…",
          error: "Search is unavailable. Please reload and try again.",
          noResults: "No results",
          noResultsHint: "Try another search term?",
          resultCount: "{count} results found",
          previewError: "Preview unavailable. You can still open the article.",
        }

    return (
      <div
        class={classNames(displayClass, "search")}
        data-loading={messages.loading}
        data-ready={messages.ready}
        data-searching={messages.searching}
        data-error={messages.error}
        data-no-results={messages.noResults}
        data-no-results-hint={messages.noResultsHint}
        data-result-count={messages.resultCount}
        data-preview-error={messages.previewError}
      >
        <button
          class="search-button"
          type="button"
          aria-label={labels.title}
          aria-haspopup="dialog"
          aria-expanded="false"
        >
          <p>{labels.title}</p>
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7">
            <g class="search-path" fill="none">
              <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4" />
              <circle cx="8" cy="8" r="7" />
            </g>
          </svg>
        </button>
        <div class="search-container">
          <div class="search-space" role="dialog" aria-modal="true" aria-label={labels.title}>
            <div class="search-input-row">
              <input
                autocomplete="off"
                class="search-bar"
                name="search"
                type="search"
                aria-label={labels.searchBarPlaceholder}
                placeholder={labels.searchBarPlaceholder}
              />
              <button
                class="search-close"
                type="button"
                aria-label={messages.close}
                title={messages.close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p class="search-status" role="status" aria-live="polite" aria-atomic="true"></p>
            <div class="search-layout" data-preview={opts.enablePreview}></div>
          </div>
        </div>
      </div>
    )
  }

  Search.afterDOMLoaded = script
  Search.css = style

  return Search
}) satisfies QuartzComponentConstructor
