---
title: 用 Harbor 构建稳定的 Agent 评测、晋级与发布环境
created: 2026-08-16T00:00:00+08:00
modified: 2026-08-17T00:00:00+08:00
published: 2026-08-16T00:00:00+08:00
description: 把 Harbor 放进生成器、评测器与优化器的双层评测体系，再由 CI/CD 将不可变 Candidate、评测门禁和生产晋级接成一条可复现的链路。
tags:
  - AI Agent
  - Evaluation
  - Harbor
  - Deep Research
  - LLM Judge
aliases:
  - Harbor Agent 评测
  - Harbor CI/CD
  - Harbor 元评测
  - 用 Harbor 构建稳定的 Agent 评测与进化环境
---

第一次在本地跑 `Harbor`，`jobs` 目录里很快多出了五个文件夹。

其中一个 `Job` 使用 `nop` `Agent`。它什么都没做，`Verifier` 正常执行，最后得到：

```json
{"file_exists": 0, "correctness": 0, "reward": 0}
```

另一个 `Job` 连 `Agent` 都没有开始运行。`Docker` 拉取基础镜像时找不到 `credential helper`，`Trial` 以 `RuntimeError` 结束。

从最终效果看，这两次都“没有完成任务”。从评测角度看，它们完全不是一回事。前者是一个有效的失败样本，后者是实验环境坏了。如果把二者都记成零分，`Agent` 还没来得及退步，统计报表已经先撒了谎。

我开始理解 `Harbor` 的位置。它不负责告诉优化器下一版 `prompt` 应该怎么写，也不替评测器决定什么叫好报告。它先把一次实验的边界固定下来，分清哪里是环境异常，哪里是 `Agent` 行为，哪里是 `Verifier` 给出的评分。

在 [[AI 系统如何进化：生成器、评估器、优化器的关系]] 里，我把一个持续演进的 `AI` 系统拆成了生成器、评测器和优化器。`Harbor` 可以放在三者下面，成为共同使用的实验底座。

```text
生成器产生候选
  -> 提交 candidate commit
  -> CI 构建不可变 artifact
  -> 启动本地实例或部署 Preview
  -> Harbor 在固定环境中运行 candidate
  -> 评测器把结果拆成 checkpoint
  -> Harbor 保存 reward、轨迹、日志和异常
  -> policy gate 决定拒绝还是晋级
  -> 优化器分析失败，产生下一个版本
```

它不能保证系统进步，却能减少一种很常见的错觉：环境、数据和评测器都变了，我们却把分数上涨归功于 `Agent`。

## `Task`、`Trial` 和 `Job` 固定了什么

`Harbor` 里的 `Task` 不是一句孤立的题目。一个可运行的 `Task` 通常同时包含指令、环境、评分脚本以及完成任务所需的资源。

```text
deep-research-dataset/
  product-001/
    instruction.md
    task.toml
    environment/
      Dockerfile
      materials/
    tests/
      test.sh
```

放到保险 `DeepResearch` 场景中，一个 `Task` 可以对应一个冻结的产品样本：输入是 `prodNo`、条款、投保须知、健康告知、责任免除、销售页和其他产品材料，要求 `Agent` 最终写出 `report.md`。评分阶段再检查报告和搜索轨迹。

`Trial` 是某个 `Agent` 对一个 `Task` 的一次实际执行。它会留下 `Agent` 配置、环境准备时间、执行时间、产物、`Verifier` 输出和异常。若 `Agent adapter` 支持 `ATIF`，还会写出 `agent/trajectory.json`；轨迹不是所有适配器天然都有的副产品。

`Job` 则是一批实验。它把一组 `Task`、一个或多个 `Agent`、模型参数、并发数和重复次数放在一起运行。一个包含 100 个产品样本的评测集，在同一个 `Agent` 配置下运行一次，通常就是一个 `Job`，下面产生至少 100 个 `Trial`。如果每个样本重复五次，就会产生 500 个 `Trial`。

```text
Dataset：固定的题目集合
Job：某个 Agent 版本在这套题上的一次实验批次
Trial：Agent 对其中一道题的一次执行
Verifier：对单次执行留下的产物和轨迹评分
```

对应的运行命令可以保持得很薄：

```bash
uvx harbor run \
  -p ./deep-research-dataset \
  -a my_agents.deep_research:DeepResearchAgent \
  -k 5 \
  --job-name deep-research-v18
```

