---
title: WebMCP 模块与数据架构
created: 2026-10-31
modified: 2026-10-31
---

# 模块与数据架构

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

本文保留初始设计。当前共享搜索核心位于 `quartz/search/`，页面与 Agent 复用同一索引；章节 range 在构建期转换为 code point。具体落地见[优化记录](./06-optimization-record.md)。

## 1. 目录与职责

以下为实施目标目录，不表示已创建这些运行时文件。按职责设目录，单文件保持内聚，不按每个函数建立目录。保留 Quartz 既有组件导出与 emitter 入口，使接入对上游结构影响可控。

```text
quartz/
  agent/
    contracts/                  # 纯类型、schema 版本、统一错误；无 DOM / Node
      catalog.ts
      notes.ts
      result.ts
    build/                      # Node / HAST / ProcessedContent 专属
      catalog.ts
      sections.ts
      revision.ts
    browser/
      data/                     # 静态资产解析、fetch、缓存与版本检查
        repository.ts
        cache.ts
        urls.ts
      search/                   # FlexSearch 适配、字段合并与稳定排序
        engine.ts
        query.ts
        snippets.ts
      reading/                  # 正文切片、分页、章节定位
        service.ts
        pagination.ts
      context/                  # 唯一允许理解当前页面 DOM 的业务模块
        current-note.ts
        navigation.ts
    webmcp/
      adapter/                  # Web API 与版本差异
        capability.ts
        registration.ts
        serialization.ts
      tools/                    # Schema、参数校验与业务服务调用
        search-notes.ts
        read-note.ts
        get-current-note.ts
      runtime/                  # 依赖装配、幂等、启停、页面生命周期
        bootstrap.ts
        lifecycle.ts
  components/
    WebMCP.tsx                  # 无可见 UI 的 Quartz 脚本挂载组件
    scripts/
      webmcp.inline.ts           # 很薄：导入 bootstrap 并启动
    agent/                      # P2 才增加可见结果组件与呈现逻辑
  plugins/
    emitters/
      agentIndex.ts             # 保留旧导出；调用 agent/build 生成新增产物

tests/
  agent/
    fixtures/                   # 少量公开真实文章与刁钻标题样本
    data/
    search/
    reading/
    webmcp/
  browser/
    webmcp.spec.mjs              # SPA / 降级 / 真实环境集成另记
```

`quartz/agent/**` 的测试可以依照现有 Node + tsx 测试方式放在模块旁；上图给出集中测试目录方案。实施时选定一种后保持一致，并显式接入 package.json，不能只建文件却未执行。

## 2. 依赖规则

```text
Quartz component → runtime 装配
runtime → adapter + tools + browser services
 tools → contracts + search / reading / context 的接口
adapter → contracts + WebMCP types
search / reading → contracts + 注入的 repository
context → contracts + DOM / Quartz navigation
repository → contracts + fetch / cache / URL policy
build → contracts + Quartz 构建类型 / Node
P2 UI → browser services，不依赖 webmcp/tools
```

禁止 browser import build；禁止 contracts import Node、Preact、DOM；禁止 tools import Search.inline 或页面选择器；禁止搜索服务点击按钮或构造事件来复用 UI；禁止 build import 浏览器 runtime。

纯模块通过参数注入 `fetch`、数据仓库、时钟和导航快照，方便失败与并发验证。公共入口只导出必需接口，不建立横跨构建与浏览器的大 barrel 文件，防止浏览器 bundle 引入 crypto、HAST 与构建依赖。

建议以 import 边界测试检查上述规则，并结合 esbuild 产物确认没有 Node 模块进入客户端。共享模块无顶层副作用；只有 bootstrap 安装监听器。

## 3. 公共业务接口

以下为设计形状，最终实现补全具体类型，不使用 WebMCP 专属返回类型污染业务层。

```ts
interface NoteRepository {
  getCatalog(signal?: AbortSignal): Promise<Catalog>
  getSearchCorpus(signal?: AbortSignal): Promise<SearchCorpus>
  readMarkdown(slug: string, signal?: AbortSignal): Promise<NoteSource>
}

interface NoteSearch {
  search(input: SearchInput, signal?: AbortSignal): Promise<SearchResult>
}

interface NoteReader {
  read(input: ReadInput, signal?: AbortSignal): Promise<ReadResult>
}

interface PageContextProvider {
  snapshot(): PageSnapshot
  isCurrent(snapshot: PageSnapshot): boolean
}
```

同一 repository、search 与 reader 实例由 runtime 装配，P2 UI 直接复用服务。现有 Search UI 在 P1 可继续使用旧搜索服务；后续迁移须先对齐排序与交互，再共享新 engine，避免在接入 WebMCP 时顺手重写已有搜索。

## 4. 数据产物

### P1 新增轻量 catalog

现有 manifest 约 2.18 MB，读取一篇文章不应必须先下载全部 headings 与链接。由同一个 AgentIndex emitter 额外输出 `/agent/catalog.json`：

```ts
interface Catalog {
  schemaVersion: "1.0"
  revision: string
  pages: Array<{
    slug: string
    url: string
    markdownUrl: string
    title: string
    language: "zh" | "en"
    hash: string
  }>
}
```

