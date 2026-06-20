export interface FeaturedItem {
  slug: string
  title: string
  desc: string
}

export interface BadgeItem {
  text: string
}

export const identityBadges: BadgeItem[] = [
  { text: "北大 '21" },
  { text: "蚂蚁 P7 · Agent 专家" },
  { text: "百万 MAU「保险快查」Agent 负责人" },
  { text: "MCPAdvisor 作者" },
]

// 手选 pillar content：代表「晓灰 = AI Agent 实践者」的核心叙事
export const featuredItems: FeaturedItem[] = [
  {
    slug: "program/llm/相比层出不穷的 Agent 框架，不变的 Agent Protocol 是什么",
    title: "相比层出不穷的 Agent 框架，不变的 Agent Protocol 是什么",
    desc: "★ 超越 Agent Runtime 的不变协议",
  },
  {
    slug: "program/llm/从Claude Code到 OneAgent：如何做好上下文工程",
    title: "从 Claude Code 到 OneAgent：上下文工程年度总结",
    desc: "★ 我的 Agent 方法论",
  },
  {
    slug: "program/llm/从RAG到DeepResearch：复杂业务报告生成的上下文工程",
    title: "从 RAG 到 Deep Research：复杂业务报告生成的上下文工程",
    desc: "Agent 架构思考",
  },
  {
    slug: "program/practices/如何打造可靠的Agent系统",
    title: "如何打造可靠的 Agent 系统",
    desc: "工程化经验",
  },
  {
    slug: "program/llm/如何快速创建领域Agent - OneAgent + MCPs 范式",
    title: "OneAgent + MCPs：如何快速创建领域 Agent",
    desc: "蚂蚁保领域 Agent 落地实践",
  },
]

export const awards: BadgeItem[] = [
  { text: "2025 OceanBase AI 黑客松 · 二等奖（队长）" },
  { text: "2025 蚂蚁集团黑客松 · 三等奖（队长）" },
  { text: "首届阿里&蚂蚁 ATA · 个人 Agent 最佳实践奖" },
  { text: "2025 蚂蚁集团 · 年度优秀创作者" },
  { text: "财保 ACE · AI 先锋 / 财保技术部 · AI 年度之星" },
]
