---
title: WebMCP 研究依据与兼容性
created: 2026-10-31
modified: 2026-10-31
---

# 研究依据与兼容性

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

## 1. 调研基线

调研日期为 2026-10-31 UTC。仓库 `istarwyh/xiaohui` 默认分支 `v4`，本次检出的源码 SHA 为 `94e8d0f3d492751ed71b0f728eeb00e887f5ed37`。线上内容快照 `generatedAt` 为 `2026-10-31T12:08:44.861Z`。两者分别作为源码与线上数据证据，没有确认线上部署对应此源码 SHA。

### 线上产物实测

使用普通 HTTPS GET 下载并解析 JSON，抽查一篇英文 OneAgent 文章的 Markdown。早先 Python urllib 请求出现 403，同环境 curl 请求成功；没有确定响应差异的原因，不据此归因为 WAF 配置。

| 产物                       | 未压缩响应体 bytes | 本地 gzip bytes | 观察                                         |
| -------------------------- | -----------------: | --------------: | -------------------------------------------- |
| `/llms.txt`                |             314717 |          107151 | 包含工作流程、主题与页面目录，已不只是短入口 |
| `/agent/manifest.json`     |            2184904 |          435072 | 578 篇，含 slug、URL、标题、链接、日期、hash |
| `/agent/search-index.json` |            5583986 |         1905664 | 578 篇，含正文 text、headings 和元数据       |

本地 gzip 由 Python `gzip.compress(..., mtime=0)` 计算，不代表 CDN 实际 Brotli 或 gzip 传输量。不要把原始体积直接写成用户实际下载流量。

### 源码落点

| 位置                                            | 已确认的事实                                                                                                  | 对方案的影响                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `quartz/plugins/emitters/agentIndex.ts`         | 从已过滤内容生成 manifest、搜索索引、逐篇 Markdown、llms 文件；标题来自 HAST；hash 覆盖 title、markdown、text | 保留唯一发布边界与真实标题 ID；增量产物在该管线扩展  |
| `quartz.config.ts`                              | `enableSPA: true`，`RemoveDrafts()`、ignorePatterns、`AgentIndex()` 已启用                                    | 工具只能访问已发布集合，不能扫描 vault               |
| `quartz/components/scripts/search.inline.ts`    | 使用 FlexSearch Document，模块级索引与 loadIndex 缓存；还混合 DOMParser、预览与交互                           | 复用库和行为，不直接 import 整个 inline 脚本         |
| `quartz/components/scripts/search.helpers.ts`   | 字面量查询与高亮、标签语法、键盘辅助                                                                          | UI 高亮不适合成为领域层；纯查询解析可后续迁移        |
| `quartz/components/renderPage.tsx`              | 页面注入全局 `fetchData`，主动请求 Quartz contentIndex；body 带 `data-slug`                                   | “不新增首屏索引”不等于现有站点零索引请求             |
| `quartz/components/scripts/spa.inline.ts`       | prenav → cleanup → DOM morph → URL 更新 → nav；模块保留                                                       | 全站注册不可绑定每页 cleanup；当前上下文用 nav 更新  |
| `quartz/plugins/emitters/componentResources.ts` | 汇总组件 JS 并去重，组件脚本先于首次 nav 安装                                                                 | 入口订阅 nav，同时支持幂等初始化                     |
| `quartz.layout.ts`                              | sharedPageComponents 与专用 homePageLayout 分开装配，首页显式覆盖 afterBody                                   | 不能只在 shared afterBody 添加组件并假定首页自动包含 |

现有 `agentIndex.ts` 没有声明 `partialEmit`。增量构建时索引刷新、删除产物清理和全量过滤集合必须验证，不能凭 emitter 接口存在就宣称支持。

## 2. WebMCP API 依据

规范参考 WebML 社区组草案，调研时主分支 SHA：`6838130ef3e930c8e1a9f98375c13d9133d61aba`，最近提交日期 2026-10-27。它不是已稳定的跨浏览器标准。

当前草案主要接口：

```ts
// 仅摘录形状；类型以固定版本的官方定义为准。
document.modelContext.registerTool(tool, { signal, exposedTo })
document.modelContext.getTools()
document.modelContext.executeTool(registeredTool, input, { signal })
```

- 上下文位于安全环境中的 `document.modelContext`。不要默认兼容旧教程的 `navigator.modelContext`，也不要自动给其赋别名。
- registerTool 返回 Promise。通过注册时传入的 AbortSignal 注销；注册 signal 与每次执行 callback 接收到的 signal 职责不同。
- execute callback 返回 JSON 可序列化值。当前草案的 `executeTool()` 返回序列化的 DOMString；消费者测试应明确解析，不能假定直接得到对象。
- 不要求把所有结果包装成 MCP `content` 数组。本方案使用结构化业务 envelope，适配层负责目标环境需要的转换。
- JSON Schema 不替代应用校验；注册名冲突、权限策略拒绝、序列化失败要处理。
- 工具 API 受 `tools` Permissions Policy 与 origin 边界约束。P1 不配置跨域 `exposedTo`，不嵌入第三方 Agent iframe。
- Chrome 文档描述了声明式表单实验，但主线规范当前仍以 imperative API 为核心。P1 不使用 `toolname` 等实验属性。

## 3. 浏览器支持与接入条件

