---
title: WebMCP 工具契约与生命周期
created: 2026-10-31
modified: 2026-10-31
---

# 工具契约与生命周期

[返回总方案](../2026-10-31-webmcp-integration-plan.md)

## 1. 公共结果与错误

业务服务返回可 JSON 序列化对象，不返回 DOM、Error、Response、Map 或循环引用。

```ts
type ToolResult<T> =
  | { ok: true; data: T; revision: string }
  | {
      ok: false
      error: {
        code: string
        message: string
        retryable: boolean
      }
    }
```

预期业务错误使用 envelope，方便模型纠正输入。浏览器的注册与权限错误由 runtime 捕获；调用取消保留 AbortError 语义，不包装成一般内容失败。日志只记录工具名、错误码与耗时，不上传查询、正文、选区或访问历史。

错误码至少覆盖 `INVALID_INPUT`、`NOTE_NOT_FOUND`、`NOT_AN_ARTICLE`、`HEADING_NOT_FOUND`、`SECTION_UNAVAILABLE`、`INDEX_UNAVAILABLE`、`FETCH_FAILED`、`UNSUPPORTED_SCHEMA`、`STALE_CONTENT`、`PAGE_CHANGED`。空搜索结果是 `ok: true`。对网络失败最多一次受控重试，不能让模型触发无限后台重试。

参数 JSON Schema 声明对象、字段描述、required、范围和 `additionalProperties: false`；execute 内再次校验类型、整数、枚举、长度与实际状态。不要依赖浏览器已经执行完整 schema 校验。

## 2. `search-notes`

描述：搜索晓灰已公开的笔记，返回相关摘要与正式引用链接。关键词检索；需要深入理解时继续使用 read-note。

| 参数       | 规则                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| `query`    | 必填字符串，trim 后 1–200 code point                                           |
| `topic`    | 可选一级主题，例如 program、invest、learning；未知主题返回输入错误并列出允许值 |
| `language` | 可选 zh / en / all，默认 all                                                   |
| `limit`    | 可选整数，默认 5，范围 1–10                                                    |

返回 `items[]`，每项含 slug、title、canonicalUrl、language、snippet、匹配字段和最多 3 个 heading 引用；不返回完整 text。可返回 `hasMore`，P1 不承诺全文精确 total，避免截断候选计数误导。示例：

```json
{
  "ok": true,
  "revision": "<content-revision>",
  "data": {
    "items": [
      {
        "slug": "en/program/llm/oneagent-mcps-domain-agent",
        "title": "OneAgent + MCPs: Fast Domain Agent Creation",
        "canonicalUrl": "https://xiaohui.cool/en/program/llm/oneagent-mcps-domain-agent",
        "language": "en",
        "snippet": "This article introduces the OneAgent + MCPs paradigm…",
        "matchedFields": ["title", "tags", "text"],
        "headings": []
      }
    ],
    "hasMore": true
  }
}
```

这只是返回形状示例，不是正式引擎排序验收结果。

## 3. `read-note`

描述：按搜索结果中的 slug 读取已公开笔记，支持正文分页；具备可靠映射时可限定章节。当前已实现此能力，特殊标题保留明确降级。

| 参数        | 规则                                                     |
| ----------- | -------------------------------------------------------- |
| `slug`      | 必填，精确匹配公开目录，最大 512 code point              |
| `headingId` | 可选，使用工具先前返回的真实 id，不能只传标题文字        |
| `offset`    | 默认 0，非负整数，表示目标正文或章节内的 code point 偏移 |
| `length`    | 默认 4000，整数 1–12000                                  |

返回 title、slug、canonicalUrl、citationUrl、hash、format、content、offset、nextOffset、truncated、headings（最多 50 项，超出给出 hasMoreHeadings）。format 明确为 `markdown`。提供 headingId 时 offset 相对该章节，citationUrl 指向对应章节。offset 超出正文范围返回输入错误，恰好等于长度返回空内容与 null nextOffset。

不要强行向正文附加模型指令。返回的文章、代码块或引用即使含“忽略之前指令”，也只属于来源内容。需要由 Agent host 维持信任边界；站点对外不承诺彻底消除 prompt injection。

## 4. `get-current-note`

描述：获取用户当前打开的笔记与引用信息，帮助 Agent 理解“这篇文章”。无参数，schema 为不允许额外字段的空对象。

