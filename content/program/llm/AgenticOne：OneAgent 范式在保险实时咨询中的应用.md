---
title: AgenticOne：OneAgent 范式在保险实时咨询中的应用
published: 2026-06-21
created: 2026-06-21T00:00:00+08:00
modified: 2026-06-21T00:00:00+08:00
description: AgenticOne 不是孤立的新范式，而是 OneAgent 范式在保险快查实时咨询场景中的应用：用主 Agent 调度 SubAgent、工具、状态和子流程，把搜品、取证、核保、问答、试算和流式输出编排成一条稳定链路。
tags:
  - AI Agent
  - OneAgent
  - AgenticOne
  - LangGraph
  - 上下文工程
  - 保险科技
---

`AgenticOne` 不是一个“什么都自己做”的大模型，也不是 `OneAgent` 之外的另一套范式。

更准确地说，`AgenticOne` 是 [[如何快速创建领域Agent - OneAgent + MCPs 范式|OneAgent]] 范式在保险快查实时咨询场景中的一个应用：基于强大的基础 `Agent` 派生业务 `Agent`，让主 `Agent` 负责理解用户意图和调度能力，让同类或异构的 `SubAgent` 负责局部自治，让工具层承担确定性数据能力，让 `state` 承载跨轮、多节点、并发场景下的中间结果。

如果说离线生产闭环里的 `Host Agent -> Research Agent -> Verify Agent -> Host 精准修正` 是 `OneAgent` 在内容生产场景里的应用，那么 `AgenticOne` 就是同一范式在在线咨询场景里的应用。

它面对的问题不再是“如何生成一份合格的离线内容并刷入存储”，而是：

- 用户说一句模糊的保险需求，系统如何稳定识别意图？
- 搜品、条款问答、核保、车险、保费试算、收益演算这些能力如何被正确调度？
- 长条款、搜索结果、用户画像、历史候选产品，哪些应该进入主上下文，哪些应该留在 `state`？
- 多个 `SubAgent` 并发工作时，前端如何看到一条符合业务理解的流式输出？

这篇文章讨论的不是某个工具如何搜索产品，而是一个生产级保险智能体如何把不确定性拆开治理。

## 一、从 OneAgent 到 AgenticOne

`OneAgent` 的核心不是“只有一个 Agent”，而是“用一个统一的基础 Agent 派生领域 Agent”。

在这个范式里，业务 `Agent` 通常具有几个特征：

1. 有一个主循环，负责根据用户目标和当前上下文决定下一步。
2. 有一组工具，负责执行外部世界里的确定性动作。
3. 有 `SubAgent`，用于把复杂子任务隔离到独立上下文里。
4. 有 `state` 或文件系统，用于把长材料、中间产物和共享结果放到主上下文之外。
5. 可以嵌套。`SubAgent` 可以是另一个同类 `OneAgent`，也可以是确定性 `workflow` 或普通图。

这也是 [[从Claude Code到 OneAgent：如何做好上下文工程]] 里讲的上下文工程：`Plan`、`Offload`、`Isolate`、`Reduce`、`Retrieve`、`Cache` 并不是抽象口号，而是生产级 `Agent` 能不能长期工作的基本条件。

`AgenticOne` 延续了这条脉络。它不是把所有保险知识塞进一个巨大 prompt，而是把保险咨询拆成若干稳定能力：

- 搜品与精选
- 产品推荐报告
- 条款、健告、除外责任问答
- 公网具名产品取证
- 核保多轮问准
- 车险多轮流程
- 保费与收益试算
- 用户画像与历史搜索上下文
- 流式输出与可观测性

主 `Agent` 不直接实现这些能力。它的职责是判断“下一步应该让谁干什么”。

这就是 `OneAgent` 的一贯思想：主 `Agent` 做薄，领域能力做厚；主上下文保持干净，复杂信息放到可管理的外部状态里。

## 二、总体分层

`AgenticOne` 可以理解为六层：

```text
入口与会话层
  负责请求标准化、session 复用、运行配置和 SSE 策略

Orchestrator 层
  负责本轮走主 Agent，还是进入核保 / 车险等子流程

主 Agent 层
  负责理解意图、选择工具、调度 SubAgent、决定是否输出

SubAgent 层
  负责搜品、筛选、取证、公网搜索等局部自治任务

工具与数据层
  负责产品池、条款材料、核保、预算、收益、保费等确定性能力

状态与流式层
  负责跨轮状态、并发合并、终末输出保护和事件队列消费
```

