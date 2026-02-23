import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { SimpleSlug } from "./quartz/util/path"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.ReadingProgress()],
  afterBody: [
    Component.ConditionalRender({
      component: Component.CardFeed({
        cards: [
          { title: "全流开发", slug: "program/full-stream/Full-Stream", gradient: "linear-gradient(135deg, #1a3a2a, #2d6a4f)" },
          { title: "教育智慧", slug: "learning/wisdom/Education-Wisdom", gradient: "linear-gradient(135deg, #2b2d42, #8d99ae)" },
          { title: "团队效能", slug: "learning/Team-Efficiency", gradient: "linear-gradient(135deg, #3a2e1f, #b08968)" },
          { title: "看见真相之后", slug: "learning/wisdom/After-I-Saw-The-Truth", gradient: "linear-gradient(135deg, #1b263b, #415a77)" },
          { title: "赛博农耕说明", slug: "Farming-in-the-cyber-world", gradient: "linear-gradient(135deg, #0d1b2a, #1b998b)" },
          { title: "Claude Code 最佳实践", slug: "program/bot/【万字长文】-最强-AI-Coding：Claude-Code-最佳实践", gradient: "linear-gradient(135deg, #2d1b3d, #7b2d8e)" },
          { title: "Loop 与 Agent Loop", slug: "program/full-stream/如何放心-100-percent-AI-交付需求(2)----Loop-与-Agent-Loop", gradient: "linear-gradient(135deg, #1a1a2e, #e94560)" },
          { title: "端到端测试", slug: "program/full-stream/如何放心-100-percent-AI-交付需求-(1)----端到端测试", gradient: "linear-gradient(135deg, #0b3d3d, #00796b)" },
        ],
      }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.RecentNotes({
        title: "最近更新",
        limit: 5,
        showTags: true,
        linkToMore: "program/" as SimpleSlug,
        filter: (f) => f.slug !== "index",
      }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.MatrixBackground(),
    Component.MatrixDebug(),
  ],
  footer: Component.Footer({
    links: {
      关于我: "/Farming-in-the-cyber-world",
      GitHub: "https://github.com/istarwyh",
      赛博农耕: "/Cyber-Farmer",
      AI加速我: "https://aispeeds.me",
      成为会员: "/membership",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
