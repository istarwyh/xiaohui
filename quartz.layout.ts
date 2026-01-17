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
          {
            title: "全流开发",
            slug: "Full-Stream",
            imageUrl: "https://images.unsplash.com/842ofHC6MaI?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "教育智慧",
            slug: "Education-Wisdom",
            imageUrl: "https://images.unsplash.com/npxXWgQ33ZQ?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "团队效能",
            slug: "Team-Efficiency",
            imageUrl: "https://images.unsplash.com/Q1p7bh3SHj8?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "看见真相之后",
            slug: "After-I-Saw-The-Truth",
            imageUrl: "https://images.unsplash.com/4Mw7nkQDByk?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "赛博农耕说明",
            slug: "Farming-in-the-cyber-world",
            imageUrl: "https://images.unsplash.com/Im7lZjxeLhg?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "Truth",
            slug: "Truth",
            imageUrl: "https://images.unsplash.com/cckf4TsHAuw?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "【万字长文】 最强 AI Coding：Claude Code 最佳实践",
            slug: "【万字长文】 最强 AI Coding：Claude Code 最佳实践",
            imageUrl: "https://images.unsplash.com/FO7JIlwjOtU?w=800&h=600&fit=crop&q=80",
          },
          {
            title: "【年度总结】从Claude Code到 OneAgent：最佳Agent 构建实践全解析",
            slug: "【年度总结】从Claude Code到 OneAgent：最佳Agent 构建实践全解析",
            imageUrl: "https://images.unsplash.com/iar-afB0QQw?w=800&h=600&fit=crop&q=80",
          },
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