这个分层有一个很重要的判断：`AgenticOne` 不是为了“多几个 Agent”而多 Agent。它真正解决的是三个失控点。

第一，决策失控。主 `Agent` 不应该自己拼复杂检索参数，也不应该同时理解产品池、责任、预算、核保、收益等所有集合运算。复杂搜品交给搜品子图，主 `Agent` 只传达任务意图。

第二，状态污染。搜索候选、取证材料、核保上下文、历史推荐清单、用户画像不能全都塞进 `messages`。它们应该进入不同的 `state` 字段，在需要时被对应工具读取。

第三，时序混乱。一个在线咨询链路里可能同时有主 `Agent` token、搜品卡片、取证卡片、报告输出、裸 LLM 工具输出。如果前端按事件到达顺序直接展示，用户看到的是乱序的系统噪音，而不是业务过程。

## 三、为什么需要 Orchestrator

普通问答可以交给一个主 `Agent`。但保险咨询里有天然的多轮流程。

核保不是一次性问答。用户说“我有高血压，能不能买百万医疗”，系统可能需要继续问：确诊时间、最高血压、是否用药、是否并发症、是否住院、最近检查结果。每一轮补充都属于同一个核保流程。

车险也类似。车辆信息、使用性质、险种偏好、报价偏好、续保状态，天然是一组状态机，而不是随口聊天。

如果把这些流程都塞进主 `Agent` prompt，主 `Agent` 会同时承担两种职责：

- 普通咨询里的自由调度；
- 多轮流程里的状态机推进。

这会让它变重，也会让跨轮状态变脆。

所以 `AgenticOne` 在主 `Agent` 外面加了一层 `Orchestrator`。它先判断当前会话是否处在某个子流程中：

```text
每轮开始
  |
  |-- 已处于核保 / 车险子流程 -> 直接进入对应子流程
  |
  '-- 没有活跃子流程 -> 进入主 Agent
```

这不是对 `OneAgent` 的替代，而是对 `OneAgent` 应用到保险领域时的外层补强。`OneAgent` 负责派生和调度领域能力，`Orchestrator` 负责把那些明确具有流程状态机特征的业务从普通问答中拆出去。

## 四、主 Agent：调度者，不是全能专家

`AgenticOne` 的主 `Agent` 只做几件事：

- 理解用户当前意图；
- 结合历史候选产品和用户画像解析指代；
- 判断该搜品、取证、问答、核保、车险、试算还是输出报告；
- 调用相应 `SubAgent` 或工具；
- 对非终末工具结果做面向用户的解释。

它不应该做几件事：

- 不直接拼复杂搜索任务；
- 不直接吞长条款原文；
- 不自己写产品深档案报告；
- 不把核保当普通多轮闲聊；
- 不在终末工具已经生成结果后再次改写。

这个边界很重要。

一个稳定的业务 `Agent` 不是让 LLM 处处“自由发挥”，而是把自由留在适合自由的地方，把确定性留给确定性系统，把长上下文放到能管理它的状态里。

## 五、搜品子图：为什么搜品不是一个普通工具

保险搜品不是一次简单查询。

用户可能说：

- “端午去尼泊尔爬山，买什么保险？”
- “给爸妈买医疗险”
- “滑雪要保险”
- “我有高血压还能买百万医疗吗？”
- “第一款换一批”

这些话里常常同时包含人群、场景、区域、疾病、预算、责任、除外责任和历史指代。把它们压成一个固定查询参数，很容易丢信息。

所以 `AgenticOne` 把搜品做成一个子图，而不是一个普通函数。它大致分成两段：

```text
deep_search
  -> filter_rank
```

`deep_search` 负责召回候选。但这里的“搜索”不是一个普通查库函数，而是三段式：

```text
LLM 规划搜索任务
  -> 确定性工具执行
  -> 结构化结果回写
```

更完整地说：

```text
product_sub_agent
  -> deep_search_node
  -> deep_search_sub_agent / product_search_sub_agent
  -> LLM 根据 query 规划 search_tasks
  -> concurrent_search 并发执行 product / underwriting / budget / benefit
  -> SearchResultCapture 把工具结果写入 search_context
  -> deep_search_node 解析搜索 Agent 最终 JSON
  -> 输出 matched_prod_nos + search_context 给 filter_rank
```

