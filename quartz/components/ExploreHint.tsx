import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/exploreHint.scss"

export default (() => {
  const ExploreHint: QuartzComponent = () => {
    return (
      <aside class="explore-hint" aria-label="站点探索">
        <p>从一个节点开始，看看它通向哪里。</p>
      </aside>
    )
  }

  ExploreHint.css = style
  return ExploreHint
}) satisfies QuartzComponentConstructor
