import { getTerminalHomeContent } from "../terminalHomeContent"
import type { CuratedHomeItem, HomeLocale } from "../../util/homePageModel"

/** Editorial choices reuse the existing authored identity and pillar-content copy. */
export function getHomeContent(locale: HomeLocale) {
  const en = locale === "en"
  const legacy = getTerminalHomeContent(locale)
  const featured = (en ? [3, 2, 0] : [4, 3, 0]).map((index, position): CuratedHomeItem => {
    const item = legacy.featuredItems[index]
    return {
      id: `selected-${position + 1}`,
      target: { kind: "page", slug: item.slug },
      label: item.title,
      note: item.desc,
      required: !en,
    }
  })
  const paths: CuratedHomeItem[] = en
    ? [
        {
          id: "engineering",
          target: {
            kind: "page",
            slug: "en/program/llm/context-engineering-from-claude-code-to-oneagent",
          },
          label: "Engineering & Agents",
          note: "Context engineering in practice",
        },
        {
          id: "investing",
          target: { kind: "page", slug: "agent-investing" },
          label: "Investment systems · 中文",
          note: "A personal research system in progress",
        },
        {
          id: "learning",
          target: { kind: "page", slug: legacy.journeySlug },
          label: "Writing & learning",
          note: "Follow the growth timeline",
        },
      ]
    : [
        {
          id: "engineering",
          target: {
            kind: "page",
            slug: "program/llm/从Claude Code到 OneAgent：如何做好上下文工程",
          },
          label: "工程与 Agent",
          note: "从上下文工程开始",
        },
        {
          id: "investing",
          target: { kind: "page", slug: "invest/投资认识论-概率认知与仓位映射" },
          label: "投资系统研究",
          note: "从概率认知与仓位映射开始",
        },
        {
          id: "learning",
          target: { kind: "page", slug: legacy.journeySlug },
          label: "写作与长期学习",
          note: "沿着成长时间线读下去",
        },
      ]
  const aboutLinks: CuratedHomeItem[] = [
    {
      id: "about",
      target: { kind: "page", slug: legacy.aboutSlug },
      label: legacy.copy.aboutLabel,
      required: true,
    },
    {
      id: "journey",
      target: { kind: "page", slug: legacy.journeySlug },
      label: en ? "Growth timeline" : "成长时间线",
    },
    {
      id: "github",
      target: { kind: "external", href: "https://github.com/istarwyh" },
      label: "GitHub",
    },
    {
      id: "consulting",
      target: { kind: "page", slug: legacy.membershipSlug },
      label: en ? "Agent diagnosis" : "Agent 诊断",
    },
  ]
  return {
    identity: legacy.copy,
    workContext: [legacy.badges[1].text, legacy.badges[3].text].join(" · "),
    featured,
    paths,
    aboutLinks,
    featuredCategories: Object.fromEntries(
      (en
        ? ["ENGINEERING", "CONTEXT", "PROTOCOLS"]
        : ["工程实践", "上下文工程", "建设中的研究系统"]
      ).map((category, i) => [`selected-${i + 1}`, category]),
    ),
    labels: {
      selected: en ? "A few places to begin" : "从这几篇开始",
      selectedIntro: en
        ? "Selected notes from my work."
        : "从真实的工程问题，到正在搭建的研究系统。",
      paths: en ? "Follow a thread" : "沿着一个主题读下去",
      writing: en ? "All writing" : "所有文章",
      order: en ? "Recently updated first" : "按最近更新排序",
      read: en ? "Start reading" : "开始阅读",
      about: en ? "About & conversation" : "关于与交流",
      rss: en ? "Subscribe via RSS" : "RSS 订阅",
      garden: en ? "A digital garden" : "一座持续生长的数字花园",
    },
  }
}
