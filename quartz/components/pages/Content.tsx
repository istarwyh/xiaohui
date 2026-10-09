import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const Content: QuartzComponent = ({ fileData, tree, rawMarkdown }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  const author = fileData.frontmatter?.author
  const shareAuthor =
    typeof author === "string"
      ? author
      : Array.isArray(author)
        ? author.filter((value) => typeof value === "string").join("、")
        : undefined
  return (
    <>
      <textarea id="copy-page-markdown-source" hidden readOnly>
        {rawMarkdown}
      </textarea>
      <article class={classString} data-share-author={shareAuthor}>
        {content}
      </article>
    </>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
