import { FullSlug, resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import styles from "./styles/rssLink.scss"

const RssLink: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const href = resolveRelative(fileData.slug!, "rss" as FullSlug)

  return (
    <a
      class={classNames(displayClass, "rss-link")}
      href={href}
      aria-label="RSS 订阅"
      title="RSS 订阅"
    >
      <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <title>RSS 订阅</title>
        <path d="M5 5.75A13.25 13.25 0 0 1 18.25 19h-2.5A10.75 10.75 0 0 0 5 8.25z" />
        <path d="M5 10.75A8.25 8.25 0 0 1 13.25 19h-2.5A5.75 5.75 0 0 0 5 13.25z" />
        <circle cx="6.75" cy="17.25" r="1.75" />
      </svg>
    </a>
  )
}

RssLink.css = styles

export default (() => RssLink) satisfies QuartzComponentConstructor
