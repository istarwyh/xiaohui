import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { byDateAndAlphabetical } from "./PageList"
import { Date as DateComponent, getDate } from "./Date"

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

export default (() => {
  const TerminalHome: QuartzComponent = ({
    fileData,
    allFiles,
    cfg,
  }: QuartzComponentProps) => {
    const recentPages = allFiles
      .filter((f) => f.slug !== "index" && !f.slug?.startsWith("tags/"))
      .sort(byDateAndAlphabetical(cfg))
      .slice(0, 6)

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
                <p>赛博农夫 · 写代码也写字</p>
                <p class="dim">一个关于技术与思考的数字花园 — <a href={resolveRelative(fileData.slug!, "Farming-in-the-cyber-world" as any)}>xiaohui.cool</a></p>
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
                <span class="prompt-cmd">recent --limit 6</span>
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

            {/* cursor */}
            <div class="terminal-prompt terminal-cursor-line">
              <span class="prompt-symbol">{">"}</span>
              <span class="terminal-cursor">_</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

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

/* blinking cursor */
.terminal-cursor-line {
  margin-top: 1.5rem;
  margin-bottom: 0;
}

.terminal-cursor {
  color: #9acd32;
  font-weight: bold;
  animation: blink 1s step-end infinite;
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

:root[saved-theme="light"] .terminal-cursor {
  color: #2e7d32;
}

:root[saved-theme="light"] .whoami-output a {
  color: #2e7d32 !important;
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .terminal-cursor {
    animation: none;
    opacity: 1;
  }
}
`

  return TerminalHome
}) satisfies QuartzComponentConstructor
