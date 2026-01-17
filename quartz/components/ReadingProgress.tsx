import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { i18n } from "../i18n"

// @ts-ignore
import script from "./scripts/readingProgress.inline"
import style from "./styles/readingProgress.scss"

export default (() => {
  const ReadingProgress: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
    return (
      <div
        id="reading-progress"
        class="reading-progress"
        role="progressbar"
        aria-label={i18n(cfg.locale).components.readingProgress.label}
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div class="reading-progress-bar"></div>
      </div>
    )
  }

  ReadingProgress.css = style
  ReadingProgress.afterDOMLoaded = script

  return ReadingProgress
}) satisfies QuartzComponentConstructor
