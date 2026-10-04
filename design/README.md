# 晓灰的设计系统

版本：v1 · Editorial / Technical Notebook

这份规范属于产品与工程文档，放在 `design/`，不进入 `content/`、文章流、搜索索引或 RSS。它约束呈现方式，不改写作者的观点、身份或经历。

## 1. 长期判断

晓灰的博客是持续积累的个人知识与作品空间。工程、Agent、投资判断和个人观察可以共享一个稳定的作者身份，不需要为每个主题另造一套视觉品牌。

长期辨识度来自 **清楚的作者、可读的内容、可靠的结构和克制的细节**。因此：

- 以纸感中性色、墨色正文、低饱和铜色交互建立一致性；强调色可整体替换，不能成为身份的唯一来源
- 保留首页 `whoami`、命令标签等工程语言；终端是表达细节，不把整站变成发光控制台
- 长文采用 CJK 友好的无衬线排版；等宽字体只用于代码、命令、短日期等结构信息
- 首页保持密集可扫读，文章保持舒适可阅读。密度是按任务选择的设计规则，不是一套大间距卡片套全站
- 对图谱、引文、回链保持较低视觉权重，让内容和作者成为第一阅读入口
- “AI 时代”的重点是能被人与 AI 一起维护的语义、证据和校验，而不是渐变、光晕或不断增添装饰

### 本次审计发现

此前存在 Quartz 默认主题、`custom.scss` 的强制绿色暗色覆盖、终端组件自己的亮暗配色、侧栏组件独立颜色四套来源。`!important` 和暗色文本光晕使主题配置无法真正控制页面；日期用浅灰导致亮色低对比度；中文终端正文和超小徽章牺牲可读性。

v1 直接移除冲突层，而不在末尾叠加第五套覆盖。已有文案、主题结构、文章内容、图谱行为与 feed 图片提取规则保留。

## 2. 单一来源与构建路径

```text
quartz/design/tokens.ts
  ├─ foundations：字体、字号、间距、密度、尺寸、圆角、动效
  ├─ light / dark：同名语义颜色与阴影
  ├─ designTokens：浏览器 CSS 自定义属性
  └─ xiaohuiTheme：Quartz 兼容配色 + 字体配置
         ↓ quartz.config.ts
         ↓ quartz/util/theme.ts → joinStyles()
         ↓ public/index.css + Quartz 图谱/OG 等消费方
```

没有第二份手写 CSS token 表，也没有需要人工同步的生成文件。构建时输出 `:root` 和 `:root[saved-theme="dark"]`；主题开关和持久化仍沿用 Quartz。JavaScript/OG 使用同源的具体颜色值，CSS 使用语义变量。

本项目用轻量 TypeScript 对象作为可机读源，不声称实现 DTCG 文件格式。以后需要 Figma/多端交换时，可以从这里导出 DTCG 格式；不要先引入同步平台或大型组件框架。

### 三个层次

1. **基础尺度**：`space-*`、`text-*`、`radius-*` 等有限选项
2. **语义角色**：`color-text-muted`、`color-surface` 等表达用途，自动适应主题
3. **组件契约**：仅在确有产品约束时增加，如 `feed-thumbnail-width` 和 feed 行密度

不要为每条 CSS 声明造一个 token，也不要让组件读取与用途无关的颜色名称。

## 3. 颜色语义

| Token                                 | 用途                     | 约束                                |
| ------------------------------------- | ------------------------ | ----------------------------------- |
| `color-canvas`                        | 页面底色                 | 全站默认表面                        |
| `color-surface`                       | 首页介绍、代码、辅助信息 | 无大面积重阴影                      |
| `color-surface-raised`                | 搜索结果、悬浮预览       | 仅浮层可用阴影                      |
| `color-surface-hover`                 | 行/结果悬停              | 不改变几何或移动内容                |
| `color-text-strong`                   | 标题、关键标签           | 用字重建立层级                      |
| `color-text`                          | 正文、摘要               | 所有正文表面至少 4.5:1              |
| `color-text-muted`                    | 日期、来源、辅助描述     | 仍至少 4.5:1，不靠 opacity 淡化     |
| `color-accent` / `color-accent-hover` | 链接、交互提示           | 不涂满普通标题                      |
| `color-accent-soft`                   | 标签、局部强调底色       | 搭配正文或强调文字                  |
| `color-border`                        | 非关键分隔线             | 不能单独标识输入框边界              |
| `color-border-strong`                 | 输入框、可交互边界       | 对相邻表面至少 3:1                  |
| `color-focus`                         | 键盘焦点                 | 至少 3:1，2px 实线＋3px 偏移        |
| `color-selection` / `color-mark`      | 文本选中、搜索匹配       | 保持文字可读                        |
| `color-positive/warning/danger`       | 状态信息                 | 必须同时提供文字/图标，不能只靠颜色 |
| `color-overlay`                       | 模态背景                 | 不用来承载正文                      |

