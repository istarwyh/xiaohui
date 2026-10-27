// Read-only metadata adapter scoped to one page. Reads stay live for SPA navigation;
// no panel, renderer, clipboard, or async lifecycle state belongs here.
export function createShareMetadata(
  document: Document,
  articleTitle: HTMLElement,
  fallbackUrl: () => string,
) {
  function shareUrlForPage() {
    return (
      document.querySelector<HTMLMetaElement>('meta[name="share-url"]')?.content ||
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ||
      fallbackUrl()
    )
  }

  function metaContent(selector: string) {
    return document.querySelector<HTMLMetaElement>(selector)?.content ?? ""
  }

  function markdownSource() {
    return document.querySelector<HTMLTextAreaElement>("#copy-page-markdown-source")?.value ?? ""
  }

  function markdownWithoutFrontmatter() {
    return markdownSource().replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "")
  }

  function stripMarkdownInlineSyntax(text: string) {
    return text
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/\[\[([^\]|]+)\|([^\]]+)]]/g, "$2")
      .replace(/\[\[([^\]]+)]]/g, "$1")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .trim()
  }

  function unquoteYamlValue(value: string) {
    const trimmed = value.trim()
    if (trimmed.length < 2) return trimmed

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').trim()
    }

    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).replace(/''/g, "'").trim()
    }

    return trimmed
  }

  function deindentYamlBlock(lines: string[]) {
    const withoutOuterBlankLines = [...lines]
    while (withoutOuterBlankLines[0]?.trim() === "") withoutOuterBlankLines.shift()
    while (withoutOuterBlankLines[withoutOuterBlankLines.length - 1]?.trim() === "") {
      withoutOuterBlankLines.pop()
    }

    const indents = withoutOuterBlankLines
      .filter((line) => line.trim().length > 0)
      .map((line) => line.match(/^\s*/)?.[0].length ?? 0)
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0

    return withoutOuterBlankLines
      .map((line) => line.slice(minIndent))
      .join("\n")
      .trim()
  }

  function markdownFrontmatterDescription() {
    const source = markdownSource()
    const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/)?.[1]
    if (!frontmatter) return ""

    const lines = frontmatter.split("\n")
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^description:\s*(.*)$/)
      if (!match) continue

      const rawValue = match[1].trim()
      if (/^[>|]/.test(rawValue)) {
        const blockLines: string[] = []
        for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
          const line = lines[blockIndex]
          if (/^\S[^:]*:\s*/.test(line)) break
          blockLines.push(line)
        }
        return deindentYamlBlock(blockLines)
      }

      return unquoteYamlValue(rawValue)
    }

    return ""
  }

  function markdownBodyExcerpt() {
    const paragraphs: string[] = []
    let currentParagraph: string[] = []
    const body = markdownWithoutFrontmatter().replace(/```[\s\S]*?```/g, "")

    function flushParagraph() {
      const paragraph = currentParagraph.join("\n").trim()
      if (paragraph) paragraphs.push(paragraph)
      currentParagraph = []
    }

    for (const line of body.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) {
        flushParagraph()
        continue
      }

      if (/^#{1,6}\s+/.test(trimmed) || /^-{3,}$/.test(trimmed)) {
        flushParagraph()
        continue
      }

      if (/^!\[[^\]]*]\([^)]+\)$/.test(trimmed)) continue

      const text = stripMarkdownInlineSyntax(trimmed.replace(/^>\s?/, "").replace(/^[-*+]\s+/, ""))
      if (text) currentParagraph.push(text)
    }

    flushParagraph()
    return paragraphs.slice(0, 3).join("\n\n")
  }

  function articleExcerpt() {
    return Array.from(document.querySelectorAll("article p"))
      .map((paragraph) => paragraph.textContent?.replace(/[ \t]+/g, " ").trim() ?? "")
      .filter(Boolean)
      .slice(0, 3)
      .join("\n\n")
  }

  function articleHeadingText() {
    const clone = articleTitle.cloneNode(true) as HTMLElement
    clone.querySelector(".copy-page-control")?.remove()
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }

  function stripSiteTitleSuffix(title: string) {
    return title.replace(/\s+\|\s+AI Agent\s*[·•]\s*MCP\s*(实践者|Practitioner)\s*$/i, "").trim()
  }

  function shareData(): ShareData {
    return {
      title:
        articleHeadingText() ||
        stripSiteTitleSuffix(metaContent('meta[property="og:title"]')) ||
        stripSiteTitleSuffix(document.title),
      text:
        markdownFrontmatterDescription() ||
        markdownBodyExcerpt() ||
        metaContent('meta[property="og:description"]') ||
        metaContent('meta[name="description"]') ||
        articleExcerpt(),
      url: shareUrlForPage(),
    }
  }

  return { shareUrlForPage, markdownSource, articleExcerpt, shareData }
}
