import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const isHomePage = (page: { fileData: { slug?: string } }) =>
  page.fileData.slug === "index" || page.fileData.slug === "en"

const bottomBreadcrumbs = Component.ConditionalRender({
  component: Component.Breadcrumbs(),
  condition: (page) => !isHomePage(page),
})

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.ReadingProgress()],
  afterBody: [],
  footer: Component.Footer({
    links: {
      关于我: "/Farming-in-the-cyber-world",
      成长时间线: "/journey",
      GitHub: "https://github.com/istarwyh",
      赛博农耕: "/Cyber-Farmer",
      成长会员: "/membership",
      RSS订阅: "/rss",
      AI加速我: "https://aispeeds.me",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.TerminalHome(),
      condition: isHomePage,
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isHomePage(page),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !isHomePage(page),
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => !isHomePage(page),
    }),
  ],
  afterBody: [bottomBreadcrumbs],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.RssLink() },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.LanguageSwitcher(),
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.TableOfContents()),
      condition: (page) => !isHomePage(page),
    }),
    Component.ConditionalRender({
      component: Component.QuoteExhibit(),
      condition: (page) => page.fileData.slug === "index",
    }),
  ],
  right: [
    Component.Graph({
      localGraph: {
        depth: 2,
        scale: 1,
        repelForce: 0.7,
        linkDistance: 40,
        fontSize: 0.7,
        focusOnHover: true,
      },
    }),
    Component.ExploreHint(),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.TerminalHome(),
      condition: isHomePage,
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isHomePage(page),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !isHomePage(page),
    }),
  ],
  afterBody: [bottomBreadcrumbs],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.RssLink() },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.LanguageSwitcher(),
  ],
  right: [],
}