官方状态页列出 Chrome 149 Origin Trial、Edge 150 Origin Trial、Brave Leo 实验支持及 ChatGPT Desktop 支持；Firefox、Safari 链接到标准立场讨论，不能据此称其已实现。

开发环境可按 Chrome 文档开启 `chrome://flags/#enable-webmcp-testing`。线上若依赖 Origin Trial，必须在实施时核对试验有效期、目标版本、origin、token 与浏览器限制，并在构建 head 注入合适 token。预览域名与正式域名不能假设共用 token。

能力分为三层，分别验证：

1. 页面存在所需方法，能完成注册。
2. 浏览器或兼容层能发现并调用工具。
3. 用户实际使用的 Agent 会发现网页工具并调用。

安装 polyfill 只能补充部分 API 能力，不自动获得第三层。此研究环境没有执行真实 WebMCP 浏览器或 Agent 验收。

## 4. 开源方案比较与选择

| 方案                      | 调研证据                                                                                                | 选择                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 原生 API + `webmcp-types` | npm 当前 0.1.10，MIT，无运行时依赖；官方类型仓库有 callback signal、register/get/execute 定义           | 首选，实施时锁定确切版本并检查类型与目标浏览器差异 |
| `@mcp-b/webmcp-polyfill`  | npm 6.0.3，MIT，依赖 webmcp-types 0.1.9；README 声明临时兼容发行包，未来会移除，无确定日期              | 不默认打进生产；P0 可在隔离样例中按需评估          |
| 上述 polyfill 的上游      | 包 README 指向 `webmachinelearning/webmcp-polyfill` 并记录 vendored revision；本次未成功获得上游 README | 不把上游可安装性或发布状态当作已核实事实           |
| MCP-B 扩展生态            | 该包 README 明确将 transports、prompts、resources 指向 `@mcp-b/global`                                  | 本项目暂不需要完整传输与扩展协议；不额外引入       |
| 现有 FlexSearch           | 仓库已锁定 0.8.212；npm 元数据为 Apache-2.0；现有 Quartz 搜索已使用                                     | 继续复用，避免第二套检索引擎                       |
| 自建 MCP Server 或向量库  | 本次三个工具读取静态公开内容与页面状态                                                                  | 无业务必要，暂不选用                               |

维护判断依据为官方草案 10 月更新、MCP-B 仓库 10 月发布提交及当前包说明，不以 star 数推断质量。MIT / Apache-2.0 均需保留许可证与 notices；类型包优先作为开发依赖，不复制整份定义形成长期分叉。此次没有进行法律审计。

自定义范围限于网站业务服务、数据产物与薄适配层，不重写浏览器权限系统、MCP 传输协议或通用检索库。先以 P0 验证具体发行版本，生产不依赖 `@latest` CDN 脚本。

## 5. 真实数据可行性实验

在上述 578 篇搜索快照上执行大小写不敏感的字面量字段加权实验：标题 10、标签 6、标题层级 4、描述 2、正文 1；每字段命中计一次。目的是验证现有数据足以检索，不是拟定最终排序模型，也不是 FlexSearch 或浏览器性能测试。

| 查询                 | 命中文章数 | 代表结果                                            |
| -------------------- | ---------: | --------------------------------------------------- |
| `MCP`                |         35 | OneAgent + MCPs 中文 / 英文文章、MCP 2026 演进      |
| `上下文工程`         |         20 | 从 Claude Code 到 OneAgent、从 RAG 到 Deep Research |
| `可持续分红`         |          2 | 2026-10-31 投资线索文章、Agent 投资系统             |
| `不存在的主题xyz987` |          0 | 正常空结果                                          |

全部 headings 有 ID，但 7 篇文章存在重复的标题文本。因此章节选择必须使用真实 `headingId`，不能只按标题文字匹配。最长文章的 text 达 74447 个 Python Unicode code point，说明正文读取必须分页。

抽查英文 `en/program/llm/oneagent-mcps-domain-agent` 的 markdownUrl：HTTP 读取成功，响应体 2888 bytes，包含元数据 frontmatter 与正文。需要按 manifest 匹配后再读取，剥离元数据 frontmatter；保留正文中的代码块、链接和 Obsidian 语法，并明确格式。

这些实验没有证明最终 FlexSearch 排序、模型工具选择、移动端内存和用户体验合格，相关门禁见实施文档。

## 6. 来源

- [WebMCP 规范固定版本](https://github.com/webmachinelearning/webmcp/blob/6838130ef3e930c8e1a9f98375c13d9133d61aba/index.bs)
- [WebMCP 说明与状态](https://github.com/webmachinelearning/webmcp/blob/6838130ef3e930c8e1a9f98375c13d9133d61aba/implementation-status.md)
- [Chrome WebMCP](https://developer.chrome.com/docs/ai/webmcp)、[最佳实践](https://developer.chrome.com/docs/ai/webmcp/best-practices)、[安全工具](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [官方类型](https://github.com/webmachinelearning/webmcp-types)、[npm 类型包](https://www.npmjs.com/package/webmcp-types)
- [MCP-B polyfill 说明](https://github.com/WebMCP-org/npm-packages/blob/469bad289e3aee1d19a487c2c7820d2c54a82373/packages/webmcp-polyfill/README.md)
- [FlexSearch](https://github.com/nextapps-de/flexsearch)
- [项目源码基线](https://github.com/istarwyh/xiaohui/tree/94e8d0f3d492751ed71b0f728eeb00e887f5ed37)
