import type { ComponentChildren } from "preact"
import type { BadgeItem, FeaturedItem, TerminalHomeCopy } from "./terminalHomeContent"

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
  title: string
}

interface TerminalSectionProps {
  command: string
  outputClass: string
  blockClass?: string
  children: ComponentChildren
}

export function TerminalChrome({ children, title }: TerminalChromeProps) {
  return (
    <div class="terminal-home">
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <span class="terminal-dot red"></span>
          <span class="terminal-dot yellow"></span>
          <span class="terminal-dot green"></span>
          <span class="terminal-titlebar-text">{title}</span>
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

export function WhoamiSection({
  aboutHref,
  badges,
  copy,
}: {
  aboutHref: string
  badges: BadgeItem[]
  copy: TerminalHomeCopy
}) {
  return (
    <TerminalSection command="whoami" outputClass="whoami-output">
      <p>{copy.whoamiLine}</p>
      <p class="badge-line">
        {badges.map((badge) => (
          <span class="badge">{badge.text}</span>
        ))}
      </p>
      <p class="dim">
        {copy.whoamiDim} — <a href={aboutHref}>{copy.aboutLabel}</a>
      </p>
    </TerminalSection>
  )
}

export function JourneySection({ href, copy }: { href: string; copy: TerminalHomeCopy }) {
  return (
    <TerminalSection command={copy.journeyCommand} outputClass="journey-output">
      <p class="journey-pitch">{copy.journeyPitch}</p>
      <a href={href} class="journey-cta">
        <span class="journey-marker">▸</span>
        <span class="journey-link-text">{copy.journeyLinkText}</span>
        <span class="journey-desc">{copy.journeyDesc}</span>
      </a>
    </TerminalSection>
  )
}

export function AwardsSection({ items, copy }: { items: BadgeItem[]; copy: TerminalHomeCopy }) {
  return (
    <TerminalSection command={copy.awardsCommand} outputClass="awards-output">
      {items.map((item) => (
        <p class="award-item">
          <span class="award-marker">★</span>
          <span class="award-text">{item.text}</span>
        </p>
      ))}
    </TerminalSection>
  )
}

export function FeaturedSection({
  pages,
  copy,
}: {
  pages: FeaturedPage[]
  copy: TerminalHomeCopy
}) {
  return (
    <TerminalSection command={copy.featuredCommand} outputClass="featured-output">
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

export function RecentSection({ pages, copy }: { pages: RecentPage[]; copy: TerminalHomeCopy }) {
  return (
    <TerminalSection command={copy.recentCommand} outputClass="recent-output">
      {pages.map((page) => (
        <a href={page.href} class="recent-item">
          <span class="recent-date">[{page.dateStr}]</span>
          <span class="recent-title">{page.title}</span>
        </a>
      ))}
    </TerminalSection>
  )
}

export function MembershipSection({ href, copy }: { href: string; copy: TerminalHomeCopy }) {
  return (
    <TerminalSection command={copy.membershipCommand} outputClass="membership-output">
      <p class="membership-pitch">{copy.membershipPitch}</p>
      <a href={href} class="membership-cta">
        <span class="membership-marker">▸</span>
        <span class="membership-link-text">{copy.membershipLinkText}</span>
        <span class="membership-price">{copy.membershipPrice}</span>
      </a>
    </TerminalSection>
  )
}

export function SearchSection({ copy }: { copy: TerminalHomeCopy }) {
  return (
    <div class="terminal-block terminal-search-block">
      <label class="terminal-prompt terminal-search-line">
        <span class="prompt-symbol">{">"}</span>
        <input
          class="terminal-search-input"
          type="search"
          placeholder={copy.searchPlaceholder}
          autocomplete="off"
          aria-label={copy.searchAriaLabel}
          aria-controls="terminal-search-results"
          aria-expanded="false"
        />
      </label>
      <div id="terminal-search-results" class="terminal-search-results" aria-live="polite"></div>
    </div>
  )
}
