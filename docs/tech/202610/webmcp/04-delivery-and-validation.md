---
title: WebMCP 实施与验收计划
created: 2026-10-31
modified: 2026-10-31
---

# 实施与验收计划

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

## 1. P0：验证 API 与最小链路

在独立开发页中实现一个读取公开文章元数据的工具，使用真实 slug `en/program/llm/oneagent-mcps-domain-agent`，不修改正式页面的行为。对以下环境分别记录浏览器版本、操作系统、启用方式、API 形状、Agent 产品与版本，以及证据时间。

1. 原生 WebMCP，按目标 Chrome 文档启用 flag 或有效 Origin Trial。
2. 不支持 WebMCP 的普通浏览器，检查静默降级。
3. 可选 polyfill 独立样例，明确 API 层与 Agent 连接层各自的结果。

依次验证：注册 → 发现 → 执行 → 参数失败 → JSON 返回 → 执行取消 → signal 注销 → 再注册。运行模拟宿主便于自动测试，但必须另做一次真实 Agent 请求“查找并阅读 OneAgent 与 MCP 的文章”的端到端操作。

若目标 Agent 不会发现网页工具，保留数据能力与 llms 路径，暂停该 Agent 的生产支持承诺。不要通过自建协议桥接来悄悄扩展本轮范围。

P0 输出固定的类型包版本、浏览器支持矩阵、结果序列化行为与开关方式。未验证前不把 0.1.10 或草案 API 当作所有产品的兼容保证。

## 2. P1 实施拆分

| 步骤           | 主要文件与目录                                                 | 可审查结果                                     |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| A：基础契约    | `quartz/agent/contracts/`                                      | 输入、结果、错误和版本契约，无 DOM / Node 依赖 |
| B：构建数据    | `quartz/agent/build/`、`quartz/plugins/emitters/agentIndex.ts` | catalog、revision、章节映射；旧路径保持兼容    |
| C：数据访问    | `quartz/agent/browser/data/`                                   | 同源访问、校验、缓存、重试、取消与预览映射     |
| D：业务服务    | `quartz/agent/browser/search/`、`reading/`、`context/`         | 使用真实内容的检索、分页、当前页面识别         |
| E：协议与装配  | `quartz/agent/webmcp/`、WebMCP 组件、thin inline 入口          | 三个工具可调用，支持失败与注销                 |
| F：Quartz 接入 | `quartz/components/index.ts`、`quartz.layout.ts`               | 首页 / 普通页覆盖，显式处理专用首页 afterBody  |
| G：质量门禁    | tests、package.json、构建配置                                  | 新测试显式执行，真实 Agent 与浏览器记录        |

每步保持独立目录和依赖边界。不能把 browser repository、FlexSearch、DOM 选择器、JSON Schema 与注册逻辑写进一个 `webmcp.inline.ts`。代码评审同时检查 import 图和最终 bundle，不仅检查文件数量。

类型定义优先使用锁定的 `webmcp-types` 开发依赖。若该包全局声明与 TypeScript lib 冲突，先核对版本与加载范围；只在 adapter 中做最小兼容声明，记录移除条件。

## 3. 性能预算与数据升级

以下为待验收目标，不是本次测得的成绩：

| 项目     | 目标与测量方式                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 首屏数据 | 工具调用前新增 catalog / search-index / sections / Markdown 请求数为 0；现有 contentIndex 请求单列            |
| JS 增量  | P1 相对固定基线 gzip 增量目标 ≤ 15 KiB；记录是否已有 FlexSearch 被跨 inline bundle 重复打包                   |
| catalog  | gzip 目标 ≤ 100 KiB；超出先去掉不必要字段，不自动放宽预算                                                     |
| 索引复用 | 每个 Document 至多一个 Agent corpus 下载与一次引擎构建；重试与版本更新除外                                    |
| 搜索延迟 | 固定真实内容、声明硬件与浏览器，20 次预热后搜索 p95 目标 ≤ 150 ms；冷启动网络与建索引单列                     |
| 主线程   | 建索引出现 > 50 ms long task 时分批让出或评估 Worker；不能只凭 578 篇认为开销小                               |
| 返回体积 | 搜索默认 5 条、最多 10 条；正文默认 4000、最多 12000 code point                                               |
| 内存     | 记录启用前后、首次搜索后、连续读取 10 篇后的 heap；正文缓存有界，评估现有 contentIndex 与新增 corpus 重复占用 |

数据更新先全量构建，后测试增量新增、修改、删除和转草稿。旧的生成 Markdown / sections 文件必须清理，否则即使不在 catalog，仍可能留下可直接访问的旧资源。删除是否代表敏感信息撤回另需核对 CDN 缓存；工具目录更新不等于缓存内容立即失效。

构建版本、catalog revision、搜索 revision、单篇 hash 的职责分别明确。部署中短暂混合新旧文件时客户端做一次重新验证，失败返回可恢复错误。若 CDN 不能提供可接受的一致性，再引入版本化资产目录；P1 不先复制所有历史版本。

