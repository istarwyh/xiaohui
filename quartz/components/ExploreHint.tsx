import { QuartzComponent, QuartzComponentConstructor } from "./types"
import { getPageUiLocale } from "../util/translations"
import style from "./styles/exploreHint.scss"

export default (() => {
  const ExploreHint: QuartzComponent = ({ cfg, fileData }) => {
    const english = getPageUiLocale(fileData, cfg).startsWith("en")
    return (
      <aside class="explore-hint" aria-label={english ? "Explore the garden" : "站点探索"}>
        <p>
          {english
            ? "Start with a node and follow its connections."
            : "从一个节点开始，看看它通向哪里。"}
        </p>
      </aside>
    )
  }

  ExploreHint.css = style
  return ExploreHint
}) satisfies QuartzComponentConstructor
