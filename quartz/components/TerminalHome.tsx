import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { byDateAndAlphabetical } from "./PageList"
import { getDate } from "./Date"
// @ts-ignore
import script from "./scripts/terminalHome.inline"

interface CategoryItem {
  name: string
  slug: string
  desc: string
}

const categories: CategoryItem[] = [
  { name: "program/", slug: "program/", desc: "软件工程 · 架构 · AI" },
  { name: "learning/", slug: "learning/", desc: "阅读 · 思考 · 智慧" },
  { name: "life/", slug: "life/", desc: "生活经验 · 工具" },
  { name: "java/", slug: "java/", desc: "Java 技术笔记" },
  { name: "society/", slug: "society/", desc: "社会观察" },
  { name: "story/", slug: "story/", desc: "叙事随笔" },
]

interface FeaturedItem {
  slug: string
  title: string
  desc: string
}

// 手选 pillar content：代表「晓灰 = AI Agent 实践者」的核心叙事
const featured: FeaturedItem[] = [
  {
    slug: "program/llm/【年度总结】从Claude Code到 OneAgent：如何做好上下文工程",
    title: "从 Claude Code 到 OneAgent：上下文工程年度总结",
    desc: "★ 我的年度方法论",
  },
  {
    slug: "program/llm/如何快速创建领域Agent - OneAgent + MCPs 范式",
    title: "OneAgent + MCPs：如何快速创建领域 Agent",
    desc: "蚂蚁保 MCP 落地实践",
  },
  {
    slug: "program/llm/从指令到意图：AI Agent 架构范式演进史",
    title: "从指令到意图：AI Agent 架构范式演进史",
    desc: "Agent 架构思考",
  },
  {
    slug: "program/practices/如何打造可靠的Agent系统",
    title: "如何打造可靠的 Agent 系统",
    desc: "工程化经验",
  },
]

interface BadgeItem {
  text: string
}

const awards: BadgeItem[] = [
  { text: "2025 OceanBase AI 黑客松 · 二等奖（队长）" },
  { text: "2025 蚂蚁集团黑客松 · 三等奖（队长）" },
  { text: "首届阿里&蚂蚁 ATA · 个人 Agent 最佳实践奖" },
  { text: "2025 蚂蚁集团 · 年度优秀创作者" },
  { text: "财保 ACE · AI 先锋 / 财保技术部 · AI 年度之星" },
]

