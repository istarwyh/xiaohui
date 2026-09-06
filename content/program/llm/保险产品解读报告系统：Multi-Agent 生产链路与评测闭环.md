---
title: 保险产品解读报告系统：Multi-Agent 生产链路与评测闭环
created: 2026-06-21T00:00:00+08:00
modified: 2026-08-30
published: 2026-06-21
description: 从 HelixVerify 到保险产品解读与评测系统，记录节点内 Agentic Loop、外层 Graph、质量网关、评分 Agent 和产品评测 Agent 如何组成可交付的 Multi-Agent 生产链路。
tags:
  - AI Agent
  - Multi-Agent
  - Harness Engineering
  - Deep Research
  - 保险科技
---

在 [[如何放心 100% AI 交付需求(3) -- 为 AI 打造可持续迭代的环境|HelixVerify]] 里，我们用 114 次迭代把风险样本召回率从 8% 提升到 98.86%，验证了一件事：

> `Harness Engineering` 的核心不是让人更会写代码，而是为 AI 搭闭环，让 AI 自举到可以自主运行。

保险产品解读与评测系统，是这个理念在另一个战场里的继续展开。

HelixVerify 解决的是“如何检测已有页面”。新的问题更难：给系统一个产品编号 `prodNo`，它要自己下载 15 类保险素材，理解条款、投保规则、健康告知、责任免除、特色服务和外部真实世界语义，生成一份专业保险产品解读报告；在交付前还要完成内部增量补充、外部认知对齐和质量校验；之后，评分与产品评测能力又要能围绕已有报告独立运行。

这不是一个“让大模型多读点材料再总结”的问题，而是一个生产系统问题。

我越来越确定，生产级 `Agent` 系统的关键不是“让 Agent 多自由”，而是把自由放在正确的位置：

> 节点内 `Agentic Loop` 负责生成与补充，外层确定性 `Graph` 负责编排与兜底，后置评分和评测 Agent 负责度量与持续演进。

这篇文章是对这套系统的完整吸收，也可以看作 [[Harness Engineering - C 端 AIGC 实时生成系统]]、[[从RAG到DeepResearch：复杂业务报告生成的上下文工程]] 和 [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]] 三条线的汇合。

## 一、系统边界

这个系统的一句话版本是：

> 输入一个 `prodNo`，系统自动完成素材下载、语义理解、报告生成、内部增量补充、外部世界知识对齐、质量校验和 RPC 回调；评分和产品评测作为独立 Agent 能力，可以对已有报告按需运行。

主链路可以抽象成：

```text
host_agent
  -> supplementary_gate
  -> supplementary_execute
  -> world_knowledge_preflight
  -> world_knowledge_execute
  -> verify_gate
  -> verify_execute
  -> callback
  -> cockpit_report
  -> END
```

这里有一个关键变化：`Host Agent` 不再通过 `task` 工具在对话中自由委派所有子任务，而是由外层 `StateGraph` 把生产流程固定下来。

在 [[Harness Engineering - C 端 AIGC 实时生成系统]] 的 DIPG 链路里，`Host Agent` 通过 `task` 工具调度 `Research Agent` 和 `Verify Agent`，再根据 `Verify` 的反馈做局部修正。那是一个很自然的第一阶段：让 `Agentic Loop` 驱动生成、校验和修正。

但保险产品解读报告的流程更像生产流水线。先生成报告，再补内部增量，再补外部认知，最后质量校验和回调。顺序稳定，输入输出清楚，失败策略也清楚。这样的流程不应该交给 LLM 临场判断，而应该沉到 `Graph` 的节点和边里。

所以当前系统的核心设计是：

```text
节点内部：允许 Agent 自主阅读、检索、写作、修订
节点之间：用 Graph 确定顺序、状态契约和失败策略
节点之后：评分、产品评测、世界知识补充都可以独立组合
```

这就是“节点内放开，生产链路收紧”。

## 二、Host Agent：让 AI 成为保险领域研究员

`Host Agent` 是第一版报告的生成者。它不是裸 `LLM wrapper`，而是基于 `OneAgent` 体系派生出来的专业 `DeepResearchAgent`。底层复用 `AgentBlueprint`、工具、中间件、虚拟文件系统和审计能力，只是在 prompt、工具集和任务职责上面向保险报告生产做了领域化配置。

