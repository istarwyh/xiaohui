import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.ReadingProgress()],
  afterBody: [Component.MatrixBackground(), Component.MatrixDebug()],
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
      component: Component.CardFeed({
        cards: [
          { title: "全流开发", slug: "program/full-stream/Full-Stream", imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop&q=80" },
          { title: "教育智慧", slug: "learning/wisdom/Education-Wisdom", imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=600&fit=crop&q=80" },
          { title: "团队效能", slug: "learning/Team-Efficiency", imageUrl: "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=600&fit=crop&q=80" },
          { title: "看见真相之后", slug: "learning/wisdom/After-I-Saw-The-Truth", imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop&q=80" },
          { title: "赛博农耕说明", slug: "Farming-in-the-cyber-world", imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop&q=80" },
          { title: "LangGraph State 的生命周期", slug: "program/llm/LangGraph-State-的生命周期", imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop&q=80" },
          { title: "向天地立心，对生民立命，继往圣之学，安当世之民", slug: "society/education/向天地立心，对生民立命，继往圣之学，安当世之民", imageUrl: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&h=600&fit=crop&q=80" },
          { title: "Agent Teams 的原理与实践", slug: "program/bot/Agent-Teams-的原理与实践", imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop&q=80" },
        ],
      }),
      condition: (page) => page.fileData.slug === "index",
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
