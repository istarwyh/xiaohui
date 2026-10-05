import { getTerminalHomeContent } from "../terminalHomeContent"
import type { CuratedHomeItem, HomeLocale } from "../../util/homePageModel"

/** Authored reading paths, not an additional latest-post query. */
export function getHomeContent(locale: HomeLocale) {
  const en = locale === "en"
  const legacy = getTerminalHomeContent(locale)
  const note = (id: string, slug: string, label: string, description: string): CuratedHomeItem => ({
    id,
    target: { kind: "page", slug },
    label,
    note: description,
    required: true,
  })
  const featured: CuratedHomeItem[] = [
    note(
      "engineering-1",
      en
        ? "en/program/practices/reliable-agent-systems"
        : "program/practices/如何打造可靠的Agent系统",
      en ? "How to Build Reliable Agent Systems" : "如何打造可靠的 Agent 系统",
      en
        ? "Concurrency, sessions and runtimes for long-running services."
        : "从并发、会话到运行时，讨论 Agent 怎样成为长期运行的服务。",
    ),
    note(
      "engineering-2",
      en
        ? "en/program/llm/deep-research-context-engineering"
        : "program/llm/从RAG到DeepResearch：复杂业务报告生成的上下文工程",
      en ? "From RAG to Deep Research" : "从 RAG 到 Deep Research：复杂业务报告生成的上下文工程",
      en
        ? "Search, evidence and counter-evidence in a traceable research process."
        : "把搜索、取证与反证组织成一条可追溯的研究链路。",
    ),
    note(
      "learning-1",
      en
        ? "en/learning/training-yourself-into-who-you-want-to-be"
        : "learning/把自己训练成自己想要的人",
      en ? "Train Yourself Into the Person You Want to Be" : "把自己训练成自己想要的人",
      en
        ? "Notice automatic reactions, then design rules you can actually follow."
        : "从观察自动反应，到设计可执行的规则，练习主动塑造自己。",
    ),
    note(
      "learning-2",
      "learning/AI 杀死长期主义了吗",
      en ? "Is AI Killing Long-Term Thinking? · 中文" : "AI 杀死长期主义了吗？",
      en
        ? "Finding and adjusting what is worth a long-term commitment. Chinese essay."
        : "当技能不断贬值，怎样寻找、验证和调整值得长期投入的方向。",
    ),
    note(
      "investing-1",
      "society/个人投资的七步迭代框架",
      en ? "A Seven-Step Investment Framework · 中文" : "个人投资的七步迭代框架",
      en
        ? "Connect understanding, valuation, execution and review. Chinese essay."
        : "把认知、估值、执行与复盘接成持续校准的个人研究框架。",
    ),
    note(
      "investing-2",
      "invest/投资认识论-概率认知与仓位映射",
      en
        ? "From Probabilistic Beliefs to Position Sizing · 中文"
        : "投资认识论：概率认知与仓位映射",
      en
        ? "Make uncertainty explicit and revisit it with evidence. Chinese essay."
        : "把不确定的判断写清楚，再讨论仓位、证据与反馈怎样对应。",
    ),
  ]
  const paths: CuratedHomeItem[] = [
    {
      ...featured[0],
      id: "engineering",
      label: en ? "Real business" : "真实业务",
      note: en ? "Build Agents that can do the work." : "把 Agent 接进真实业务。",
    },
    {
      ...featured[2],
      id: "learning",
      label: en ? "Personal growth" : "个人成长",
      note: en ? "Expand your abilities through practice." : "用实践拓展自己的能力。",
    },
    {
      ...featured[4],
      id: "investing",
      label: en ? "Investing" : "投资研究",
      note: en ? "Let evidence test your judgment." : "让判断接受事实的检验。",
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
    featured,
    paths,
    aboutLinks,
    hero: {
      eyebrow: en ? "Xiaohui · engineer and writer" : "晓灰 · 写代码，也写字",
      lines: en
        ? ["Putting Agents into", "real business,", "growth & investing"]
        : ["把 Agent 做进", "真实业务、", "个人成长与投资"],
      intro: en
        ? "I build Agent systems for real work, and use code to expand my abilities and study investing. These are my projects, practice and ongoing ideas."
        : "在真实业务中构建 Agent，也用代码拓展个人能力、研究投资判断。这里是我的作品、实践与长期思考。",
      primary: en ? "Explore my work" : "看我的作品",
      secondary: en ? "Read my notes" : "读我的实践笔记",
      reach: en ? "1M+" : "百万",
      proof: en ? "Insurance Quick Check" : "保险快查",
      proofDetail: en ? "Agents in real business" : "Agent 真实业务实践",
      photoAlt: en ? "Public portrait of Xiaohui" : "晓灰的公开个人照片",
      caption: en ? "From ideas to real work." : "从想法，到真实现场。",
    },
    labels: {
      selected: en ? "Ideas, put into practice." : "把想法，做成作品。",
      moreWork: en ? "More work" : "更多作品",
      publicWork: en ? "Share what actually works." : "把真实实践，带到现场。",
      paths: en ? "Three threads I keep following." : "我持续探索的三条线。",
      writing: en ? "All writing" : "所有文章",
      writingIntro: en
        ? "Working notes, questions and ideas worth returning to. One continuously updated feed."
        : "工程里的问题，生活里的观察，以及值得反复校准的判断。都收在这一条文章流里。",
      order: en ? "Recently updated first" : "按最近更新排序",
      about: en ? "Keep the conversation going." : "继续交流，也继续生长。",
      aboutIntro: en
        ? "More about my background, how I got here, and the projects I work on."
        : "关于我的来路、正在做的事，以及一路上的成长与思考。",
      rss: en ? "Subscribe via RSS" : "RSS 订阅",
      curated: en ? "A place to begin" : "从这里读起",
    },
  }
}