保险条款的困难不在于语言难读，而在于它的限制性信息经常藏在角落里。

比如“保证续保”看起来是一个简单标签，但真正改变结论的可能是“经保险公司审核同意后方可续保”；“赔付比例”看起来是一个数字，但它可能被医保身份、医院范围、免赔额、等待期和责任免除共同修正。

所以这类报告不能靠一次 `RAG` 摘要完成，它需要 [[从RAG到DeepResearch：复杂业务报告生成的上下文工程|Deep Research]]：先理解全貌，再沿着关键指标查证，遇到敏感指标做对抗性检索，最后把证据组织成报告。

### 最小生成契约：不要把领域能力都塞进 Host Prompt

我们一开始考虑过一个叫 `Skill Mesh` 的设计：把条款理解、两核知识、保研观点、利益演算、合规表达、引用溯源等能力做成一组常驻指令，直接放进 `Host Agent` 的 system prompt。

后来我认为这是一个不好的方向，尤其不适合 `DeepResearch` 主任务。

原因是：`DeepResearchAgent` 本来就要在长上下文里持续搜索、阅读、比较和写作。如果再把大量“领域 skill”常驻进去，它们会不可避免污染主任务上下文：

- 本轮不需要的规则也会占用注意力。
- 不同 skill 之间可能互相拉扯，比如“保研观点”倾向评价，“合规表达”倾向收敛。
- Agent 容易被专业话术诱导，在证据不足时写出看似专业但信息密度很低的段落。
- 如果 skill 的真实目的只是接入多方数据源，那把它写进 prompt 就更不对，数据源应该通过工具、`Handoff` SubAgent 或外层 `Graph` 节点进入系统。

所以更合理的边界是：`Host Agent` 只保留最小生成契约。

```text
Host Agent 核心 prompt：
  - 如何阅读产品素材
  - 如何写入 report.md
  - 如何引用和溯源
  - 如何在证据不足时降级
  - 如何避免编造和越界表达

外部能力：
  - 数据源访问交给工具 / MCP / Material-Scoped tools
  - 内部增量交给 Supplementary Agent
  - 外部认知交给 World Knowledge Agent
  - 质量判断交给 Verify / Scoring Agent
  - 产品水位判断交给 Evaluation Agent
```

如果未来要补核保、核赔、精算、合规等专业能力，也不应该先塞进 `Host Agent` 的长 prompt，而应该优先变成可独立运行的 SubAgent 或 `Gate + Execute` 节点。这样既能保留专业上下文，又不会污染主报告生成任务。

### 动态 Prompt：按险种装配阅读方法

不同险种的阅读方法不同。

医疗险要重点看报销范围、医院范围、免赔额、赔付比例、保证续保和院外药械；重疾险要看疾病定义、赔付条件、轻中症分组和责任间关系；储蓄型保险要看现金价值、收益演算和退保风险。

系统支持按 `prodNo` 或险种动态加载专属 prompt。查到产品专属指令时，覆盖或更新通用 prompt；查不到时回退到通用 prompt。

这里真正重要的不是“每个产品维护一份 prompt”。产品太多，不可能也不应该这么维护。真正重要的是沉淀“阅读方法”：

1. 先通过投保页和结构化信息理解产品全貌。
2. 再用 `ls`、正则检索和语义检索定位关键材料。
3. 对敏感指标做多文件比对，比如生效地区、续保条件、责任免除。
4. 只有证据足够时才写结论，证据不足时明确降级。

也就是说，prompt 的核心不是记住每个产品的答案，而是教 Agent 如何读一个陌生保险产品。

## 三、从 Prompt 软约束到工具硬边界

这个项目里最有工程味的一次演进，是素材工具从通用磁盘工具升级为 `Material-Scoped` 工具。

最初的做法是让 `Host Agent` 使用通用工具：

```text
read_disk_file
grep_disk_file
find_disk_files
```

然后在 prompt 里反复强调：

```text
禁止使用 cwd
必须使用素材根目录
不要搜索无关目录
```

实际运行后发现，这类文字约束并不可靠。Agent 会忘记根目录，会把搜索范围放大，会误读无关文件。这不是某个 prompt 没写好，而是 LLM 的固有边界：文字纪律不是硬边界。

