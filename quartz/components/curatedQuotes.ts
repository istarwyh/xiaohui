export interface CuratedQuote {
  role: "hook" | "seed" | "judgment" | "method" | "delivery"
  quote: string
  sourceExcerpt: string
  articleTitle: string
  articlePath: string
  articleHref: string
  lineStart: number
  lineEnd: number
  curatorReason: string
}

export interface BackupCuratedQuote {
  quote: string
  sourceExcerpt: string
  articleTitle: string
  articlePath: string
  articleHref: string
  lineStart: number
  lineEnd: number
  curatorReason: string
}

export interface CuratedQuoteCuration {
  theme: string
  slug: string
  curatorNote: string
  targetReader: string
  updatedAt: string
  quotes: CuratedQuote[]
  backupCandidates: BackupCuratedQuote[]
}

export const curatedQuoteCuration: CuratedQuoteCuration = {
  theme: "好的想法是显而易见的",
  slug: "good-ideas-are-obvious",
  curatorNote:
    "这期策展把“好想法”从灵感拉回到判断：它不是凭空冒出来的，而是在大量想法、清晰问题、准确判断和低损耗交付中变得显而易见。",
  targetReader: "第一次进入这个数字花园、想理解作者如何看待想法、产品与 AI 交付的读者",
  updatedAt: "2026-05-31",
  quotes: [
    {
      role: "hook",
      quote: "好的想法是显而易见的。",
      sourceExcerpt: "好的想法是显而易见的。--保罗·格雷厄姆",
      articleTitle: "Aspiration",
      articlePath: "content/life/wisdom/Aspiration.md",
      articleHref: "/life/wisdom/Aspiration",
      lineStart: 11,
      lineEnd: 11,
      curatorReason: "用一句极短的判断直接点题：真正好的想法不是复杂包装，而是让人一眼意识到它对。",
    },
    {
      role: "seed",
      quote: "如果你想拥有好主意，你必须有许多主意。",
      sourceExcerpt: "如果你想拥有好主意，你必须有许多主意。--Linus Pauling",
      articleTitle: "Idea",
      articlePath: "content/life/wisdom/Idea.md",
      articleHref: "/life/wisdom/Idea",
      lineStart: 7,
      lineEnd: 7,
      curatorReason: "把“显而易见”从天才灵感改写成概率问题：足够多的想法，才会筛出真正清晰的那个。",
    },
    {
      role: "judgment",
      quote:
        "创造力也以判断力基础，由判断力引发 —— 知道什么是陈词滥调（坏的），什么是新鲜创意（好的），所以才有不同的选择。",
      sourceExcerpt:
        "创造力也以判断力基础，由判断力引发 —— 知道什么是陈词滥调（坏的），什么是新鲜创意（好的），所以才有不同的选择。",
      articleTitle: "Humor",
      articlePath: "content/life/wisdom/Humor.md",
      articleHref: "/life/wisdom/Humor",
      lineStart: 18,
      lineEnd: 18,
      curatorReason:
        "解释为什么好想法会显得“显而易见”：不是因为它普通，而是判断力已经把陈词滥调排除掉了。",
    },
    {
      role: "method",
      quote:
        "这是宏观的层面，为实际操作中，可行性分析在于强迫我们站在业务的角度去解决问题，去面对真正要解决的问题，而不是只顾着完美地解决某个被别人定义的问题。",
      sourceExcerpt:
        "这是宏观的层面，为实际操作中，可行性分析在于强迫我们站在业务的角度去解决问题，**去面对真正要解决的问题，而不是只顾着完美地解决某个被别人定义的问题。**",
      articleTitle: "Requirements Analysis",
      articlePath: "content/program/full-stream/Requirements Analysis.md",
      articleHref: "/program/full-stream/Requirements-Analysis",
      lineStart: 55,
      lineEnd: 55,
      curatorReason: "把抽象的好想法落到项目判断：显而易见的前提，是问题本身被重新定义准确。",
    },
    {
      role: "delivery",
      quote:
        "结果：没有协调成本，没有内部政治，没有被 PM 稀释的大胆版本。创始人的想法从脑子到发布，不经稀释。",
      sourceExcerpt:
        "**结果：没有协调成本，没有内部政治，没有被 PM 稀释的大胆版本。创始人的想法从脑子到发布，不经稀释。**",
      articleTitle: "AI-Native 产品团队：零协调成本的开发范式",
      articlePath: "content/program/full-stream/AI-Native 产品团队：零协调成本的开发范式.md",
      articleHref: "/program/full-stream/AI-Native-产品团队：零协调成本的开发范式",
      lineStart: 18,
      lineEnd: 18,
      curatorReason:
        "收束到这个站点的 AI Agent 主题：好想法不仅要被看见，还要尽可能低损耗地抵达交付。",
    },
  ],
  backupCandidates: [
    {
      quote:
        "每个出现的产品想法就像一个抛向我的棒球，我可以静静地看着它们飞过，什么也不做。一旦发现一个绝佳好球，再全力挥棒。",
      sourceExcerpt:
        "每个出现的产品想法就像一个抛向我的棒球，我可以静静地看着它们飞过，什么也不做。一旦发现一个绝佳好球，再全力挥棒。-- 巴菲特",
      articleTitle: "Choice",
      articlePath: "content/life/wisdom/Choice.md",
      articleHref: "/life/wisdom/Choice",
      lineStart: 8,
      lineEnd: 8,
      curatorReason: "它很适合补充“等待好球”的选择观，但第一版已经有足够完整的从灵感到交付动线。",
    },
  ],
}