这条命令不能把代码改动变成 `Agent v18`。它只能运行一个已经可调用的 `Agent`。`Harbor` 的 `Task Environment` 是考场，负责材料、工具、隔离和 `Verifier`；`DeepResearchAgent` 的应用运行时仍然需要由本地进程、容器或部署平台启动。两者不要混成同一个 `Docker` 镜像。

## `Agent v2` 先要成为一个 Candidate

`Agent v1 → Agent v2` 之间至少藏着一次构建和启动。对于可以在本地直接执行的 `Agent`，开发者可以在当前分支启动进程，再让 `Harbor adapter` 调它；这适合少量 `Dev Task` 的快速验证。可用于比较的 `Job` 仍应记录确切 commit、依赖锁和配置版本。

保险 `DeepResearchAgent` 这类有 `LangGraph`、工具服务、缓存和业务依赖的应用，更适合先变成一个独立 Candidate：

```text
commit abc123
  -> CI build
  -> registry/deep-research@sha256:bbb
  -> Preview namespace / Preview URL
  -> health check
  -> Harbor Job
```

这里的 `sha256:bbb` 才是可发布的 `Agent` 身份，不是一个“当前分支最新代码”的口头描述。`Preview` 应有独立的服务地址和状态命名空间，避免 `v17` 的缓存、`LangGraph checkpoint` 或历史文件影响 `v18`。`Harbor adapter` 接收 `Preview URL` 和 image digest，代表某个 `Task` 去调用 `Candidate`：

```bash
uvx harbor run \
  -p ./deep-research-dataset \
  -a company.harbor_agents:DeepResearchAdapter \
  --ak base_url=https://deep-research-abc123.preview.internal \
  --ak agent_image_digest=sha256:bbb \
  --job-name deep-research-abc123
```

如果 `Agent` 本身是 `CLI` 或单容器任务，adapter 也可以直接拉起 `Candidate image`；如果 `Agent` 是在线服务，`Image` 的部署由 CI/CD 完成，`Harbor` 只访问部署后的地址。`Harbor` 不会自己发现仓库里刚产生了哪个 `Image`，digest 或 `URL` 必须由上层流水线明确传入。

同一份评测集比较 `DeepResearchAgent v17` 和 `v18`，应该产生两个 `Job`。同一个版本重复运行五次以观察方差，可以在一个 `Job` 里增加每个任务的尝试次数。目录里的 `config.json`、`lock.json`、任务校验值和每个 `Trial` 的 `result.json`，共同构成这次实验的账本。

`Harbor` 对这个账本很较真。我们修改了网络配置后重用旧 `Job` 名称，它没有覆盖原结果，而是因为 `lock.json` 与新配置不一致而拒绝继续。这个行为有点麻烦，但麻烦得对。一个名字相同、实验条件却偷偷变化的目录，不该继续参与版本比较。

## 把保险 `DeepResearch` 放进 `Task`

保险产品解读系统接收一个 `prodNo`，下载 15 类产品素材，再让 `Host Agent` 搜索、阅读、比较并写出 `report.md`。生产链路还会经过内部增量补充、外部认知对齐和质量校验。完整过程记录在 [[保险产品解读报告系统：Multi-Agent 生产链路与评测闭环]]。

要用 `Harbor` 稳定评测这条链路，不能只把最终报告复制进一个评分 `prompt`。一个 `Task` 至少要冻结四类东西。

第一类是输入。产品材料需要形成带版本的快照。否则今天运行时条款是 A，明天运行时销售页更新成 B，两次 `Job` 的分差不再只来自 `Agent`。

第二类是工具。`Material-Scoped` 工具的参数、默认搜索范围、返回格式和失败语义都要随 `Task` 或 `Agent` 版本记录。`Agent` 是否会越界搜索、是否会在语义检索失败后回退到 `grep`，取决于这层契约。

第三类是执行轨迹。`DeepResearch` 的价值不只是最后多写了一份长报告。它应该形成一条可检查的研究路线：先提出问题，搜索支持材料，再搜索限制和反证，记录没有找到的证据，最后收窄结论。接入 `Harbor` 的自定义 `Agent adapter` 需要把这些动作写成 `ATIF` 轨迹，让评测器直接检查 `agent/trajectory.json`，不必从最终文本反猜过程。

### `ATIF` 不必只能在线监听 `Events`