在 `AgenticOne` 里，主 `Agent` 调用 `product_sub_agent` 时传入的通常不是原始用户问题，而是经过主 `Agent` 理解后的任务描述。

比如用户原句是：

```text
端午去尼泊尔爬山，买什么保险？
```

主 `Agent` 可能传给搜品子图的任务是：

```text
为端午短期尼泊尔爬山推荐保险，重点关注境外户外旅行险、
尼泊尔 / 亚洲承保区域、紧急救援、搜救 / 医疗转运、
高风险运动 / 高海拔 / 登山条款。
```

也就是说，`deep_search` 处理的是一个更结构化的搜索任务，而不只是用户原话。

真正搜索前，`deep_search_node` 还会处理若干早退场景：如果命中人工干预的指定产品，就直接返回；如果本轮意图是普通回答或离题，就跳过搜索；如果外部上下文已经带了产品编号，就直接进入对比或展示；如果有用户画像，也可以把必要的年龄、性别、预算等信息注入到搜索 query 里。

随后它会启动一个 ReAct 搜索 `Agent`。这个搜索 `Agent` 有专门的搜索 prompt 和一个核心工具：`concurrent_search`。它的工作模式是：

```text
Thinking: 理解用户需求
Action: 调 concurrent_search
Observation: 读取工具返回
Final: 输出 JSON
```

搜索 prompt 会要求模型把所有搜索、核保、预算、收益筛选统一规划成 `search_tasks`，再交给 `concurrent_search` 执行。任务类型大致有四类：

| task_type | 作用 |
| --- | --- |
| `product` | 产品搜索 |
| `underwriting` | 核保过滤 |
| `budget` | 预算过滤 |
| `benefit` | 收益过滤 |

对于“端午去尼泊尔爬山”这类问题，搜索 `Agent` 可能规划出：

```text
product:
  产品分类 = 旅行意外
  承保目的地国家或地区 = 亚洲
  safe_in_country = 尼泊尔
  fuzzy pattern = 登山 | 徒步 | 高海拔 | 高风险运动 | 紧急救援 | 医疗转运 | 搜救
```

如果用户补充“预算 300 元以内”，就追加 `budget` 任务。如果用户补充“我有高血压”，就追加 `underwriting` 任务。如果用户问的是收益阈值，再追加 `benefit` 任务。

`concurrent_search` 接到这些任务后，会先按当前搜索场景拿产品池白名单，然后并发执行每个任务。不同任务走不同确定性能力：

| task_type | 后端能力 |
| --- | --- |
| `product` | 产品结构化过滤与模糊扫描 |
| `underwriting` | 核保查询 |
| `budget` | 预算过滤 |
| `benefit` | 收益过滤 |

其中 `product` 搜索不是向量检索，而是基于产品 mapper 数据做结构化过滤和正则扫描。大致流程是：

```text
初始产品池
  -> scene / scope 白名单过滤
  -> 产品名 pattern
  -> conditions_map 字段条件
  -> liability 条件
  -> safe_in_country 目的地除外过滤
  -> fuzzy_prod_info_pattern 扫产品字段和责任详情
  -> 排序、同名去重、slim 输出
```

放回尼泊尔爬山例子里：

- `产品分类 = 旅行意外` 先锁定旅行险；
- `承保目的地国家或地区 = 亚洲` 确保区域覆盖；
- `safe_in_country = 尼泊尔` 排除不承保尼泊尔的产品；
- `fuzzy pattern = 登山 / 徒步 / 高海拔 / 紧急救援 / 医疗转运 / 搜救` 用于找到责任或详情里有户外相关能力的产品。

多路任务的合并规则也很关键：

```text
product tasks 之间取并集
underwriting / budget / benefit 与候选池取交集
最后按产品池白名单兜底过滤
再排序、同名去重、截断
```

所以如果用户同时给出旅行、预算和健康条件，候选池会变成：

```text
旅行险候选
  ∩ 预算范围内
  ∩ 核保条件可接受
  ∩ 收益或责任阈值满足
```

工具返回后，搜索结果不会只留在工具消息里。`SearchResultCapture` 会把结构化结果写入 `search_context`，例如产品 slim 信息、命中原因、核保结果、预算结果、收益结果、任务摘要等。它还可以维护本轮搜索池，支持后续在上一轮候选里继续追加条件，也就是类似 `scope = last` 的渐进搜索。

搜索 `Agent` 最终不会给用户写推荐语，而是输出一个结构化 JSON，例如：

