import { normalizeLang } from "../util/translations"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/siteIntro.scss"

export default (() => {
  const SiteIntro: QuartzComponent = ({ cfg, fileData }: QuartzComponentProps) => {
    const lang = normalizeLang(fileData.frontmatter?.lang, cfg.locale)
    const text = lang.startsWith("en")
      ? "AI Agents · Engineering · Digital garden"
      : "AI Agent · 工程实践 · 数字花园"

    return (
      <aside
        class="site-intro"
        aria-label={lang.startsWith("en") ? "Site introduction" : "站点介绍"}
      >
        <p>{text}</p>
      </aside>
    )
  }

  SiteIntro.css = style
  return SiteIntro
}) satisfies QuartzComponentConstructor