已经运行过的 `LangGraph` 不必因为当时没有监听 `Events` 就失去轨迹。可以离线读取 `Checkpointer`，把历史 `StateSnapshot` 转成 `ATIF`，再写入 `trajectory.json`。这能让已有的报告、搜索和工具调用先进入 Harbor，历史数据不必等到审计系统重做以后才开始评测。

前提是要分清两类记录：`Checkpointer` 保存的是状态快照，`Events` 保存的是执行事件。离线转换能恢复多少，取决于 `AgentState` 写进了多少执行细节。

如果 `OneAgent` 的 `State` 保存完整 `messages`，通常可以恢复：

- `HumanMessage` 对应 `ATIF User Step`；
- `AIMessage` 对应 `ATIF Agent Step`，其中的 `tool_calls` 对应 `ToolCall`；
- `ToolMessage.tool_call_id` 对应工具 `Observation`；
- 最终回答、`Graph` 节点推进、`checkpoint` 时间和 `thread` 信息；
- 已写入 `usage_metadata` 的 `token` 数据。

离线导出链路如下：

```text
LangGraph Checkpointer
  -> get_state_history / aget_state_history
  -> StateSnapshot 序列
  -> 每次新增的 messages / writes
  -> HumanMessage、AIMessage、ToolMessage
  -> ATIF Step
  -> trajectory.json
```

最简单的 exporter 会按历史顺序读取 snapshot 的新增 writes：

```python
snapshots = list(graph.get_state_history(config))
snapshots.reverse()

for snapshot in snapshots:
    writes = snapshot.metadata.get("writes", {})

    for node_name, node_output in writes.items():
        messages = node_output.get("messages", [])

        for message in messages:
            convert_message_to_atif_step(message)
```

不要把每个 `snapshot` 的完整 `state["messages"]` 都直接转出。它通常是累计 `State`，同一条消息会被重复写进 `trajectory`。优先读取 `snapshot.metadata.writes`，没有 `writes` 时再计算相邻 `snapshot` 的增量。

`Checkpointer` 仍然有边界。它适合恢复“状态可见的轨迹”，却无法凭空还原没有进入 `State` 的执行过程：工具的开始和结束时间、真实延迟、内部重试、被 `middleware` 吞掉的异常、未完成的模型调用、流式 `token`、`HTTP` 状态、限流，以及 `ToolNode` 在最终写入 `ToolMessage` 前的原始返回。

一个工具节点可能经历：

```text
第一次调用超时
  -> 自动重试
  -> 第二次调用成功
  -> 只把最终 ToolMessage 写入 State
```

离线读取时只能看到“工具成功”。这不是 `exporter` 丢了数据，而是失败从未进入 `Checkpointer`。

| 轨迹来源 | 能恢复的内容 | 合适的用途 |
| --- | --- | --- |
| 仅 Checkpointer 离线转换 | 消息、工具调用、最终结果 | 历史补录、结果评测、基础过程评测 |
| 在线监听 `Events` | 调用、异常、时延、重试和节点内部过程 | 高精度过程评测 |
| Checkpointer + Audit Event | 状态恢复与执行审计 | 生产系统推荐 |

三类 reward 受到的影响也不同。错误引用通常可以离线评测：最终报告、引用列表、搜索结果和原始证据还在，就能检查某条引用是否支持对应 claim。无效搜索可以部分离线评测：标准 `ToolCall` 和 `ToolMessage` 保留查询参数与返回结果时，能检查重复查询、空结果、搜索结果是否被使用、关键子问题是否覆盖；缓存命中和工具内部重试仍然不可见。

工具调用失败最依赖在线 `Events` 或审计记录。如果错误被显式写成：

```json
{
  "status": "error",
  "error_type": "invalid_arguments"
}
```

离线 `exporter` 可以恢复它。失败若在 `ToolNode` 内部被捕获、重试成功且没有写入 `State`，`Checkpointer` 无法倒推出那次失败。

实际落地可以分两步。先把历史 `Postgres Checkpointer` 导出为 `ATIF`，快速接入结果、引用和基础工具轨迹评测；从现在开始，再在工具层增加轻量 `AuditEvent`。`AuditEvent` 至少记录 `tool_call_id`、工具名、参数、状态、错误类型、重试次数和起止时间。

```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    audit_events: list[AuditEvent]
```

