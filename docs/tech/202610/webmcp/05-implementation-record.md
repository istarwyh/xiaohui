---
title: WebMCP P1 实施记录与启用方法
created: 2026-10-31
modified: 2026-10-31
---

# WebMCP P1 首版实施历史与启用方法

本文保留优化前的实施记录。当前实现已共享检索资源并增加章节读取，最新状态与指标见[优化记录](./06-optimization-record.md)。启用方式不变。

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

状态：本地实现，默认关闭，未提交或部署。本记录针对工作区代码；源码起点为 `94e8d0f3d492751ed71b0f728eeb00e887f5ed37`，不是生产上线声明。

## 1. 已实现内容

- `search-notes`：FlexSearch 关键词检索，支持主题、语言与条数限制；返回摘要与正式引用。
- `read-note`：精确 slug 读取，默认 4000、最多 12000 code point 分页，校验文章版本与正文 SHA-256；不截断 emoji。
- `get-current-note`：当前文章元数据、真实章节与引用；首页、列表和 404 不作为正文，切页竞态返回 PAGE_CHANGED。
- 原生 `document.modelContext` 适配，使用锁定的 `webmcp-types@0.1.10`；三个工具只注册一次，部分注册失败统一回收。
- 全 Document 生命周期，不绑定每页 cleanup；普通 SPA 切页保留注册，bfcache pagehide 保留，非持久卸载释放。
- catalog、全文索引与正文按需加载；共享下载不受单个调用者取消影响，失败可重试；正文 LRU 最多 10 篇且约 2 MiB 上限。
- 新增 `/agent/catalog.json`、`/agent/sections/<slug>.json`；search-index 追加 revision 和 language。原有 llms、manifest 和逐篇 Markdown 入口保留。
- emitter 从过滤后的公开集合生成产物；开发增量调用重新生成目录，删除已撤回文章的 Markdown 与 sidecar。
- 新增类型、格式与模块依赖边界验证，没有新增模型服务、数据库、扩展传输协议或可见 UI。

## 2. 最终模块落点

```text
quartz/agent/
  contracts/                  notes.ts / result.ts
  build/                      catalog.ts
  browser/
    data/                     repository / cache / urls / validation
    search/                   engine.ts
    reading/                  service.ts
    context/                  current-note / navigation
  webmcp/
    adapter/                  registration.ts
    tools/                    三个工具与参数校验
    runtime/                  bootstrap.ts
  tests/                      build / runtime / services

quartz/components/WebMCP.tsx
quartz/components/scripts/webmcp.inline.ts
```

这是目标架构的最小落地，未为尚未实现的能力建立空目录。WebMCP 入口脚本只启动 runtime；业务层不依赖协议，工具与 adapter 不直接查询 DOM，Node crypto 仅用于构建和测试。浏览器正文校验使用 Web Crypto。

`quartz.layout.ts` 显式给专用首页、文章和列表布局挂载无 UI 组件。renderPage 的 `data-agent-page-kind` 区分 home、article、list、other，不用首页或列表的 DOM 文本充当文章。

## 3. 启用方式

默认没有设置开关或设置为 0 时不注入工具脚本。`.env.example` 仅用于说明，不意味着 Quartz 会自动读取 .env；在实际构建环境中 export 变量。

```bash
# 本地内容构建，启用工具脚本
QUARTZ_ENABLE_WEBMCP=1 node quartz/bootstrap-cli.mjs build

# 本地开发服务
QUARTZ_ENABLE_WEBMCP=1 node quartz/bootstrap-cli.mjs build --serve

# 关闭
QUARTZ_ENABLE_WEBMCP=0 node quartz/bootstrap-cli.mjs build
```

Windows 可在构建环境设置同名变量后执行 Node 命令。生产平台亦设置构建环境变量；开关在构建时决定，不是访问者 URL 参数。未在本次操作中修改远端平台设置。

目标浏览器需要支持原生 API。Chrome 本地测试按官方文档启用 `chrome://flags/#enable-webmcp-testing` 后重启；线上 Origin Trial 的 token、origin、有效期和具体 Agent 产品需要独立配置与验证。本实现没有默认安装 polyfill，也不自动注册跨域暴露。

本环境首次构建的既有 OG 字体请求失败；使用环境支持的 `NODE_USE_ENV_PROXY=1` 后内容与 docs 构建通过。这是本执行环境的网络参数，不是网站功能依赖，不要求给所有部署平台设置它。

## 4. 已执行验证

自动测试使用 Node 24.19.0。新增测试纳入 `npm run test:agent`，并由原有 `npm test` 继续调用。