```text
{
  "intent": "product_search",
  "matched_prod_no_list": ["..."]
}
```

`deep_search_node` 再解析这份 JSON，并做产品编号校验，过滤掉模型可能编错的编号。最后它返回：

```text
intent
matched_prod_nos
search_context
search_note
history_message
```

这里的 `matched_prod_nos` 是候选产品编号列表，`search_context` 是候选产品的轻量信息、命中原因以及预算 / 核保 / 收益等附属信息。

`filter_rank` 负责从候选里精选。它读取召回结果、历史已展示产品、预算或核保约束，然后输出更适合给主 `Agent` 使用的精选产品编号。

这个子图的输出不是最终答案，而是一份轻量候选清单。它告诉主 `Agent`：这些产品值得展示，其他候选可以作为“换一批”的后备池。

这体现了 `OneAgent` 的 `Isolate`：搜品过程自己的搜索轨迹、工具调用和筛选推理不应该污染主 `Agent` 的上下文。主 `Agent` 只拿到可以继续调度的结果。

## 六、以“端午去尼泊尔爬山”为例

用户说：

```text
端午去尼泊尔爬山，买什么保险？
```

这不是一个简单的“推荐旅行险”问题。

它至少包含几层隐含约束：

- 端午意味着短期出行；
- 尼泊尔意味着境外目的地；
- 爬山可能是普通徒步，也可能是高海拔徒步、EBC / ABC 线路，甚至是技术登山；
- 保险边界会被海拔、路线、是否攀岩、是否技术装备、是否搜救和医疗转运责任强烈影响。

主 `Agent` 在这里不应该自己写搜索参数。它更应该把任务交给搜品子图：

```text
为端午短期尼泊尔户外 / 爬山场景推荐保险，
重点关注承保区域、境外医疗、紧急救援、搜救或医疗转运、
高风险运动 / 高海拔 / 登山条款、旅行延误、行李证件损失，
并提示用户补充路线、最高海拔、是否技术攀登和预算。
```

搜品子图召回并精选后，主 `Agent` 再调用推荐报告工具。报告工具会基于最终产品拉取更完整的产品档案，而不是直接相信搜索阶段的轻量字段。

于是推荐链路变成两段式：

```text
搜索阶段：轻量字段 + 结构化筛选 -> 定产品
表达阶段：深档案 + 取证材料 -> 写产品卡和对比表
```

这比“搜到什么就总结什么”更可靠。搜索阶段要快、广、可筛选；表达阶段要准、深、可读。

## 七、取证 Agent：查材料，但不直接回答

条款问答是保险智能体里最容易把上下文撑爆的地方。

用户问：

```text
这款乙肝健告怎么写？
```

系统需要读产品材料、健康告知、除外责任、可能还要看投保须知。如果取证 `SubAgent` 把所有原文直接作为 `ToolMessage` 回给主 `Agent`，主 `Agent` 后续每一轮都会背着一堆长材料继续推理。

`AgenticOne` 的做法是把“取证”和“回答”拆开：

```text
context_sub 取证
  -> ContextBypass 聚合原文片段
  -> ContextEvidenceCapture 写入 state
  -> 主 Agent 只看到简短 manifest
  -> qa_summary 读取 evidence 并生成对客答案
```

这其实是 [[从Claude Code到 OneAgent：如何做好上下文工程]] 里的 `Offload`：长证据不直接进入主上下文，而是存到 `state` 里。主 `Agent` 只知道“证据已经准备好”，真正回答时由专门工具读取证据并输出。

这个设计减少了两类风险：

- 长原文污染主 `Agent`，导致下一步调度变差；
- 主 `Agent` 在没有完整取证约束时自行解释条款，增加幻觉风险。

公网搜索也是同理。当用户点名一个库内找不到的产品，系统可以通过公网搜索取证，但最后仍然应该进入 evidence 管道，再由问答工具组织成答案。

## 八、qa_summary 的三条线

`qa_summary` 不是前端直接消费的工具 JSON。它是一个终末工具，同时连接三条线：证据线、回答线、前端流式线。

以用户问“EBC 徒步能不能赔？”为例，链路大致是：

