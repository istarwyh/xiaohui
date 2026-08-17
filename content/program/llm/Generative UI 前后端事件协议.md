---
title: Generative UI 的前后端用什么事件协议
created: 2026-08-16T11:37:40Z
modified: 2026-08-16T11:40:05Z
published: 2026-08-16
description: 模型决定把卡片换成按钮，前后端之间传什么？RFC 6902 JSONL 是操作日志，A2UI 与 json-render 的组件模型是邻接表。传输层与运行时层，要分开回答。
tags:
  - Generative UI
  - A2UI
  - json-render
  - JSON Patch
  - 事件流
---

模型（或 Agent 进程）决定把界面上的一张卡片换成按钮。屏幕在用户那一端，中间隔着网络，要落地这个改动，前后端得先商量出一种"描述 UI 变化"的方式。这个问题没有单一答案，但记住一个分层就能看清大多数框架：**传输的是操作日志，运行时的真相是邻接表。**

## 先有操作日志：RFC 6902 JSONL

RFC 6902（`JSON Patch`）把一次 UI 变更描述成一串操作，每个操作是 `{ "op": ..., "path": ..., "value": ... }`。

```json
[
  { "op": "add",     "path": "/cards/1",        "value": { "type": "Button" } },
  { "op": "replace", "path": "/cards/0/type",   "value": "Button" },
  { "op": "remove",  "path": "/cards/2" }
]
```

`path` 用 JSON Pointer 指目标位置，比如 `/cards/0/type`。这串操作按行写成 JSONL（`JSON Lines`），每行一个操作，就是一条可以追加、可以重放的变更流。

这类操作是**相对当前文档**的：第 3 条 `remove /cards/2` 依赖前两条执行完之后的文档状态。所以这条流严格有序，丢一条或者乱序，文档就不知道长什么样了。

## A2UI：把 "Agent 到 UI" 定成协议

`A2UI`（`Agent to UI`）想回答"模型怎么命令前端渲染"。它把组件发成一张**扁平列表**，而不是嵌套的 JSON 树：

```json
{
  "updateComponents": {
    "surfaceId": "user_profile_card",
    "components": [
      { "id": "root",       "component": "Column", "children": ["user_name", "user_title"] },
      { "id": "user_name",  "component": "Text",   "text": "John Doe" },
      { "id": "user_title", "component": "Text",   "text": "Software Engineer" }
    ]
  }
}
```

这取自图论的"邻接表"：每个组件不嵌套子节点，而是在自己的 `children` 字段里记"我连到哪些 ID"，子节点本人躺在列表的其他位置。客户端收到后存进 `Map<id, Component>`，渲染时从 `root` 开始按 ID 查表展开。

扁平加 ID 引用顺手给出四个性质：

- **按 ID 缓存**。组件有稳定 `id`，想更新就重发同一个 `id` 的快照，客户端 upsert 进 map，重复发送没有副作用。
- **允许乱序**。规范明确说组件可以任意顺序到达，反正渲染时才拼树。
- **丢包自愈**。哪条消息丢了，重发那个 `id` 的快照就行，map 是幂等合并。
- **引用容错**。引用了不存在的 ID，渲染时跳过，不崩。

A2UI 处理增量的方式是 `updateComponents`：按 `id` 重发组件即表示添加或更新。细粒度的 JSON Pointer 补丁只存在于数据模型上（`updateDataModel`），组件列表本身在 v0.9.1 里没有独立的补丁通道（更早的 v0.9 草案里的 `PatchComponents` 用过 RFC 6902，定稿版本里没有保留）。

## json-render：patch 当传输，邻接表当运行时

`json-render`（vercel-labs）是更实际的例子，因为它把两层都摆出来了。

它内部维护的 spec 长这样：

```json
{
  "root": "card-1",
  "elements": {
    "card-1":  { "type": "Card",   "props": { "title": "Hello" }, "children": ["button-1"] },
    "button-1": { "type": "Button", "props": { "label": "Click me" }, "children": [] }
  }
}
```

`root` + `elements` map，`children` 是 ID 数组。这跟 A2UI 是同一个模型，只是字段换了个名字，所以 A2UI 集成几乎零成本。而它对外流式输出的正是 **RFC 6902 JSONL patch**：客户端工具把 patch 流"编译回 spec"，落到那张 `elements` map 上做增量修改。

两层各司其职：

- **传输层**：RFC 6902 JSONL patch，有序、相对、粒度细，省带宽。
- **运行时**：扁平 `elements` map，按 key 持有、幂等、可容错。

它自称 schema-agnostic，意思是不把任何一个协议的模型锁死。A2UI、AG-UI、Adaptive Cards、OpenAPI 各有各的形态（有的嵌套树，有的根本不是 UI 树），json-render 把它们全部映射到自己的扁平 element tree 上。`traverseSpec` 同时处理扁平与嵌套两种格式，`specToNested` 负责把扁平转成嵌套。

## 状态同步与操作日志不是一回事

| | RFC 6902 patch（操作日志） | 邻接表快照（状态同步） |
|---|---|---|
| 一条消息的含义 | 对当前文档做第 n 个变换 | id=X 的组件现在是这个快照 |
| 应用方式 | 依赖之前所有操作的累积效果 | 幂等合并进 map |
| 顺序敏感 | 高度敏感，乱序即损坏 | 顺序无关，渲染时才拼 |
| 丢一条 | 文档状态未知，要整体重放或靠 `test` 校验 | 重发该 `id` 快照即可 |
| 缓存单元 | 整个文档状态 | 单个组件 `id` |

patch 能改单个字段，更细；邻接表一次要重发整个组件快照，更粗。这是 patch 胜出的地方。但乱序、按 ID 缓存、丢包自愈这些，是邻接表模型的默认属性，却是 patch 模型要额外加机制（序列号、checkpoint、`test` op）才能盖出来的，而且盖完之后等于在操作日志的骨架上重建了"按 key 管理状态"那一层。

别把它们当二选一。json-render 就是两层都用：patch 负责"这次只改哪几处"，`elements` map 负责"客户端怎么可靠地持有"。A2UI 回答"数据长什么样、丢包了怎么办"，patch 回答"这次传输最小变化是什么"。

## 下次看框架，先问这两句

看到一个 Generative UI 框架，先分清两件事：它的 JSONL patch 是**传输层的增量编码**，还是**客户端唯一的真相来源**？它的组件是**扁平 ID 引用**，还是**嵌套树**？大多数框架都在传输层用操作日志、在运行时用邻接表，只是两层之间的边界画在不同位置。搞清楚手上的框架把边界画在哪，比背它的 API 有用。

相关的另一条生成式 UI 路线是让 Agent 直接产出 HTML 或 WebComponent，见 [[如何让 AI Agent 实时个性化可视交互]]。事件流的消费和断线恢复，分别见 [[LangGraph Agent Event 消费指南]] 与 [[LangGraph Platform 可恢复流协议深度解析]]。
