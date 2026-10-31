---
title: WebMCP 共享检索与章节读取优化记录
created: 2026-10-31
modified: 2026-10-31
---

# WebMCP 共享检索与章节读取优化记录

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

本页记录首版之后的当前实现；[首版记录](./05-implementation-record.md)保留历史指标。启用方式仍为构建环境 `QUARTZ_ENABLE_WEBMCP=1`，默认关闭，未部署；提交与 PR 状态以 GitHub 记录为准。

## 1. 重复资源与索引

新增独立的通用搜索模块，与 Agent 业务分开：

```text
quartz/search/
  contracts/runtime.ts       # 数据、查询、快照和端口契约
  browser/runtime.ts         # 唯一 FlexSearch Document、加载、重试与时间分片
  build/fingerprint.ts       # UI / Agent 共用的文章指纹规则
  build/loader.ts            # 安全生成并固定索引绝对 URL
  tests/runtime.test.ts

quartz/agent/
  build/sections.ts          # 真实标题 ID 与源码位置的关联
  browser/search/engine.ts   # 主题、语言、评分、摘要和引用，依赖通用搜索端口
```

Quartz 分别打包每个 inline 入口，直接在两个入口 import 同一个模块仍会重复包含依赖。因此 `Search` 和 `WebMCP` 组件均声明相同的 `searchRuntime.inline` 资源，利用现有 ComponentResources 的 Set 去重，确保共享资源在任一消费者前执行一次。

资源仅安装 `window.quartzSearch` 这个有类型的 Document 级端口；FlexSearch 本体和索引状态都属于通用搜索模块。页面 UI 和 Agent 业务均通过端口使用服务，互不导入对方的交互实现。普通搜索仍保留其对话框、IME、键盘、预览和焦点逻辑。

Agent 不再下载 `/agent/search-index.json`，不再建立另一组五字段索引。该静态入口继续生成，供站外 Agent 使用；站内检索复用已加载的 `/static/contentIndex.json` 与现有标题、标签、正文索引。章节文字也在正文中参与召回，结果的章节引用再从有界缓存的 sidecar 取得。

ContentIndex 追加每篇 hash，计算规则与 AgentIndex 相同：标题 + 已规范化 Markdown + 纯文本。Agent 查询前核对公开集合及 hash，混合版本只做一次共享重载，失败返回 STALE_CONTENT。页面与 Agent 查询返回结果时携带同一不可变数据快照，避免重载期间数字 ID 指向另一篇文章。

共享索引采用约 8 ms 的批次时间预算让出事件循环；一篇文章的添加是原子操作，因此这不是低端设备上绝对的 long task 上限。并发刷新合并为一次，旧的未完成构建在让出后或数据到达时放弃，不继续建立第二套索引。初始下载失败后的下一次加载会重新请求。

### SPA 重试地址

首次渲染时把 contentIndex 地址解析为绝对 URL，首次加载与 reload 始终使用该地址。这样从多层文章进入首页后，重试不会把初始 `../../static/...` 按新页面层级重新解析。新增测试执行实际生成的 loader 脚本并改变 document.baseURI，确认两次请求地址一致。

### 有界缓存与摘要

章节 metadata 以 revision + hash + slug 缓存，共享进行中的下载，最多 64 篇；搜索、当前上下文和正文读取可复用。正文保留原有最多 10 篇 / 约 2 MiB 上限。取消单个调用不会取消其他调用仍在使用的共享工作。

摘要只对命中附近的小片段建立 code point 数组，避免为每条摘要展开整篇长文。正文分页仍按完整 code point 计数并保留 emoji。

## 2. 按章节读取

`buildSections` 用 remark-parse 解析规范化 Markdown，取得真实 heading 起点；再按源码位置和层级，关联最终 HAST 节点上的真实 ID。不根据标题文字重新生成 slug。

- 支持 ATX、Setext、中文、同名标题和嵌套章节。
- frontmatter 与前导空白的位移在构建时处理。
- 章节从该 heading 开始，到下一个同级或更高级 heading 之前结束。
- 范围在构建时转为 code point；浏览器不混用 UTF-16 偏移。
- 原始 HTML、生成标题、缺位置或数量不一致等情况保守降级，不推算边界。
- sidecar 同时绑定 revision、文章 hash 和正文 digest，读取时继续核对。

`read-note({ slug, headingId, offset, length })` 现可读取映射可靠的章节；offset 和 nextOffset 相对此章节，citationUrl 指向真实 heading URL。没有可靠映射的文章继续返回 SECTION_UNAVAILABLE，未知 ID 返回 HEADING_NOT_FOUND。

