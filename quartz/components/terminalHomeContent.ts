export interface FeaturedItem {
  slug: string
  title: string
  desc: string
}

export interface BadgeItem {
  text: string
}

export interface TerminalHomeCopy {
  titlebar: string
  whoamiLine: string
  whoamiDim: string
  aboutLabel: string
  journeyPitch: string
  journeyLinkText: string
  journeyDesc: string
  membershipPitch: string
  membershipLinkText: string
  membershipPrice: string
  searchPlaceholder: string
  searchAriaLabel: string
  featuredCommand: string
  recentCommand: string
  journeyCommand: string
  awardsCommand: string
  membershipCommand: string
}

export interface TerminalHomeContent {
  aboutSlug: string
  journeySlug: string
  membershipSlug: string
  badges: BadgeItem[]
  featuredItems: FeaturedItem[]
  awards: BadgeItem[]
  copy: TerminalHomeCopy
}

export const identityBadges: BadgeItem[] = [
  { text: "北大 '21" },
  { text: "蚂蚁 P7 · Agent 专家" },
  { text: "百万 MAU「保险快查」Agent 负责人" },
  { text: "MCPAdvisor 作者" },
  { text: "Agent 投资系统建设中" },
]

// 手选 pillar content：保留 Agent 工程身份，同时露出 Agent 投资系统的新主线
export const featuredItems: FeaturedItem[] = [
  {
    slug: "agent-investing",
    title: "Agent 投资系统",
    desc: "技术、投资与个人决策系统",
  },
  {
    slug: "invest/投资认识论-概率认知与仓位映射",
    title: "投资认识论：概率认知与仓位映射",
    desc: "把判断转成概率和仓位",
  },
  {
    slug: "invest/债权经济学投资框架",
    title: "债权经济学投资框架",
    desc: "先问钱从哪里来",
  },
  {
    slug: "program/llm/从RAG到DeepResearch：复杂业务报告生成的上下文工程",
    title: "从 RAG 到 Deep Research：复杂业务报告生成的上下文工程",
    desc: "可追溯研究链路",
  },
  {
    slug: "program/practices/如何打造可靠的Agent系统",
    title: "如何打造可靠的 Agent 系统",
    desc: "先可靠，再自动化",
  },
]

export const awards: BadgeItem[] = [
  { text: "2025 OceanBase AI 黑客松 · 二等奖（队长）" },
  { text: "2025 蚂蚁集团黑客松 · 三等奖（队长）" },
  { text: "首届阿里&蚂蚁 ATA · 个人 Agent 最佳实践奖" },
  { text: "2025 蚂蚁集团 · 年度优秀创作者" },
  { text: "财保 ACE · AI 先锋 / 财保技术部 · AI 年度之星" },
]

const englishBadges: BadgeItem[] = [
  { text: "Peking University '21" },
  { text: "Ant Group P7 · Agent specialist" },
  { text: "Lead of Insurance Quick Check Agent, 1M+ MAU" },
  { text: "Author of MCPAdvisor" },
]

const englishFeaturedItems: FeaturedItem[] = [
  {
    slug: "en/program/llm/agent-protocol",
    title: "What stays stable beneath fast-moving Agent frameworks?",
    desc: "Stable protocol boundaries beyond Agent runtimes",
  },
  {
    slug: "en/program/llm/context-engineering-from-claude-code-to-oneagent",
    title: "From Claude Code to OneAgent: context engineering",
    desc: "My Agent methodology",
  },
  {
    slug: "en/program/llm/deep-research-context-engineering",
    title: "From RAG to Deep Research: context engineering for reports",
    desc: "Agent architecture notes",
  },
  {
    slug: "en/program/practices/reliable-agent-systems",
    title: "How to build reliable Agent systems",
    desc: "Production engineering experience",
  },
  {
    slug: "en/program/llm/oneagent-mcps-domain-agent",
    title: "OneAgent + MCPs: fast domain Agent creation",
    desc: "Ant Insurance domain Agent practice",
  },
]

const englishAwards: BadgeItem[] = [
  { text: "2025 OceanBase AI Hackathon · Second Prize, team lead" },
  { text: "2025 Ant Group Hackathon · Third Prize, team lead" },
  { text: "First Alibaba & Ant ATA · Best Personal Agent Practice" },
  { text: "2025 Ant Group · Outstanding Creator of the Year" },
  { text: "Insurance ACE · AI Pioneer / AI Star of the Year" },
]

const zhHomeContent: TerminalHomeContent = {
  aboutSlug: "Farming-in-the-cyber-world",
  journeySlug: "journey",
  membershipSlug: "consulting",
  badges: identityBadges,
  featuredItems,
  awards,
  copy: {
    titlebar: "xiaohui@blog:~",
    whoamiLine: "晓灰 · 赛博农夫 · 写代码也写字",
    whoamiDim: "一个关于 AI Agent、工程实践、投资系统与长期学习的数字花园",
    aboutLabel: "关于我",
    journeyPitch: "比作品集更重要的是成长路径：求学、工程、业务、Agent，以及每次认知升级。",
    journeyLinkText: "查看晓灰的成长时间线",
    journeyDesc: "timeline · experience map",
    membershipPitch: "想更深入交流？AI Agent 落地诊断 · 1h 付费沟通。",
    membershipLinkText: "预约 Agent 诊断",
    membershipPrice: "$49 · 1h",
    searchPlaceholder: "search notes...",
    searchAriaLabel: "Search notes",
    featuredCommand: "cat ~/featured.md",
    recentCommand: "ls -lt ~/posts | head -6",
    journeyCommand: "cat ~/journey.md",
    awardsCommand: "cat ~/.awards",
    membershipCommand: "cat ~/consulting.md",
  },
}

const enHomeContent: TerminalHomeContent = {
  aboutSlug: "en/Farming-in-the-cyber-world",
  journeySlug: "en/journey",
  membershipSlug: "en/consulting",
  badges: englishBadges,
  featuredItems: englishFeaturedItems,
  awards: englishAwards,
  copy: {
    titlebar: "xiaohui@blog:~",
    whoamiLine: "Xiaohui · cyber farmer · engineer and essayist",
    whoamiDim: "A digital garden about AI Agents, engineering practice, and thinking",
    aboutLabel: "About me",
    journeyPitch:
      "More important than a portfolio is the path: education, engineering, business, Agents, and each upgrade in judgment.",
    journeyLinkText: "View Xiaohui's growth timeline",
    journeyDesc: "timeline · experience map",
    membershipPitch:
      "Want a deeper conversation? AI Agent delivery diagnosis · 1h paid conversation.",
    membershipLinkText: "Book an Agent diagnosis",
    membershipPrice: "$49 · 1h",
    searchPlaceholder: "search notes...",
    searchAriaLabel: "Search notes",
    featuredCommand: "cat ~/featured.md",
    recentCommand: "ls -lt ~/posts | head -6",
    journeyCommand: "cat ~/journey.md",
    awardsCommand: "cat ~/.awards",
    membershipCommand: "cat ~/consulting.md",
  },
}

export function getTerminalHomeContent(lang: string | undefined): TerminalHomeContent {
  return lang?.startsWith("en") ? enHomeContent : zhHomeContent
}