```text
用户问具体条款问题
  -> 主 Agent 判断不能自己编，需要先取证
  -> task(context_sub_agent, "查高海拔 / 登山 / 徒步除外责任")
  -> context_sub_agent 读取条款、责任免除、投保须知等材料
  -> ContextBypass 聚合原文片段，去重、截断、控制预算
  -> ContextEvidenceCapture 把 evidence 写入 state.search_evidence
  -> 主 Agent 只收到“已取证”的清单，不看到长原文
  -> 主 Agent 调 qa_summary(question, prod_nos)
  -> qa_summary 从 state.search_evidence 读取 evidence
  -> qa_summary 拼 QA prompt，调用 LLM 生成 Markdown
  -> LLM token 通过 SSE 流给前端
  -> qa_summary 返回完整 Markdown
  -> SummaryBypass 把 ToolMessage 转成最终 AIMessage
```

这里有几个细节很关键。

第一，evidence 不是 `qa_summary` 自己查的。它来自 `context_sub_agent` 或公网取证类能力。取证过程中读到的条款原文会先被聚合成 evidence，再写入 `state.search_evidence`。主 `Agent` 收到的只是 manifest，例如“已取某产品的高海拔 / 登山 / 徒步除外责任，evidence 已入库，可调用 `qa_summary` 使用”。

第二，`qa_summary` 的入参通常只需要问题和产品范围，例如：

```text
qa_summary(
  question="EBC 徒步能不能赔？",
  prod_nos=["某产品编号"]
)
```

它不会要求主 `Agent` 把 evidence 作为参数传进来。evidence 通过注入的 `state` 读取。这样主 `Agent` 不需要背条款原文，也不会在转述过程中丢失或污染证据。

第三，`qa_summary` 消费 evidence 时，会根据产品范围找到对应材料。如果某个产品缺少本轮 evidence，但产品库里有深档案，它会补充产品档案作为辅助上下文。回答优先级应该是：

```text
本轮 evidence > 产品档案 > 往轮对话
```

这条优先级很重要。具体问答必须优先相信本轮取到的条款、健告、投保须知等原文，而不是相信主 `Agent` 的历史印象。

第四，前端看到的是 `qa_summary` 内部 LLM 生成过程中的 token，而不是等工具函数完全返回后才一次性显示。也就是说，`qa_summary` 内部的 LLM 调用会被标记成问答生成模块，SSE consumer 持续消费 token chunk，前端把这些 chunk 拼成用户看到的 Markdown 答案。

第五，`qa_summary` 最后仍然会返回完整 Markdown。这个返回值进入图状态，成为工具消息。但它主要用于本轮状态收口，不是让主 `Agent` 再总结。`SummaryBypass` 会把这条终末工具结果转成最终 `AIMessage`，并结束本轮，防止主 `Agent` 二次加工。

所以更准确的分工是：

| 阶段 | 主 Agent 是否参与 |
| --- | --- |
| 判断用户是不是具体问答 | 参与 |
| 选择产品和取证主题 | 参与 |
| 调用取证 SubAgent | 参与 |
| 阅读 evidence 原文 | 不参与 |
| 解释 evidence 并写答案 | 不参与 |
| 调用 qa_summary | 参与 |
| qa_summary 生成答案后再总结 | 不参与，被 bypass 禁止 |

一句话说，主 `Agent` 负责“该查什么、该问谁”；`context_sub_agent` 负责“把证据取回来”；`qa_summary` 负责“读证据并写给用户”；前端消费的是 `qa_summary` 生成过程中的 SSE token。

## 九、终末工具要被保护

在 `AgenticOne` 里，有些工具只是中间工具，有些工具是终末工具。

中间工具的结果需要主 `Agent` 再解释，比如保费试算、收益演算、部分核保工具。它们返回的是结构化事实，主 `Agent` 需要把这些事实变成用户能理解的话。

终末工具则不同。推荐报告和条款问答这类工具，本身已经生成了用户可见内容。它们可能包含产品卡、对比表、风险提示、证据解释和结构化组件。

如果终末工具成功后再让主 `Agent` 总结一遍，常见问题是：

- Markdown 或 HTML 组件被破坏；
- 产品卡被压缩丢失；
- 证据解释被二次改写；
- 用户看到重复回答。

所以终末工具成功后应该直接成为最终输出。这是对输出层的保护，也是 `OneAgent` 应用到 C 端产品时必须建立的边界。

这和离线生产闭环里的一个经验是同源的：已经通过专门链路生成和校验过的产物，不要再让另一个自由模型随手改写。

## 十、状态模型：不要把所有东西都塞进 messages

`AgenticOne` 的稳定性，很大一部分来自状态拆分。

一个保险咨询会话里至少有这些状态：

