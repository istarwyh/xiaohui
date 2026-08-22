---
title: Agent Checkpoint 与 Trajectory 的分层存储
created: 2026-08-22T00:00:00+08:00
modified: 2026-08-22T00:00:00+08:00
published: 2026-08-22T00:00:00+08:00
description: 从长程 Agent 的大状态问题出发，区分 Checkpoint、Trajectory、Artifact 与 WAL，并给出 PostgreSQL、OpenTelemetry 和 OSS/S3 的分层存储方案。
tags:
  - AI Agent
  - LangGraph
  - Checkpoint
  - Trajectory
  - OpenTelemetry
  - Object Storage
aliases:
  - Agent 状态与轨迹存储
  - Agent Checkpoint 分层存储
---

一个搜索节点抓回了 `5 MB` 网页正文。正文进入工具结果，又被追加到 `messages`。图再走几步，`PostgreSQL` 里的 `checkpoint_blobs` 和 `checkpoint_writes` 很快长出一排相似的大字段；追踪系统还保存了一份完整的模型输入和工具输出。

最顺手的答案是把大内容放进 `OSS/S3`，数据库只存元数据。

方向没有错，边界却不能只由字节数决定。`checkpoint` 里的数据要在进程崩溃后把图重新扶起来，`trajectory` 里的数据主要回答这次运行经过了哪些节点、调用了什么工具、慢在哪里。两者都可能出现大字段，丢失后的代价完全不同。

## `Checkpoint` 不是 `Trajectory`

| 对象 | 保存的内容 | 使用时机 | 丢失后的结果 |
| --- | --- | --- | --- |
| `Checkpoint` | 图状态、版本、下一步任务、`pending writes` | 中断、重启、回滚 | `Agent` 无法从原位置恢复 |
| `Trajectory` | 模型与工具调用、节点路径、耗时、错误、输入输出引用 | 调试、评测、审计 | 观测不完整，通常不影响恢复 |
| `Artifact` | 网页、文件、图片、报告、完整工具结果 | 节点读取、用户下载、事后检查 | 引用失效，相关任务可能无法继续 |
| `WAL` | 某个存储系统提交前的追加记录 | 崩溃恢复、可靠转发 | 取决于它保护的是数据库还是轨迹管道 |

`WAL` 描述的是持久化手段，不是一种新的 `Agent` 数据。数据库用 `WAL` 修复数据库，轨迹采集器也可以用本地 `WAL` 防止遥测数据在发送前丢失。后者并不会自动拥有恢复图状态所需的 `channel_versions`、调度任务和 `reducer` 结果。

只有当系统刻意把每次状态变更、调度决定和非确定性结果都建模成可重放事件时，轨迹才能重建运行状态。那已经是一套 `Event Sourcing Agent Runtime`，不再是通常所说的可观测性 `trajectory`。

## `Checkpoint` 是恢复热路径

`LangGraph` 的 `PostgresSaver` 会在 `super-step` 边界保存状态，并把节点级 `pending writes` 一起纳入恢复协议。它还把非基础类型按 `channel` 和 `version` 写进 `checkpoint_blobs`；多个 `checkpoint` 可以继续引用没有变化的版本。详细表结构见 [[LangGraph State 的生命周期]]。

它写得频繁，恢复时会被立即读取，元数据和 `blob` 还必须指向同一个有效状态。

