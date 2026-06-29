import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, slugifyFilePath } from "../util/path"
import type { FilePath, FullSlug } from "../util/path"
import type { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"
import { getDate } from "./Date"
import { getTerminalHomeContent, type TerminalHomeContent } from "./terminalHomeContent"
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
  content: TerminalHomeContent,
): HomeLinks | undefined {
  const aboutSlug = findOptionalPageSlug(content.aboutSlug, allFiles)
  const journeySlug = findOptionalPageSlug(content.journeySlug, allFiles)
  const membershipSlug = findOptionalPageSlug(content.membershipSlug, allFiles)

  if (!aboutSlug || !journeySlug || !membershipSlug) {
    return undefined
  }

  return {
    aboutHref: resolveRelative(currentSlug, aboutSlug),
    journeyHref: resolveRelative(currentSlug, journeySlug),
    membershipHref: resolveRelative(currentSlug, membershipSlug),
  }
}

function resolveFeaturedPages(
  currentSlug: FullSlug,
  allFiles: QuartzPluginData[],
  content: TerminalHomeContent,
): FeaturedPage[] {
  return content.featuredItems.map((item) => {
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
  lang,
}: {
  allFiles: QuartzPluginData[]
  cfg: QuartzComponentProps["cfg"]
  currentSlug: FullSlug
  lang: string
}): RecentPage[] {
  const englishHome = lang.startsWith("en")

  return allFiles
    .filter(
      (file) =>
        file.slug !== "index" &&
        file.slug !== "en" &&
        !file.slug?.startsWith("tags/") &&
        (englishHome ? file.slug?.startsWith("en/") : !file.slug?.startsWith("en/")) &&
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
    const lang =
      typeof fileData.frontmatter?.lang === "string"
        ? fileData.frontmatter.lang
        : currentSlug === "en"
          ? "en"
          : cfg.locale
    const content = getTerminalHomeContent(lang)
    const links = resolveHomeLinks(currentSlug, allFiles, content)

    if (!links) {
      return <></>
    }

    const recentPages = getRecentPages({ allFiles, cfg, currentSlug, lang })
    const featuredPages = resolveFeaturedPages(currentSlug, allFiles, content)

    return (
      <TerminalChrome title={content.copy.titlebar}>
        <WhoamiSection aboutHref={links.aboutHref} badges={content.badges} copy={content.copy} />
        <RecentSection pages={recentPages} copy={content.copy} />
        <FeaturedSection pages={featuredPages} copy={content.copy} />
        <SearchSection copy={content.copy} />
        <JourneySection href={links.journeyHref} copy={content.copy} />
        <AwardsSection items={content.awards} copy={content.copy} />
        <MembershipSection href={links.membershipHref} copy={content.copy} />
      </TerminalChrome>
    )
  }

  TerminalHome.afterDOMLoaded = script
  TerminalHome.css = style

  return TerminalHome
}) satisfies QuartzComponentConstructor