于是工具被重写成面向产品素材的能力：

```text
download(prod_no)
  -> ls_materials(prod_no)
  -> grep_material(prod_no, pattern)
  -> read_material(file_path, prod_no)
  -> find_material(prod_no, pattern)
```

变化看起来只是多了一个 `prod_no`，本质上却是边界下沉：

- `grep_material` 自动定位产品素材根目录，Agent 无法搜到别处。
- `find_material` 默认递归，因为素材目录结构固定为两层。
- `grep_material` 默认带上下文行，因为保险条款里单行命中经常没有意义。
- `read_material` 接受完整 `file_path`，但用 `prod_no` 做安全校验，并通过 `realpath` 防路径穿越。

这是一个可以迁移到很多 Agent 系统里的原则：

> 当 prompt 中的约束被 Agent 频繁违反时，不要继续堆文字，要把约束下沉到工具参数、默认值和返回值里。

Prompt 是交通标语，工具才是护栏。

### `Semantic Search-then-Read`

只靠 `grep` 也不够。

保险材料里有大量同义表达。用户想找“赔付金额”，条款里可能写的是“给付保险金”“保险金额”“年度累计限额”。正则对精确数值很强，但对语义召回很弱。

```text
semantic_search_material：先找到可能相关的段落
read_material / grep_material：再精读、定位、核对原文
```

`semantic_search_material` 先用 `prod_no` 限定当前产品的材料，再做向量搜索。`QA Matching` 返回 `Top 5 chunk_id`，唯一的核心指标是 `Anchor Precision@5`。`Agent` 按 `ID` 打开数据后如何查看前后内容、补齐限制条件并形成证据链，归报告生成器评测。

材料主要来自公网保险条款，少部分图片经 `OCR` 转成 `Markdown`。`download_insurance_product_all_materials` 完成后，`MaterialIndexMiddleware` 拦截 `ToolMessage` 并构建索引：

```text
download 完成
  -> Middleware 解析素材清单
  -> 汇总公网保险条款与 OCR Markdown
  -> 固定 2000 字窗口、重叠 200 字、步长 1800 字
  -> Qwen-Embedding-4B 批量处理 Chunk 正文
  -> Redis 缓存向量
  -> 产品内索引写入 Agent state
```

`download` 只负责取得材料，索引构建留在 `MaterialIndexMiddleware`。`QA Matching` 与产品召回的 `QQ Matching` 共用经过保险领域语料微调的 `Qwen-Embedding-4B`；`Embedding` 只输入 `Chunk` 正文，不拼产品名、文件名或章节标题。

`chunk_id` 解决寻址，不负责去掉重叠候选。当时没有深入分析固定滑窗的坏案例，相邻窗口重复、标题语义缺失和 `OCR` 噪声只能列为待验证风险。详细实现与评测边界记录在 [[RAG 工程实践：QQ 产品召回与 QA 文档导航]]。

索引失败不阻塞主链路。`Embedding API` 不可用时，`semantic_search_material` 返回降级提示，`Agent` 回到 `grep` 和原文读取。

## 四、外层 Graph：把增强和校验变成生产流程

第一版报告生成之后，系统还要经过两个增量 Agent 和一个质量网关。

| Agent | 目标 | 信息来源 | 输出方式 |
| --- | --- | --- | --- |
| `CHACHA_LANDING_PAGE_SUPPLEMENTARY_AGENT` | 补内部增量 | 增值服务、产品特色、理赔信息等内部数据 | 在既有 `report.md` 上定向再写 |
| `PRODUCT_WORLD_KNOWLEDGE_AGENT` | 补外部认知 | 产品真实名称、市场表达、用户常见理解 | 只更新目标章节 |
| `Verify Agent` | 交付前把关 | 最终报告和素材状态 | 输出通过、建议或错误码 |

内部增量和外部增量不是一回事。

内部增量通常来自业务接口。它不一定出现在条款素材里，但会影响用户是否理解产品，比如增值服务、理赔服务、产品特色。这类信息需要再写进报告。

外部增量解决的是另一个问题：产品在真实世界中的名字、宣传口径、用户搜索口径和内部结构化名称经常不一致。报告如果只使用内部名称，就会显得不像用户真正认识的那个产品。

### 上下文隔离