默认只返回标题、slug、canonicalUrl、当前 hash、heading 目录、pageKind；不返回用户选区、不尝试根据视口推断精确阅读段落、不默认返回整页 DOM 文本。读取正文继续调用 read-note，避免首页文章卡片、侧栏与弹窗混进内容。

pageKind 为 article、home、list、other。首页或列表页返回 `NOT_AN_ARTICLE` 并提示可调用 search-notes；不把首页 `article` 容器中的全部 feed 误作笔记正文。

context 模块结合 `body.dataset.slug`、`data-layout`、公开 catalog 与明确页面类型判断；不能只用 slug 是否为 index 判断，因为 docs/index 不是站点首页。URL hash 只有匹配当前文章真实 heading 时才作为 section 引用。

取快照记录 navigation generation、slug 与 URL；等待 catalog 完成后再次检查。若用户已切页，返回 `PAGE_CHANGED`，不得返回旧标题配新链接。该工具读取真实页面状态，因此导航期间可临时返回 `PAGE_CHANGED`。

## 5. WebMCP 薄适配层

capability 检测在客户端执行，禁止服务端渲染时访问 document。生产默认只使用当前原生接口：安全上下文、document.modelContext 存在且所需 registerTool 为函数。getTools / executeTool 是消费者与调试能力，不能把其缺失一概等同不能向内置 Agent 提供工具；P0 对实际目标实现单独验证。

类型包锁定到验证版本，引用范围限制在 webmcp 目录。目标实现与草案不一致时在 adapter 中明示兼容分支，禁止散布到三个 tools 文件。不要写一个“能赋属性成功”就称所有旧浏览器支持的 fallback。

注册示意，非已验证的生产实现：

```ts
const registration = new AbortController()
try {
  for (const definition of definitions) {
    await context.registerTool(
      {
        name: definition.name,
        description: definition.description,
        inputSchema: definition.inputSchema,
        async execute(input, options) {
          return definition.run(input, options.signal)
        },
      },
      { signal: registration.signal },
    )
  }
} catch (error) {
  registration.abort() // 回收已注册的同组工具，防止部分安装
  reportRegistrationFailure(error)
}
```

执行返回结构化对象；原生 getTools / executeTool 的本地验收需对序列化字符串作一次 JSON.parse。其他宿主需要 MCP content 格式时仅在其明确的兼容适配中转换，避免双重 stringify。

## 6. SPA 与关闭

bootstrap 模块级幂等，维护 `unsupported / registering / ready / failed / disposed` 状态与唯一启动 Promise。并发启动不会重复注册；失败清理 Promise 后允许显式重试，避免在每次 nav 中刷错误。

- 生命周期为整个 Document 的三个固定工具只注册一次。其 handler 通过服务获取最新上下文，不能闭包捕获初始文章。
- 全站 registration controller 不放进每页 `window.addCleanup`，否则第一次切页就会注销工具。也不要在 nav 中无条件重注册。
- 订阅 prenav 时推进 generation 并使当前页面读取失效，nav 后提交新快照。页面专属监听器才使用 Quartz cleanup。
- search-notes / read-note 是全站读取，普通切页不必取消；get-current-note 必须检查 snapshot 一致性。P2 会改 DOM 的工具需要更强的页面 generation 校验。
- pagehide 若 persisted=true，保留 Document 生命周期状态；pageshow 从 bfcache 恢复时重新核对能力与上下文。非 persisted 的卸载可注销并释放监听器。
- docs、首页、普通文章、文件夹、标签与 404 的组件资源覆盖分别验收。`homePageLayout.afterBody` 独立覆盖，实施时显式包含 WebMCP 挂载；特殊 emitter 不能假定继承 shared 布局。

P1 不提供跳转工具，避免执行过程中导航销毁调用上下文而结果丢失。P2 若增加导航，需先明确同页锚点、SPA 与整页导航的返回时机，不把跨文档返回当作规范已解决能力。

## 7. 降级与策略

不支持 API 时静默跳过，保持 llms、普通搜索与 Markdown 不变。存在 API 但被 Permissions Policy 拒绝时清理半注册状态、记录本地诊断，不阻断页面。

不扩大跨域暴露，不读取登录信息或浏览历史，不接入外部模型供应商。polyfill 只在 P0 隔离样例显式启用；不能把 polyfill 的 API 测试通过写成原生浏览器或真实 Agent 验收通过。