审计事件不必永久堆进 `LangGraph State`。高频事件更适合旁路写入独立的 `append-only audit log`，再用 `thread_id`、`run_id` 和 `tool_call_id` 与 `Checkpointer` 对齐。这样历史 `State` 用来重建结果，审计日志用来解释失败、重试和时延；两者在导出阶段合成更完整的 `ATIF`。

第四类是评分。`Verifier` 不只检查 `report.md` 是否存在，还要读取报告、原始材料和轨迹，输出结构化 `checkpoint` 结果。细节可以保存在独立的 `checkpoints.json` 中，最终聚合为数值型 `reward.json`：

```json
{
  "reward": 0.78,
  "fact_fidelity": 0.92,
  "coverage": 0.75,
  "citation_correctness": 0.68,
  "tool_call_success": 0.97,
  "effective_search": 0.61
}
```

`reward` 是主指标，后面几项不能被平均掉。一个 `Agent` 可能通过更少搜索降低成本，却同时漏掉“经保险公司审核同意后方可续保”这类限制条款。总分恰好不变，行为已经变坏了。

工具调用失败、无效搜索和错误引用也在这里进入 `reward`，但进入方式不同。

工具调用失败可以从轨迹中的调用状态确定；无效搜索需要结合查询、返回材料和后续使用情况判断；错误引用需要把报告里的具体 `claim` 与原始证据重新对齐。前者较适合确定性规则，后两者经常需要规则与结构化 `LLM Judge` 配合。无论采用哪种方式，`Verifier` 都应该保留证据、错误码和命中的 `checkpoint_id`，不能只写一句“搜索质量一般”。

## `result.json` 只负责告诉优化器去哪里看

让另一个 `AI` 读取 `result.json`、修改 `Agent`，再发起下一个 `Job`，方向没有错。问题在于 `result.json` 只够做索引，不够做诊断。

优化器需要一份失败包：

```text
Job 汇总
  + 新旧版本逐 Task 的配对差异
  + 退化 Trial 的 result.json
  + agent/trajectory.json
  + Verifier 的 checkpoint 明细和证据
  + 工具日志与环境异常
```

比如 `v17` 在“续保条件”相关任务上连续失分。只看总分，优化器可能粗暴地在 `system prompt` 里加一句“注意续保条件”。看过轨迹以后，问题也许很具体：`Agent` 搜索了“保证续保”，但没有继续搜索“申请续保”“审核同意”“本公司有权”，搜索结果已经出现限制材料，却没有被最终报告引用。

这时可选的修改完全不同：

- 给搜索规划器增加限制性查询模板；
- 在 `Material-Scoped` 工具中提供面向条件词的检索入口；
- 在写作前增加 `claim-evidence` 对齐检查；
- 把这个样本加入回归集，防止下一版再次漏掉。

优化器每轮最好只推动一个主要假设。否则同时换模型、改 `prompt`、调工具和修改 `Verifier`，即使分数上涨，也很难知道是哪一项起作用。

一次失败只有进入下一次任务的输入、工具、样例、测试或默认参数，才形成我所说的进化。如果优化器只是把当前 `report.md` 改对，那仍然是闭环优化。

## 让 Harbor 成为发布门禁

一开始不需要单独造一个“大平台”。现有的 `GitHub Actions`、`GitLab CI`、`Jenkins` 或 `Argo Workflows` 就能成为最小的评测控制面。它传递 `Candidate` 身份、等待 `Preview` 健康、保存 `Job` 结果，并根据评测策略控制后续部署。

```text
pull request / commit
  -> CI build image digest
  -> deploy Preview
  -> smoke test
  -> Harbor Dev Job
  -> Harbor Regression Job
  -> eval policy gate
  -> reject / canary / production
```

`Verifier` 对单个 `Trial` 判分；`policy gate` 读取整批 `Job` 的结果，决定这个 `Candidate` 能否进入下一套部署环境。把这两层分开，报告的单个 checkpoint 和发布红线才不会混在一个 prompt 里。

`Harbor` 的退出码不能单独作为发布依据。前面那个 `nop` `Agent` 的 `Job` 正常结束，进程退出码也是 `0`，只是 reward 为 `0`。这表示“实验执行完毕”，不表示“Candidate 通过”。`CI` 需要再运行一个 policy script，读取 `Job` 汇总、`Trial reward`、异常和 guardrail，并用自己的退出码决定发布是否继续。

例如，一个 Deep Research Candidate 可以要求：