把这些能力放到外层 `Graph` 节点里，最大的收益是上下文隔离。

- `Host Agent` 的长对话历史不会污染补充 Agent。
- 补充 Agent 只看到内部增量任务，不需要继承所有生成轨迹。
- 世界知识 Agent 只处理“真实世界认知对齐”章节。
- Verify Agent 在独立上下文中判断报告是否可交付。

这和 [[从Claude Code到 OneAgent：如何做好上下文工程]] 里讲的 `Isolate` 是一件事。长任务不是把所有信息塞进一个窗口，而是让不同阶段拥有自己的上下文边界。

### files：跨 Agent 的虚拟文件系统

这些 Agent 能接力工作，是因为它们共享同一个 `files` 契约。

`files` 不是操作系统目录，而是 `DeepAgent` 的虚拟文件系统。`Host Agent` 写入 `report.md`，后续 Agent 通过 `read_file`、`write_file`、`edit_file` 读取或修改这份报告。

但共享不等于任意合并。世界知识节点尤其需要安全边界：它只允许更新“真实世界认知对齐”目标章节。如果子 Agent 改了其他章节，父图会丢弃这次更新并降级继续主链路。

这和 `Material-Scoped` 工具是同一个思想：

> Prompt 只能提出约束，Graph 节点、VFS 契约和安全合并逻辑才能把约束变成 LLM 无法绕过的硬边界。

## 五、质量网关：不再追求无限重试

Verify 系统经历过三个阶段。

第一阶段是直接回调。`Host Agent` 生成后，middleware 直接把报告透传给下游。问题很明显：质量完全依赖生成 Agent 自觉。

第二阶段是忠实性校验加重试。Verify Node 检查报告中的数值是否和原始素材一致，不通过就把意见反馈给 Host Agent 修正，最多重试 5 次。

这个方案看起来完整，但成本很高。保险术语表达复杂，数值忠实性校验容易误报；每次重试都要重新走一轮 Agent 调用链；更关键的是，真正的质量风险不只是某个数字错了，而是素材是否充分、报告是否降级合理、核心参数是否完整。

第三阶段是当前架构：内容增强前置，质量校验后置，取消重试环路。

```text
生成报告
  -> 内部增量补充
  -> 外部认知对齐
  -> 质量校验
  -> callback
```

这个决策很重要。

与其让 Agent 在昂贵的重试里修修补补，不如把首次生成质量做高，把确定性增强步骤放在质量网关前，把质量网关作为交付底线而不是万能修理厂。

### Gate-Execute 两阶段

`Supplementary`、`World Knowledge` 和 `Verify` 都采用 `Gate / Execute` 思路：

- `Gate` 或 `Preflight`：轻量、确定性检查，不调用 LLM。比如是否已有 `error_code`，是否存在唯一 `report.md`。
- `Execute`：真正运行 Agent，处理不确定性逻辑。

这让路由逻辑可测，Agent 执行逻辑可替换。稳定的规则放在内层，不稳定的模型调用放在边缘。

### ErrorCode 从严

Verify 输出分成两类：

```text
fatal -> error_code="REPORT_QUALITY_POOR"
suggestion -> 只输出 quality_suggestions
```

只有致命问题才触发 `ErrorCode`。非致命问题，比如结构不够漂亮、引用标注不够细，只进入建议，不阻断回调。

原因很现实：`ErrorCode` 会触发下游错误处理、告警或重新生成。如果把所有质量瑕疵都上升为错误，系统会被误拦截淹没。

当前致命问题主要包括：

- 素材严重不足，只能做概念研究。
- `CLAUSE` 等核心条款缺失。
- 核心保险参数大面积不合格。

其中最有价值的一条规则，是识别“笼统描述”。

LLM 在材料不足时很会伪装。它不一定胡编数字，而是写：

```text
由保险单载明
本合同约定的保障责任
按一定比例赔付
```

这些话看起来合规，实际上没有给用户任何有效信息。Verify 必须把它们当成参数缺失，而不是当成正确描述。

### Loop 隔离

系统里还有一个偏底层但很关键的工程点：Verify 等后置 Agent 不和主 `App Loop` 抢事件循环。

