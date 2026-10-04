import { brandAssets } from "../design/brandAssets"
import { dark, foundations, light } from "../design/tokens"
import Darkmode from "./Darkmode"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/brandKit.scss"
// @ts-ignore
import script from "./scripts/brandKit.inline"

const swatches = [
  { role: "color-canvas", name: "纸白", usage: "页面底色" },
  { role: "color-surface", name: "纸面", usage: "内容与辅助信息" },
  { role: "color-text-strong", name: "墨色", usage: "标题与关键文字" },
  { role: "color-text-muted", name: "灰墨", usage: "日期、来源与说明" },
  { role: "color-accent", name: "铜色", usage: "链接与交互提示" },
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
          晓灰 <span>xiaohui.cool</span>
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
        <div>
          <p class="brand-kicker">XIAOHUI / BRAND KIT</p>
          <h1 id="brand-title">晓灰的品牌资料</h1>
          <p class="brand-lead">写代码也写字</p>
          <p class="brand-description">
            用于介绍、引用和展示的标识、配色与排版资料。延续博客的纸感、墨色和技术笔记气质，
            让每一次露出都能认出是晓灰。
          </p>
          <a class="brand-action" href="#brand-downloads" data-router-ignore>
            查看可下载资源 ↓
          </a>
        </div>
        <figure
          class="brand-signature brand-preview-light"
          style={{ backgroundColor: light["color-canvas"] }}
        >
          <img
            src="/brand/xiaohui-horizontal-light.svg"
            alt="晓灰 Xiaohui 横向标识"
            width="448"
            height="192"
          />
          <figcaption style={{ color: light["color-text-muted"] }}>
            晓灰 / XIAOHUI / xiaohui.cool
          </figcaption>
        </figure>
      </section>

      <section id="brand-marks" class="brand-section" aria-labelledby="brand-marks-title">
        <div class="brand-section-heading">
          <p class="brand-kicker">01 / IDENTITY</p>
          <h2 id="brand-marks-title">晨光与书页</h2>
          <p>一笔晨光，两页打开的笔记。保留“晓”的轻盈，也保留记录与思考的空间。</p>
        </div>
        <div class="brand-mark-grid">
          <figure
            class="brand-mark-card brand-preview-light"
            style={{ backgroundColor: light["color-canvas"] }}
          >
            <div class="brand-mark-stage">
              <img src="/brand/xiaohui-mark.svg" alt="晓灰晨光书页标识" width="96" height="96" />
            </div>
            <figcaption style={{ color: light["color-text"] }}>
              <strong>独立标识</strong> 小尺寸入口与署名
            </figcaption>
          </figure>
          <figure
            class="brand-mark-card brand-preview-light"
            style={{ backgroundColor: light["color-canvas"] }}
          >
            <div class="brand-mark-stage">
              <img
                src="/brand/xiaohui-horizontal-light.svg"
                alt="浅色背景使用的晓灰横向标识"
                width="280"
                height="120"
              />
            </div>
            <figcaption style={{ color: light["color-text"] }}>
              <strong>墨色组合</strong> 浅色页面与文档
            </figcaption>
          </figure>
          <figure
            class="brand-mark-card brand-preview-dark"
            style={{ backgroundColor: dark["color-canvas"] }}
          >
            <div class="brand-mark-stage">
              <img
                src="/brand/xiaohui-horizontal-dark.svg"
                alt="深色背景使用的晓灰横向标识"
                width="280"
                height="120"
              />
            </div>
            <figcaption style={{ color: dark["color-text"] }}>
              <strong>浅色组合</strong> 深色页面与封面
            </figcaption>
          </figure>
        </div>
        <div class="brand-size-row" aria-label="标识尺寸示例">
          {[32, 48, 64, 96].map((size) => (
            <div>
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
          <p>图标建议不小于 32px；横向组合建议不小于 224px。四周留出至少标识高度 1/4 的空间。</p>
        </div>
      </section>

      <section id="brand-downloads" class="brand-section" aria-labelledby="brand-downloads-title">
        <div class="brand-section-heading">
          <p class="brand-kicker">02 / DOWNLOADS</p>
          <h2 id="brand-downloads-title">拿来就能用的文件</h2>
          <p>SVG 为透明底矢量文件，字形已转为路径；无需安装字体，也不依赖第三方资源。</p>
        </div>
        <div class="brand-download-grid">
          {brandAssets.map((asset) => (
            <div class="brand-download-card">
              <h3>{asset.title}</h3>
              <p>{asset.description}</p>
              <code>{asset.filename}</code>
              <a
                class="brand-action"
                href={`/brand/${asset.filename}`}
                download={asset.filename}
                data-router-ignore
              >
                下载 SVG ↓
              </a>
            </div>
          ))}
        </div>
        <div class="brand-extra-downloads">
          <a href="/brand/xiaohui-mark.png" download="xiaohui-mark.png" data-router-ignore>
            图标 PNG · 512px
          </a>
          <a
            href="/brand/xiaohui-horizontal-light.png"
            download="xiaohui-horizontal-light.png"
            data-router-ignore
          >
            横向组合 PNG · 1200px
          </a>
          <a href="/brand/xiaohui-social.png" download="xiaohui-social.png" data-router-ignore>
            介绍封面 PNG · 1200×630
          </a>
          <a href="/brand/palette.json" download="xiaohui-palette.json" data-router-ignore>
            配色 JSON
          </a>
          <a href="/brand/README.txt" download="xiaohui-brand-readme.txt" data-router-ignore>
            使用说明 TXT
          </a>
        </div>
      </section>

      <section id="brand-colors" class="brand-section" aria-labelledby="brand-colors-title">
        <div class="brand-section-heading">
          <p class="brand-kicker">03 / COLOR & MATERIAL</p>
          <h2 id="brand-colors-title">浅纸，灰墨，一点铜色</h2>
          <p>纸面更浅、少一点黄色。纹理留在背景，文字保持清楚。点击色值即可复制。</p>
        </div>
        <div class="brand-palette-grid">
          {(
            [
              ["亮色", light],
              ["暗色", dark],
            ] as const
          ).map(([label, palette]) => (
            <div class="brand-palette">
              <h3>{label}</h3>
              {swatches.map(({ role, name, usage }) => (
                <button
                  class="brand-swatch"
                  data-brand-copy={palette[role]}
                  aria-label={`复制${label}${name}色值 ${palette[role]}`}
                >
                  <span
                    class="brand-swatch-color"
                    style={{ backgroundColor: palette[role] }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{name}</strong>
                    <small>{usage}</small>
                  </span>
                  <code>{palette[role].toUpperCase()}</code>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div class="brand-material-note">
          <p>
            <strong>纸张纹理</strong> 轻量、静态、可平铺。高对比度模式和打印时自动关闭。
          </p>
          <a href="/brand/paper-light.svg" download="xiaohui-paper-light.svg" data-router-ignore>
            下载纹理 SVG ↓
          </a>
        </div>
      </section>

      <section class="brand-section" aria-labelledby="brand-type-title">
        <div class="brand-section-heading">
          <p class="brand-kicker">04 / TYPOGRAPHY</p>
          <h2 id="brand-type-title">把层级交给文字</h2>
        </div>
        <div class="brand-type-grid">
          <div class="brand-type-sample">
            <h3>写代码也写字</h3>
            <p>一个关于 AI Agent、工程实践、投资系统与长期学习的数字花园。</p>
            <small>
              Noto Sans SC / 系统中文无衬线字体
              <br />
              正文 {foundations["text-body"]} · 行高 {foundations["leading-reading"]}
            </small>
          </div>
          <div class="brand-type-sample brand-type-code">
            <p>const notes = ["build", "write", "learn"]</p>
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
          <p class="brand-kicker">05 / USAGE</p>
          <h2 id="brand-usage-title">保持清楚，保留留白</h2>
        </div>
        <div class="brand-usage-grid">
          <div>
            <ul class="brand-rules">
              <li>
                <strong>按背景选择版本</strong>{" "}
                浅底用墨色组合，深底用浅色组合；图片与复杂底纹上先铺一块干净底色。
              </li>
              <li>
                <strong>保持原始比例</strong> 不拉伸、不挤压，不加描边、发光或额外渐变。
              </li>
              <li>
                <strong>名称与链接保持一致</strong> 中文写“晓灰”，英文写“Xiaohui”，网站为
                xiaohui.cool。
              </li>
              <li>
                <strong>引用不等于背书</strong>{" "}
                标识用于准确说明来源与作者，不应让读者误以为存在未经确认的合作、认证或推荐。
              </li>
            </ul>
            <p class="brand-small-note">
              单色版本内联使用时可继承 currentColor；通过 img 引用时，使用固定浅色或深色版本。
            </p>
          </div>
          <div class="brand-embed">
            <div>
              <h3>最小引用示例</h3>
              <button class="brand-copy" data-brand-copy={embed}>
                复制代码
              </button>
            </div>
            <pre>
              <code>{embed}</code>
            </pre>
            <p class="brand-small-note">下载后放入网站的 /brand/ 目录即可引用，无需额外脚本。</p>
          </div>
        </div>
      </section>
      <p class="brand-copy-status" role="status" aria-live="polite" />
    </div>
  )
  BrandKit.css = style
  BrandKit.afterDOMLoaded = script
  return BrandKit
}) satisfies QuartzComponentConstructor