export default (() => {
  const TerminalHome: QuartzComponent = ({ fileData, allFiles, cfg }: QuartzComponentProps) => {
    const recentPages = allFiles
      .filter((f) => f.slug !== "index" && !f.slug?.startsWith("tags/"))
      .sort(byDateAndAlphabetical(cfg))
      .slice(0, 4)

    return (
      <div class="terminal-home">
        <div class="terminal-window">
          <div class="terminal-titlebar">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
            <span class="terminal-titlebar-text">xiaohui@blog:~</span>
          </div>
          <div class="terminal-body">
            {/* whoami */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">whoami</span>
              </div>
              <div class="terminal-output whoami-output">
                <p>晓灰 · 赛博农夫 · 写代码也写字</p>
                <p class="badge-line">
                  <span class="badge">北大 '21</span>
                  <span class="badge">蚂蚁 P7 · Agent 专家</span>
                  <span class="badge">百万 MAU「保险快查」Agent 负责人</span>
                  <span class="badge">MCPAdvisor 作者</span>
                </p>
                <p class="dim">
                  一个关于 AI Agent、工程实践与思考的数字花园 —{" "}
                  <a href={resolveRelative(fileData.slug!, "Farming-in-the-cyber-world" as any)}>
                    关于我
                  </a>
                </p>
              </div>
            </div>

            {/* journey */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">cat ~/journey.md</span>
              </div>
              <div class="terminal-output journey-output">
                <p class="journey-pitch">
                  比作品集更重要的是成长路径：求学、工程、业务、Agent，以及每次认知升级。
                </p>
                <a href={resolveRelative(fileData.slug!, "journey" as any)} class="journey-cta">
                  <span class="journey-marker">▸</span>
                  <span class="journey-link-text">查看晓灰的成长时间线</span>
                  <span class="journey-desc">timeline · experience map</span>
                </a>
              </div>
            </div>

            {/* awards */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">cat ~/.awards</span>
              </div>
              <div class="terminal-output awards-output">
                {awards.map((a) => (
                  <p class="award-item">
                    <span class="award-marker">★</span>
                    <span class="award-text">{a.text}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* featured */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">cat ~/featured.md</span>
              </div>
              <div class="terminal-output featured-output">
                {featured.map((f) => (
                  <a href={resolveRelative(fileData.slug!, f.slug as any)} class="featured-item">
                    <span class="featured-marker">▸</span>
                    <span class="featured-title">{f.title}</span>
                    <span class="featured-desc">{f.desc}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* ls ~/blog */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">ls ~/blog</span>
              </div>
              <div class="terminal-output ls-output">
                {categories.map((cat) => (
                  <a href={resolveRelative(fileData.slug!, cat.slug as any)} class="ls-item">
                    <span class="ls-perm">drwxr-x</span>
                    <span class="ls-name">{cat.name}</span>
                    <span class="ls-desc">{cat.desc}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* recent */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">recent --limit 4</span>
              </div>
              <div class="terminal-output recent-output">
                {recentPages.map((page) => {
                  const title = page.frontmatter?.title ?? "Untitled"
                  const date = getDate(cfg, page)
                  const dateStr = date
                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                    : "----------"
                  return (
                    <a href={resolveRelative(fileData.slug!, page.slug!)} class="recent-item">
                      <span class="recent-date">[{dateStr}]</span>
                      <span class="recent-title">{title}</span>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* membership */}
            <div class="terminal-block">
              <div class="terminal-prompt">
                <span class="prompt-symbol">{">"}</span>
                <span class="prompt-cmd">cat ~/membership.md</span>
              </div>
              <div class="terminal-output membership-output">
                <p class="membership-pitch">想更深入交流？1:1 咨询 · 私密社群 · 内推机会。</p>
                <a
                  href={resolveRelative(fileData.slug!, "membership" as any)}
                  class="membership-cta"
                >
                  <span class="membership-marker">▸</span>
                  <span class="membership-link-text">加入私人成长会员</span>
                  <span class="membership-price">$29 · 终身</span>
                </a>
              </div>
            </div>

            {/* search */}
            <div class="terminal-block terminal-search-block">
              <label class="terminal-prompt terminal-search-line">
                <span class="prompt-symbol">{">"}</span>
                <input
                  class="terminal-search-input"
                  type="search"
                  placeholder="search notes..."
                  autocomplete="off"
                  aria-label="Search notes"
                />
              </label>
              <div class="terminal-search-results" aria-live="polite"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  TerminalHome.afterDOMLoaded = script
  TerminalHome.css = `
.terminal-home {
  width: 100%;
  padding: 1rem 0;
}

.terminal-window {
  background: #1a1a2e;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 1px rgba(154, 205, 50, 0.3);
  border: 1px solid rgba(154, 205, 50, 0.15);
}

.terminal-titlebar {
  background: #0d0d1a;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(154, 205, 50, 0.1);
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red { background: #ff5f57; }
.terminal-dot.yellow { background: #febc2e; }
.terminal-dot.green { background: #28c840; }

.terminal-titlebar-text {
  color: #888;
  font-family: "Courier New", "Fira Code", monospace;
  font-size: 0.8rem;
  margin-left: 8px;
}

.terminal-body {
  padding: 1.5rem;
  font-family: "Courier New", "Fira Code", monospace;
}

.terminal-block {
  margin-bottom: 1.8rem;
}

.terminal-prompt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.prompt-symbol {
  color: #9acd32;
  font-weight: bold;
  font-size: 1rem;
}

.prompt-cmd {
  color: #e0e0e0;
  font-size: 0.95rem;
}

.terminal-output {
  padding-left: 1.2rem;
  line-height: 1.7;
}

/* whoami section */
.whoami-output p {
  margin: 0.3rem 0;
  color: #c8c8c8;
  font-size: 0.9rem;
}

.whoami-output .dim {
  color: #777;
  font-size: 0.85rem;
}

.whoami-output a {
  color: #9acd32 !important;
  text-decoration: none;
  border-bottom: 1px dashed rgba(154, 205, 50, 0.4);
  transition: all 0.2s;
}

.whoami-output a:hover {
  color: #b8e65c !important;
  border-bottom-color: #9acd32;
}

/* identity badges */
.whoami-output .badge-line {
  margin: 0.5rem 0 0.4rem !important;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.whoami-output .badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  font-size: 0.72rem;
  font-family: "Courier New", "Fira Code", monospace;
  color: #b8e65c;
  background: rgba(154, 205, 50, 0.08);
  border: 1px solid rgba(154, 205, 50, 0.25);
  border-radius: 3px;
  white-space: nowrap;
}

/* awards section */
.awards-output {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.award-item {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0 !important;
  padding: 0.15rem 0.5rem;
  font-size: 0.85rem !important;
}

.award-marker {
  color: #febc2e;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.award-text {
  color: #c8c8c8;
  font-size: 0.85rem;
}

/* featured section */
.featured-output {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.featured-item {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  text-decoration: none !important;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  flex-wrap: wrap;
}

.featured-item:hover {
  background: rgba(154, 205, 50, 0.08);
}

.featured-marker {
  color: #9acd32;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.featured-title {
  color: #e0e0e0;
  font-size: 0.92rem;
  font-weight: 600;
}

.featured-item:hover .featured-title {
  color: #b8e65c;
  text-shadow: 0 0 6px rgba(154, 205, 50, 0.3);
}

.featured-desc {
  color: #777;
  font-size: 0.78rem;
}

/* ls section */
.ls-output {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ls-item {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  text-decoration: none !important;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.ls-item:hover {
  background: rgba(154, 205, 50, 0.08);
}

.ls-perm {
  color: #666;
  font-size: 0.8rem;
  flex-shrink: 0;
  width: 5.5em;
}

.ls-name {
  color: #64b5f6;
  font-size: 0.9rem;
  font-weight: 600;
  flex-shrink: 0;
  min-width: 8em;
}

.ls-item:hover .ls-name {
  color: #90caf9;
  text-shadow: 0 0 6px rgba(100, 181, 246, 0.3);
}

.ls-desc {
  color: #777;
  font-size: 0.8rem;
}

/* recent section */
.recent-output {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.recent-item {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  text-decoration: none !important;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.recent-item:hover {
  background: rgba(154, 205, 50, 0.08);
}

.recent-date {
  color: #666;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.recent-title {
  color: #9acd32;
  font-size: 0.9rem;
}

.recent-item:hover .recent-title {
  color: #b8e65c;
  text-shadow: 0 0 6px rgba(154, 205, 50, 0.3);
}

/* journey section */
.journey-output {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.journey-pitch {
  margin: 0 !important;
  color: #c8c8c8;
  font-size: 0.85rem !important;
}

.journey-cta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  text-decoration: none !important;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(100, 181, 246, 0.35);
  border-radius: 4px;
  transition: all 0.2s;
  width: fit-content;
}

.journey-cta:hover {
  background: rgba(100, 181, 246, 0.08);
  border-color: rgba(100, 181, 246, 0.65);
}

.journey-marker {
  color: #64b5f6;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.journey-link-text {
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
}

.journey-cta:hover .journey-link-text {
  color: #90caf9;
  text-shadow: 0 0 6px rgba(100, 181, 246, 0.3);
}

.journey-desc {
  color: #777;
  font-size: 0.78rem;
}

/* membership section */
.membership-output {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.membership-pitch {
  margin: 0 !important;
  color: #c8c8c8;
  font-size: 0.85rem !important;
}

.membership-cta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  text-decoration: none !important;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(154, 205, 50, 0.3);
  border-radius: 4px;
  transition: all 0.2s;
  width: fit-content;
}

.membership-cta:hover {
  background: rgba(154, 205, 50, 0.1);
  border-color: rgba(154, 205, 50, 0.6);
}

.membership-marker {
  color: #9acd32;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.membership-link-text {
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
}

.membership-cta:hover .membership-link-text {
  color: #b8e65c;
  text-shadow: 0 0 6px rgba(154, 205, 50, 0.3);
}

.membership-price {
  color: #777;
  font-size: 0.78rem;
}

/* terminal search */
.terminal-search-block {
  margin-bottom: 0;
}

.terminal-search-line {
  margin-bottom: 0.7rem;
}

.terminal-search-input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e0e0e0;
  font: inherit;
  caret-color: #9acd32;
}

.terminal-search-input::placeholder {
  color: #666;
}

.terminal-search-input::-webkit-search-cancel-button {
  display: none;
}

.terminal-search-results {
  display: none;
  padding-left: 1.2rem;
}

.terminal-search-results.active {
  display: block;
}

.terminal-search-layout {
  display: none;
  width: 100%;
  max-height: 22rem;
  overflow-y: auto;
  border: 1px solid rgba(154, 205, 50, 0.2);
  border-radius: 4px;
  background: rgba(13, 13, 26, 0.55);
}

.terminal-search-layout.display-results {
  display: block;
}

.terminal-search-layout .preview-container {
  display: none !important;
}

.terminal-search-layout .results-container {
  height: auto !important;
  max-height: 22rem;
  overflow-y: auto;
}

.terminal-search-layout .result-card {
  display: block;
  padding: 0.65rem 0.8rem;
  text-decoration: none !important;
  border-bottom: 1px solid rgba(154, 205, 50, 0.12);
  transition: background 0.2s;
}

.terminal-search-layout .result-card:last-child {
  border-bottom: 0;
}

.terminal-search-layout .result-card:hover,
.terminal-search-layout .result-card:focus,
.terminal-search-layout .result-card.focus,
.terminal-search-layout .result-card.terminal-focus {
  background: rgba(154, 205, 50, 0.08);
  outline: none;
}

.terminal-search-layout .card-title {
  margin: 0;
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
}

.terminal-search-layout .result-card:hover .card-title,
.terminal-search-layout .result-card:focus .card-title,
.terminal-search-layout .result-card.terminal-focus .card-title {
  color: #b8e65c;
  text-shadow: 0 0 6px rgba(154, 205, 50, 0.3);
}

.terminal-search-layout .card-title::before {
  content: "▸";
  color: #9acd32;
  margin-right: 0.5rem;
}

.terminal-search-layout .card-description {
  margin: 0.3rem 0 0 1.3rem;
  color: #777;
  font-size: 0.78rem;
  line-height: 1.45;
}

.terminal-search-layout .tags {
  margin: 0.35rem 0 0 1.3rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
}

.terminal-search-layout .tags li {
  margin: 0;
}

.terminal-search-layout .tags p {
  margin: 0;
  color: #777;
  font-size: 0.72rem;
}

.terminal-search-layout .highlight,
.terminal-search-layout .match-tag {
  color: #b8e65c !important;
  background: rgba(154, 205, 50, 0.16);
  border-radius: 3px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* responsive */
@media (max-width: 768px) {
  .terminal-body {
    padding: 1rem;
  }

  .ls-perm {
    display: none;
  }

  .ls-name {
    min-width: auto;
  }

  .recent-item {
    flex-direction: column;
    gap: 0.1rem;
  }

  .recent-date {
    font-size: 0.75rem;
  }

  .whoami-output .badge {
    font-size: 0.68rem;
    padding: 0.1rem 0.45rem;
  }

  .featured-item {
    flex-direction: column;
    gap: 0.15rem;
  }

  .featured-marker {
    display: none;
  }

  .award-item {
    font-size: 0.78rem !important;
  }

  .award-text {
    font-size: 0.78rem;
  }
}

@media (max-width: 480px) {
  .terminal-home {
    padding: 0.5rem 0;
  }

  .terminal-window {
    border-radius: 6px;
  }

  .ls-desc {
    display: none;
  }
}

/* light mode adjustments */
:root[saved-theme="light"] .terminal-window {
  background: #f5f5f0;
  border-color: #ddd;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:root[saved-theme="light"] .terminal-titlebar {
  background: #e8e8e0;
  border-bottom-color: #ddd;
}

:root[saved-theme="light"] .prompt-cmd {
  color: #333;
}

:root[saved-theme="light"] .whoami-output p {
  color: #444;
}

:root[saved-theme="light"] .whoami-output .dim {
  color: #888;
}

:root[saved-theme="light"] .ls-perm {
  color: #aaa;
}

:root[saved-theme="light"] .ls-name {
  color: #1976d2;
}

:root[saved-theme="light"] .ls-desc {
  color: #888;
}

:root[saved-theme="light"] .recent-date {
  color: #999;
}

:root[saved-theme="light"] .recent-title {
  color: #2e7d32;
}

:root[saved-theme="light"] .recent-item:hover .recent-title {
  color: #388e3c;
  text-shadow: none;
}

:root[saved-theme="light"] .ls-item:hover .ls-name {
  color: #1565c0;
  text-shadow: none;
}

:root[saved-theme="light"] .ls-item:hover,
:root[saved-theme="light"] .recent-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

:root[saved-theme="light"] .prompt-symbol {
  color: #2e7d32;
}

:root[saved-theme="light"] .terminal-search-input {
  color: #333;
  caret-color: #2e7d32;
}

:root[saved-theme="light"] .terminal-search-input::placeholder {
  color: #999;
}

:root[saved-theme="light"] .terminal-search-layout {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(46, 125, 50, 0.22);
}

:root[saved-theme="light"] .terminal-search-layout .result-card {
  border-bottom-color: rgba(46, 125, 50, 0.12);
}

:root[saved-theme="light"] .terminal-search-layout .result-card:hover,
:root[saved-theme="light"] .terminal-search-layout .result-card:focus,
:root[saved-theme="light"] .terminal-search-layout .result-card.focus,
:root[saved-theme="light"] .terminal-search-layout .result-card.terminal-focus {
  background: rgba(46, 125, 50, 0.06);
}

:root[saved-theme="light"] .terminal-search-layout .card-title {
  color: #2b2b2b;
}

:root[saved-theme="light"] .terminal-search-layout .result-card:hover .card-title,
:root[saved-theme="light"] .terminal-search-layout .result-card:focus .card-title,
:root[saved-theme="light"] .terminal-search-layout .result-card.terminal-focus .card-title {
  color: #2e7d32;
  text-shadow: none;
}

:root[saved-theme="light"] .terminal-search-layout .card-title::before {
  color: #2e7d32;
}

:root[saved-theme="light"] .terminal-search-layout .card-description,
:root[saved-theme="light"] .terminal-search-layout .tags p {
  color: #888;
}

:root[saved-theme="light"] .terminal-search-layout .highlight,
:root[saved-theme="light"] .terminal-search-layout .match-tag {
  color: #2e7d32 !important;
  background: rgba(46, 125, 50, 0.1);
}

:root[saved-theme="light"] .whoami-output a {
  color: #2e7d32 !important;
}

:root[saved-theme="light"] .whoami-output .badge {
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.06);
  border-color: rgba(46, 125, 50, 0.3);
}

:root[saved-theme="light"] .award-text {
  color: #555;
}

:root[saved-theme="light"] .award-marker {
  color: #e69500;
}

:root[saved-theme="light"] .featured-title {
  color: #2b2b2b;
}

:root[saved-theme="light"] .featured-item:hover .featured-title {
  color: #2e7d32;
  text-shadow: none;
}

:root[saved-theme="light"] .featured-desc {
  color: #888;
}

:root[saved-theme="light"] .featured-marker {
  color: #2e7d32;
}

:root[saved-theme="light"] .featured-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

:root[saved-theme="light"] .journey-pitch {
  color: #555;
}

:root[saved-theme="light"] .journey-cta {
  border-color: rgba(25, 118, 210, 0.35);
}

:root[saved-theme="light"] .journey-cta:hover {
  background: rgba(25, 118, 210, 0.06);
  border-color: rgba(25, 118, 210, 0.55);
}

:root[saved-theme="light"] .journey-link-text {
  color: #2b2b2b;
}

:root[saved-theme="light"] .journey-cta:hover .journey-link-text {
  color: #1565c0;
  text-shadow: none;
}

:root[saved-theme="light"] .journey-marker {
  color: #1976d2;
}

:root[saved-theme="light"] .journey-desc {
  color: #888;
}

:root[saved-theme="light"] .membership-pitch {
  color: #555;
}

:root[saved-theme="light"] .membership-cta {
  border-color: rgba(46, 125, 50, 0.35);
}

:root[saved-theme="light"] .membership-cta:hover {
  background: rgba(46, 125, 50, 0.06);
  border-color: rgba(46, 125, 50, 0.55);
}

:root[saved-theme="light"] .membership-link-text {
  color: #2b2b2b;
}

:root[saved-theme="light"] .membership-cta:hover .membership-link-text {
  color: #2e7d32;
  text-shadow: none;
}

:root[saved-theme="light"] .membership-marker {
  color: #2e7d32;
}

:root[saved-theme="light"] .membership-price {
  color: #888;
}

/* hide empty article content on homepage */
.center:has(.terminal-home) > article {
  display: none;
}

`

  return TerminalHome
}) satisfies QuartzComponentConstructor
