---
title: RAG 工程实践：QQ 产品召回与 QA 文档导航
created: 2026-08-30
modified: 2026-08-30
published: 2026-08-30
description: 从淘工厂知识库问答到保险 `Agentic RAG`，记录 `QQ Matching` 如何召回产品池、`QA Matching` 如何提供文档定位，以及两条链路为什么分别使用 `Precision@3` 与 `Anchor Precision@5`。
tags:
  - AI Agent
  - RAG
  - 搜索
  - 评测
  - 保险科技
---

在保险快查里，同样是一次向量匹配，系统收到结果后的动作完全不同。

`QQ Matching` 返回的是离线 `Query` 背后的一组产品；`QA Matching` 返回的只是材料里的几个坐标。前者要让用户看到的产品足够准，后者要让 `Agent` 知道接下来去哪里翻。把它们都写成“检索 `Top K`，然后交给大模型”，会把真正发生的工作抹掉。

## 从知识块问答走到文档导航

2023 年 10 月到 2024 年 6 月，我负责淘宝淘工厂客服知识库和问答相关工作。那套系统已经具备一条典型的 `RAG` 链路：把问题和必要的聊天历史向量化，融合线上、离线知识源，对候选内容粗排、重排和精排，再让 `LLM` 基于候选知识回答。知识管理侧还要处理新增、内容修改、版本升级和删除。相关记录在 [[淘工厂客服知识库和问答相关的工作]]。

进入保险业务后，检索结果不再只有“可放进上下文的知识块”这一种形态。产品搜索需要复用离线整理过的产品池，报告 `Agent` 则需要在几十份产品材料里继续查证。两条链路都使用语义匹配，交付物却不一样。

```text
QQ Matching：Query -> 离线 Query -> 产品池 -> Top 3 产品

QA Matching：Question -> Top 5 文本块 -> 文档坐标 -> Agent 前后搜索
```

## `QQ Matching` 召回产品池

`QQ Matching` 的结果只服务我们定义的复杂 `Query`。产品名搜索、明确的单条件筛选等简单 `Query` 仍然提交原有的 `HA3 easy` 搜索结果。

复杂 `Query` 的产品池由 `Agentic Search` 离线生成：拆解需求、调用搜索工具、产出候选产品，再把结果与离线 `Query` 一起写入 `Elasticsearch`。线上链路不重跑这段搜索轨迹，只取回已经物化的产品池。

`QQ Matching` 使用经过保险领域语料微调的 `Qwen-Embedding-4B`。在线问题完成向量化后，`Elasticsearch` 只返回相似度最高的一个离线 `Query`，不合并多个查询的产品池。最高分超过阈值才算命中，阈值通过线上 `A/B` 实验调整。`Embedding` 接口耗时约为 `50ms`，这是组件级近似值。

### 三路从 `t0` 并发

简单和复杂 `Query` 由 `Qwen3.5-35B-A3B` 量级的小模型判断，接口耗时约为 `250ms`，同样是组件级近似值。这个 `Gate` 不作为搜索的串行前置步骤；请求进入时，`Gate`、`HA3 easy` 和 `QQ Matching` 同时执行：

```text
用户 Query
  ├── complexity gate：simple / complex
  ├── HA3 easy：原有搜索引擎逻辑
  └── QQ Matching
       ├── Qwen-Embedding-4B
       └── Elasticsearch Top 1 Query -> 离线产品池

simple
  -> HA3 easy

complex + QQ hit
  -> 离线产品池

complex + QQ miss
  -> HA3 easy
```

`Gate` 判为简单 `Query` 时提交 `HA3 easy` 结果；判为复杂 `Query` 且 `QQ Matching` 命中时提交离线产品池；`QQ Matching` 未过阈值时，改为提交已经在途的 `HA3 easy` 结果，不再重新发起搜索。没有被选中的分支也会消耗计算资源，换回的是降级时无需等待另一条链路冷启动。

### 评测落在产品上

这条链路不评价两个问题有多相似。用户最终看见的是产品，评测也直接落在产品上。

对单个查询 $q$：

$$
Precision@3(q)=\frac{\sum_{i=1}^{3} rel(q,p_i)}{3}
$$

$rel(q,p_i)$ 表示第 $i$ 个产品是否满足既有标准。评测集取各查询的 `Precision@3` 宏平均：

$$
Macro\ Precision@3=\frac{1}{|Q|}\sum_{q\in Q}Precision@3(q)
$$

如果前三个产品分别是“满足、满足、不满足”，这条查询的 `Precision@3` 就是 $2/3$。

`Precision@3` 是 `QQ Matching` 唯一的核心指标。它是产品级业务指标，会同时反映离线 `Query` 覆盖、线上匹配、产品池维护和候选排序的问题。

若产品位不足三个，评测分母仍应按三个计算。否则系统可以通过少返回结果抬高精度。训练集和测试集还要按 `Query` 语义簇隔离；同一句需求的轻微改写如果同时落在两边，会制造一个很好看但无法说明线上效果的数字。

