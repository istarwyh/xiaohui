import { QuartzComponent, QuartzComponentConstructor } from "./types"
import FeedList from "./FeedList"
import { getHomeContent } from "./home/homeContent"
import { getPageLocale, resolveHomeItems, HomeDiagnostic } from "../util/homePageModel"
import { FullSlug, resolveRelative } from "../util/path"
import { concatenateResources } from "../util/resources"
import style from "./styles/homePage.scss"
// @ts-ignore
import script from "./scripts/homePage.inline"

const portrait =
  "https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260618165805272.png"
const talkPhoto =
  "https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/ai-maker-shanghai-agent-native-talk-20260912.jpg"
const mcpDemo =
  "https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202506221717969.png"
const talk = "https://aispeeds.me/shares/agent-native-product-ai-maker-shanghai"
const ccf = "https://www.ccf.org.cn/Activities/Training/TF/TF/2026-07-15/915112.shtml"

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
      console.warn("[HomePage:" + fileData.slug + "] " + diagnostic.message)
    const labels = content.labels
    const hero = content.hero
    const productShot = resolveRelative(
      fileData.slug!,
      "static/home-ai-speeds-products-82e18ee7.jpg" as FullSlug,
    )
    const portraitMask = resolveRelative(
      fileData.slug!,
      "static/home-portrait-mask-cb27f3ad.png" as FullSlug,
    )
    return (
      <div class="home-page" lang={en ? "en" : "zh-CN"}>
        <section class="home-hero" aria-labelledby="home-title">
          <div class="home-hero-copy">
            <p class="home-eyebrow">
              <span class="home-tiny-sun" aria-hidden="true" />
              {hero.eyebrow}
            </p>
            <h1 id="home-title">
              {hero.lines.map((line, i) => (
                <span class={i === 2 ? "home-display-accent" : undefined}>
                  {line}
                  {en && i < 2 ? " " : ""}
                </span>
              ))}
            </h1>
            <p class="home-intro">{hero.intro}</p>
            <div class="home-actions">
              <a class="home-primary" href="#featured" data-no-popover data-router-ignore>
                {hero.primary}
                <span aria-hidden="true">↗</span>
              </a>
              <a class="home-secondary" href="#writing" data-no-popover data-router-ignore>
                {hero.secondary}
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <a class="home-proof" href={talk}>
              <span class="home-proof-number">
                {hero.reach} <small>MAU</small>
              </span>
              <span class="home-proof-detail">
                {hero.proof}
                <br />
                {hero.proofDetail}
              </span>
              <span class="home-proof-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
          <div class="home-hero-visual">
            <div class="home-portrait-frame">
              <img
                class="home-portrait"
                style={{ maskImage: "url(" + portraitMask + ")" }}
                src={portrait}
                width="1254"
                height="1254"
                alt={hero.photoAlt}
                loading="eager"
                decoding="async"
              />
              <span class="home-portrait-signature" aria-hidden="true">
                晓灰
              </span>
            </div>
          </div>
        </section>
        <section
          class="home-featured home-section"
          id="featured"
          tabIndex={-1}
          aria-labelledby="featured-title"
        >
          <div class="home-section-heading">
            <div>
              <p class="home-kicker">SELECTED WORK / 01</p>
              <h2 id="featured-title">{labels.selected}</h2>
            </div>
            <a class="home-text-link" href="https://aispeeds.me">
              {labels.moreWork}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <article class="home-lead-case" aria-labelledby="ai-speeds-title">
            <div class="home-case-copy">
              <p class="home-case-eyebrow">{en ? "A portfolio in progress" : "持续建设的作品集"}</p>
              <h3 id="ai-speeds-title">
                AI Speeds
                <span>{en ? "Products, tools & public work" : "产品、工具与公开实践"}</span>
              </h3>
              <p class="home-case-description">
                {en
                  ? "From model access and AI workflows to whiteboards, recording summaries and wireframes. A home for products, tools and ideas I keep building and sharing."
                  : "从模型接入、AI 工作流，到白板、录音总结与线框图。这里放着我持续构建的产品、工具和公开分享。"}
              </p>
              <ul class="home-case-topics">
                <li>AI API {en ? "Gateway" : "网关"}</li>
                <li>cc4pm</li>
                <li>{en ? "Tools & talks" : "公开工具与分享"}</li>
              </ul>
              <a class="home-case-button" href="https://aispeeds.me">
                {en ? "Explore AI Speeds" : "探索 AI Speeds"}
                <span aria-hidden="true">↗</span>
              </a>
              <p class="home-case-footnote">aispeeds.me</p>
            </div>
            <figure class="home-case-visual">
              <div class="home-browser-frame">
                <div class="home-browser-top">
                  <span aria-hidden="true">● ● ●</span>
                  <span>aispeeds.me</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <img
                  src={productShot}
                  width="1165"
                  height="746"
                  loading="lazy"
                  decoding="async"
                  alt={
                    en
                      ? "Actual AI API Gateway section on the AI Speeds website"
                      : "AI Speeds 官网的 AI API 网关产品区实际截图"
                  }
                />
              </div>
              <figcaption>
                {en ? "AI Speeds website · AI API Gateway" : "AI Speeds 官网 · AI API 网关产品区"}
              </figcaption>
            </figure>
          </article>
          <div class="home-project-grid">
            <article
              class="home-project"
              id="home-project-insurance"
              aria-labelledby="insurance-title"
            >
              <p class="home-kicker">02 / {en ? "BUSINESS PRACTICE" : "业务实践"}</p>
              <h3 id="insurance-title">{en ? "Insurance Quick Check" : "保险快查"}</h3>
              <p>
                {en
                  ? "Agent engineering for an Ant Insurance product serving over a million monthly active users: product reports, quality scoring and evaluation workflows."
                  : "支持百万 MAU 的蚂蚁保产品，把通用 Agent 系统接进产品解读报告、质量评分与产品评测等生产链路。"}
              </p>
              <ul class="home-project-notes">
                <li>{en ? "Context supply" : "上下文供给"}</li>
                <li>{en ? "Reusable capabilities" : "可复用能力"}</li>
                <li>{en ? "Evaluation-driven iteration" : "评测驱动迭代"}</li>
              </ul>
              <a class="home-text-link" href={talk}>
                {en ? "Read the public case · 中文" : "看公开实践"}
                <span aria-hidden="true">↗</span>
              </a>
            </article>
            <article
              class="home-project"
              id="home-project-mcpadvisor"
              aria-labelledby="mcpadvisor-title"
            >
              <p class="home-kicker">03 / {en ? "OPEN SOURCE" : "开源成果"}</p>
              <h3 id="mcpadvisor-title">MCPAdvisor</h3>
              <p>
                {en
                  ? "An MCP tool for discovering and installing MCP servers, so useful tools are easier to find and connect to an Agent workflow."
                  : "一个帮助发现、推荐与安装 MCP 服务的 MCP，让合适的工具更容易被找到，接进 Agent 工作流。"}
              </p>
              <p class="home-project-evidence">
                {en
                  ? "2025 OceanBase AI Hackathon · Second Prize"
                  : "2025 OceanBase AI 黑客松 · 二等奖"}
              </p>
              <div class="home-project-links">
                <a class="home-text-link" href="https://github.com/istarwyh/mcpadvisor">
                  {en ? "Explore the repository" : "查看开源项目"}
                  <span aria-hidden="true">↗</span>
                </a>
                <a class="home-text-link" href={mcpDemo}>
                  {en ? "View the real demo" : "看实际演示"}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          </div>
        </section>
        <section
          class="home-public-work home-section"
          id="public-work"
          tabIndex={-1}
          aria-labelledby="public-work-title"
        >
          <div class="home-section-heading">
            <div>
              <p class="home-kicker">IN PUBLIC / 02</p>
              <h2 id="public-work-title">{labels.publicWork}</h2>
            </div>
          </div>
          <div class="home-talk-layout">
            <figure class="home-talk-photo">
              <img
                src={talkPhoto}
                width="1440"
                height="960"
                loading="lazy"
                decoding="async"
                alt={
                  en
                    ? "The room at Xiaohui's AI Maker Shanghai presentation"
                    : "AI Maker 上海公开分享现场"
                }
              />
              <figcaption>
                {en
                  ? "AI Maker Shanghai · September 12, 2026"
                  : "AI Maker 上海 · 2026 年 9 月 12 日"}
              </figcaption>
            </figure>
            <div class="home-talk-copy">
              <p class="home-kicker">AI MAKER SHANGHAI</p>
              <h3>{en ? "Building an Agent Native Product" : "构建 Agent Native Product"}</h3>
              <p>
                {en
                  ? "Using Insurance Quick Check to explore how context, collaboration protocols and evaluation connect to real delivery."
                  : "从保险快查出发，讲清上下文、协作协议与评测闭环如何连接真实交付。"}
              </p>
              <a class="home-text-link" href={talk}>
                {en ? "Read the slides & notes · 中文" : "看公开演示与逐页讲稿"}
                <span aria-hidden="true">↗</span>
              </a>
              <div class="home-talk-secondary">
                <p class="home-talk-meta">
                  CCF TF 179 · <time dateTime="2026-06-25">2026.06.25</time>
                </p>
                <h3>
                  {en
                    ? "Insurance Quick Check: Agent Native Practice"
                    : "保险快查 Agent Native 实践"}
                </h3>
                <p>
                  {en
                    ? "A talk in the CCF Technology Forum on Agents and financial innovation."
                    : "在“智能体加速金融创新”专题中，分享保险场景下的 Agent 构建方法。"}
                </p>
                <a class="home-text-link" href={ccf}>
                  {en ? "Read the CCF event recap · 中文" : "读 CCF 活动回顾"}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>
        <section
          class="home-paths home-section"
          id="paths"
          tabIndex={-1}
          aria-labelledby="paths-title"
        >
          <div class="home-section-heading">
            <div>
              <p class="home-kicker">ONGOING QUESTIONS / 03</p>
              <h2 id="paths-title">{labels.paths}</h2>
            </div>
          </div>
          <div class="home-paths-grid">
            {paths.map((item, i) => (
              <article class="home-path-column">
                <a class="internal home-path" href={item.href}>
                  <span class="home-path-number">0{i + 1}</span>
                  <h3>
                    {item.label}
                    <span aria-hidden="true">↗</span>
                  </h3>
                  <p>{item.note}</p>
                </a>
                <p class="home-curated-label">{labels.curated}</p>
                <div class="home-path-reading">
                  {featured
                    .filter((entry) => entry.id.startsWith(item.id + "-"))
                    .map((entry) => (
                      <a class="internal home-featured-item" href={entry.href}>
                        <h4>{entry.label}</h4>
                        <p>{entry.note}</p>
                      </a>
                    ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          class="home-writing home-section"
          id="writing"
          tabIndex={-1}
          aria-labelledby="writing-title"
        >
          <div class="home-writing-heading">
            <p class="home-kicker">FIELD NOTES / 04</p>
            <h2 id="writing-title">{labels.writing}</h2>
            <p>{labels.writingIntro}</p>
            <a class="home-rss" href={resolveRelative(fileData.slug!, "rss" as FullSlug)}>
              {labels.rss}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div class="home-writing-feed">
            <p class="home-feed-order">{labels.order}</p>
            <Feed {...props} />
          </div>
        </section>
        <section
          class="home-about home-section"
          id="about"
          tabIndex={-1}
          aria-labelledby="about-title"
        >
          <div>
            <p class="home-kicker">XIAOHUI / {en ? "KEEP IN TOUCH" : "保持交流"}</p>
            <h2 id="about-title">{labels.about}</h2>
            <p class="home-about-intro">{labels.aboutIntro}</p>
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
