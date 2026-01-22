---
title: 太阳总会升起
aliases:
  - index
  - home
---

<div class="manifesto">
  <p class="manifesto-text">我相信技术是一种思维方式，而不仅仅是工具。</p>
</div>

<div class="intro-block">
  <div class="intro-left">
    <span class="label">关于</span>
    <h1>晓灰</h1>
    <p class="role">AI Agent · 分布式系统 · 数据库</p>
  </div>
  <div class="intro-right">
    <p>我在蚂蚁集团负责 AI Agent 的架构设计与落地。此前在淘宝做过财务中台、知识库与问答系统。我对「如何让机器更好地理解世界」这件事有持续的好奇心。</p>
    <p class="intro-links">
      <a href="/Farming-in-the-cyber-world">关于我 →</a>
      <a href="/membership">私人成长会员 →</a>
    </p>
  </div>
</div>

<div class="expertise-section">
  <div class="expertise-item">
    <span class="expertise-number">01</span>
    <h3>AI Agent</h3>
    <p>从 ReAct 到 OneAgent + MCPs，探索智能体的架构范式演进。在生产环境中落地案件分析、赔付率异动分析等 Agent 应用。</p>
    <a href="/program/llm/如何快速创建领域Agent---OneAgent-+-MCPs-范式" class="expertise-link">阅读文章 →</a>
  </div>
  <div class="expertise-item">
    <span class="expertise-number">02</span>
    <h3>数据库与分布式系统</h3>
    <p>从 MySQL 到 NewSQL，理解不同数据库的设计哲学。分布式一致性、分片策略、存算分离架构的实践经验。</p>
    <a href="/program/database/How-to-Choose-the-Suitable-Database" class="expertise-link">阅读文章 →</a>
  </div>
  <div class="expertise-item">
    <span class="expertise-number">03</span>
    <h3>工程实践</h3>
    <p>不追求「正确」的架构，只追求「合适」的解法。在大厂的踩坑与反思中，积累了一些可能对你有用的经验。</p>
    <a href="/program/llm/痛定思痛，AI-Agent-给我的教训" class="expertise-link">阅读文章 →</a>
  </div>
</div>

<div class="section-divider"></div>

<div class="section-header">
  <span class="section-label">SELECTED WORKS</span>
  <h2>精选文章</h2>
</div>

<!-- This page uses the CardFeed component defined in quartz/components/CardFeed.tsx -->
<!-- Card data is injected via the layout configuration in quartz.layout.ts -->

<div id="card-feed-placeholder">
  <!-- Cards will be rendered here by the CardFeed component -->
</div>

<div class="closing-note">
  <blockquote>
    「先线下再线上、先 SOP 再 RPA、先 RPA 再 Agent」<br/>
    <span class="quote-source">—— 我在 AI Agent 实践中总结的顺口溜</span>
  </blockquote>
  <p class="closing-text">如果你对我的分享感兴趣，欢迎 <a href="/membership">加入私人成长会员</a>，我们可以更深入地交流。</p>
</div>

<script async src="https://d3kno6bpmj270m.cloudfront.net/widget/userdesk.js" data-userdesk="clsok8vng0001aihcgmmbxfos"></script>

<script type="text/javascript"> (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window, document, "clarity", "script", "l799n31rgg"); </script>

<style>
/* Brutalist / NYT-inspired Design */

/* Manifesto */
.manifesto {
  border-top: 3px solid var(--dark);
  border-bottom: 1px solid var(--lightgray);
  padding: 2rem 0;
  margin-bottom: 3rem;
}

.manifesto-text {
  font-size: 1.5rem;
  font-weight: 300;
  font-style: italic;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--darkgray);
}

/* Intro Block */
.intro-block {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
  margin-bottom: 4rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid var(--lightgray);
}

.intro-left .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gray);
  display: block;
  margin-bottom: 0.5rem;
}

.intro-left h1 {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1;
}

.intro-left .role {
  font-size: 0.9rem;
  color: var(--gray);
  margin-top: 1rem;
}

.intro-right p {
  font-size: 1.1rem;
  line-height: 1.8;
  margin: 0 0 1rem 0;
}

.intro-links {
  display: flex;
  gap: 2rem;
}

.intro-links a {
  font-size: 0.9rem;
  color: var(--dark);
  text-decoration: none;
  border-bottom: 1px solid var(--dark);
  padding-bottom: 2px;
  transition: border-color 0.2s;
}

.intro-links a:hover {
  border-color: var(--gray);
}

/* Expertise Section */
.expertise-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 4rem;
}

.expertise-item {
  padding: 1.5rem 0;
  border-top: 2px solid var(--dark);
}

.expertise-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray);
  display: block;
  margin-bottom: 1rem;
}

.expertise-item h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.01em;
}

.expertise-item p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--darkgray);
  margin: 0 0 1rem 0;
}

.expertise-link {
  font-size: 0.85rem;
  color: var(--dark);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.expertise-link:hover {
  border-bottom-color: var(--dark);
}

/* Section Divider */
.section-divider {
  height: 1px;
  background: var(--lightgray);
  margin: 2rem 0;
}

/* Section Header */
.section-header {
  margin-bottom: 2rem;
}

.section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--gray);
  display: block;
  margin-bottom: 0.5rem;
}

.section-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

/* Closing Note */
.closing-note {
  margin-top: 4rem;
  padding: 3rem 0;
  border-top: 1px solid var(--lightgray);
}

.closing-note blockquote {
  font-size: 1.3rem;
  font-style: italic;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  padding-left: 1.5rem;
  border-left: 3px solid var(--dark);
}

.quote-source {
  font-size: 0.9rem;
  font-style: normal;
  color: var(--gray);
}

.closing-text {
  font-size: 1rem;
  color: var(--darkgray);
  margin: 0;
}

.closing-text a {
  color: var(--dark);
  text-decoration: none;
  border-bottom: 1px solid var(--dark);
}

/* Responsive */
@media (max-width: 768px) {
  .manifesto-text {
    font-size: 1.2rem;
  }
  
  .intro-block {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .intro-left h1 {
    font-size: 2.5rem;
  }
  
  .expertise-section {
    grid-template-columns: 1fr;
  }
  
  .intro-links {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>

<!--
Card Feed Data (for quartz.layout.ts):

Component.CardFeed({
  cards: [
    { title: "全流开发", slug: "program/full-stream/Full-Stream", imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop&q=80" },
    { title: "教育智慧", slug: "learning/wisdom/Education-Wisdom", imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=600&fit=crop&q=80" },
    { title: "团队效能", slug: "learning/Team-Efficiency", imageUrl: "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=600&fit=crop&q=80" },
    { title: "看见真相之后", slug: "learning/wisdom/After-I-Saw-The-Truth", imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop&q=80" },
    { title: "赛博农耕说明", slug: "Farming-in-the-cyber-world", imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop&q=80" },
    { title: "Truth", slug: "life/wisdom/Truth", imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop&q=80" },
    { title: "【万字长文】 最强 AI Coding：Claude Code 最佳实践", slug: "program/bot/【万字长文】-最强-AI-Coding：Claude-Code-最佳实践", imageUrl: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&h=600&fit=crop&q=80" },
    { title: "【年度总结】从Claude Code到 OneAgent：最佳Agent 构建实践全解析", slug: "program/llm/【年度总结】从Claude-Code到-OneAgent：最佳Agent-构建实践全解析", imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop&q=80" }
  ]
})
-->