| 检查                                     | 结果与范围                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci` 与锁定类型依赖安装              | 成功，原有 native git binding 检查通过；lockfile 保留原平台依赖元数据                                  |
| `npm run check`                          | TypeScript 与全仓 Prettier 通过                                                                        |
| `npm test`                               | 261 项通过：原有业务 189、脚本 27、设计 25、Agent 20；无失败或跳过                                     |
| emitter → 静态文件 → repository → reader | 用真实公开英文 OneAgent 文章验证，正文、hash、章节引用正确                                             |
| 增量产物撤回                             | 同一 emitter 实例从一篇文章变为空集合，目录 revision 变化，正文和 sidecar 删除                         |
| Agent API mock 宿主                      | 注册、失败回收、注销、重复启动、SPA、bfcache、降级验证通过；不等于原生验收                             |
| 实际浏览器 bundle                        | esbuild browser 打包成功，无 Node build 模块进入；无原生 API 时执行不发请求                            |
| 启用内容构建                             | 579 个输入，过滤 1 个，生成 578 篇公开目录与 2730 个文件                                               |
| 关闭 docs 构建                           | 86 个输入，过滤 1 个，生成 398 个文件；postscript 不包含三个工具                                       |
| 页面类型产物                             | 中文 / 英文首页为 home，英文文章为 article，program/index 为 list，docs/index 为 article，404 为 other |

测试还覆盖网络 / schema / 版本错误、外域路径拒绝、单调用取消隔离、缓存失败恢复、版本变化后的索引重建、真实双语检索、正文分页边界与章节降级。既有一项设计测试检查布局源文本，已调整为允许无可见 UI 的可选挂载，继续验证文章标签位于正文之后。

### 578 篇产物检索实验

Node 进程通过文件适配器读取真实构建输出，执行正式 search 和 reader 服务：

| 查询               | 实际代表命中                                        |                      单次耗时观察 |
| ------------------ | --------------------------------------------------- | --------------------------------: |
| MCP                | MCP 2026 演进、OneAgent + MCPs 中英文文章           | 约 624 ms，包含首次读取与索引构建 |
| 上下文工程         | 从 Claude Code 到 OneAgent、从 RAG 到 Deep Research |                约 13 ms，预热索引 |
| 可持续分红         | 2026-10-31 投资线索文章                             |                 约 1 ms，预热索引 |
| 不存在的主题xyz987 | 空结果                                              |                           约 0 ms |

前三组的首条结果均成功读取正文、hash 和正式链接。首两篇读出 4000 code point 并返回 nextOffset，投资线索文章读出 2044 code point 并正常结束。

这些是单次 Node 文件读取实验，不是浏览器网络时间、p95 延迟或手机性能。不可与研究阶段 Python 字面量匹配数量直接比较；正式 FlexSearch 会召回分词匹配候选。

## 5. 明确限制与偏差

1. **章节截取降级。** sidecar 返回真实 HAST heading ID、层级和引用，但 `available: false`。传入存在的 headingId 返回 SECTION_UNAVAILABLE，未知 ID 返回 HEADING_NOT_FOUND；不猜测原始 Markdown 与变换后标题之间的边界。正常正文分页可用。
2. **脚本预算尚未达到。** 最终对照中 postscript gzip 从 414121 bytes 增至 437150 bytes，增加 23029 bytes（约 22.5 KiB），高于原方案 15 KiB 目标。Quartz 独立打包 inline 入口，新增检索模块会再次包含 FlexSearch。此次保留现有搜索 UI 隔离，尚未重构其资源管线；默认关闭，不能写成性能门禁全部通过。后续可评估共享搜索资源或懒加载独立模块。
3. **目录体积达标。** 首轮构建 catalog 245669 bytes，本地 gzip 为 58873 bytes（约 57.5 KiB），低于 100 KiB 目标。gzip 用 Python 固定 mtime 计算，不代表 CDN 实际传输量。
4. **原生浏览器与真实 Agent 未测。** 当前环境没有可用的已连接 Browser 控制工具。没有执行 Chrome 原生工具调用、Origin Trial、ChatGPT Desktop、Safari、移动端或真实 Agent 工作流；mock 和 Node 链路不能替代这些检查。
5. **未采集浏览器内存和 long task。** 索引每 20 篇让出事件循环，但还没有浏览器主线程与低端设备指标；共享已有 contentIndex 的优化未实施。
6. **未发布。** 未提交、推送、创建 PR 或修改生产配置。重新构建不能卸载已经打开页面的旧脚本，回滚后需普通刷新。

正式启用前至少补齐原生注册 / 发现 / 调用 / 取消 / 注销与目标 Agent 的端到端验收，并决定如何处理脚本预算偏差。上述限制不会阻止对当前实现代码进行审查或本地显式启用。
