import sharp from "sharp"
import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import BodyConstructor from "../../components/Body"
import BrandKit from "../../components/BrandKit"
import Darkmode from "../../components/Darkmode"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { FullSlug } from "../../util/path"
import { sharedPageComponents } from "../../../quartz.layout"
import { defaultProcessedContent } from "../vfile"
import { brandAssets } from "../../design/brandAssets"
import { dark, foundations, light } from "../../design/tokens"
import { paperTextureSvg } from "../../design/paperTexture"
import { write } from "./helpers"

/** Product/reference page: emitted outside the authored vault, feed, RSS and search index. */
export const BrandPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    header: [],
    pageBody: BrandKit(),
    beforeBody: [],
    afterBody: [],
    left: [],
    right: [],
  }
  const Body = BodyConstructor()
  const ThemeToggle = Darkmode()
  return {
    name: "BrandPage",
    getQuartzComponents() {
      return [opts.head, Body, opts.pageBody, opts.footer, ThemeToggle]
    },
    async *emit(ctx, content, resources) {
      const cfg = ctx.cfg.configuration
      const slug = "brand" as FullSlug
      if (
        content.some(([, file]) => file.data.slug === slug || file.data.slug?.startsWith("brand/"))
      ) {
        throw new Error(
          "BrandPage reserves /brand and /brand/*; move conflicting authored content before building",
        )
      }
      const [tree, file] = defaultProcessedContent({
        slug,
        description: "晓灰的品牌标识、浅纸配色、排版规则与可下载资源。",
        frontmatter: {
          title: "品牌资料",
          tags: [],
          pageType: "brand",
          socialImage: `https://${cfg.baseUrl ?? "xiaohui.cool"}/brand/xiaohui-social.png`,
        },
      })
      const externalResources = pageResources("." as FullSlug, resources)
      const props: QuartzComponentProps = {
        ctx,
        cfg,
        tree,
        fileData: file.data,
        children: [],
        allFiles: [],
        externalResources,
      }
      yield write({
        ctx,
        slug,
        ext: ".html",
        content: renderPage(cfg, slug, props, opts, externalResources),
      })
      for (const asset of brandAssets) {
        yield write({
          ctx,
          slug: `brand/${asset.filename}` as FullSlug,
          ext: "",
          content: asset.svg,
        })
      }
      for (const [filename, width] of [
        ["xiaohui-mark.svg", 512],
        ["xiaohui-horizontal-light.svg", 1200],
      ] as const) {
        const asset = brandAssets.find((item) => item.filename === filename)!
        yield write({
          ctx,
          slug: `brand/${filename.replace(/\.svg$/, ".png")}` as FullSlug,
          ext: "",
          content: await sharp(Buffer.from(asset.svg)).resize({ width }).png().toBuffer(),
        })
      }
      const lockup = brandAssets.find((item) => item.filename === "xiaohui-horizontal-light.svg")!
      const socialMark = await sharp(Buffer.from(lockup.svg))
        .resize({ width: 672 })
        .png()
        .toBuffer()
      yield write({
        ctx,
        slug: "brand/xiaohui-social" as FullSlug,
        ext: ".png",
        content: await sharp({
          create: { width: 1200, height: 630, channels: 4, background: light["color-canvas"] },
        })
          .composite([{ input: socialMark, left: 264, top: 171 }])
          .png()
          .toBuffer(),
      })
      yield write({
        ctx,
        slug: "brand/paper-light" as FullSlug,
        ext: ".svg",
        content: paperTextureSvg("light"),
      })
      yield write({
        ctx,
        slug: "brand/palette" as FullSlug,
        ext: ".json",
        content:
          JSON.stringify(
            {
              name: "Xiaohui / 晓灰",
              website: `https://${cfg.baseUrl ?? "xiaohui.cool"}`,
              light: Object.fromEntries(
                Object.entries(light).filter(([key]) => key.startsWith("color-")),
              ),
              dark: Object.fromEntries(
                Object.entries(dark).filter(([key]) => key.startsWith("color-")),
              ),
              typography: {
                body: foundations["font-body"],
                code: foundations["font-code"],
                readingLineHeight: foundations["leading-reading"],
              },
            },
            null,
            2,
          ) + "\n",
      })
      yield write({
        ctx,
        slug: "brand/README" as FullSlug,
        ext: ".txt",
        content: [
          "晓灰 / XIAOHUI — 品牌资料 v1",
          `网站：https://${cfg.baseUrl ?? "xiaohui.cool"}`,
          "",
          "标识：晨光与打开的笔记页。SVG 为透明底矢量，字形已转路径。",
          "浅色背景用 xiaohui-horizontal-light.svg，深色背景用 xiaohui-horizontal-dark.svg。",
          "图标建议至少 32px，横向组合建议至少 224px；保留原始比例与画板留白，四周留出至少标识高度 1/4 的空间。",
          "xiaohui-monochrome.svg 在内联时可通过 SVG 的 color 属性调整；以 img 引用时保留默认墨色。",
          "下载后可自行托管文件，例如 /brand/xiaohui-horizontal-light.svg。无需额外品牌脚本。",
          "品牌资产用于准确说明来源与作者，不应让读者误以为存在未经确认的合作、认证或推荐。",
          "",
          "字形轮廓基于 Noto Sans CJK SC Bold / Regular（SIL OFL 1.1），只包含展示字形路径，不分发字体文件。",
          "生成来源：quartz/design/brandAssets.ts；颜色与排版来源：quartz/design/tokens.ts。",
          "页面与资源随构建生成，不进入博客文章、RSS 或搜索索引。",
          "",
        ].join("\n"),
      })
    },
    async *partialEmit() {},
  }
}