catalog 不含全文、headings、filePath、完整描述；语言沿用项目现有中英文路径规则与 translation 工具，不增加另一套推断。所有记录由通过现有 filters 的 ProcessedContent 生成。canonical URL 与内部请求 URL 分开处理。

catalog 的 revision 使用稳定排序后的公开页面身份与内容哈希集合生成；新增、修改、删除都变化。不能只用当前时间作为内容 revision。未来标签或日期若进入结果且影响排序，也应计入对应数据 revision。

### 搜索产物

P1 复用 `/agent/search-index.json` 的现有字段，向其追加与 catalog 一致的 `revision`。对旧消费者是新增字段；实施时做旧入口回归。webmcp 客户端版本化缓存，遇到旧产物缺 revision 时返回可诊断的版本不兼容，不静默混合新旧数据。

搜索首次调用才加载全文数据和建立 FlexSearch 索引。不要为了查询先下载 manifest，再下载 search-index。搜索数据本身已经包含结果展示与读取需要的元数据。

目前页面 `fetchData` 已主动下载 contentIndex。P1 接受 Agent 首次调用后独立下载 agent/search-index，以隔离已有 UI。明确记录潜在两份正文占用；不声称当前方案实现全站唯一索引。若真实测量不满足内存预算，再评估让两个入口共用数据与 engine，或构建检索分片，不预先增加复杂度。

### 章节数据

逐篇追加 `/agent/sections/<slug>.json`，包含 revision、page hash、正文格式与各 heading 的真实 id、depth、正式引用 URL 和起止偏移。仅在按章节读取时请求，不把全部章节带入 catalog。

章节边界针对剥离生成 frontmatter 后的 Markdown，偏移统一用 JS UTF-16 code unit。构建过程需保留源码 heading 与最终 HAST ID 的映射，使用解析阶段可用的 source position；原始 HTML 标题、Obsidian 展开、缺少 position 等场景不能靠正则或重新 slugify 猜测。无法可靠映射的章节标记 unavailable，正文分页仍可用。

实现前用真实重复标题、中文标题、代码块里的 `#`、Setext、HTML heading、转引/嵌入样本验证映射。如果映射不能稳定落地，P1 降级为返回可用 headings 清单与正文分页，明确返回 `SECTION_UNAVAILABLE`，不交付误定位的章节功能。

`page.hash` 目前不是单纯正文 SHA，因此读取时不能用 `sha256(markdown)` 与其直接比较。需要校验正文完整性时，在 sections 数据中单独输出正文 digest，并明确 UTF-8 编码与规范化规则。

## 5. URL 与缓存策略

- 对外引用保持 catalog 中的正式 `url` / heading URL。
- 内部请求使用固定同源目录，metadata URL 经 origin、pathname、协议和重定向目标校验。预览与 localhost 只把经校验的路径映射到当前 origin，不访问线上正文。
- 不接受调用方传入任意 URL；slug 只查 catalog / search corpus 的精确键，不用字符串拼接猜文章位置。
- 使用 URL API，拒绝路径穿越、双重编码、外域重定向、非 JSON / Markdown 内容；校验 HTTP 状态和响应体结构，防止 200 的 HTML 错页被当正文。
- 新请求携带构建版本或内容 revision 查询参数；CDN 是否把 query 纳入缓存键需在部署验收时核对。revision 发生冲突时对必要产物做一次 revalidate，再失败则返回 `STALE_CONTENT`，不无限刷新。
- module 级缓存共享加载 Promise，失败后移除，允许下一次重试。正文按 slug + hash 做有界 LRU，建议最多 10 篇或合计 2 MiB UTF-16 近似预算；具体阈值按实测调整。
- 共享 catalog / search 下载不能绑定某一个调用者的 AbortSignal。等待者可独立取消等待；仅最后等待者退出时才取消底层请求，或选择让共享请求完成。单篇独立下载可直接传播调用 signal。
- P1 不增加 Service Worker 或持久 IndexedDB。页面完整刷新后重新协商版本，避免持久缓存迁移成本。

## 6. 检索与阅读规则

搜索复用 FlexSearch 0.8.212。保留中英文、标签的既有能力，在独立 engine 中增加标题层级与描述字段；英文大小写归一、Unicode NFKC 归一。查询作为字面量，限制长度，不构造未转义的用户正则。

字段优先级为标题、标签、heading、描述、正文，按字段候选合并去重；同分以 slug 排序确保稳定。FlexSearch 具体 API 及 tokenization 用真实内容测试，不把 Python 字段实验结果当作引擎结果。P1 不承诺向量语义搜索；“类似观点”由 Agent 多次检索与阅读完成。

工具搜索摘要取匹配点附近约 240 code point，使用纯文本，不输出 HTML。`topic` 按一级路径段精确过滤，明确 `en/...` 的英文归类；另提供 language 过滤，不能拿英文路径前缀误作知识主题。

读取保留原始 Markdown 语义，不对内容执行脚本或外部资源请求。业务分页默认 4000、最多 12000 code point；返回起始位置、实际长度与 nextOffset。工具输入输出 offset 使用 code point，章节构建偏移为 UTF-16，必须由 reading 模块显式转换，不能混用；实现可统一转为 code point 后再切片。

正文中的 Obsidian wiki link 可能仍存在，不声称已全部转换为标准 Markdown。引用以显式 canonical / heading URL 为准。章节由当前 heading 到下一个相同或更高层级 heading；长章节继续分页。
