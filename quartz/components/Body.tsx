// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
// @ts-ignore
import rightSidebarResizeScript from "./scripts/rightSidebarResize.inline"
// @ts-ignore
import rightSidebarResizePrescript from "./scripts/rightSidebarResizePrescript.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { concatenateResources } from "../util/resources"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

Body.beforeDOMLoaded = rightSidebarResizePrescript
Body.afterDOMLoaded = concatenateResources(clipboardScript, rightSidebarResizeScript)
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