| 状态类型 | 作用 |
| --- | --- |
| 对话消息 | 保留用户和系统的多轮交流 |
| 当前问题 | 标记本轮用户真正问的是什么 |
| 用户画像 | 支持必要的人群、年龄、家庭成员、偏好判断 |
| 搜索上下文 | 保存候选产品、产品轻量信息、预算、收益、核保等中间结果 |
| 精选产品 | 保存当前可推荐或可指代的产品编号 |
| 取证材料 | 保存条款、健告、除外责任、公网材料等 evidence |
| 子流程状态 | 标记当前是否在核保、车险等流程中 |
| 历史推荐记录 | 支持“换一批”“第一款多少钱”“和刚才那个比” |

如果这些信息都进入 `messages`，主 `Agent` 很快会变成在一堆 JSON、长条款和历史输出里找针。

更好的方式是把 `state` 当作业务操作系统。不同字段承载不同生命周期的信息：

- 当前轮信息每轮刷新；
- 搜索结果按场景更新；
- evidence 每轮取证后合并；
- 子流程状态跨轮保留；
- 历史推荐清单用于指代解析；
- 对话消息只承担对话记忆，不承担所有中间状态。

这也是 [[LangGraph State 的生命周期]] 里状态持久化价值在业务层的体现。`state` 不只是框架内部的数据结构，而是复杂智能体的“工作台”。

## 十一、Middleware：把隐形纪律写进链路

生产级 `Agent` 不能只靠 prompt 管纪律。很多规则必须进入运行时。

`AgenticOne` 里的中间层大致承担几类工作：

- 每轮开始时刷新当前问题，清理上一轮 evidence，注入必要画像；
- 在主 `Agent` 调用前，把历史推荐清单压缩注入，支持指代和“换一批”；
- 把用户画像注入到合适位置，但限制模型默认滥用画像；
- 拦截取证 `SubAgent` 的长输出，把 evidence 写入 `state`，只给主 `Agent` 留简短清单；
- 在终末工具成功后跳过主模型二次总结，保护最终产物。

这些都是上下文工程的工程化落点。

Prompt 告诉模型“应该怎么做”，middleware 则保证系统“每轮都会这样做”。前者是语义约束，后者是运行时约束。真正的生产系统需要两者一起工作。

## 十二、流式输出也是架构的一部分

`AgenticOne` 的流式输出不是简单地把 LLM token 往前端推。

因为一次请求中可能有：

- 主 `Agent` 的思考和工具调用事件；
- 搜品子图的搜索和筛选事件；
- 取证 `SubAgent` 的并发事件；
- 推荐报告工具的最终内容；
- 问答工具的最终内容；
- 裸 LLM 调用的 token；
- 可观测性记录和工具卡片。

如果按事件到达顺序展示，前端会看到多个 `SubAgent` 的输出互相打散。用户理解的业务时序和系统实际事件时序不一致。

这些事件也不是业务代码手动一个个 `yield` 出来的。它们主要来自 LangGraph / LangChain 的运行时事件系统：

```text
Agent / Tool / LLM 每执行一步
  -> LangChain 自动发标准事件
  -> 最外层 agent.astream_events(...) 统一监听
  -> producer 收集、分组、排序
  -> consumer 翻译成前端 SSE
```

运行时会自动产生一组标准事件，例如：

| 事件 | 含义 |
| --- | --- |
| `on_chain_start` | 某个 graph node / agent 开始 |
| `on_chain_end` | 某个 graph node / agent 结束 |
| `on_chat_model_start` | LLM 调用开始 |
| `on_chat_model_stream` | LLM token 流 |
| `on_chat_model_end` | LLM 调用结束 |
| `on_tool_start` | 工具开始 |
| `on_tool_end` | 工具结束 |

所以主 `Agent`、搜品子图、搜索工具、筛选 `SubAgent`、取证 `SubAgent`、`qa_summary` 内部 LLM、`render_report` 内部 LLM，都会在同一棵运行树里冒出事件。

系统不会消费所有事件，而是通过 include / exclude 规则只监听产品侧关心的节点和工具。每个事件还会携带 `metadata`、`name`、`run_id`、`parent_ids`、`checkpoint_ns` 等信息。`producer` 会先根据 `metadata` 里的 `lc_agent_name` 判断事件属于哪个 `Agent` 或工具；如果没有明确标记，再落到默认主 `Agent` 或默认工具 `Agent`。

