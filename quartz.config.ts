import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { xiaohuiTheme } from "./quartz/design/tokens"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "🌥️ 晓灰",
    pageTitleSuffix: " | AI Agent · MCP 实践者",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "zh-CN",
    baseUrl: "xiaohui.cool",
    ignorePatterns: [
      "private",
      "templates",
      ".obsidian",
      "*.canvas",
      "claude-code-*.html",
      "CLAUDE.md",
      "AGENTS.md",
    ],
    defaultDateType: "created",
    theme: xiaohuiTheme,
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.TableOfContents(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.CrawlLinks({
        markdownLinkResolution: "shortest",
        prettyLinks: true,
        openLinksInNewTab: false,
      }),
      Plugin.Latex({
        renderEngine: "katex",
        katexOptions: {
          throwOnError: false,
          strict: false,
        },
      }),
      Plugin.Description(),
    ],
    filters: [
      Plugin.RemoveDrafts(),
      // Plugin.ExplicitPublish(),
    ],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
        rssLimit: 20,
        rssFullHtml: true,
      }),
      Plugin.AgentIndex({
        siteDescription:
          "晓灰的公开数字花园，聚焦 AI Agent、MCP、软件工程、Agent 投资系统、学习、社会观察与个人思考。",
      }),
      Plugin.CustomOgImages({
        colorScheme: "lightMode",
        width: 1200,
        height: 630,
        excludeRoot: false,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
