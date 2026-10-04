import { QuartzComponent, QuartzComponentConstructor } from "./types"
import FeedList from "./FeedList"
import { getHomeContent } from "./home/homeContent"
import { getPageLocale, resolveHomeItems, HomeDiagnostic } from "../util/homePageModel"
import { brandMarkPaths } from "../design/brandAssets"
import { FullSlug, resolveRelative } from "../util/path"
import { concatenateResources } from "../util/resources"
import style from "./styles/homePage.scss"
// @ts-ignore
import script from "./scripts/homePage.inline"

export default (() => {
  const Feed = FeedList({ languageScope: "page", enhancement: "button" })
  const HomePage: QuartzComponent = (props) => {
    const { fileData, allFiles } = props
    const locale = getPageLocale(fileData)
    const en = locale === "en"
    const content = getHomeContent(locale)
    const diagnostics: HomeDiagnostic[] = []
    const resolve = (items: typeof content.featured, location: string) =>
      resolveHomeItems(items, allFiles, fileData.slug!, { location, diagnostics })
    const featured = resolve(content.featured, "featured")
    const paths = resolve(content.paths, "paths")
    const aboutLinks = resolve(content.aboutLinks, "aboutLinks")
    for (const diagnostic of diagnostics)
      console.warn(`[HomePage:${fileData.slug}] ${diagnostic.message}`)
    const about = aboutLinks.find((item) => item.id === "about")!
    const labels = content.labels
    return (
      <div class="home-page">
        <section class="home-hero" aria-labelledby="home-title">
          <div class="home-hero-copy">
            <p class="home-eyebrow">
              <span aria-hidden="true">~/</span> {labels.garden}
            </p>
            <h1 id="home-title">{content.identity.whoamiLine}</h1>
            <p class="home-intro">{content.identity.whoamiDim}</p>
            <p class="home-work-context">{content.workContext}</p>
            <div class="home-actions">
              <a class="home-primary" href="#featured" data-no-popover data-router-ignore>
                {labels.read} <span aria-hidden="true">↓</span>
              </a>
              <a class="internal home-secondary" href={about.href}>
                {about.label} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div class="home-hero-note" aria-hidden="true">
            <span class="home-note-label">XIAOHUI / FIELD NOTES</span>
            <svg viewBox="0 0 64 64" width="160" height="160">
              <path class="home-mark-dawn" d={brandMarkPaths.dawn} />
              <g
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d={brandMarkPaths.pages} />
                <path d={brandMarkPaths.fold} />
              </g>
            </svg>
            <p>{en ? "The sun will rise." : "太阳总会升起"}</p>
          </div>
        </section>
        {featured.length > 0 && (
          <section
            class="home-featured home-section"
            id="featured"
            tabIndex={-1}
            aria-labelledby="featured-title"
          >
            <div class="home-section-heading">
              <h2 id="featured-title">{labels.selected}</h2>
              <p>{labels.selectedIntro}</p>
            </div>
            <div class="home-featured-grid">
              {featured.map((item, i) => (
                <a class="home-featured-item internal" href={item.href}>
                  <span class="home-featured-meta">
                    <span class="home-item-number">0{i + 1}</span>
                    {content.featuredCategories[item.id]}
                  </span>
                  <h3>{item.label}</h3>
                  {item.note && <p>{item.note}</p>}
                  <span class="home-item-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
        {paths.length > 0 && (
          <section class="home-paths home-section" aria-labelledby="paths-title">
            <h2 id="paths-title">{labels.paths}</h2>
            <div class="home-paths-grid">
              {paths.map((item) => (
                <a class="internal home-path" href={item.href}>
                  <span>
                    {item.label} <span aria-hidden="true">→</span>
                  </span>
                  {item.note && <small>{item.note}</small>}
                </a>
              ))}
            </div>
          </section>
        )}
        <section
          class="home-writing home-section"
          id="writing"
          tabIndex={-1}
          aria-labelledby="writing-title"
        >
          <div class="home-section-heading home-writing-heading">
            <div>
              <h2 id="writing-title">{labels.writing}</h2>
              <p>{labels.order}</p>
            </div>
            <a class="home-rss" href={resolveRelative(fileData.slug!, "rss" as FullSlug)}>
              {labels.rss} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <Feed {...props} />
        </section>
        <section
          class="home-about home-section"
          id="about"
          tabIndex={-1}
          aria-labelledby="about-title"
        >
          <div>
            <p class="home-eyebrow">XIAOHUI / {en ? "KEEP IN TOUCH" : "保持交流"}</p>
            <h2 id="about-title">{labels.about}</h2>
          </div>
          <nav aria-label={en ? "About Xiaohui" : "了解晓灰"}>
            {aboutLinks.map((item) => (
              <a href={item.href} class={item.kind === "page" ? "internal" : "external"}>
                {item.label}
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
        </section>
      </div>
    )
  }
  HomePage.css = concatenateResources(style, Feed.css)
  HomePage.afterDOMLoaded = concatenateResources(script, Feed.afterDOMLoaded)
  HomePage.beforeDOMLoaded = Feed.beforeDOMLoaded
  return HomePage
}) satisfies QuartzComponentConstructor