颜色与阴影原始值只在 `tokens.ts` 中修改。暗色模式保持相同的语义关系，并非简单反色。非关键分隔线允许更轻；正文、控件和焦点不能借此降低可访问性要求。

### Quartz 兼容映射

`light → canvas`、`lightgray → border`、`gray → text-muted`、`darkgray → text`、`dark → text-strong`、`secondary → accent`、`tertiary → accent-hover`、`highlight → accent-soft`、`textHighlight → mark`。

旧 Quartz 组件可以继续读这些别名。新写的品牌组件应优先用语义名称。尤其注意 `--gray` 不再是装饰浅灰，不能拿低对比色同时承担日期文字与边框。

## 4. 字体、密度与布局

- 正文/标题：Noto Sans SC，后备 system-ui、PingFang SC、Microsoft YaHei、sans-serif。沿用已有 Google Fonts 加载，不新加字体依赖；字体请求失败时仍可阅读
- 代码/短命令：IBM Plex Mono，后备 ui-monospace、SFMono-Regular、Consolas、Liberation Mono
- 正文基准 16px，文章行高 1.85；UI 1.5，代码 1.6，标题 1.35
- caption 12px、meta 13px、small 14px；新组件不使用更小的标签文字，不给中文正文增加字距
- 标题随视口在 28–36px 范围变化；首页身份标题 24px，避免把密集知识主页改成巨大营销首屏
- 正文最大宽度 `44rem`，页面最大宽度 `100rem`；宽图表和代码在各自容器内滚动
- 间距以 4px 为基准：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px
- 圆角 4 / 8 / 12px；圆形仅用于小圆点等，普通信息不做满屏胶囊
- 普通内容不使用阴影；`shadow-popover` 和 `shadow-overlay` 分别用于悬浮预览和搜索浮层
- 动效只有 120 / 180ms；以颜色、背景、透明度变化为主，不为装饰移动文字

### 响应式边界

`quartz/styles/variables.scss` 的 Sass `$mobile` / `$tablet` / `$desktop` 是布局断点的唯一来源（800px / 1200px）。媒体查询不能依赖运行时 CSS 变量，因此不再在 TypeScript 中复制断点。新样式应导入这些变量。

保留 Quartz 三栏与用户可调整的右栏。移动端保持首页正文优先，侧栏折叠为后续内容；工具按钮目标至少 44px，文字内链不强制套按钮尺寸。测试 320px、390px 和宽屏，不能靠横向裁切掩盖布局溢出。

## 5. 组件契约

### 首页 / 技术笔记本

- 保留现有作者文案与内容顺序；身份文字用可见 `h1`
- 命令提示用等宽小字，栏目命令用 `h2`；内容文字用正文栈
- 终端窗口用语义表面＋细边框；去掉绿光、背景点阵、强制黑底、彩色窗口灯
- 引文与图谱是次要信息；不以渐变、光晕或位移争夺注意力

### Feed

- 标题与日期同一行，必要时自然换行；日期不放到单独的大区块
- 摘要最多两行，标题允许自然换行
- 桌面行内边距保持 `0.75rem 0.4rem`，移动保持 `0.65rem 0.2rem`
- 最多三张来自正文/封面的去重真实图片；无图不造占位图
- 单张最大 128×96px，4:3 容器内 `object-fit: contain`；一两张图片也不放大成大图
- 小屏按可用空间缩小；保留 `contain: inline-size` 防止图片撑宽 Grid
- 图片提取、懒加载、分页揭示逻辑不由设计 token 改动