## 4. 自动化测试矩阵

| 层         | 必测行为                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| contracts  | schema 范围、额外参数、错误码、可序列化返回、依赖隔离                                               |
| build      | 草稿 / ignore 排除、公开列表稳定排序、URL 编码、revision 随增删改变化、旧入口不变                   |
| sections   | 中文与重复标题 ID、Setext / HTML / 代码块 / 嵌入、缺 position 的显式降级、UTF-16 到 code point 转换 |
| repository | 200 HTML 错页、404、超时、错误 JSON、未知版本、外域 URL / 重定向拒绝、预览同源映射                  |
| cache      | 并发合并、失败后可重试、单调用取消不影响其他等待者、LRU 上限、版本冲突                              |
| search     | MCP、上下文工程、可持续分红、英文词、标签 / 主题 / 语言、空结果、正则字符按字面量、稳定去重         |
| reading    | 标准 slug、目录 index slug、中文编码、未知 slug、分页边界、emoji 不截断、未知 heading、长章节       |
| context    | 文章 / 首页 / docs/index / 列表 / 404、URL hash、等待过程中切页、当前文章与 catalog 不匹配          |
| adapter    | 方法缺失、权限拒绝、部分注册失败回收、注册 / 执行 signal 区别、结果解析一次、dispose 幂等           |
| lifecycle  | 首次 nav、连续 nav、Back / Forward、bfcache 恢复、失败后重试、页面工具保持唯一                      |

真实样本至少包含三组查询命中文章、上述英文 Markdown、最长上下文工程文章和一篇同名标题文章；fixtures 只保留公开且必要的片段及来源，不把整份线上 corpus 提交到测试目录。每次刷新 fixtures 记录 snapshot 时间与 hash。

未来实现运行以下命令，并补全新增测试文件的真实路径：

```bash
npm ci
npm run check
npm test
npx quartz build
npx quartz build -d docs
```

`npm ci` 会执行现有 postinstall 与 hooks 安装，需在隔离 checkout 中运行。生产 `npm run build` 含 git fetch 与复制 extra-pages，若用于最终产物验收，独立记录网络影响和源文件是否漂移。文档变更本身只需针对新文档做格式与链接检查，不为此安装整个应用依赖或运行全站测试。

## 5. 浏览器与真实 Agent 验收

- 从中文首页请求“找上下文工程相关笔记”，确认至少找到对应 OneAgent 与 Deep Research 文章，引用正式 URL。
- 从英文文章询问“这篇文章讲了什么”，确认当前 slug 正确，Agent 读取其正文，不混入侧栏或 feed。
- 一篇长文分两次读取，合并片段无丢字、重复或 emoji 损坏；按章节读取同名标题时定位正确。
- 进入普通文章、标签、文件夹、首页，Back / Forward 多次，工具不重复、不消失，当前上下文不串页。
- 慢网、断网、取消、再次调用与版本切换，错误可理解、可恢复；没有未处理 Promise rejection。
- 不支持 API 的浏览器、禁用 JavaScript 场景，普通内容与链接仍可用；实际禁用 JS 的浏览器验证与静态产物检查分开记录。
- 使用有效 Origin Trial 的正式域名和预览域名分别检查；没有 token 的环境应正确降级。
- 固定浏览器能通过 getTools / executeTool，不代表 ChatGPT Desktop 或其他 Agent 已端到端通过；每个目标产品分别记录。

P1 无新增可见 UI，不要求为工具创建访客聊天框。P2 若增加搜索结果面板，先读 design/README.md，复用设计 tokens，再补键盘、焦点、读屏状态、移动端与浅深主题验收。

## 6. 发布与回滚

P1 增加构建期 `QUARTZ_ENABLE_WEBMCP` 开关，默认关闭；启用仅影响组件装配，静态 llms 入口继续存在。配套测试 enabled / disabled 两种产物；不能只禁掉工具却仍在首屏下载额外索引。

先固定开发环境验证，再预览，最后按既有发布流程交付。实际部署时另行记录源 SHA、浏览器 / Agent 版本、产物 hash、试验 token 的 origin 与有效期；token 等不必要配置不复制到研究文档。

回滚可关闭开关重新构建，或回退对应实现提交。回滚不删除已有 llms、manifest、search-index、Markdown，不改变现有搜索。已经打开的客户端需普通刷新，不能声称重新部署会立即卸载其已运行的工具。

## 7. 调研与实现记录的边界

第 1–6 节描述验收要求，不代表所有项目已通过。最初调研完成了源码和公开规范阅读、npm 元数据比较、线上数据结构检查、字面量检索实验与 Markdown 抽查；后续已经实现 P1 代码。

实际已执行的测试、构建和检索实验，以及章节降级、脚本预算超出、原生浏览器和真实 Agent 未测情况，统一见[实施记录](./05-implementation-record.md)。不要把 mock 宿主或 Node 数据链路的测试称为真实 Agent 验收。
