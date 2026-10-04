---
title: 晓灰首页现代化重构技术方案
date: 2026-10-04
status: proposal
scope: homepage-only
---

# 晓灰首页现代化重构技术方案

本文给出可拆分实施、可验收、可回滚的首页重构方案，存放于 `docs/tech/202610`。本次交付只有方案，不包含首页代码实现，也不代表任何实现或生产发布已获批准。

**建议结论：在现有 Quartz v4 静态站内建立专用首页布局，将“认识作者 → 看到作品 → 选择阅读路径 → 持续阅读”作为主线。继承已建立的纸感中性色、品牌资源、语义 token 和紧凑 feed，以信息层级、排版和可验证内容实现现代化，不更换框架。**

## 1 依据与边界

### 1.1 审计基线

- 代码仓库：`istarwyh/xiaohui`，目标分支 `v4`
- 紧凑 feed 基线：[PR #93](https://github.com/istarwyh/xiaohui/pull/93)，合并提交 `b25bc3203700f224380bace2e95ac12054a4aaf1`
- 当前实施基线：[PR #95](https://github.com/istarwyh/xiaohui/pull/95) 已于2026-10-04合并，`v4` 为 `7b595545b1ea19eb880d5e2224238dbbc2f84223`，最终PR head为 `7b3fb0334ab1a24472da4906e2e102920c92a458`；本文已在合并后重新核对设计系统、品牌与SPA源码
- 参考网站：[lizheng.ai 首页](https://www.lizheng.ai/)，观测日期 2026-10-04；页面内容与浏览器视觉观察分别记录，不能据外观推断其框架、服务端架构或内部实现
- 本仓库的 `AGENTS.md`、`CLAUDE.md`、`design/README.md` 优先于外部教程。公开 Quartz 文档已显示 v5，不能直接把其 YAML 配置或社区插件机制搬到本仓库 v4

### 1.2 本轮目标

1. 新访客在首屏知道“晓灰是谁、关注什么、从哪里开始”，不必先理解终端命令
2. 用真实作品和原始文章建立可信度，承接工程、Agent 构建、投资系统研究这三条相关主线
3. 老读者能迅速进入全部文章与搜索；首页宣传区不能挤占主要阅读任务
4. 首页与文章、品牌页共享同一套视觉语言，同时允许首页采用更开放的构图
5. 中文与英文首页、键盘、窄屏、无 JavaScript、SPA 来回导航均有明确行为

### 1.3 不在本轮范围

- 不升级到 Quartz v5，不引入 Next.js、运行时 React 应用、CMS、数据库或新的 CSS 框架
- 不仿制参考站的品牌、照片、文案、评价、履历、会员体系、成员地图或 AI 问答产品
- 不重写文章、不改文章 URL、不批量生成个人经历、奖项、客户评价、投资收益或项目成效
- 不接入新统计、获客表单、付费系统或第三方追踪；现有服务的去留另行决定
- 不把设计、方案或品牌说明放进文章 vault，不增加一套设计 token，不重做文章页三栏布局

## 2 参考首页分析

### 2.1 实际观测

以下描述只表示页面在观测时的公开呈现，不表示对其中人物履历、业绩或评价做过独立事实核验。

| 层面     | 可观察到的处理                                                                     | 对晓灰的启发                                         |
| -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 桌面首屏 | 左侧大标题、简介与主次行动，右侧人物图；深色背景形成清晰第一印象                   | 首屏先讲作者与价值，再给少量明确入口                 |
| 导航     | 栏目锚点、语言切换和主行动；“更多”展开次级入口                                     | 主要阅读任务显露，低频链接下沉                       |
| 内容层级 | 代表作、人物对话、判断、文章等分段，标题与留白建立节奏                             | 首页应有编辑选择，不只是按时间堆内容                 |
| 可信度   | 作品与判断附可访问的原始记录                                                       | 作品、方法与研究都应能回到证据                       |
| 交互     | 导航随阅读位置变化；页面含展开项、成员检索及问答入口                               | 借鉴方向感，不继承高成本互动模块                     |
| 窄屏     | 523 CSS px时导航折叠；展开菜单含分组入口；作品改为上下布局，首屏人物图位于文案之前 | 采用单列与清晰触控入口；晓灰仍让文字和阅读行动先出现 |

来源：[参考首页](https://www.lizheng.ai/)。观测时检查了1188 CSS px桌面首屏、导航展开、代表作区和页面完整语义结构，并在523 CSS px窄视口检查了折叠菜单、首屏与作品堆叠。窄视口由云端Chromium窗口与缩放获得，不等同真实手机/触屏设备测试；本次未测参考站390px和320px。未提交问答、加入社区、登录或付款；技术栈、真实访问性能与跨设备兼容情况未审计。

### 2.2 采用与不采用

**采用信息组织方法。** 保留作者首屏、少量精选、明确阅读入口、来源可追溯、主次行动分明、连续的阅读节奏。现代感来自准确的取舍和一致性。

**转换为晓灰自己的表达。** 使用晓灰现有品牌图形与纸感表面；`whoami` 可以作为小型工程签名，面向读者的主标题和栏目名用自然语言。以正文与作品为视觉主体，不要求先有大幅肖像才能上线。

**不照搬长营销漏斗。** 晓灰的核心资产是长期写作和工程实践。没有经核实并适合首页的内容，不做数字成就墙、客户 logo 墙或评价轮播；不用大面积绿色、霓虹、全屏视频、粒子地图、滚动劫持或聊天窗口证明“AI 感”。

## 3 当前实现诊断

### 3.1 已有能力应该复用

- `quartz.layout.ts` 已区分 `index` 与 `en` 首页，保留独立的文章与列表布局
- `TerminalHome.tsx` 与 `terminalHomeContent.ts` 已分离一部分布局、双语文案和精选文章配置
- `FeedList.tsx` 在构建时生成文章 HTML，客户端按批次揭示；图片提取由 `quartz/util/feedImage.ts` 负责
- `Head.tsx` 已处理 canonical、语言 alternate、OG、JSON-LD；`LanguageSwitcher.tsx` 与 `util/translations.ts` 已处理翻译关系
- 现有 Search、Darkmode、RSS、SPA、popover、AgentIndex 和品牌资源无需另建替代品
- PR #95 提供 `quartz/design/tokens.ts`、静态纸纹、`/brand` 及自动设计契约测试

### 3.2 首页需要解决的问题

| 问题                     | 已核对的源码事实                                                                           | 重构处理                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 首页仍是文章三栏框架     | `renderPage.tsx` 统一输出左右栏、center 与右栏拖柄                                         | 首页使用专用布局；文章布局保留                                    |
| 第一阅读目标不集中       | TerminalHome 同框呈现身份、最近文章、精选、搜索、成长、奖项和诊断                          | 拆成少量有优先级的编辑区块                                        |
| 最近内容重复             | TerminalHome 取 6 篇最近内容，后面再渲染全量 FeedList                                      | 去掉独立 RecentSection，feed 只出现一次                           |
| 排序含义不一致           | 最近6篇通过 `getDate(cfg)`，当前默认日期是 created；feed 为 modified → published → created | feed 清晰标“最近更新”，排序沿用其既有规则                         |
| 双语筛选不一致           | 最近6篇区分 `en/`，FeedList 当前没有语言过滤                                               | 首页 feed 明确按页面语言筛选，并测试缺省语言回退                  |
| 可选链接变成整体依赖     | about、journey、membership 任一缺失，TerminalHome 整块不渲染；精选缺失会 throw             | 必需项失败报清楚；可选项按块降级                                  |
| 搜索 DOM 耦合            | terminal 搜索会把同一个 `.search-layout` 在内嵌容器与浮层之间搬移，并等待 ready            | 新首页只保留一个官方搜索入口与结果浮层，删除新首页的 DOM 搬移需求 |
| 无 JS 与键盘继续阅读不足 | 首批以后卡片默认 CSS hidden，仅由 IntersectionObserver 揭示                                | 增强成功后再分页隐藏，增加显式“加载更多”按钮                      |
| 旧构建脚本职责残留       | update-homepage 仍寻找 CardFeed、生成 Unsplash 卡片数据，并可强制重写 index                | 退出新首页数据链路，保留显式兼容命令或随后单独移除                |
| docs 构建存在误判风险    | docs 也有 index；只看 slug 无法辨别博客首页与文档首页                                      | 新首页要求显式 frontmatter 标记                                   |
| 自写脚本与正文耦合       | content/index.md 含外部客服脚本和 Clarity 内联脚本                                         | 单独记录迁移清单；确认保留后才移到资源层，不静默丢失或新增追踪    |

主要源码：[TerminalHome](https://github.com/istarwyh/xiaohui/blob/7b595545b1ea19eb880d5e2224238dbbc2f84223/quartz/components/TerminalHome.tsx)、[FeedList](https://github.com/istarwyh/xiaohui/blob/7b595545b1ea19eb880d5e2224238dbbc2f84223/quartz/components/FeedList.tsx)、[构建脚本](https://github.com/istarwyh/xiaohui/blob/7b595545b1ea19eb880d5e2224238dbbc2f84223/scripts/update-homepage.js)、[ContentPage](https://github.com/istarwyh/xiaohui/blob/7b595545b1ea19eb880d5e2224238dbbc2f84223/quartz/plugins/emitters/contentPage.tsx)。

上述为源码诊断，不意味着所有潜在问题都已在生产触发。PR #95 已修复同文档锚点/Back/Forward重挂载及等待micromorph完成的生命周期问题，并带回归测试；新首页必须保留这项已落地修复。Clarity内联脚本转义告警已被确认为旧版遗留，本方案将其列入后续脚本迁移清单，不再把图谱开关问题当作待修复前提。

## 4 用户任务与信息架构

### 4.1 三条主线

- **工程与 Agent 构建**：从真实系统、上下文工程、协议与可靠性文章进入
- **投资系统研究**：以研究过程、证据和复盘为内容，沿用 `agent-investing` 已有边界，不包装成荐股或跟单服务
- **写作与长期学习**：通过全部文章、成长时间线和关于页面理解作者的持续积累

“工程师、Agent builder、投资研究者”是内容组织方向，不直接新增首页职业头衔。“投资人”是否作为自我介绍应由作者确认。现有投资入口明确是建设中的个人研究系统，不应改成投资管理资质或收益承诺。[原始入口说明](https://github.com/istarwyh/xiaohui/blob/7b595545b1ea19eb880d5e2224238dbbc2f84223/content/agent-investing.md)

### 4.2 推荐顺序

1. **HomeHeader**：品牌回首页；精选、文章、关于；搜索、语言、主题
2. **HomeHero**：一个 h1、一段简介、主行动“开始阅读”、次行动“关于我”
3. **HomeFeatured**：三项精选起点，以作品/方法/研究体现主线，不复制全部精选列表
4. **HomePaths**：三个简短文字阅读路径；不足以形成独立合集的主题链接到已存在的有效页面
5. **HomeFeed**：标题“所有文章”，说明“按最近更新排序”；复用紧凑 feed，默认首批10篇
6. **HomeAboutLinks**：关于、成长时间线、GitHub、现有交流入口；没有内容依据的链接不出现
7. **现有 Footer**：RSS、品牌资料及其他低频导航

桌面页内锚点建议 `#featured`、`#writing`、`#about`。每个 ID 在页面中仅出现一次，中英文页面保持同一组 ID，便于共享链接。主行动去 `#writing`，不创建空泛的预约或订阅转化。

### 4.3 内容选择原则

- 首屏身份初版复用已存在的“晓灰 · 赛博农夫 · 写代码也写字”与简介，最终文案在实施 PR 单独展示差异
- 精选默认从现有人工配置挑选，不按最新时间、点击量或模型评分自动“发明代表作”
- 建议起点：Agent 投资系统、可靠 Agent 系统、上下文工程；这只是基于现有内容的编排建议，最终三项由作者审阅
- 关于页已提供MCPAdvisor的项目链接与作者关系；若作为项目卡，还需核对仓库当前状态和合适的本地说明页，不把现有一次性下载/奖项信息扩写为持续运营成效
- 现有奖项不删除事实记录，可进入关于/时间线；首页至多留一条简洁证据入口，不堆徽章
- 付费诊断保留现有入口即可，不在首页复制价格，以免与服务页成为两份报价来源

## 5 布局与响应式设计

### 5.1 桌面线框

```text
┌ 晓灰品牌 ───── 精选  文章  关于 ─── 搜索  中文/EN  主题 ┐
│                                                       │
│ whoami                                                │
│ 晓灰 · 赛博农夫 · 写代码也写字       小型品牌图形/作者注记 │
│ 一段经过确认的定位说明                                 │
│ [开始阅读]  关于我 →                                   │
├ 精选起点 ──────────────────────────────────────────────┤
│ 工程方法                 Agent 构建             投资研究 │
│ 真实标题/说明/链接        真实标题/说明/链接             │
├ 阅读路径 ──────────────────────────────────────────────┤
│ 工程与 Agent    投资系统研究    写作与长期学习            │
├ 所有文章 · 最近更新 ────────────────────────────────────┤
│ 紧凑文章标题  日期          可选辅助栏：关于/成长/RSS     │
│ 两行摘要                                               │
│ [小图][小图][小图]                                      │
│ …首批10篇…                 辅助栏不是悬浮图谱            │
│ [加载更多]                                             │
├ 关于与交流 / 页脚 / 品牌资料 ────────────────────────────┤
```

- 首页外框复用 `measure-brand:72rem`，正文流控制在 `measure-reading:44rem` 左右；具体列宽由 Grid 自适应分配，不新增任意全局宽度
- header 和精选可以宽于文章流；主阅读列不因去掉侧栏而无限变宽
- hero 用 `text-title`、`text-lead` 和已有 spacing，优先尝试现有 28–36px 标题尺度。若视觉稿证明需要更大首页标题，单独提 token 和测试，不能直接写 80px 营销字
- 首屏无需占满视口。1440×900 桌面目标能看到精选区起点；小屏目标能看到主行动且无迫使滚动的大型装饰
- 静态品牌图形为装饰时用空 alt/aria-hidden；真正作者照片只有在现有授权素材足够时才加入

### 5.2 平板与手机线框

```text
晓灰          搜索  主题  菜单
whoami
单一 h1，自然换行
简介
[开始阅读]  关于我 →
精选起点
  作品1
  作品2
  作品3
阅读路径（可换行文字链接）
所有文章 · 最近更新
  标题 + 日期（不另设大日期区）
  两行摘要
  0–3张小图
  …
[加载更多]
关于 / 成长 / RSS / 品牌
```

- 使用现有 Sass `$mobile` / `$tablet` / `$desktop`，不把断点复制到 TypeScript
- ≤800px 单列；中间宽度优先避免导航拥挤，精选可两列后转单列；1200px 以上允许辅助列
- 手机菜单使用原生 `details/summary` 或等价轻量 disclosure，内容在文档流中展开，避免全屏覆盖、焦点陷阱和滚动锁
- 搜索入口始终可触达；语言可以收进菜单但不得只靠国旗或无名图标表示
- 不使用横向卡片轮播、拖动才能发现的栏目或横向裁切来隐藏溢出
- 320、390、768、1024、1440 CSS px，以及200%缩放分别验收；800/1200临界点也测，遵从现有断点重叠的级联次序
- sticky header 只在足够高度的宽屏启用；锚点与焦点目标设置 scroll margin，窄屏/高缩放不遮挡正文

## 6 视觉系统使用方式

### 6.1 不变的基础

新首页消费 `quartz/design/tokens.ts`。颜色使用 `color-canvas`、`color-surface`、`color-text-strong`、`color-text`、`color-text-muted`、`color-accent`、`color-border`、`color-focus` 等现有语义；亮暗由同名 token 自动切换。纸纹沿用 `texture-paper`，不叠加滤镜或噪点 canvas。

字号、间距、圆角、动画、字体使用 foundations。首页 SCSS 不写第二套 hex、深色覆盖、`!important` 或 `transition:all`；不把全文改为等宽字体。正文链接有可辨认的下划线或同等非颜色线索，普通卡片不加重阴影。

新布局会调整 `design/README.md` 中“首页保留三栏/原内容顺序”的现状契约，说明仅首页发生变化；文章三栏与右栏调宽保持。不能为了遵循旧文档而阻止已批准的新布局，也不能悄悄让文档过期。

### 6.2 Feed 不可退回的契约

- 标题与日期在同一行布局，空间不足时自然换行
- 摘要最多两行，文字标题自然换行，不截成单行省略
- 桌面行内边距 `0.75rem 0.4rem`；移动 `0.65rem 0.2rem`
- 每篇最多三张去重真实图片；没有图片时不造占位或随机图
- 每张最多128×96，4:3框内 `object-fit:contain`；一张或两张也不放大
- 图片继续懒加载，丢失图片移除并收拢图片行
- 保留 `contain:inline-size`、Grid `minmax(0,1fr)`、正文 `min-width:0` 等防撑宽保护
- 新首页容器不得用宽泛 `.home article` 规则改变上述密度

### 6.3 动效

只使用已有120/180ms颜色、背景与透明度过渡。内容默认可见，禁止依赖滚动动画把初始内容设置为透明；不做打字机标题、数字计数、自动轮播。reduced-motion 下关闭非必要过渡，forced-colors/打印关闭纸纹并保留结构。

## 7 技术架构

### 7.1 选择专用首页布局而非独立应用

继续由 `ContentPage` emitter 为已有 `index` 和 `en` 页面生成 HTML，保留站点资源、Head、语言关系和静态内容管线。新增首页布局配置，不新增与 ContentPage 争抢 `index.html` 的 emitter，也不在 `extra-pages` 再造第二个首页。

```text
content/index.md、content/en.md
  pageType: home + 原有 SEO / 翻译元数据
                         │
homeContent.ts ── allFiles（已通过发布过滤） ── ctx.allSlugs
                         │
                 buildHomePageModel()
                         │
ContentPage 选择 homePageLayout
  ├─ HomeHeader（Search / LanguageSwitcher / Darkmode 各一个）
  ├─ HomePage（Hero / Featured / Paths / Feed / AboutLinks）
  ├─ shared Head / Footer
  └─ renderPage 最小 home variant（不输出侧栏与拖柄）
                         │
     静态 HTML + 同源 token CSS + 少量渐进增强脚本
```

### 7.2 入口判定与渲染接线

1. 在中文与英文首页 frontmatter 新增 `pageType: home`，保留现有 title、aliases、description、socialDescription、lang/source/translationKey 等字段
2. 新增纯函数 `isHomePage(fileData)`：同时满足 `pageType === "home"` 和合法首页 slug。文档的 `docs/index.md` 不会误进入博客主页
3. `ContentPage` 增加可选 `homeLayout`，普通 opts 默认行为不变；emit 和 partialEmit 使用相同的选择函数
4. `renderPage` 增加有限的 `layoutVariant`，只处理首页结构差异与 `data-layout="home"`。保留 PR #95 的真实 main、skip link 和资源输出，不能复制完整 HTML document 形成两套模板
5. 首页不渲染左右栏组件和右栏拖柄。仅用 CSS 隐藏侧栏是不够的，会留下重复 Search、ID、图谱初始化和不可见交互
6. 顶层导航在 main 外；HomePage 只输出 main 内的 section，不嵌套 main。首页只有一个 h1
7. 不依赖 Markdown 中的“所有文章”标题决定组件位置；标题由 HomeFeed 负责，中英文一致
8. 新首页上线前给 index/en 正文做逐项迁移：SEO 留 frontmatter；机器可读入口交由现有 AgentIndex/站点资源；原有脚本保留/迁移须有明确结论。不能把整段原文 Content 又渲染一次而产生重复标题和脚本

### 7.3 组件资源与构建陷阱

Quartz 当前的 `ComponentResources` 按 emitter 的 `getQuartzComponents()` 聚合资源，不会自动遍历所有嵌套 JSX。HomePage 内嵌 FeedList 或 Search，不等于其 CSS/脚本一定被注册。

- 首页布局与文章布局的组件必须都被 `getQuartzComponents()` 返回，按组件实例去重
- 若采用 HomePage 包装子组件，显式向上传递其 `css`、`beforeDOMLoaded`、`afterDOMLoaded`，或统一注册子组件；只选一种，避免重复打包
- 现有资源是全站聚合的，首页不渲染图谱不等于图谱代码已从公共 bundle 消失。首期不承诺“按路由零图谱 JS”；是否拆包是后续测量驱动的优化
- homepage 依赖allFiles与ctx.allSlugs。开发时已发布文章新增/变更/删除、翻译状态变化，以及本地图片资产新增/删除，都要重新生成index/en；当前ContentPage.partialEmit只重写changedSlugs，删除事件还可能没有file，不能被if (!changeEvent.file) continue吞掉。实现中把受影响主页加入重建，或开发阶段显式触发全量rebuild
- 纯数据模型不在组件 render 内修改 frontmatter、写文件或请求网络

## 8 文件级实施设计

| 文件                                                                                                                 | 计划职责与改动                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `quartz/components/HomePage.tsx`                                                                                     | 首页组合入口，只处理已经解析好的 model；声明所需资源                                |
| `quartz/components/HomeHeader.tsx`                                                                                   | 唯一首页导航与工具区；复用现有 Search、Darkmode、LanguageSwitcher、RssLink          |
| `quartz/components/home/HomeHero.tsx`                                                                                | h1、简介、两个主要动作；不持有业务数据                                              |
| `quartz/components/home/HomeFeatured.tsx`                                                                            | 0–3项人工精选，普通链接、可选媒体                                                   |
| `quartz/components/home/HomePaths.tsx`                                                                               | 阅读路径与有效入口；缺项自然收拢                                                    |
| `quartz/components/home/HomeAboutLinks.tsx`                                                                          | 关于、成长、GitHub与已存在的交流入口                                                |
| `quartz/components/home/homeContent.ts`                                                                              | 带类型的中英文人工文案与策展引用；从 terminalHomeContent 迁移，避免两套持续维护     |
| `quartz/util/homePageModel.ts`                                                                                       | slug解析、语言、链接校验、内容排除、精选、feed数据；纯函数可测                      |
| `quartz/components/FeedList.tsx`                                                                                     | 复用渲染；支持明确的语言范围/预选pages，以及渐进揭示模式；不重写图片算法            |
| `quartz/components/scripts/feedList.inline.ts`                                                                       | 新增显式加载、无JS降级、清理与状态播报；保留坏图处理                                |
| `quartz/components/styles/homePage.scss`                                                                             | 首页范围内的栅格、排版和密度；引入现有断点                                          |
| `quartz/components/styles/homeHeader.scss`                                                                           | header / disclosure / 工具触控区；不覆盖全站 nav                                    |
| `quartz.layout.ts`                                                                                                   | 新增 homePageLayout，文章与列表布局保留                                             |
| `quartz/plugins/emitters/contentPage.tsx`                                                                            | 布局分发、资源并集、主页数据依赖的增量构建处理                                      |
| `quartz/components/renderPage.tsx`                                                                                   | 最小首页 variant 与语义结构，无第二套 head/footer                                   |
| `quartz/components/index.ts`、`quartz.config.ts`                                                                     | 导出/接入首页组件与布局选项                                                         |
| `quartz/util/translations.ts`、`quartz/components/Search.tsx`、`Darkmode.tsx`、`RssLink.tsx`、`LanguageSwitcher.tsx` | 增加页面UI locale解析与必要文案适配；不修改全局cfg.locale，不引入新的语言系统       |
| `quartz/components/scripts/search.inline.ts`                                                                         | 从SSR data属性接收当前页面的状态/无结果文案，不继续使用固定英文                     |
| `quartz/components/scripts/spa.inline.ts`、`spa.test.ts`                                                             | 仅补跨语言导航同步html.lang及回归；保留PR95的await micromorph与同文档历史修复       |
| `quartz/components/Head.tsx`                                                                                         | 保留现有SEO输出；移除未实现q参数对应的SearchAction声明，除非另行实现并验证查询入口  |
| `content/index.md`、`content/en.md`                                                                                  | 显式首页标记与正文迁移；遵循 content/CLAUDE.md，不重写个人事实                      |
| `scripts/update-homepage.js`、`package.json`                                                                         | 新首页不读旧 CardFeed/Unsplash 结果；生产构建去除无意义生成步骤，保留其他调用方兼容 |
| `design/README.md`                                                                                                   | 更新首页布局契约、沿用 feed 规则与贡献指导                                          |
| `quartz/util/homePageModel.test.ts`、`quartz/design/homePage.test.ts`                                                | 数据、结构、链接、token、双语、feed/首页不互相污染                                  |
| `tests/homepage.spec.ts` 或既有测试目录                                                                              | 如采用浏览器自动化，放入项目约定目录并明确新增依赖；不是本方案已存在的文件          |

拆分以职责为准；非常短的纯展示子块可留在一个 `HomeSections.tsx`，不为五行 JSX 制造过多文件。无需先建通用组件库、抽象 schema 引擎或插件系统。

## 9 内容模型与降级规则

### 9.1 单一事实来源

- 作者文案、身份和精选选择：从现有 `terminalHomeContent.ts` 迁移到 `homeContent.ts`
- 文章标题、描述、日期、语言：读取已发布的 `QuartzPluginData`，不复制到第二份 JSON
- 原文与图片：继续使用现有 slug 解析、`resolveRelative`、`getFeedImages` 和构建资产集合
- 品牌与主题：只读 `quartz/design`
- 首页静态配置不包含 API key、账号凭证、未公开数据、读者信息或自动抓取第三方个人档案

建议类型如下；这是设计接口，不是已实现代码：

```ts
type HomeLocale = "zh-CN" | "en"

type HomeTarget = { kind: "page"; slug: string } | { kind: "external"; href: string }

interface CuratedHomeItem {
  id: string
  target: HomeTarget
  label?: string // 只有人工策展确实需要不同于原文标题时才使用
  note?: string // 人工审阅的一句推荐理由
  required?: boolean
}

interface HomeContent {
  locale: HomeLocale
  identity: {
    heading: string
    description: string
    about: CuratedHomeItem
  }
  featured: CuratedHomeItem[]
  paths: CuratedHomeItem[]
  aboutLinks: CuratedHomeItem[]
}

interface HomePageModel {
  locale: HomeLocale
  uiLocale: "zh-CN" | "en-US"
  identity: ResolvedIdentity
  featured: ResolvedHomeItem[]
  paths: ResolvedHomeItem[]
  aboutLinks: ResolvedHomeItem[]
  feedPages: QuartzPluginData[]
  diagnostics: HomeDiagnostic[]
}
```

`ResolvedIdentity`、`ResolvedHomeItem`、`HomeDiagnostic` 在实现中明确定义，包括解析后的 href、来源slug、可选图片、稳定id和诊断级别。最终渲染不得把未经校验的 URL 直接当 HTML 注入。

### 9.2 解析顺序

1. 输入只使用 emitter 提供的发布后 allFiles，不重新扫描磁盘绕开 draft/private 过滤
2. 归一化locale复用 `normalizeLang`；身份文案、导航、日期以首页明确的frontmatter.lang为准。文章筛选优先frontmatter.lang，缺失时可按既有en/路径约定兜底，最后中文默认。注意现有translations只使用lang→cfg.locale，不会自动推断路径；对en/下缺失lang的条目给构建告警，避免把首页筛选的兼容兜底误称为全站语言规则，不在本轮批量改文章
3. 用 Quartz 的 `slugifyFilePath` 和已解析 slug 查找，禁止自写另一份中文 slug 转义
4. 内链通过 `resolveRelative` 生成；外链仅允许显式 http/https，联系入口若有 mailto 则单独列为允许类型，拒绝 javascript/data URL
5. 解析精选/路径，按配置顺序展示、按 slug/id 去重；必需链接缺失为构建错误并输出配置位置，可选链接缺失给构建告警并移除
6. 精选不足三项就显示已有项，零项隐藏整个区块；不得随机选择文章补齐“代表作”
7. 所有文章按 `modified → published → created` 排序；同时间使用稳定标题+slug次序。无日期放尾部且不显示虚构日期
8. 首页model不得额外用new Date()或磁盘mtime补齐日期。首期保持现有page.dates兼容；CreatedModifiedDate自身有frontmatter→git→filesystem以及无效值当前时间回退，且目前不记录日期来源，因此不能声称page.dates已经排除检出时间。发布前核验首屏文章日期来自有效frontmatter/git，报告异常；若要全面消除filesystem回退，应另行扩展日期来源字段并测试，不能仅靠首页排序函数假装做到
9. 无摘要时隐藏摘要；无图时保持文字卡；无文章时给出清楚的空状态和关于/RSS入口

### 9.3 排除与双语

默认排除 index、en、404、tags/_、_/index 和明确非文章标记；品牌页由独立 emitter 生成，本来不应成为 feed 数据。新增 `feed:false` 如有需要应单独定义，不把 `rss:false` 或 `recent:false` 偷换成同一语义。

首期不对整个 vault 批量打标。先用已存在的首页/系统 slug 排除，列出少量经作者确认的非文章入口，再逐步用显式元数据替代。AGENTS/CLAUDE、设计文档与私有目录必须继续由现有过滤保证不公开。

中文首页只取中文/未声明语言的中文默认文章，英文首页只取英文文章；不通过自动翻译补齐英文首页。英文精选不足时缩减数量；链接到中文原文须明确标“中文”，不伪称已翻译。所有栏目、按钮、空状态、加载状态与辅助技术文案也要本地化，日期使用页面语言而非全局zh-CN。

当前Search、Darkmode、FeedList消费全局cfg.locale，RssLink固定中文，search.inline的无结果文案固定英文，直接复用不会自动获得双语。增加轻量页面UI locale适配，使用fileData.frontmatter.lang并映射到Quartz ValidLocale：内容标记en映射en-US，中文映射zh-CN；不能把类型示例中的HomeLocale直接传给Date组件或i18n。由SSR把当前页面状态文案写入data属性给搜索脚本消费，nav后重新读取；LanguageSwitcher的导航名称和图标辅助名称同样核验。

## 10 交互与兼容性

### 10.1 搜索

- 新首页只有一个 `Search()` 实例、一个输入/结果体系；用它的已有快捷键与浮层
- hero 不再加另一套“终端输入 → 搬移搜索 DOM”的桥接；可以增加“搜索文章”按钮，但它只触发现有搜索实例
- 普通查询、中文输入法组合、无结果、上下键、Enter、Escape、关闭后焦点返回、重复打开都验收
- 首次慢网络加载必须有可识别的等待/错误状态，不让按钮看似无反应
- 无 JavaScript 时不显示一个不可用输入框；仍可直接浏览静态文章链接

### 10.2 Feed 与继续阅读

推荐新首页采用**显式加载更多**作为默认模式，首批10篇，每次10篇；旧组件如仍有其他调用方，默认行为保持兼容，用 options 在新首页选择模式。

- JS成功初始化后才对后续卡片应用隐藏；无JS或初始化失败时全部静态链接可见
- 按钮是原生 button，含剩余/已显示状态，加载完成后明确结束；用简短 aria-live 通知增加数量
- 用户主动激活“加载更多”后，将焦点放到首个新增文章标题链接，并用focus({ preventScroll: true })及必要的最近位置滚动保持上下文；随后Tab顺序沿新增内容继续。自动揭示不移动焦点。按钮在列表之后，不能一面保留按钮焦点，一面假定下一次Tab会倒回新增卡片
- IntersectionObserver 可以作为可选增强，但不能成为唯一入口；若保留自动加载，不能使页脚持续逃离键盘/触控用户
- 图片错误监听、observer和按钮监听在 `window.addCleanup` 中清理
- 从文章 Back 返回已展开的首页时，至少恢复可见条数与滚动锚点。若使用 sessionStorage，仅存当前首页路径、可见数量等低风险UI状态；不保存搜索词或阅读档案
- 本轮维持构建期全量HTML，不同时引入网络分页。只有实际测量证明HTML体积不可接受时，另立静态归档分页方案

### 10.3 SPA 与导航

所有新脚本遵循当前仓库 `nav` + `window.addCleanup` 生命周期，查询当前 DOM 后再绑定；不存在首页节点时立即返回。避免全局重复监听、重复ID、把已离开页面的元素留在闭包里。

当前SPA只morph body与替换head，不同步document.documentElement.lang。跨中文/英文页面时，在morph成功后、notifyNav前同步新文档lang；保留saved-theme等主题状态，失败仍走现有整页导航回退。此项是本轮需要补的兼容细节，与PR95已修复的同页锚点生命周期不同。

同页锚点、跨页回首页锚点、浏览器前进/返回、手动刷新深链接分别测试。对原生 skip link 保留 `data-router-ignore`；普通站内文章仍由现有 SPA 处理。下载与品牌资源继续绕过 SPA。

首页去掉图谱并不删除全站图谱功能，文章页仍完整保留。ReaderMode 放在文章工具区；首页不保留一个缺乏阅读对象的开关。主题与语言状态沿用现有实现，不新建 localStorage 协议。

## 11 可访问性与性能

### 11.1 可访问性验收

参考 [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)，以下是本项目验收清单，不能等同完整合规认证：

- 全站一个main，首页一个h1，区块h2，卡片标题不跳级；nav具有可区分的名称
- skip link 真实移动到主要内容，焦点可见，不被sticky header遮挡
- 常规正文、辅助文字与日期4.5:1；大字和关键控件边界按适用条件至少3:1；继续用现有 token 测试含纸纹最坏叠加
- 工具按钮触控区至少44px，这是本项目更保守的设计目标，不把它误称为所有WCAG AA目标的统一最低值
- 所有动作可键盘完成；不以hover或颜色作为唯一提示；不嵌套可交互链接
- 320px、200%缩放、用户文字间距覆盖、强制颜色、减弱动画均无内容丢失和横向页面滚动
- 装饰图空alt，有信息图片提供真实替代文本；不存在的图不留下无意义空框
- 菜单展开状态可读，Escape可关闭并返回触发点；点击导航后不会遗留展开菜单

### 11.2 性能预算

先对 PR #95 最终生产基线记录资源体积与同条件浏览器数据，再比较实现。不把参考站体感或一次Lighthouse分数当作性能基线。

| 项目           | 首期目标                            | 测量说明                                                  |
| -------------- | ----------------------------------- | --------------------------------------------------------- |
| 新增首页交互JS | gzip增量≤10KB                       | 相对基线postscript及新增资源合计，不重复算已有Search      |
| 新增首页CSS    | gzip增量≤8KB                        | 包括全局bundle变化，不只统计homePage.scss源码             |
| 新增首屏媒体   | 默认无大图；如需要，合计≤120KB      | 明确宽高、尺寸匹配、非首屏lazy；只有真实LCP图才设高优先级 |
| LCP            | ≤2.5s                               | 有足够真实用户数据时以移动/桌面分别p75评价                |
| INP            | ≤200ms                              | 需要真实交互/现场数据，不能用TBT冒充INP                   |
| CLS            | ≤0.1                                | 图片预留尺寸，字体回退、菜单和feed加载不意外推移当前视口  |
| 增量退化       | 同条件实验中不超过基线10%且说明噪声 | 至少3次冷启动取中位数；报告测试机、网络、视口与主题       |

Core Web Vitals 的阈值与p75口径来自 [web.dev](https://web.dev/articles/vitals)。实验室数据用于发布前回归，现场数据用于发布后判断，二者分别报告。没有现场样本时明确“未测”，不为了首页引入新的跟踪服务。

现有 `pageResources` 会拉取内容索引，组件资源也全站聚合，因此本轮预算只约束新增负担。若旧索引/公共图谱资源已经过重，记录独立优化项，不能靠删除搜索功能或隐瞒总下载量达到目标。

## 12 SEO 与机器可读能力

1. 保持 `/`、`/en`、现有文章URL和alias，不制造首页canonical迁移
2. 保留 Head 的 canonical、OG、语言alternate与网站类型；首页不生成Article结构化数据
3. 首页title/description是否从现有“太阳总会升起”进一步转向作者名，作为单独文案决策；默认不悄悄改已有标题
4. 初版只复用已验证的WebSite结构化数据。若增加Person/schema，所有字段要来自确认的公开信息，不添加未知奖项、合作关系或职业资质
5. Head现有SearchAction写的是 `/?q=...`，已核对search.inline当前没有消费URL q参数。首期建议移除这条无效声明，保留WebSite其余字段；若希望提供可分享搜索URL，另行实现并验证，不能仅改metadata声称支持
6. 核验 `/llms.txt`、`/agent/manifest.json`、Agent markdown/search index、RSS和sitemap仍存在且链接有效
7. 首页布局与策展配置不进入文章索引；`docs/tech/202610` 只属于仓库技术文档，默认内容构建不发布它
8. 双语关系沿用source/translationKey；不输出指向不存在翻译的hreflang
9. 抓取不依赖JS。文章入口、精选、描述都应在构建后的HTML中可读取

## 13 实施顺序与发布

### 阶段0 方案和内容确认

- PR #95 已合并；实现分支以本文的最终基线为起点，开工时检查v4是否又有后续变更
- 确认首屏名称与一句话简介、三项精选、保留的交流入口、外部脚本去留
- 保留原始首页截图、资源体积、英文页与文章回归样本
- 本文作为方案提交，不在文档PR夹带视觉实现

退出条件：依赖基线明确；未知个人事实不被当作确定文案；下列决策有默认值或明确待定项。

### 阶段1 数据与专用布局

- 实现home标记、homePageModel、homeLayout分发、静态结构和资源注册
- 中英文一起接线，docs构建独立运行
- 不先做动效；预览验证链接与h1/main/页脚结构
- 以构建配置控制legacy/editorial切换；只输出其中一种，禁止把两套首页藏在同页
- preview开启editorial，production仍保持legacy，切换值不进入浏览器或用户cookie

退出条件：单元、类型、链接与双语结构检查通过，旧首页仍可用单项配置恢复。

### 阶段2 视觉与渐进交互

- 按token实现首页布局，保持FeedList的既有图片与密度
- 新搜索入口、菜单、加载更多、无JS回退与Back恢复
- 迁移已经确认保留的首页脚本；未决定的脚本不悄悄移除或换供应商
- 建立窄屏与主题截图、键盘用例

退出条件：桌面/移动/亮暗/无JS/SPA矩阵通过，所有已知差异有解释。

### 阶段3 审阅与上线

- draft PR附实际截图、精确commit预览URL、测试与预算结果、内容diff、回滚步骤
- 检查精确commit的Ubuntu/macOS/Windows CI与Cloudflare预览；不能拿旧commit结果代替
- 作者审阅首页编排后再申请合并/生产发布；方案批准不自动授权上线
- 上线后验证canonical、RSS、双语、搜索和核心内链，记录结果
- 观察窗口建议为上线当天与下一次正常内容发布；若有真实流量样本，再看CWV，不做无休止或未经请求的监控

退出条件：指定生产commit可访问，关键回归成立；否则立即按已授权流程回滚。

### 回滚

首选revert首页实现PR或将构建配置切回legacy并重新部署。内容元数据迁移要保持legacy可读，旧TerminalHome在切换稳定前暂不删除。回滚不能倒退PR #93/#95的feed、token、品牌资源，也不应回滚同期无关文章。确认稳定后单独清理legacy组件与旧脚本，避免长期维护两套首页。

## 14 测试与验收矩阵

### 14.1 自动检查

```bash
npm run check
npm test
npm run check:design
node --test ./scripts/update-homepage.test.js
npx quartz build
npx quartz build --bundleInfo -d docs
```

以上既有命令要在最终实现分支核对有效性；新增首页测试须接入 `npm test` / CI，而非只在本地手动执行。不要用生产 `npm run build` 代替无副作用的首轮验证，它会运行仓库特有生成步骤。生产构建流程变更也要在隔离工作树实际跑一遍并核对产生的diff。

新增单元/结构测试至少包括：

- pageType与slug组合、普通文章和docs/index不误判
- zh/en归一化、HomeLocale到ValidLocale映射、缺失lang告警、英文精选缺失与语言回退
- 精选去重、必需/可选链接缺失、未知协议、中文slug与空列表
- modified/published/created优先级、无日期、同时间排序稳定
- published数据范围、系统文件排除、0/1/2/3/多图与缺失图片
- SSR一个h1/main、header位置、唯一Search/ID、有效anchor与按钮名称
- token检查、feed几何契约、新样式作用域、不新增原始色或暗色覆盖
- partialEmit文章新增/变更/删除，以及仅删除图片资产/补齐原缺图后主页更新；docs不会请求博客必需页面
- brand页、Agent索引、RSS、OG、canonical、hreflang不回归

### 14.2 浏览器矩阵

| 维度   | 必测                                                                 |
| ------ | -------------------------------------------------------------------- |
| 视口   | 320 / 390 / 768 / 1024 / 1440，800/1200临界点，200%缩放              |
| 主题   | 亮 / 暗 / 系统主题首次进入 / 连续切换                                |
| 语言   | 中文首页、英文首页、首页与文章语言切换，SPA后html.lang及工具文案正确 |
| 交互   | 菜单展开关闭、锚点、搜索键盘、IME、无结果、重复Escape                |
| Feed   | 首批10、继续加载、完成、1/2/3图、坏图、无图、长标题与长日期          |
| 导航   | 首次加载、文章→首页、首页→文章、Back/Forward、深链接刷新             |
| 降级   | JS关闭、慢/失败索引、图片失败、reduced-motion、forced-colors         |
| 非首页 | 长文、带图表/代码文章、tag/folder、brand、404、docs构建              |

用真实截图检查视觉节奏、密度、层级和截断，不只读DOM。若浏览器工具限制无法测某一项，写“未测及原因”，不可替用户默认为通过。

### 14.3 最终验收清单

- [ ] 首页能够快速说明作者与内容主线，主要入口无需理解终端命令
- [ ] 只有一套首页结构，一个h1，一个main，一个搜索实例
- [ ] 所有个人事实、精选和对外入口都有现有来源或作者确认
- [ ] 不新增未经验证的职业资质、收益、评价、客户或统计数字
- [ ] 精选与feed不重复一整组“最新内容”；feed只出现一次
- [ ] 三图上限、128×96上限、日期同行、两行摘要与紧凑间距全部保留
- [ ] 中英文有各自有效内容，日期和辅助文案跟随当前页面语言
- [ ] 320px/200%缩放无页面横向溢出，手机工具触达可靠
- [ ] 无JS仍可读与导航，键盘能继续加载并访问页脚
- [ ] 搜索、主题、SPA返回与锚点不会产生重复监听或焦点丢失
- [ ] 文章、列表、brand、RSS、Agent入口、canonical与docs不回归
- [ ] 最终commit全部必需检查通过，已测/失败/未测分开列出
- [ ] 相对基线的CSS/JS/媒体体积和性能已记录，没有虚构性能分数
- [ ] 变更仅在明确批准后上线，回滚路径已验证

## 15 风险与决策

| 风险                               | 优先级 | 控制措施                                                       |
| ---------------------------------- | ------ | -------------------------------------------------------------- |
| 现代化变成营销模板，削弱写作主线   | 高     | 控制hero高度，前三个栏目就进入文章，不做数字墙                 |
| 首页布局改变误伤文章三栏           | 高     | 显式layoutVariant与作用域，保留非首页回归矩阵                  |
| 个人文案为了布局被扩写             | 高     | 内容diff单独审核；未知信息不展示                               |
| 首页/文章DOM与SPA脚本耦合          | 高     | 真正不渲染侧栏，单实例搜索，nav清理与重复流程测试              |
| 数据模型变更导致语言或排序意外漂移 | 中     | 固定排序与locale规则，fixture单测，构建前后文章集合对比        |
| 新组件资源遗漏或重复注入           | 中     | getQuartzComponents并集、产物检查、构建测试                    |
| 增量构建首页不更新                 | 中     | 将allFiles依赖显式纳入首页重建，测试删除与新增                 |
| 后续v4变化使方案过期               | 中     | 实施前对比本文锁定commit与最新v4的token、路由和QA结论          |
| 外部字体/图片/客服脚本拖慢或报错   | 中     | 回退字体、可选媒体、独立脚本清单，不新增供应商                 |
| 全量feed与索引体积增长             | 中     | 测量总资源与HTML；超预算另做静态分页，不假称仅靠隐藏就减少下载 |
| 旧生成脚本覆盖新首页               | 高     | 新首页退出旧脚本链路，禁止FORCE覆盖；隔离工作树验证生产命令    |

### 实施前需作者确认的少量内容

1. 首屏是否继续使用现有“晓灰 · 赛博农夫 · 写代码也写字”？默认继续，不替作者另造口号
2. 三个精选起点是否采用本方案建议？默认只使用已存在文章，不添加项目成效描述
3. 首页是否保留付费诊断入口？默认下沉到关于/交流区，只链接原页面
4. 客服与Clarity脚本是否保留？默认不自行改变追踪政策；先修复或迁移已批准的行为
5. 是否加入作者照片？默认使用现有品牌图形或纯排版，没有照片不阻塞上线

以上不阻塞方案本身交付。实现必须先得到明确请求；若无新增文案或素材确认，可按保守默认准备预览，不能把默认值当作对外发布授权。

## 16 来源与后续维护

- [参考首页](https://www.lizheng.ai/)：只用于2026-10-04公开页面与布局观察
- [仓库最终基线](https://github.com/istarwyh/xiaohui/tree/7b595545b1ea19eb880d5e2224238dbbc2f84223)：当前组件、构建、语言与数据规则
- [PR #95](https://github.com/istarwyh/xiaohui/pull/95)：语义token、品牌页、纸纹、SPA修复与设计规则；已锁定合并commit `7b595545b1ea19eb880d5e2224238dbbc2f84223`
- [Quartz组件文档](https://quartz.jzhao.xyz/advanced/creating-components)：确认公开文档现为v5；本方案接口仍以仓库v4源码为准
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)：可访问性检查依据
- [Core Web Vitals](https://web.dev/articles/vitals)：指标阈值、p75与现场/实验室口径

后续实现PR应更新本文状态、精确基线、决策结果与偏差，不把“计划如此”改写成“已经验证”。最终长期契约进入 `design/README.md`，本文保留当时的决策依据与迁移记录。
