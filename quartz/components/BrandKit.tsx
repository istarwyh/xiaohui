import { brandAssets } from "../design/brandAssets"
import { dark, foundations, light } from "../design/tokens"
import Darkmode from "./Darkmode"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/brandKit.scss"
// @ts-ignore
import script from "./scripts/brandKit.inline"

const swatches = [
  { role: "color-canvas", name: "纸白", darkName: "炭灰", usage: "页面底色" },
  { role: "color-surface", name: "纸面", darkName: "深纸", usage: "内容与辅助信息" },
  { role: "color-text-strong", name: "墨色", darkName: "浅墨", usage: "标题与关键文字" },
  { role: "color-text-muted", name: "灰墨", darkName: "浅灰", usage: "日期、来源与说明" },
  { role: "color-accent", name: "铜色", darkName: "浅铜", usage: "链接与交互提示" },
] as const

const embed = `<a href="https://xiaohui.cool/">
  <img src="/brand/xiaohui-horizontal-light.svg"
       alt="晓灰 Xiaohui" width="240" />
</a>`

export default (() => {
  const ThemeToggle = Darkmode()
  const BrandKit: QuartzComponent = (props) => (
    <div class="brand-kit">
      <header class="brand-topbar">
        <a class="brand-home" href="/" data-router-ignore>
          晓灰<span>XIAOHUI</span>
        </a>
        <nav aria-label="品牌资料导航">
          <a href="#brand-marks" data-router-ignore>
            标识
          </a>
          <a href="#brand-downloads" data-router-ignore>
            下载
          </a>
          <a href="#brand-colors" data-router-ignore>
            色彩
          </a>
          <a href="#brand-usage" data-router-ignore>
            使用
          </a>
          <ThemeToggle {...props} />
        </nav>
      </header>

      <section class="brand-intro" aria-labelledby="brand-title">
        <div class="brand-intro-copy">
          <p class="brand-kicker">
            <span class="brand-dot" aria-hidden="true" />
            晓灰 · 品牌资料
          </p>
          <h1 id="brand-title">
            写代码，
            <br />
            也写字<span>。</span>
          </h1>
          <p class="brand-description">
            一笔晨光，两页笔记。
            <br />
            属于晓灰的标识、配色与表达方式。
          </p>
          <div class="brand-intro-actions">
            <a class="brand-action brand-action-primary" href="#brand-downloads" data-router-ignore>
              获取品牌资源 <span aria-hidden="true">↗</span>
            </a>
            <a class="brand-text-link" href="#brand-marks" data-router-ignore>
              认识这枚标识 <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p class="brand-intro-meta">
            XIAOHUI / BRAND KIT <span>01 — 2026</span>
          </p>
        </div>
        <figure
          class="brand-signature"
          style={{
            backgroundColor: light["color-surface"],
            color: light["color-text-strong"],
            "--specimen-line": light["color-border"],
          }}
        >
          <div class="brand-signature-label">
            <span>晨光 / 书页</span>
            <span>FIG. 01</span>
          </div>
          <div class="brand-signature-art">
            <span class="brand-orbit" aria-hidden="true" />
            <span class="brand-orbit brand-orbit-inner" aria-hidden="true" />
            <img src="/brand/xiaohui-mark.svg" alt="晓灰晨光书页标识" width="224" height="224" />
          </div>
          <figcaption>
            <strong>晓灰</strong>
            <span>
              XIAOHUI
              <br />
              xiaohui.cool
            </span>
          </figcaption>
        </figure>
      </section>

      <div class="brand-index-strip" aria-label="品牌资料内容">
        <span>
          清楚的文字。
          <br />
          可辨认的自己。
        </span>
        <a href="#brand-marks" data-router-ignore>
          <small>01</small> 标识 <span aria-hidden="true">↘</span>
        </a>
        <a href="#brand-downloads" data-router-ignore>
          <small>02</small> 资源 <span aria-hidden="true">↘</span>
        </a>
        <a href="#brand-colors" data-router-ignore>
          <small>03</small> 色彩 <span aria-hidden="true">↘</span>
        </a>
        <a href="#brand-type" data-router-ignore>
          <small>04</small> 排版 <span aria-hidden="true">↘</span>
        </a>
      </div>

      <section id="brand-marks" class="brand-section" aria-labelledby="brand-marks-title">
        <div class="brand-section-heading">
          <div>
            <p class="brand-kicker">01 / IDENTITY</p>
            <h2 id="brand-marks-title">从晨光，到书页。</h2>
          </div>
          <p>一笔晨光，两页打开的笔记。保留“晓”的轻盈，也保留记录与思考的空间。</p>
        </div>
        <div class="brand-mark-grid">
          <figure
            class="brand-mark-card"
            style={{ backgroundColor: light["color-canvas"], color: light["color-text"] }}
          >
            <div class="brand-specimen-label">
              <span>01.A / LIGHT</span>
              <span>墨色组合</span>
            </div>
            <div class="brand-mark-stage">
              <img
                src="/brand/xiaohui-horizontal-light.svg"
                alt="晓灰 Xiaohui 横向标识"
                width="448"
                height="192"
              />
            </div>
            <figcaption>
              <span>浅色页面 · 文档 · 署名</span>
              <span>224 × 96</span>
            </figcaption>
          </figure>
          <figure
            class="brand-mark-card"
            style={{ backgroundColor: dark["color-canvas"], color: dark["color-text"] }}
          >
            <div class="brand-specimen-label">
              <span>01.B / DARK</span>
              <span>浅色组合</span>
            </div>
            <div class="brand-mark-stage">
              <img
                src="/brand/xiaohui-horizontal-dark.svg"
                alt="深色背景使用的晓灰横向标识"
                width="448"
                height="192"
              />
            </div>
            <figcaption>
              <span>深色页面 · 封面 · 展示</span>
              <span>224 × 96</span>
            </figcaption>
          </figure>
        </div>
        <div class="brand-size-panel">
          <div>
            <p class="brand-kicker">SMALL, STILL CLEAR</p>
            <h3>
              小到一个入口，
              <br />
              也能被认出。
            </h3>
            <p>图标建议不小于 32px；横向组合建议不小于 224px。四周留出至少标识高度 1/4 的空间。</p>
          </div>
          <div class="brand-size-row" aria-label="标识尺寸示例">
            {[32, 48, 64, 96].map((size) => (
              <div key={size}>
                <span class="brand-size-stage" style={{ backgroundColor: light["color-canvas"] }}>
                  <img
                    src="/brand/xiaohui-mark.svg"
                    alt={`${size} 像素标识`}
                    width={size}
                    height={size}
                  />
                </span>
                <span>{size} px</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="brand-downloads" class="brand-section" aria-labelledby="brand-downloads-title">
        <div class="brand-section-heading">
          <div>
            <p class="brand-kicker">02 / DOWNLOADS</p>
            <h2 id="brand-downloads-title">拿走，即可使用。</h2>
          </div>
          <p>透明底 SVG，字形已转为路径。无需安装字体，也不依赖第三方资源。</p>
        </div>
        <div class="brand-download-grid">
          {brandAssets.map((asset, index) => {
            const isDark = asset.filename === "xiaohui-horizontal-dark.svg"
            const palette = isDark ? dark : light
            return (
              <div class="brand-download-card" key={asset.filename}>
                <div
                  class="brand-download-preview"
                  style={{
                    backgroundColor: palette["color-surface"],
                    color: palette["color-text-muted"],
                  }}
                >
                  <span class="brand-file-number">0{index + 1} / SVG</span>
                  <img
                    src={`/brand/${asset.filename}`}
                    alt={asset.title}
                    width={asset.filename.includes("horizontal") ? 280 : 96}
                    height={asset.filename.includes("horizontal") ? 120 : 96}
                    loading="lazy"
                  />
                  <span class="brand-file-format">VECTOR · TRANSPARENT</span>
                </div>
                <div class="brand-download-info">
                  <div>
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                  </div>
                  <a
                    class="brand-download-link"
                    href={`/brand/${asset.filename}`}
                    download={asset.filename}
                    aria-label={`下载${asset.title} SVG`}
                    data-router-ignore
                  >
                    SVG <span aria-hidden="true">↓</span>
                  </a>
                  <code>{asset.filename}</code>
                </div>
              </div>
            )
          })}
        </div>
        <div class="brand-extra-downloads">
          <div>
            <p class="brand-kicker">ALSO INCLUDED</p>
            <h3>其他格式与配套资料</h3>
          </div>
          <div>
            <a href="/brand/xiaohui-mark.png" download="xiaohui-mark.png" data-router-ignore>
              图标 PNG <span>512px ↓</span>
            </a>
            <a
              href="/brand/xiaohui-horizontal-light.png"
              download="xiaohui-horizontal-light.png"
              data-router-ignore
            >
              横向组合 PNG <span>1200px ↓</span>
            </a>
            <a href="/brand/xiaohui-social.png" download="xiaohui-social.png" data-router-ignore>
              介绍封面 PNG <span>1200×630 ↓</span>
            </a>
            <a href="/brand/palette.json" download="xiaohui-palette.json" data-router-ignore>
              配色 JSON <span>LIGHT + DARK ↓</span>
            </a>
            <a href="/brand/README.txt" download="xiaohui-brand-readme.txt" data-router-ignore>
              使用说明 TXT <span>READ ME ↓</span>
            </a>
          </div>
        </div>
      </section>

      <section id="brand-colors" class="brand-section" aria-labelledby="brand-colors-title">
        <div class="brand-section-heading">
          <div>
            <p class="brand-kicker">03 / COLOR & MATERIAL</p>
            <h2 id="brand-colors-title">浅纸，灰墨，一点铜色。</h2>
          </div>
          <p>纸面更浅，少一点黄色。纹理留在背景，文字保持清楚。点击色块复制色值。</p>
        </div>
        <div class="brand-palette-grid">
          {(
            [
              ["亮色", light],
              ["暗色", dark],
            ] as const
          ).map(([label, palette]) => (
            <div class="brand-palette" key={label}>
              <h3>
                {label}
                <span>{label === "亮色" ? "LIGHT / PAPER" : "DARK / INK"}</span>
              </h3>
              <div class="brand-swatches">
                {swatches.map(({ role, name, darkName, usage }) => {
                  const textColor =
                    role === "color-canvas" || role === "color-surface"
                      ? palette["color-text-strong"]
                      : palette["color-canvas"]
                  return (
                    <button
                      class="brand-swatch"
                      key={role}
                      data-brand-copy={palette[role]}
                      aria-label={`复制${label}${label === "暗色" ? darkName : name}色值 ${palette[role]}`}
                    >
                      <span
                        class="brand-swatch-color"
                        style={{ backgroundColor: palette[role], color: textColor }}
                      >
                        <span aria-hidden="true">↗</span>
                        <code>{palette[role].toUpperCase()}</code>
                      </span>
                      <strong>{label === "暗色" ? darkName : name}</strong>
                      <small>{usage}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div class="brand-material-note">
          <span class="brand-material-sample" aria-hidden="true">
            Aa<span>纸</span>
          </span>
          <div>
            <h3>有纸的触感，没有阅读的噪声。</h3>
            <p>轻量、静态、可平铺的纸张纹理。高对比度模式和打印时自动关闭。</p>
          </div>
          <a
            class="brand-text-link"
            href="/brand/paper-light.svg"
            download="xiaohui-paper-light.svg"
            data-router-ignore
          >
            下载纹理 SVG <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section id="brand-type" class="brand-section" aria-labelledby="brand-type-title">
        <div class="brand-section-heading">
          <div>
            <p class="brand-kicker">04 / TYPOGRAPHY</p>
            <h2 id="brand-type-title">文字，有自己的层次。</h2>
          </div>
          <p>中文读得舒适，代码看得清楚。两套字形，各自做好一件事。</p>
        </div>
        <div class="brand-type-grid">
          <div class="brand-type-sample">
            <p class="brand-kicker">01 / READING</p>
            <h3>
              记录。
              <br />
              思考。
              <br />
              <span>继续生长。</span>
            </h3>
            <p>一个关于 AI Agent、工程实践、投资系统与长期学习的数字花园。</p>
            <small>
              Noto Sans SC / 系统中文无衬线字体
              <br />
              正文 {foundations["text-body"]} · 行高 {foundations["leading-reading"]}
            </small>
          </div>
          <div class="brand-type-sample brand-type-code">
            <p class="brand-kicker">02 / BUILDING</p>
            <div class="brand-code-specimen" aria-label="字体示例">
              <span aria-hidden="true">Aa / 01</span>
              <code>
                const notes = [<br />
                &nbsp; "build",
                <br />
                &nbsp; "write",
                <br />
                &nbsp; "learn"
                <br />]
              </code>
            </div>
            <small>
              IBM Plex Mono / 系统等宽字体
              <br />
              用于代码、命令与短元信息
            </small>
          </div>
        </div>
      </section>

      <section id="brand-usage" class="brand-section" aria-labelledby="brand-usage-title">
        <div class="brand-section-heading">
          <div>
            <p class="brand-kicker">05 / USAGE</p>
            <h2 id="brand-usage-title">保持清楚，保留留白。</h2>
          </div>
          <p>一点简单的约定，让每一次引用都能准确地传递来源。</p>
        </div>
        <div class="brand-usage-grid">
          <div>
            <ul class="brand-rules">
              <li>
                <span aria-hidden="true">01</span>
                <div>
                  <strong>按背景选择版本</strong>
                  <p>浅底用墨色组合，深底用浅色组合；图片与复杂底纹上先铺一块干净底色。</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">02</span>
                <div>
                  <strong>保持原始比例</strong>
                  <p>不拉伸、不挤压，不加描边、发光或额外渐变。</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">03</span>
                <div>
                  <strong>名称与链接保持一致</strong>
                  <p>中文写“晓灰”，英文写“Xiaohui”，网站为 xiaohui.cool。</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">04</span>
                <div>
                  <strong>引用不等于背书</strong>
                  <p>
                    标识用于准确说明来源与作者，不应让读者误以为存在未经确认的合作、认证或推荐。
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div class="brand-embed">
            <div>
              <h3>放进你的页面</h3>
              <button class="brand-copy" data-brand-copy={embed}>
                复制代码
              </button>
            </div>
            <pre data-clipboard-skip>
              <code>{embed}</code>
            </pre>
            <p class="brand-small-note">下载后放入网站的 /brand/ 目录即可引用，无需额外脚本。</p>
            <p class="brand-small-note">
              单色版本内联使用时可继承 currentColor；通过 img 引用时，使用固定浅色或深色版本。
            </p>
          </div>
        </div>
      </section>
      <div class="brand-endnote">
        <span>写代码也写字</span>
        <a href="/" data-router-ignore>
          回到晓灰的数字花园 <span aria-hidden="true">↗</span>
        </a>
      </div>
      <p class="brand-copy-status" role="status" aria-live="polite" />
    </div>
  )
  BrandKit.css = style
  BrandKit.afterDOMLoaded = script
  return BrandKit
}) satisfies QuartzComponentConstructor