```text
mean_reward 比 baseline 高至少 3%
citation_correctness 不低于 baseline
tool_exception_rate <= 1%
compliance flip rate = 0
P95 latency 增幅 <= 10%
环境异常率 <= 1%
```

这些阈值不是 `Harbor` 内置的“正确答案”，而是团队写进 `eval_policy` 的发布规则。`Harbor` 保存足够细的 `Trial` 证据，policy script 决定哪些指标允许被平均，哪些指标只要翻转一次就要阻断。

`Candidate` 通过后，`CD` 应把刚刚评测过的同一个 image digest 晋级到 `Staging`、`Canary` 或 `Production`：

```text
Harbor evaluated: registry/deep-research@sha256:bbb
Production runs: registry/deep-research@sha256:bbb
```

评测后重新 build 一个“代码应该一样”的镜像，再把新 digest 发到生产，会切断评测和发布之间的证据链。

## 评测器也作为被测对象进入 Harbor

生成器的分数是否可信，取决于评测器本身有没有对齐专家。在 [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]] 里，我用三个指标衡量文本报告评测器：

```text
ESF：评测器是否复现了专家在 checkpoint 层面的扣分和放行
SCE：评测器总分与专家总分相差多少
RCR：同一份报告重复评测时是否稳定
```

这套元评测同样可以变成一组 `Harbor Job`，被评测对象从报告生成器换成了评测器。

```text
生成器评测 Job
  输入：产品材料
  被测对象：DeepResearchAgent
  产物：report.md + trajectory
  Verifier：已经通过元评测的 Evaluator

评测器元评测 Job
  输入：产品材料 + 固定报告
  被测对象：Evaluator Candidate
  产物：Evaluator JSON
  Verifier：将 Evaluator JSON 与隐藏的 Expert GT 对齐
```

第二类 `Job` 中，专家 `GT` 只能在 `Verifier` 阶段使用，不能暴露给被测评测器。每个 `Task` 对应一份固定报告、原始材料和专家 `checkpoint` 标注。`Evaluator Candidate` 输出同构的评分 `JSON`，确定性脚本按 `checkpoint_id` 对齐并计算 `ESF` 与 `SCE`。

`RCR` 需要重复运行。可以让同一评测器对每个 `Task` 运行多次，再从同一 `Task` 的多个 `Trial` 中计算：

```text
Checkpoint Stability
Score Std
Compliance Flip Rate
```

`ESF` 和 `SCE` 可以在单个 `Trial` 内计算；`RCR` 是跨重复 `Trial` 的聚合指标，需要在 `Job` 结束后汇总，或者交给单独的 `reducer`。`Harbor` 管理重复运行、配置和原始产物，元评测脚本负责指标定义。

评测器升级也应有自己的晋级门槛。比如 `Evaluator v8` 只有在独立测试集上满足下面的条件，才能替换 `v7`：

```text
ESF 不低于 v7
SCE 明显下降
Checkpoint Stability >= 0.95
Compliance Flip Rate <= 1%
严重错误的加权召回率不能下降
```

评测器候选版本没有通过元评测时，不能拿它去证明生成器变好了。否则生成器和尺子同时变化，新的高分没有解释力。

## 两条进化链不能在同一次比较里一起动

系统里实际存在两条进化链。

```text
生成器进化
DeepResearchAgent v17
  -> build / Preview v17
  -> 固定 Evaluator v7
  -> Harbor Job
  -> Optimizer
  -> DeepResearchAgent v18
  -> build / Preview v18

评测器进化
Evaluator v7
  -> build / Preview v7
  -> 固定 Expert GT
  -> Harbor Meta-eval Job
  -> Meta Optimizer
  -> Evaluator v8
  -> build / Preview v8
```

当我们比较 `DeepResearchAgent v17` 和 `v18` 时，应该冻结 `Evaluator v7`、数据集版本和运行环境。等 `Evaluator v8` 通过元评测后，可以用它对历史生成结果重新评分，建立一条新的指标基线；不能把 `v7` 给出的旧分数和 `v8` 给出的新分数直接连成趋势线。

反过来也一样。优化评测器时，固定报告和专家 `GT`，不要同时换一批更容易的样本。`ESF / SCE / RCR` 的变化才有含义。

这两条链最后由优化器连接起来。更可靠的评测器会提供更可信的失败信号，生成器优化器再利用这些信号修改搜索、阅读和写作策略。生成器产出的新型失败样本，也会回流到评测器的对抗测试集。但回流要经过版本化和人工确认，不能让线上噪声直接改写尺子。

