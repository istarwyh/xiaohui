import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import {
  getTranslationAlternates,
  getPageUiLocale,
  languageLabel,
  normalizeLang,
} from "../util/translations"
import { classNames } from "../util/lang"

export default (() => {
  const LanguageSwitcher: QuartzComponent = ({
    cfg,
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    const alternates = getTranslationAlternates(cfg, fileData, allFiles)
    if (alternates.length <= 1) return <></>

    const label = getPageUiLocale(fileData, cfg).startsWith("zh") ? "语言版本" : "Language versions"
    const currentLang = normalizeLang(fileData.frontmatter?.lang, cfg.locale)

    return (
      <nav class={classNames(displayClass, "language-switcher")} aria-label={label}>
        {alternates.map((alternate) => {
          const label = languageLabel(alternate.lang)
          const isCurrent = alternate.lang === currentLang
          const href = alternate.slug
            ? resolveRelative(fileData.slug!, alternate.slug)
            : alternate.href

          return isCurrent ? (
            <span class="language-switcher-current" aria-current="page">
              {label}
            </span>
          ) : (
            <a href={href}>{label}</a>
          )
        })}
      </nav>
    )
  }

  LanguageSwitcher.css = `
.language-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.75rem 0;
  font-size: 0.85rem;
}

.language-switcher a,
.language-switcher-current {
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  line-height: 1.4;
}

.language-switcher-current {
  color: var(--darkgray);
  background: var(--highlight);
}
`

  return LanguageSwitcher
}) satisfies QuartzComponentConstructor
