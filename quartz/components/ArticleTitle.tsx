import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

// @ts-ignore
import copyPageScript from "./scripts/copyPage.inline"
import copyPageStyle from "./styles/copyPage.scss"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (title) {
    return <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
  } else {
    return null
  }
}

ArticleTitle.css =
  copyPageStyle +
  `
.article-title {
  margin: 2rem 0 0 0;
}
`

ArticleTitle.afterDOMLoaded = copyPageScript

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