### 文章

- 使用 `main` 与真实跳转链接；文章标题和正文的结构可被辅助技术识别
- 正文内链提供下划线，不只依靠颜色
- 列表、引用、表格与代码遵守阅读节奏；代码语法颜色由 Shiki 负责，数学由 KaTeX 负责
- TOC 非当前条目使用可读 muted 色，不再用 0.35 透明度把字“隐藏”

### 搜索 / 导航

- 搜索输入框保持明显边界和焦点环，结果的键盘焦点与 hover 都可辨认
- 深浅主题共享同一个组件 CSS，不再写各自的硬编码颜色分支
- 搜索开关、Escape、结果导航、返回、重复打开必须验证
- 图谱、主题切换、阅读模式、语言切换保留原有行为；悬浮预览沿用 Quartz

## 6. AI 与人工贡献者的工作规则

1. 先读本规范和相关组件，判断这次属于哪个语义角色/密度场景
2. 优先复用 token；不要从截图反推一堆新的 hex、阴影或 spacing 值
3. 新 token 必须说明用途、消费者、亮暗对应与为什么现有 token 不够；同时更新测试和文档
4. 不向 `custom.scss` 追加全局深色覆盖，不用 `!important` 抢回配色，不用 `transition: all`
5. 不以“现代 AI 风格”为理由增添霓虹、满屏玻璃、强饱和渐变、巨型空白或仪表盘卡片
6. 不改作者观点、身份标签、价格或营销文案来适应一个样式；品牌判断不等于授权重写内容
7. 基础值只在 `tokens.ts` 改；组件规则在组件 SCSS；全局阅读规则在 `custom.scss`
8. 特例必须局部、可解释、可删除：例如图形内部坐标、1px 细线、既有 feed 密度兼容值，不是禁绝所有 CSS 数字
9. 文档与样例放在 `design/` 或代码目录，不放文章 vault。`AGENTS.md`、`CLAUDE.md` 也不应公开进入 feed
10. PR 说明影响范围、未迁移区域、已跑/失败/未跑的检查，不能把 focused pass 冒充全站通过

### 正确的新增组件示例

```scss
.note-panel {
  color: var(--color-text);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-medium);
  padding: var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-reading);
}

.note-panel a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
```

禁止示例：组件内 `#9acd32`、为暗色复制一整套样式、对整块内容设置低 opacity、在文章正文套等宽字体。

## 7. 验证与防漂移

```bash
npm run check:design
npm test
npm run check
npx quartz build
```

`check:design` 已接入 `npm test` 和 CI 独立步骤，验证：

- 亮暗语义键一致，变量引用无缺失与循环
- Quartz/OG 与浏览器配色保持同源
- 正文、日期、链接在四种支持表面至少 4.5:1；强调/选中背景也保持可读
- 焦点和控件边界至少 3:1；状态文字至少 4.5:1
- 已迁移样式不得重新引入原始颜色、字体名称或未定义语义变量
- feed 密度、缩略图尺寸/比例和保护性布局声明不能无意漂移
- 文档排除与主要内容跳转目标存在

这些是有限的工程保护，不是 WCAG 整站合规认证。实际浏览器仍需验证：

- 首页与长文：桌面/390px/320px × 亮/暗，200% 缩放及文字间距覆盖
- tab 焦点、真实跳转链接、搜索输入/箭头/Enter/Escape、主题连续切换
- SPA 导航、浏览器返回/前进、重复开关搜索与全局图谱
- feed 日期同行、1/2/3 张图尺寸、加载失败、继续加载后布局
- reduced-motion 与触摸目标；确保不会因减少动画改变功能

### 边界与下一步

v1 迁移首页、feed、文章阅读、搜索、引文、探索提示、TOC、图谱表面、popover 和阅读进度。未全面改写 Quartz 基础布局、所有上游组件、第三方代码/图表配色、文章内手写 HTML 或 `extra-pages/` 独立专题页。它们继续使用兼容别名或自己的第三方语义，下一次触及时再逐组件迁移。

不要为了“一次统一所有东西”重写内容、替换框架或引入组件平台。若以后有真正独立的作品产品，应共享本系统的基础值与语义，而不是复制一份后各自漂移。
