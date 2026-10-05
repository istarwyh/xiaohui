import { QuartzComponent, QuartzComponentConstructor } from "./types"
import Search from "./Search"
import Darkmode from "./Darkmode"
import LanguageSwitcher from "./LanguageSwitcher"
import { brandMarkPaths } from "../design/brandAssets"
import { concatenateResources } from "../util/resources"
import { getHomeUiLocale } from "../util/homePageModel"
import { resolveRelative, FullSlug } from "../util/path"
import style from "./styles/homeHeader.scss"
// @ts-ignore
import script from "./scripts/homeHeader.inline"

export default (() => {
  const SearchControl = Search({ enablePreview: false })
  const ThemeControl = Darkmode()
  const LanguageControl = LanguageSwitcher()
  const HomeHeader: QuartzComponent = (props) => {
    const en = getHomeUiLocale(props.fileData) === "en-US"
    const home = resolveRelative(props.fileData.slug!, (en ? "en" : "index") as FullSlug)
    const links = [
      ["#featured", en ? "Selected" : "精选"],
      ["#writing", en ? "Writing" : "文章"],
      ["#about", en ? "About" : "关于"],
    ]
    return (
      <header class="home-header">
        <a
          class="home-wordmark internal"
          href={home}
          aria-label={en ? "Xiaohui · Home" : "晓灰 · 首页"}
        >
          <svg viewBox="0 0 64 64" aria-hidden="true" width="40" height="40">
            <path class="home-mark-dawn" d={brandMarkPaths.dawn} />
            <g
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d={brandMarkPaths.pages} />
              <path d={brandMarkPaths.fold} />
            </g>
          </svg>
          <span>{en ? "Xiaohui" : "晓灰"}</span>
        </a>
        <nav class="home-nav" aria-label={en ? "Main navigation" : "主导航"}>
          {links.map(([href, label]) => (
            <a href={href} data-no-popover data-router-ignore>
              {label}
            </a>
          ))}
        </nav>
        <div class="home-tools" hidden>
          <SearchControl {...props} />
          <ThemeControl {...props} />
        </div>
        <details class="home-menu">
          <summary>
            {en ? "Menu" : "菜单"}
            <span aria-hidden="true">＋</span>
          </summary>
          <div class="home-menu-panel">
            <nav aria-label={en ? "Page sections" : "页面栏目"}>
              {links.map(([href, label]) => (
                <a href={href} data-no-popover data-router-ignore>
                  {label}
                </a>
              ))}
            </nav>
            <LanguageControl {...props} />
            <a href={resolveRelative(props.fileData.slug!, "rss" as FullSlug)}>
              {en ? "Subscribe via RSS" : "RSS 订阅"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </details>
      </header>
    )
  }
  const controls = [SearchControl, ThemeControl, LanguageControl]
  HomeHeader.css = concatenateResources(style, ...controls.map((c) => c.css))
  HomeHeader.beforeDOMLoaded = concatenateResources(...controls.map((c) => c.beforeDOMLoaded))
  HomeHeader.afterDOMLoaded = concatenateResources(script, ...controls.map((c) => c.afterDOMLoaded))
  return HomeHeader
}) satisfies QuartzComponentConstructor
