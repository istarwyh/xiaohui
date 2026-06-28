import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, slugifyFilePath } from "../util/path"
import type { FilePath, FullSlug } from "../util/path"
import type { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"
import { getDate } from "./Date"
import { awards, featuredItems, identityBadges } from "./terminalHomeContent"
import {
  AwardsSection,
  FeaturedSection,
  JourneySection,
  MembershipSection,
  RecentSection,
  SearchSection,
  TerminalChrome,
  WhoamiSection,
  type FeaturedPage,
  type RecentPage,
} from "./TerminalHomeSections"
import style from "./styles/terminalHome.scss"
// @ts-ignore
import script from "./scripts/terminalHome.inline"

interface HomeLinks {
  aboutHref: string
  journeyHref: string
  membershipHref: string
}

function normalizePageId(slug: string): FullSlug {
  return slugifyFilePath(slug as FilePath)
}

function findOptionalPageSlug(pageId: string, allFiles: QuartzPluginData[]): FullSlug | undefined {
  const normalizedSlug = normalizePageId(pageId)
  const page = allFiles.find((f) => f.slug === normalizedSlug)
  return page?.slug as FullSlug | undefined
}

function findPageSlug(pageId: string, allFiles: QuartzPluginData[], label: string): FullSlug {
  const slug = findOptionalPageSlug(pageId, allFiles)

  if (!slug) {
    const normalizedSlug = normalizePageId(pageId)
    throw new Error(
      `TerminalHome ${label} points to a missing page: "${pageId}" (normalized: "${normalizedSlug}")`,
    )
  }

  return slug
}

function resolveHomeLinks(
  currentSlug: FullSlug,
  allFiles: QuartzPluginData[],
): HomeLinks | undefined {
  const aboutSlug = findOptionalPageSlug("Farming-in-the-cyber-world", allFiles)
  const journeySlug = findOptionalPageSlug("journey", allFiles)
  const membershipSlug = findOptionalPageSlug("membership", allFiles)

  if (!aboutSlug || !journeySlug || !membershipSlug) {
    return undefined
  }

  return {
    aboutHref: resolveRelative(currentSlug, aboutSlug),
    journeyHref: resolveRelative(currentSlug, journeySlug),
    membershipHref: resolveRelative(currentSlug, membershipSlug),
  }
}

function resolveFeaturedPages(currentSlug: FullSlug, allFiles: QuartzPluginData[]): FeaturedPage[] {
  return featuredItems.map((item) => {
    const pageSlug = findPageSlug(item.slug, allFiles, `featured link "${item.title}"`)
    return {
      ...item,
      href: resolveRelative(currentSlug, pageSlug),
    }
  })
}

function formatTerminalDate(date: Date | undefined): string {
  if (!date) {
    return "----------"
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

function frontmatterFalse(value: unknown): boolean {
  return value === false || value === "false"
}

function getRecentPages({
  allFiles,
  cfg,
  currentSlug,
}: {
  allFiles: QuartzPluginData[]
  cfg: QuartzComponentProps["cfg"]
  currentSlug: FullSlug
}): RecentPage[] {
  return allFiles
    .filter(
      (file) =>
        file.slug !== "index" &&
        !file.slug?.startsWith("tags/") &&
        !frontmatterFalse(file.frontmatter?.recent),
    )
    .sort(byDateAndAlphabetical(cfg))
    .slice(0, 6)
    .map((page) => ({
      href: resolveRelative(currentSlug, page.slug!),
      title: page.frontmatter?.title ?? "Untitled",
      dateStr: formatTerminalDate(getDate(cfg, page)),
    }))
}

export default (() => {
  const TerminalHome: QuartzComponent = ({ fileData, allFiles, cfg }: QuartzComponentProps) => {
    const currentSlug = fileData.slug!
    const links = resolveHomeLinks(currentSlug, allFiles)

    if (!links) {
      return <></>
    }

    const recentPages = getRecentPages({ allFiles, cfg, currentSlug })
    const featuredPages = resolveFeaturedPages(currentSlug, allFiles)

    return (
      <TerminalChrome>
        <WhoamiSection aboutHref={links.aboutHref} badges={identityBadges} />
        <RecentSection pages={recentPages} />
        <FeaturedSection pages={featuredPages} />
        <SearchSection />
        <JourneySection href={links.journeyHref} />
        <AwardsSection items={awards} />
        <MembershipSection href={links.membershipHref} />
      </TerminalChrome>
    )
  }

  TerminalHome.afterDOMLoaded = script
  TerminalHome.css = style

  return TerminalHome
}) satisfies QuartzComponentConstructor
