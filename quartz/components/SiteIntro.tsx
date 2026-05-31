import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/siteIntro.scss"

export default (() => {
  const SiteIntro: QuartzComponent = () => {
    return (
      <aside class="site-intro" aria-label="站点介绍">
        <p>AI Agent · 工程实践 · 数字花园</p>
      </aside>
    )
  }

  SiteIntro.css = style
  return SiteIntro
}) satisfies QuartzComponentConstructor