## 稳定环境不等于把所有东西塞进 Docker

`Docker` 能固定操作系统、依赖和文件布局，却固定不了所有变量。

如果 `Dockerfile` 使用会移动的镜像标签，环境仍可能变化；如果 `Candidate` 应用使用 `latest` 而不是 image digest，评测和发布可能跑到两个不同 `Image`；如果 `Agent` 调用外部模型，服务端模型可能升级；如果 `DeepResearch` 搜索实时网页，搜索结果和页面内容每天都在变化；如果评测器本身使用随机采样，同一报告也可能得到不同判断。

保险 `DeepResearch` 最好保留两套评测集。

一套是离线回归集。产品材料、搜索索引和工具返回都被冻结，用于严格比较 `Agent` 版本。这里应尽量固定 `Task` 环境镜像 `digest`、`Candidate image digest`、依赖锁、模型版本、工具 `schema`、`Evaluator` 版本和数据集校验值。

另一套是在线观察集。它允许访问实时搜索和业务接口，检查 `Agent` 面对真实变化时是否仍能工作。它适合发现新问题和观察生态有效性，不适合把两天之间的零点几分差异解释成算法进步。

两套数据不能混成一个平均数。离线集回答“在相同条件下是否进步”，在线集回答“在当前世界里是否还能用”。

重复运行也不能省。`n_attempts=1` 只能看到一次结果，无法区分真实提升和采样运气。对重要版本，应至少对关键样本重复运行，并报告均值、方差、配对胜负和严重错误翻转。平均 `reward` 上升但合规翻转增加，不应晋级。

## 一条能接上 CI/CD 的晋级流水线

`Agent` 版本晋级可以落到下面十步：

```text
1. 冻结 Dataset、Environment、Evaluator 和 Job Config
2. 优化器读取 baseline Job 的失败包，提出一个主要修改假设
3. 生成 Agent Candidate，提交代码 commit 与配置版本
4. CI 构建不可变 image，并产出 image digest
5. CD 部署 Preview，隔离缓存、数据库 namespace 和 Agent checkpoint
6. 运行 health check 与少量 Dev Task
7. 用 Harbor 运行完整 Regression、隐藏 Test 与 Adversarial Test
8. policy gate 检查主 reward、checkpoint guardrail、成本、延迟和异常率
9. 通过后将同一个 image digest 晋级到 Canary 或 Production
10. 将已晋级的 Candidate 标记为新的 baseline，并保留 Job 和部署记录
```

数据也要分层。`Train` 用于整理经验和调 `prompt`，`Dev` 用于快速验证改动，`Test` 在候选版本冻结后运行，`Adversarial Test` 专门放数字篡改、错误引用、遗漏限制条款和工具故障等难例。优化器不能读取隐藏测试集的具体答案，否则自动迭代很快会退化成自动刷题。

每次晋级至少保留这些身份：

```text
agent_commit
agent_image_digest
agent_config_version
dataset_version
environment_digest
evaluator_version
evaluator_image_digest
model_version
job_id
deployment_id
```

半年后再看到“报告引用正确率从 68% 上升到 81%”，这组字段还能找回曲线两端对应的 `Agent`、Image、题目、评测器、环境、部署和失败轨迹。

`Harbor` 不替优化器产生洞见，也不替专家定义 `GT`。它留下任务校验值、`environment_digest`、`evaluator_version`、每个 `Trial` 的轨迹和评分结果。

下一版 `Agent` 运行时，应该只有 `agent_commit`、`agent_image_digest` 和明确声明的候选配置发生变化。如果数据、环境或评测器也要升级，就建立一条新基线，不把新旧分数硬接在同一条曲线上。

## Related

- [[AI 系统如何进化：生成器、评估器、优化器的关系]]：区分闭环优化、进化和自进化，以及三个角色之间的关系。
- [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]]：用 `checkpoint`、`ESF`、`SCE` 和 `RCR` 校准文本报告评测器。
- [[从RAG到DeepResearch：复杂业务报告生成的上下文工程]]：说明为什么复杂业务报告需要搜索、反证和修正组成的研究轨迹。
- [[保险产品解读报告系统：Multi-Agent 生产链路与评测闭环]]：保险报告生成、增强、质量网关、评分和产品评测的实际生产链路。