从 `Elasticsearch` 取回产品池后，在线链路还会拦截已下架、当前渠道不可售或违反硬条件的产品。年龄、保额、保障期、健康告知等条件不能只交给离线产品池或语义相似度。[[AgenticOne 产品召回：JSON 分发与内存全量过滤]] 记录了为什么这些条件要由确定性代码在完整候选域上执行，[[保险商品搜索 Agent 工程架构：从自然语言需求到可交互货架]] 则记录了候选如何进入最终货架。

### 线上时延

最近一天的线上数据中，接口算术平均耗时约为 `340ms`，`P95` 约为 `640ms`。性能口径以这组线上数据为准，`Embedding` 的 `50ms` 和 `Gate` 的 `250ms` 只作为组件级近似值。

三条分支并发后，接口时延接近 `Gate` 与被选检索分支的较大值，而不是把 `250ms`、`50ms` 和搜索耗时依次相加：

```text
simple:
  T ≈ max(T_gate, T_HA3) + T_assemble

complex + QQ hit:
  T ≈ max(T_gate, T_embedding + T_ES) + T_assemble

complex + QQ miss:
  T ≈ max(T_gate, T_embedding + T_ES, T_HA3) + T_fallback
```

`P95 = 640ms` 表示最近一天约 95% 的请求在 `640ms` 内完成，并非最慢请求耗时。

## `QA Matching` 给 `Agent` 一个坐标

保险报告的原材料主要是公网保险条款，少部分图片材料先经过 `OCR` 转成 `Markdown`。向量搜索前先用 `prod_no` 限定材料范围，因此这是产品内检索，不会拿当前产品的问题去整个保险条款库里找相似段落。

第一版没有依赖标题层级。原生文本和 `OCR Markdown` 都按固定 `2000` 字窗口切分，窗口重叠 `200` 字，实际步长为 `1800` 字。

```text
prod_no 对应的产品材料
  ├── 公网保险条款
  └── 图片 -> OCR -> Markdown
           │
           ▼
  2000 字窗口 / 200 字重叠
           │
           ▼
  Qwen-Embedding-4B(chunk 正文)
           │
           ▼
  产品内向量索引：chunk_id + vector
```

`QA Matching` 与 `QQ Matching` 使用同一个经过保险领域语料微调的 `Qwen-Embedding-4B`。`Embedding` 输入只有 `Chunk` 正文，不拼产品名、文件名或章节标题。检索向 `Agent` 返回 `Top 5 chunk_id`；`Agent` 按 `ID` 打开数据，再查看命中位置的前后文本。

```text
semantic search
  -> Top 5 chunk_id
  -> 按 ID 读取 Chunk
  -> read / grep 前后内容
  -> 比对责任、条件和除外
  -> 取得可写入报告的原文证据
```

用户问“赔付金额”，条款里可能写“给付保险金”“年度累计限额”。一段正文说明可以赔，限制条件却可能在后面的责任免除里。`Chunk` 在这里只是一处可继续阅读的坐标。

`Anchor Precision@5` 是 `QA Matching` 唯一的核心指标，只评价检索器交出的五个定位块：

$$
Anchor\ Precision@5(q)=\frac{\sum_{i=1}^{5}rel(q,c_i)}{5}
$$

$rel(q,c_i)$ 表示文本块 $c_i$ 是否构成有效定位目标。一个块可以直接包含目标信息，也可以落在需要继续阅读的正确章节；只出现相似词、却把 `Agent` 带到另一项责任或另一份材料，不应标为相关。

五个候选里有三个有效，`Anchor Precision@5` 就是 $3/5$。

`chunk_id` 解决寻址，不负责候选去重。相邻窗口可能重复占用 `Top 5`，只输入正文可能丢掉章节标题提供的语义，`OCR` 噪声也可能进入向量。当时没有继续做切分策略的专项坏案例分析，也没有系统比较固定滑窗、结构化切分与父子 `Chunk`；这三项只能记作风险，不能写成已经在线验证过的结论。

切分方案变化后仍用 `Anchor Precision@5` 比较定位结果。`Agent` 如何沿着 `chunk_id` 查看前后内容、搜索轨迹是否有效、最后有没有取得完整证据，归报告生成器评测。

这条 `Semantic Search-then-Read` 链路的实现细节记录在 [[保险产品解读报告系统：Multi-Agent 生产链路与评测闭环]]。语义搜索负责缩小阅读范围，`read` 和 `grep` 回到原始材料精确取证；向量索引失效时，`Agent` 仍可退回关键词搜索和原文读取。

## 检索指标不评价生成器

| 模块 | 交付物 | 核心指标 | 指标不负责什么 |
| --- | --- | --- | --- |
| `QQ Matching` | `Top 3` 产品 | `Precision@3` | 产品解释和最终报告质量 |
| `QA Matching` | `Top 5` 定位文本块 | `Anchor Precision@5` | `Agent` 后续如何搜索和阅读 |
| 报告生成 `Agent` | 搜索轨迹、证据与报告 | 轨迹有效性、证据完整性、结论与引用质量 | 上游候选块本身的相关性 |

出现坏案例时，五个定位块有四个不相关，先修 `QA Matching`；定位准确但 `Agent` 没有继续核对后文，修工具策略和搜索轨迹；证据已经完整，报告仍然写错，修生成与校验。