`PostgreSQL` 也没有 `DynamoDB` 那样的 `400 KB` 单条硬限制。较大的 `JSONB` 和 `BYTEA` 会由 `TOAST` 自动压缩或移到表外区域，应用仍在一个事务边界内读写。[PostgreSQL TOAST](https://www.postgresql.org/docs/current/storage-toast.html)

官方 `PostgresSaver` 没有默认提供 `PostgreSQL + OSS/S3` 自动卸载。公开集成把 `PostgreSQL` 与 `AWS` 做成两个独立后端；自动 `S3 offload` 出现在受单条大小限制的 `DynamoDBSaver` 中。[LangGraph Checkpointer Integrations](https://docs.langchain.com/oss/python/integrations/checkpointers)、[DynamoDB Checkpointer](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ddb-langgraph-checkpoint.html)

如果把 `checkpoint` 的序列化字段按大小自动挪走，写入会裂成两次：

```text
先写对象，数据库事务失败
  -> OSS 留下无人引用的对象

先提交数据库，再上传对象
  -> checkpoint 已可见，payload 却不存在
```

补上这条裂缝需要内容哈希、幂等上传、暂存状态、孤儿扫描、引用计数和删除补偿。对象存储节省的那部分数据库空间，换成了恢复协议里的第二套生命周期。

## 先让 `Artifact` 离开 `State`

先外置那些已经具备文件语义的内容：网页原文、`PDF`、图片、音频、代码包、完整检索结果、报告中间稿。这些对象往往只由少数节点读取，却会跟着 `messages` 或累积型 `state` 进入后续每个检查点。

节点拿到网页后先写对象存储，`state` 只接收一张小卡片：

```python
class ArtifactRef(TypedDict):
    artifact_id: str
    uri: str
    sha256: str
    content_type: str
    size_bytes: int
    schema_version: int
    required_for_resume: bool


class AgentState(TypedDict):
    messages: list
    source_documents: list[ArtifactRef]
```

对象键使用内容哈希，而不是临时文件名：

```text
oss://agent-artifacts/{tenant_id}/sha256/ab/cd/abcdef...
```

同一份网页被三个节点使用，只上传一次。上传完成并校验 `sha256` 后，节点才把 `ArtifactRef` 返回给图；`PostgresSaver` 随后的事务只需要保存这张引用卡。数据库事务若失败，对象会暂时成为孤儿，后台任务可以延迟清理。反过来的顺序会制造一个已经提交却无法读取的 `checkpoint`，恢复时更难处理。

`required_for_resume` 不能省。值为 `true` 的对象保留期至少覆盖对应 `checkpoint` 的可恢复窗口；值为 `false` 的调试附件可以更早进入低频或删除策略。不能让 `OSS lifecycle` 在数据库仍保存可恢复快照时先删掉对象。

`messages` 变大时也不要条件反射地整体外置。它通常是模型下一轮立刻要读的热数据，放到对象存储只会让每一步多一次下载。先做消息裁剪、摘要、`DeltaChannel` 或拆出不再需要进入上下文的 `Artifact`。

## `Trajectory` 走观测链路

`trajectory` 不参与 `Agent` 恢复，对象存储可以用得更激进。一次运行的结构元数据进入追踪后端，完整内容留在独立对象里：

```text
Agent Runtime
  -> OpenTelemetry SDK / Collector
      -> Trace backend：span、父子关系、耗时、状态、token、payload_ref
      -> Metric backend：延迟、错误率、成本
  -> OSS/S3：完整 prompt、completion、tool result、检索材料
```

`OpenTelemetry` 的 `Trace` 适合表达一次 `Run` 中的调用树，`Log/Event` 适合记录瞬时状态变化，`Metric` 只保留聚合结果。它的 `Log Data Model` 已经提供 `Timestamp`、`TraceId`、`SpanId`、`EventName`、`Body` 和 `Attributes`，不必再发明一套无法与现有观测系统互通的日志信封。[OpenTelemetry Log Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)

一条工具调用可以只留下这些字段：

```json
{
  "trace_id": "4bf92f...",
  "span_id": "00f067...",
  "event_name": "agent.tool.completed",
  "attributes": {
    "gen_ai.operation.name": "execute_tool",
    "gen_ai.tool.name": "web_search",
    "agent.run.id": "run_01...",
    "agent.node.name": "search_products"
  },
  "body": {
    "payload_ref": {
      "uri": "oss://agent-artifacts/tenant_01/sha256/ab/cd/abcdef...",
      "sha256": "abcdef...",
      "size_bytes": 5242880
    }
  }
}
```

当前 `OpenTelemetry GenAI Semantic Conventions` 已经覆盖模型推理、`invoke_agent`、`invoke_workflow`、`plan` 和 `execute_tool`，但 `Agent` 相关约定仍处于 `Development`。[OpenTelemetry GenAI Agent Spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

内部事件保留自己的稳定字段，例如 `agent.run.id`、`agent.checkpoint.id` 和 `trajectory.schema_version`，再通过适配器映射到特定版本的 `gen_ai.*`。标准变化时只改导出层，历史数据不跟着搬家。

完整 `prompt`、模型输出和工具参数默认也不该进入 `Span attributes`。它们体积大，还可能包含用户信息。`OpenTelemetry` 对生产环境的建议同样是把内容放到外部存储，在 `Span` 上记录引用。[OpenTelemetry GenAI Content Capture](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md#capturing-instructions-inputs-and-outputs)

## `Trajectory` 的 `WAL` 只保护采集链路

有些系统会先把轨迹写入本地追加文件、`Kafka` 或数据库 `outbox`，再异步发送给 `OpenTelemetry Collector`。这种 `WAL-based trajectory` 能在进程突然退出后补发尚未送达的事件。

它保护的是观测数据完整性，不接管 `checkpointer`：

```text
Agent Runtime
  ├── PostgresSaver
  │     -> 恢复 State、next tasks、pending writes
  │
  └── trajectory spool / outbox
        -> OTLP Collector -> Trace backend / OSS archive
```

普通业务可以接受少量轨迹丢失，直接使用 `OpenTelemetry` 的批量与重试机制。审计、计费或训练数据要求一条不漏时，再增加持久化 `spool/outbox`。即便轨迹完整，恢复仍从 `checkpoint` 开始；不会把几百个 `Span` 倒回 Runtime，尝试拼出图状态。

## 元数据表只保存可查询的部分

系统自己管理对象引用时，可以增加两张与框架表解耦的元数据表。`agent_artifacts` 只描述对象本体：

```sql
CREATE TABLE agent_artifacts (
  artifact_id          UUID NOT NULL,
  tenant_id            TEXT NOT NULL,
  sha256               TEXT NOT NULL,
  uri                  TEXT NOT NULL,
  content_type         TEXT NOT NULL,
  size_bytes           BIGINT NOT NULL,
  schema_version       INTEGER NOT NULL,
  status               TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, artifact_id),
  UNIQUE (tenant_id, sha256)
);
```

`agent_artifact_refs` 记录引用者和这条引用的保留期。同一 `artifact_id` 可以同时服务于恢复快照、运行轨迹和用户产物：

```sql
CREATE TABLE agent_artifact_refs (
  tenant_id            TEXT NOT NULL,
  artifact_id          UUID NOT NULL,
  owner_type           TEXT NOT NULL,
  owner_id             TEXT NOT NULL,
  required_for_resume  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, owner_type, owner_id, artifact_id),
  FOREIGN KEY (tenant_id, artifact_id)
    REFERENCES agent_artifacts(tenant_id, artifact_id)
);
```

`owner_type` 可以取 `checkpoint`、`trajectory` 或 `business_output`：

| 引用来源     | 元数据位置                          | 大内容位置 | 删除条件                         |
| ------------ | ----------------------------------- | ---------- | -------------------------------- |
| `Checkpoint` | `PostgresSaver` + `ArtifactRef`     | `OSS/S3`   | 所有可恢复快照都不再引用         |
| `Trajectory` | `OpenTelemetry` 后端或 `ClickHouse` | `OSS/S3`   | 轨迹保留期结束且无审计要求       |
| 用户产物     | 业务数据库                          | `OSS/S3`   | 按产品生命周期或用户删除请求处理 |

对象删除采用延迟的 `mark-and-sweep`。先在元数据中标记不可达，经过一个安全窗口后再删对象；上传完成却没有任何引用的哈希对象，也由同一轮扫描回收。直接在删除某个 `checkpoint` 时同步删除文件，很容易误伤仍被其他版本或轨迹引用的内容。

## 什么时候先不要分层

如果单次状态只有几十到几百 `KB`，运行量不大，数据库也没有明显的 `TOAST` 膨胀、备份压力或读取延迟，直接使用官方 `PostgresSaver` 更省事。轨迹量不大时，完整内容也可以暂时进入受控的观测后端。

等监控、备份任务或账单里出现这些信号，再拆也不迟：

- 单个工具结果稳定达到 `MB` 级，且后续节点很少读取；
- 相同网页、文件或模型上下文在多个 `checkpoint` 中反复出现；
- 数据库备份、复制或清理时间被大字段拖长；
- 轨迹后端因完整输入输出出现成本、容量或权限问题；
- `checkpoint` 与轨迹需要不同的保留期和访问权限。

那个 `5 MB` 网页最终只需要在 `OSS` 里出现一次。`checkpoint` 保存 `ArtifactRef`，恢复时按需读取；`trajectory span` 保存耗时、模型、工具、`token` 和同一个引用；前端事件只说搜索完成。进程重启后，图从 `checkpoint` 继续，不重放轨迹。

## Related

- [[LangGraph State 的生命周期]]
- [[LangGraph Agent Event 消费指南]]
- [[LangGraph Platform 可恢复流协议深度解析]]
- [[相比层出不穷的 Agent 框架，不变的 Agent Protocol 是什么]]
- [[从Claude Code到 OneAgent：如何做好上下文工程]]