OceanBase 的 `aiomysql.Pool` 绑定创建它的事件循环。如果 Verify Agent 的长时间推理跑在 `App Loop` 上，就会阻塞其他 Agent 请求和 DB 操作。

所以系统维护了独立 loop：

| Loop | 绑定资源 | 任务 |
| --- | --- | --- |
| App Loop | OceanBase Pool | 主 Agent 推理和 checkpoint |
| Verify Loop | MemorySaver | Verify 等后置 Agent 推理 |
| Query Loop | OceanBase Query Pool | 历史消息查询 |

Verify Agent 使用 `MemorySaver`，避免跨 loop 使用 DB pool。这个设计看起来像运行时细节，但它决定了生产服务会不会被一个慢校验拖死。

## 六、评分 Agent：从能不能交付到多少分

质量网关回答的是“能不能放行”。但它不能回答：

```text
这份报告是 70 分还是 90 分？
如果要从 70 分提高到 90 分，应该改哪里？
```

这就是 `PRODUCT_REPORT_QUALITY_SCORING_AGENT` 的位置。它已经从主链路中拆出，成为可以围绕已有报告独立运行的能力：通过源 session 恢复 `files`，读取 `report.md` 和相关上下文，再输出结构化评分和改进建议。

评分体系有三个计分维度和一个合规门槛：

| 模块 | 问题 | 机制 |
| --- | --- | --- |
| D1 事实忠实度 | 说得对不对 | 计分 |
| D2 信息完整性 | 说得全不全 | 计分 |
| D3 基础质量 | 读起来顺不顺、一不一致 | 计分 |
| 合规门槛 | 能不能放行 | 通过 / 不通过 |

合规不参与普通加权。一旦合规门槛不通过，最终分数直接折损。因为合规不是“差一点”的问题，而是红线问题。

每个检查点采用三元评分：

| 分值 | 含义 |
| --- | --- |
| 1.0 | 满足 |
| 0.5 | 部分满足 |
| 0.0 | 不满足 |

不用 0 到 10 的连续分，是为了减少主观漂移。对生产系统来说，“满足 / 部分满足 / 不满足”比“7 分还是 8 分”更容易校准。

所有聚合分数由 Python 侧重新计算，不相信 LLM 自己做算术。

更有意思的是信息层级带来的分数天花板：

| 层级 | 信息 | 报告能力 |
| --- | --- | --- |
| L0 | 基础条款 | 保障责任、保额、免赔额等骨架 |
| L1 | 投保须知、健康告知、免责说明 | 投保资格、健康要求和限制 |
| L2 | 核保、核赔、理赔数据 | 实务深度 |
| L3 | 精算指标、金选模型 | 产品洞察 |

如果一个报告只有 L0 和 L1 输入，它不应该因为文笔好就拿到接近满分。缺失的信息层级会在 D2 中自然形成天花板。这让分数反映信息价值，而不是写作技巧。

评分之后，每个低于 1.0 的检查点都会生成改进建议：

| 优先级 | 触发条件 |
| --- | --- |
| V0 | 合规门槛不通过 |
| P0 | 关键检查点为 0.0 |
| P1 | 检查点为 0.5 |
| P2 | 信息层级缺失，需要新增数据源 |

这样评分就不只是一个数字，而是下一轮再写的任务清单。

这条线和 [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]] 是同一个方向：评测不是点评，而是可解释、可计算、可复现的测量系统。

## 七、产品评测 Agent：报告之外，还要评价产品本身

报告评分关心的是“报告写得好不好”。但用户真正关心的是：

> 这个保险产品本身好不好？

所以系统里还有独立的 `PRODUCT_EVALUATION_AGENT`。它同样可以从已有 session 恢复 `files`，读取 `report.md` 和素材，再按险种评测标准生成 `evaluation_report.md`。

产品评测使用四级水位：

| 水位 | 含义 |
| --- | --- |
| 亮点 | 高于行业基线 |
| 达标 | 满足基线 |
| 注意点 | 低于基线但未触发警戒线 |
| 坑点 | 落入警戒线 |

这套体系必须规则驱动，而不是让 LLM 凭感觉评价。每个指标都要引用评测标准中的基线和警戒线；没有基线的指标只做客观描述，不做水位判断。

住院医疗险、门诊险、重疾险、寿险、意外险、储蓄型保险等险种的评测标准不同，所以标准需要动态注入。