当前 578 篇公开文章中：299 篇具有可靠章节映射，65 篇有标题但保留降级，214 篇无正文标题。即有标题的 364 篇中支持 299 篇；这不是对所有 Markdown / Obsidian 扩展的完整支持声明。

## 3. 测量结果

### 脚本体积

使用固定 mtime 的本地 gzip，与最初未接入 WebMCP 的 postscript 比较。首版为 437150 bytes，基线为 414121 bytes，增量 23029 bytes。优化后首轮为 420167 bytes，增量 6046 bytes，回到 15 KiB 预算内；最终产物校验值见本页末尾。

这不是 CDN 实际压缩量，也不是浏览器加载时间。共享资源仍在现有 postscript 内，未增加单独的脚本网络请求。最终还构建关闭开关的 docs 版本，检查 WebMCP 三个工具没有进入关闭产物，普通搜索仍包含共享服务。

### 真实内容链路

Node 24.19.0 下，通过文件适配器读取正式构建的 578 篇内容。先以普通 UI 身份初始化共享索引，再执行三个查询、正文和章节读取、空查询及重复查询：

| 指标                              | 观察结果                                           |
| --------------------------------- | -------------------------------------------------- |
| 共享全文数据加载次数              | 1                                                  |
| Agent 独立 search-index 请求      | 0                                                  |
| 重复相同查询的新增 metadata 请求  | 0                                                  |
| 时间分片让出次数                  | 60                                                 |
| MCP 查询                          | 约 59.51 ms，含首次 Agent metadata 加载            |
| 上下文工程查询                    | 约 6.05 ms                                         |
| 可持续分红查询                    | 约 2.63 ms                                         |
| 不存在的主题                      | 空结果，约 1 ms                                    |
| 全部实验耗时                      | 约 1035 ms，含共享索引初始化                       |
| GC 后相对 UI 索引就绪的 heap 增量 | 约 2.90 MB，包含目录、结果、sidecar 和三篇正文缓存 |

英文 OneAgent、中文上下文工程、投资线索文章均成功按首个真实 heading 读取 200 code point，引用 URL 与对应章节一致。

这些是单进程 Node、文件适配器和单次观察，不是浏览器 p95、网络延迟、手机内存或用户流量数据。heap 增量包含整段工作流，不能直接称为“一次搜索的内存消耗”。

## 4. 回归与剩余边界

已增加共享加载、单索引、失败恢复、时间分片、并发刷新、查询快照一致、索引 URL 跨层级重试、章节位置、metadata 下载合并等回归。实际 WebMCP browser bundle 的依赖检查确保其中不包含 FlexSearch 或 Node 构建模块；库仅由独立共享搜索资源提供。

页面搜索的既有 6 项交互测试继续通过，包括 IME、乱序请求、键盘和清理；共享引擎另有真实 FlexSearch 测试，不以 UI 边界 mock 代替引擎正确性验证。类型 / 格式、完整测试、启用内容构建和关闭 docs 构建的最终结果见下方。

尚未进行 Chrome 原生 WebMCP、Origin Trial、ChatGPT Desktop 或真实 Agent 的端到端验收，也没有手机浏览器 heap / long task 测量。优化消除了已确认的重复加载与索引，不能替代这些产品与设备验收；开关保持默认关闭。

## 5. 最终执行记录

- `npm run check`：TypeScript 与全仓 Prettier 通过。
- `npm test`：270 项通过，0 失败、0 跳过；189 项既有业务 + 27 项脚本 + 25 项设计 + 29 项 Agent / 共享搜索测试。
- 启用内容构建：579 个输入，过滤 1 个，输出 2730 个文件。
- 关闭 docs 构建：87 个输入，过滤 1 个，输出 402 个文件；工具名不进入关闭产物。
- 最终 postscript：启用 1468384 raw bytes / 420236 gzip bytes；优化后关闭 1452488 raw bytes / 414776 gzip bytes。
- 对最初未接入版本的 gzip 增量为 6115 bytes（约 5.97 KiB），对当前关闭版本增量为 5460 bytes（约 5.33 KiB），均低于 15 KiB 目标。
- 首版 gzip 437150 → 当前 420236，减少 16914 bytes；WebMCP 相对最初基线的额外开销下降约 73%。
- 578 篇 ContentIndex 与 catalog 的文章指纹逐项一致。
- 全部 299 篇支持章节读取的文章已核对正文 digest、heading ID 与 code point 范围；无越界。
- 没有修改或发布生产环境。原生 Agent 与实体设备性能仍按上节边界保留未测状态。
