import type { ComponentChildren } from "preact"
import type { BadgeItem, FeaturedItem } from "./terminalHomeContent"

export interface FeaturedPage extends FeaturedItem {
  href: string
}

export interface RecentPage {
  href: string
  title: string
  dateStr: string
}

interface TerminalChromeProps {
  children: ComponentChildren
}

interface TerminalSectionProps {
  command: string
  outputClass: string
  blockClass?: string
  children: ComponentChildren
}

export function TerminalChrome({ children }: TerminalChromeProps) {
  return (
    <div class="terminal-home">
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <span class="terminal-dot red"></span>
          <span class="terminal-dot yellow"></span>
          <span class="terminal-dot green"></span>
          <span class="terminal-titlebar-text">xiaohui@blog:~</span>
        </div>
        <div class="terminal-body">{children}</div>
      </div>
    </div>
  )
}

function TerminalPrompt({ command }: { command: string }) {
  return (
    <div class="terminal-prompt">
      <span class="prompt-symbol">{">"}</span>
      <span class="prompt-cmd">{command}</span>
    </div>
  )
}

function TerminalSection({ command, outputClass, blockClass, children }: TerminalSectionProps) {
  return (
    <div class={blockClass ? `terminal-block ${blockClass}` : "terminal-block"}>
      <TerminalPrompt command={command} />
      <div class={`terminal-output ${outputClass}`}>{children}</div>
    </div>
  )
}

export function WhoamiSection({ aboutHref, badges }: { aboutHref: string; badges: BadgeItem[] }) {
  return (
    <TerminalSection command="whoami" outputClass="whoami-output">
      <p>晓灰 · 赛博农夫 · 写代码也写字</p>
      <p class="badge-line">
        {badges.map((badge) => (
          <span class="badge">{badge.text}</span>
        ))}
      </p>
      <p class="dim">
        一个关于 AI Agent、工程实践与思考的数字花园 — <a href={aboutHref}>关于我</a>
      </p>
    </TerminalSection>
  )
}

export function JourneySection({ href }: { href: string }) {
  return (
    <TerminalSection command="cat ~/journey.md" outputClass="journey-output">
      <p class="journey-pitch">
        比作品集更重要的是成长路径：求学、工程、业务、Agent，以及每次认知升级。
      </p>
      <a href={href} class="journey-cta">
        <span class="journey-marker">▸</span>
        <span class="journey-link-text">查看晓灰的成长时间线</span>
        <span class="journey-desc">timeline · experience map</span>
      </a>
    </TerminalSection>
  )
}

export function AwardsSection({ items }: { items: BadgeItem[] }) {
  return (
    <TerminalSection command="cat ~/.awards" outputClass="awards-output">
      {items.map((item) => (
        <p class="award-item">
          <span class="award-marker">★</span>
          <span class="award-text">{item.text}</span>
        </p>
      ))}
    </TerminalSection>
  )
}

export function FeaturedSection({ pages }: { pages: FeaturedPage[] }) {
  return (
    <TerminalSection command="cat ~/featured.md" outputClass="featured-output">
      {pages.map((page) => (
        <a href={page.href} class="featured-item">
          <span class="featured-marker">▸</span>
          <span class="featured-title">{page.title}</span>
          <span class="featured-desc">{page.desc}</span>
        </a>
      ))}
    </TerminalSection>
  )
}

export function RecentSection({ pages }: { pages: RecentPage[] }) {
  return (
    <TerminalSection command="ls -lt ~/posts | head -6" outputClass="recent-output">
      {pages.map((page) => (
        <a href={page.href} class="recent-item">
          <span class="recent-date">[{page.dateStr}]</span>
          <span class="recent-title">{page.title}</span>
        </a>
      ))}
    </TerminalSection>
  )
}

export function MembershipSection({ href }: { href: string }) {
  return (
    <TerminalSection command="cat ~/membership.md" outputClass="membership-output">
      <p class="membership-pitch">想更深入交流？1:1 咨询 · 私密社群 · 内推机会。</p>
      <a href={href} class="membership-cta">
        <span class="membership-marker">▸</span>
        <span class="membership-link-text">加入私人成长会员</span>
        <span class="membership-price">$29 · 终身</span>
      </a>
    </TerminalSection>
  )
}

export function SearchSection() {
  return (
    <div class="terminal-block terminal-search-block">
      <label class="terminal-prompt terminal-search-line">
        <span class="prompt-symbol">{">"}</span>
        <input
          class="terminal-search-input"
          type="search"
          placeholder="search notes..."
          autocomplete="off"
          aria-label="Search notes"
          aria-controls="terminal-search-results"
          aria-expanded="false"
        />
      </label>
      <div id="terminal-search-results" class="terminal-search-results" aria-live="polite"></div>
    </div>
  )
}
