import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"
import { CustomOgImagesEmitterName } from "../plugins/emitters/ogImage"
export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const title =
      (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    const isHome = fileData.slug === "index"
    const is404 = fileData.slug === "404"
    // Canonical URL of current page; collapse "/index" to "/" for the homepage.
    const canonicalUrl = is404
      ? url.toString()
      : isHome
        ? url.toString()
        : joinSegments(url.toString(), fileData.slug!)
    const socialUrl = canonicalUrl

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some(
      (e) => e.name === CustomOgImagesEmitterName,
    )
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    const tags: string[] = Array.isArray(fileData.frontmatter?.tags)
      ? (fileData.frontmatter!.tags as string[])
      : []
    const author =
      (fileData.frontmatter as any)?.author ?? (cfg as any).author ?? cfg.pageTitle
    const dates = fileData.dates
    const isArticle = !isHome && !is404 && !!fileData.frontmatter
    const ogType = isArticle ? "article" : "website"
    const locale = (cfg.locale ?? "en-US").replace("-", "_")

    // Structured data (JSON-LD)
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: cfg.pageTitle,
      url: `https://${cfg.baseUrl}/`,
      inLanguage: cfg.locale,
      potentialAction: {
        "@type": "SearchAction",
        target: `https://${cfg.baseUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    }

    // BreadcrumbList JSON-LD — built from slug segments (e.g. program/llm/foo)
    const slugSegments = (fileData.slug ?? "")
      .split("/")
      .filter((s) => s.length > 0 && s !== "index")
    const breadcrumbSchema =
      !isHome && !is404 && slugSegments.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: cfg.pageTitle,
                item: `https://${cfg.baseUrl}/`,
              },
              ...slugSegments.map((seg, i) => ({
                "@type": "ListItem",
                position: i + 2,
                name: decodeURIComponent(seg).replace(/-/g, " "),
                item: `https://${cfg.baseUrl}/${slugSegments.slice(0, i + 1).join("/")}`,
              })),
            ],
          }
        : undefined
    const articleSchema = isArticle
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: fileData.frontmatter?.title,
          description,
          mainEntityOfPage: canonicalUrl,
          url: canonicalUrl,
          inLanguage: cfg.locale,
          author: { "@type": "Person", name: author },
          publisher: {
            "@type": "Organization",
            name: cfg.pageTitle,
            logo: {
              "@type": "ImageObject",
              url: `https://${cfg.baseUrl}/static/icon.png`,
            },
          },
          datePublished: dates?.published?.toISOString() ?? dates?.created?.toISOString(),
          dateModified: dates?.modified?.toISOString(),
          keywords: tags.join(", ") || undefined,
        }
      : undefined

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content={cfg.theme.colors.lightMode.light} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={cfg.theme.colors.darkMode.light} media="(prefers-color-scheme: dark)" />

        {!is404 && <link rel="canonical" href={canonicalUrl} />}
        {!is404 && cfg.locale && (
          <>
            <link rel="alternate" hrefLang={cfg.locale} href={canonicalUrl} />
            <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
          </>
        )}

        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content={ogType} />
        <meta property="og:locale" content={locale} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {isArticle && dates?.published && (
          <meta property="article:published_time" content={dates.published.toISOString()} />
        )}
        {isArticle && dates?.modified && (
          <meta property="article:modified_time" content={dates.modified.toISOString()} />
        )}
        {isArticle && (
          <meta property="article:author" content={author} />
        )}
        {isArticle &&
          tags.map((t) => <meta property="article:tag" content={t} key={`tag-${t}`} />)}

        <meta name="author" content={author} />
        {tags.length > 0 && <meta name="keywords" content={tags.join(", ")} />}

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${(getFileExtension(ogImageDefaultPath) ?? ".png").replace(/^\./, "")}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {articleSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
          />
        )}
        {breadcrumbSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
        )}

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