`qa_summary`、`render_report` 这种“工具内部直接调裸 LLM”的场景尤其需要显式标记。它们内部的 LLM 调用会带上专门的 `lc_agent_name`，这样 consumer 才能知道这些 token 应该进入最终回答区，而不是普通思考区。

所以流式层要做生产者和消费者分离：

```text
Producer
  读取 Agent 事件
  按 checkpoint / 子图命名空间分组
  写入事件队列

Consumer
  按业务顺序消费队列
  聚合取证事件
  展示搜索、筛选、取证、最终回答
```

入口层只创建一个 producer 和一个 consumer，它们共享同一个事件派发状态。这个共享状态里最重要的是按 checkpoint 组织的事件队列：

```text
EventDispatchState
  checkpoint_event_queues
  checkpoint_index
  checkpoint_lock
```

`producer` 负责监听最外层 `agent.astream_events(...)`，把原始运行时事件写入这些队列。`consumer` 负责顺序读取队列，把事件翻译成前端能消费的 SSE。

关键在于分组。

LangGraph 事件是并发、嵌套、交错的。`producer` 不会直接转发，而是按 `checkpoint_ns` 分组，再用 `run_id` 和 `parent_ids` 判断一个事件属于哪个队列：

```text
同一个队列：
  本事件 run_id 等于队列首事件 run_id
  或 队列首事件 run_id 出现在本事件 parent_ids 中

没有匹配队列：
  创建新的 EventQueue
  追加到 checkpoint_event_queues
```

这一步的本质，是把“内部执行树”压成“业务段落队列”。

`context_sub_agent` 是一个特殊场景。它可能并发查多个产品材料，如果直接展示，前端会看到多条材料读取事件互相穿插。所以 producer 会对取证事件单独聚合：第一个取证 `SubAgent` 开始时打开聚合，多个取证结束事件进入同一个聚合区，遇到非取证事件时再 flush 成一个合成队列。用户最终看到的是一张“正在查材料”的取证卡，而不是多个并发 `Agent` 的杂乱事件。

`consumer` 则按 `checkpoint_event_queues` 的顺序消费。一个队列什么时候结束，取决于它首事件对应的关闭事件：

```text
on_chain_start      -> on_chain_end
on_chat_model_start -> on_chat_model_end
```

因此 consumer 的职责不是“谁先到就先发”，而是“按业务队列顺序发”。这也是产品体验的关键：前端看到的是搜索、筛选、取证、最终回答这样的业务时序，而不是运行时事件到达顺序。

最后，不管是工具卡、产品卡还是最终回答，都会被包装成统一的 SSE token：

```text
event_kind
event_name
lc_agent_name
module_code
event_data.chunk.content
```

其中 `module_code` 决定前端把内容放在哪个区域。例如思考 / 工具区和最终回答区应该分开，否则用户会把中间过程误认为最终结论。

整条管线可以概括为：

```text
所有内部运行事件
  -> agent.astream_events
  -> produce_events
  -> checkpoint_event_queues
  -> consume_events
  -> process_event
  -> create_sse_token
  -> SSE response
  -> 前端
```

这和 [[LangGraph Platform 可恢复流协议深度解析]] 里讨论的可恢复流属于同一类问题：`Agent` 的执行流和用户看到的产品流不是一回事。产品侧需要一层协议把内部事件翻译成用户可理解的时序。

## 十三、典型链路

### 推荐链路

```text
用户提出保险需求
  -> 入口标准化请求并恢复 session
  -> Orchestrator 判断没有活跃子流程
  -> 主 Agent 识别为推荐诉求
  -> 搜品子图召回和精选候选
  -> 主 Agent 调推荐报告工具
  -> 终末工具直出
  -> SSE 按业务时序展示
```

### 条款问答链路

```text
用户追问某产品责任 / 健告 / 除外责任
  -> 主 Agent 定位产品
  -> 取证 SubAgent 读取材料
  -> ContextBypass 聚合原文片段
  -> ContextEvidenceCapture 写入 evidence
  -> qa_summary 读取 evidence 并流式生成 Markdown
  -> SummaryBypass 终末工具直出
```

### 保费试算链路

```text
用户问“第一款一年多少钱”
  -> 主 Agent 从历史候选定位产品
  -> 保费工具计算
  -> 主 Agent 解释金额、假设和可调项
```

保费试算不是终末工具。它返回事实，仍需要主 `Agent` 面向用户表达。

### 核保链路