产品评测还有三条红线：

1. 唯一信源：只能来自解读报告和原始素材。
2. 无数据不评测：缺失指标必须标注无法评测。
3. 禁止推荐：只能客观呈现适合和不适合的人群，不能做购买建议。

这让产品评测和报告生成、报告评分形成三个不同层次：

```text
报告生成：把材料写成用户能懂的报告
报告评分：判断报告质量好不好
产品评测：判断产品指标处在什么水位
```

它们共享 `files`，但不绑死在同一条主链路里。

## 八、可复用的工程模式

从这个项目里，我觉得至少沉淀了八个可迁移模式。

第一，Host Prompt 最小化。

`Host Agent` 的 prompt 不应该承载所有领域知识和数据源能力。它只需要保留生成契约、引用规则、降级策略和安全边界。专业数据补充、质量判断和产品评测应该通过工具、SubAgent 或外层 `Graph` 节点接入。

第二，Prompt 约束工具化。

当 Agent 频繁违反 prompt 里的路径、范围、格式约束时，不要继续写更长的 prompt，而要改工具。`Material-Scoped` 工具就是例子。

第三，外层 Graph 包裹。

当生产流程稳定时，不要让 LLM 决定拓扑。用 `StateGraph` 固定生成、增强、校验、回调的节点顺序，把不确定性关进节点内部。

第四，Gate-Execute 分离。

前置检查应该是轻量、确定、可测的；LLM 调用应该放在 execute 节点里。这样系统既能灵活迭代，又不至于每个分支都变成 prompt 行为。

第五，Loop 隔离。

长推理任务和 DB 绑定任务不要抢同一个事件循环。尤其在 Python + `aiomysql` 体系里，事件循环归属不是小事。

第六，Typed State Update。

LangGraph 节点不要随手返回裸 `dict`。像 `VerifyUpdate`、`EvaluationUpdate` 这类类型化构造器，可以让 key 拼错和类型不匹配更早暴露。

第七，Middleware 分层。

素材预检、索引构建、审计记录、源 session 文件恢复，都是横切关注点。把它们放进 middleware，比散落在业务工具里更可维护。

第八，虚拟文件系统恢复。

`files` 是跨 Agent 的稳定数据契约。只要可以从源 session 恢复 `report.md` 和上下文产物，评分、评测、世界知识补充就不必强绑定在线生产主链路，而可以成为可组合能力。

## 结语

回到开头那句话：

> 节点内 `Agentic Loop` 负责生成与补充，外层生产链路负责编排与兜底。

这个系统里，每个 Agent 都只解决一个层次的问题：

- `Host Agent` 解决如何生成。
- `Supplementary Agent` 解决如何补内部增量。
- `World Knowledge Agent` 解决如何补外部认知。
- `Verify Agent` 解决如何交付前把关。
- `Scoring Agent` 解决如何度量报告质量。
- `Evaluation Agent` 解决如何评价产品本身。

这比“做一个更强的大 Agent”更朴素，也更接近真实业务系统。

Agent 的终局不是一次回答看起来聪明，而是在真实业务约束下持续交付。要做到这一点，就必须给 AI 搭环境、搭闭环、搭硬边界，让它在可观察、可评测、可恢复的系统里工作。

从 HelixVerify 到保险产品解读与评测系统，我对 `Harness Engineering` 的理解也变得更具体：

> 不是让 AI 替人写完某个东西，而是让 AI 产物进入一条可以持续生产、持续校验、持续度量、持续改进的工程链路。

## Related

- [[Harness Engineering - C 端 AIGC 实时生成系统]]：前一阶段的 C 端 AIGC 离线生成与 Verify 闭环实践。
- [[从RAG到DeepResearch：复杂业务报告生成的上下文工程]]：解释复杂业务报告为什么需要搜索轨迹，而不是一次性检索摘要。
- [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]]：讨论报告评分体系和评测器本身如何被校准。
- [[AgenticOne：OneAgent 范式在保险实时咨询中的应用]]：同一套 `OneAgent` 思想在在线保险咨询链路里的应用。
- [[从Claude Code到 OneAgent：如何做好上下文工程]]：讨论规划、子智能体、虚拟文件系统和 prompt 如何组成生产级 Agent 的上下文工程。
