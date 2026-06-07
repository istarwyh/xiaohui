import { curatedQuoteCuration, type CuratedQuote } from "./curatedQuotes"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FilePath, FullSlug, resolveRelative, slugifyFilePath } from "../util/path"
import style from "./styles/curatedQuotes.scss"

const roleLabels: Record<CuratedQuote["role"], string> = {
  hook: "破题",
  seed: "种子",
  judgment: "判断",
  method: "方法",
  delivery: "交付",
}

function sourceSlug(
  articlePath: string,
  allFiles: QuartzComponentProps["allFiles"],
): FullSlug | undefined {
  const contentPath = articlePath.replace(/^content\//, "")
  const normalizedSlug = slugifyFilePath(contentPath as FilePath)
  return allFiles.find((file) => file.slug === normalizedSlug)?.slug as FullSlug | undefined
}

export default (() => {
  const CuratedQuotes: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    return (
      <aside class="curated-quotes" aria-labelledby="curated-quotes-title">
        <div class="curated-quotes-kicker">本期策展</div>
        <h3 id="curated-quotes-title">{curatedQuoteCuration.theme}</h3>
        <p class="curated-quotes-note">{curatedQuoteCuration.curatorNote}</p>
        <div class="curated-quotes-list">
          {curatedQuoteCuration.quotes.map((item, index) => {
            const slug = sourceSlug(item.articlePath, allFiles)
            const href = slug ? resolveRelative(fileData.slug!, slug) : item.articleHref

            return (
              <a
                class="curated-quote-card"
                href={href}
                aria-label={`阅读来源文章：${item.articleTitle}`}
              >
                <span class="curated-quote-index">{String(index + 1).padStart(2, "0")}</span>
                <span class="curated-quote-role">{roleLabels[item.role]}</span>
                <blockquote>{item.quote}</blockquote>
                <span class="curated-quote-source">《{item.articleTitle}》</span>
              </a>
            )
          })}
        </div>
      </aside>
    )
  }

  CuratedQuotes.css = style
  return CuratedQuotes
}) satisfies QuartzComponentConstructor