```text
用户提出带病投保问题
  -> 主 Agent 判断需要核保
  -> 可先结合搜品做粗筛
  -> 进入核保子流程
  -> 子流程逐轮问准
  -> 完成后把核保结论交回主线
```

核保的关键不在一次回答，而在跨轮状态。它必须记住同一被保人的已确认健康点位，这正是子流程状态存在的原因。

## 十四、和离线生产闭环的关系

离线生产闭环和 `AgenticOne` 都是 `OneAgent` 的应用，但它们解决的问题不同。

离线生产闭环面向内容交付质量：

```text
Host Agent
  -> Research Agent 生成
  -> Verify Agent 校验
  -> Host 按 fix_hint 精准修正
  -> 通过后入库
```

它关心的是：

- 产物是否正确；
- 是否能被程序和 LLM 共同校验；
- 高频错误能否回灌 prompt；
- 用户是否只看到通过校验的结果。

`AgenticOne` 面向实时咨询编排：

```text
主 Agent
  -> 搜品 / 取证 / 公网搜索 SubAgent
  -> 核保 / 车险子流程
  -> 推荐报告 / 问答 / 试算工具
  -> SSE 实时输出
```

它关心的是：

- 本轮该走主线还是子流程；
- 当前问题该调用哪个能力；
- 中间材料如何不污染主上下文；
- 用户如何看到稳定、连续、可理解的输出。

两者的共同底座是 `OneAgent`：

- 都有主 `Agent` 和 `SubAgent` 的嵌套；
- 都依赖 `state` 或文件系统保存中间产物；
- 都把长上下文从主模型窗口中卸载出去；
- 都区分中间能力和终末产物；
- 都需要运行时纪律，而不只是 prompt 纪律。

区别只在业务目标：一个把 `AI` 产物变成可刷库的内容，一个把多种保险能力编排成在线咨询。

## 十五、可迁移的方法论

`AgenticOne` 的价值不在于“保险场景里用了多少 Agent”，而在于它给复杂业务智能体提供了几条可迁移原则。

第一，把主 `Agent` 做薄。主 `Agent` 负责判断下一步，不负责实现每个领域能力。

第二，把多轮流程从普通问答中拆出去。核保、车险这类任务有明确状态机特征，不应该靠 prompt 记忆硬撑。

第三，把长证据放进 `state`，不要放进主上下文。主 `Agent` 只需要知道证据已经准备好，回答工具再按需读取。

第四，区分中间工具和终末工具。中间工具返回事实，主 `Agent` 负责解释；终末工具已经生成用户可见产物，就应该直接输出。

第五，流式输出要按业务时序重排。多 `Agent` 系统的事件到达顺序不等于用户理解顺序。

第六，`SubAgent` 不是为了组织结构好看，而是为了隔离上下文、压缩主链路、保护专业能力边界。

## 结语

`AgenticOne` 可以被看作一个很典型的 `OneAgent` 应用案例。

它没有发明一套脱离 `OneAgent` 的新范式，而是把 `OneAgent` 的思想落到了保险快查的实时咨询链路里：基于基础 `Agent` 派生业务 `Agent`，允许主 `Agent` 调度同类或异构 `SubAgent`，用 `state` 管住长上下文和跨轮状态，用子流程承载业务状态机，用终末工具保护最终输出，用 SSE 队列把内部事件翻译成用户可理解的时序。

从这个角度看，`AgenticOne` 的重点不是“用了 Agent”，而是把保险咨询中的不确定性拆成了几个可以治理的层次：

- 意图不确定，交给主 `Agent`；
- 搜品不确定，交给搜品子图；
- 条款不确定，交给取证和问答工具；
- 多轮流程不确定，交给子流程；
- 长上下文不确定，交给 `state`；
- 输出时序不确定，交给流式队列。

每一层只解决自己那一段不确定性。复杂系统不是靠一个更大的 prompt 稳定下来，而是靠边界、状态、工具、子流程和输出协议共同稳定下来。

## Related

- [[如何快速创建领域Agent - OneAgent + MCPs 范式]]
- [[从Claude Code到 OneAgent：如何做好上下文工程]]
- [[如何打造可靠的Agent系统]]
- [[LangGraph State 的生命周期]]
- [[LangGraph Agent Event 消费指南]]
- [[LangGraph Platform 可恢复流协议深度解析]]
- [[从RAG到DeepResearch：复杂业务报告生成的上下文工程]]
- [[Harness Engineering - C 端 AIGC 实时生成系统]]
