import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { normalizeLang } from "../util/translations"
import style from "./styles/footer.scss"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ cfg, displayClass, fileData }: QuartzComponentProps) => {
    const lang = normalizeLang(fileData.frontmatter?.lang, cfg.locale)
    const englishLabels: Record<string, [string, string]> = {
      关于我: ["About", "/en/Farming-in-the-cyber-world"],
      成长时间线: ["Timeline", "/en/journey"],
      赛博农耕: ["Cyber Farming", "/Cyber-Farmer"],
      成长会员: ["Membership", "/en/membership"],
      RSS订阅: ["RSS", "/rss"],
      AI加速我: ["AI Speeds", "https://aispeeds.me"],
    }
    const links = Object.entries(opts?.links ?? {}).map(([text, link]) => {
      if (lang.startsWith("en") && englishLabels[text]) {
        return englishLabels[text]
      }
      return [text, link]
    })

    return (
      <footer class={`${displayClass ?? ""}`}>
        <ul>
          {links.map(([text, link]) => (
            <li>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
