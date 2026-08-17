---
title: 从 Harbor Hub 到 Agent 能力认证市场
created: 2026-08-17T00:00:00+08:00
modified: 2026-08-17T00:00:00+08:00
published: 2026-08-17T00:00:00+08:00
description: Harbor Hub 已经有了评测资产注册表的雏形。再向前一步，它或许会生长出连接 CI/CD、可信评测与 Agent 能力交易的 EvalOps 平台。
tags:
  - AI Agent
  - Harbor
  - Agent EvalOps
  - Evaluation
  - 商业模式
  - 评测市场
aliases:
  - Agent EvalOps 平台
  - Agent 能力认证市场
---

当一个 `Agent` 改完代码，我们很容易画出这条箭头：

```text
Agent v1 -> Harbor Job -> 分析失败 -> Agent v2 -> Harbor Job
```

真正落地时，`v1` 和 `v2` 之间塞着一整条工程链。代码要提交，`CI` 要构建镜像，部署平台要启动 `Preview`，测试通过后，`CD` 还要把同一个镜像推进生产。`Harbor` 可以在中间跑评测，却不知道仓库里刚刚多了哪个 `commit`，也不会自动拿到它构建出的 `image digest`。

这个缺口比一个内部工具更有意思。当 `Task`、`Dataset`、`Evaluator`、`Job` 和 `Agent Image` 都有稳定身份后，平台交付的就不只是一个分数，而是一份可以被采购、上线和事后追责的能力证明。

## `Harbor Hub` 已经露出了市场的轮廓

截至 2026 年 8 月，[`Harbor Hub`](https://hub.harborframework.com/) 已经展示社区公开的 `Dataset` 和其中的 `Task`，也提供排行榜入口。

`Harbor` 的官方文档已经把一批评测资产变成了可发布的对象：

| 资产 | 当前能力 | 还缺什么 |
| --- | --- | --- |
| `Task` | 公开或私有发布，注册版本和 `digest` | 作者授权、质量信誉与付费使用 |
| `Dataset` | 组合带版本的 `Task`，可携带自定义聚合指标 | 隐藏测试、泄题检测与持续更新 |
| `Job / Trial` | 边运行边上传，按用户或组织共享，也可公开 | 与代码、镜像、部署和发布记录绑定 |
| `Leaderboard` | 展示试验数、错误、成本、`reward` 和模型等结果 | 结果审核、反作弊与可转移性证明 |

`Task` 和 `Dataset` 可以通过 [`Harbor Registry` 公开或私有发布](https://www.harborframework.com/docs/datasets/publishing)；每个数据集还可以携带 [`metric.py`](https://www.harborframework.com/docs/datasets/metrics)，自定义任务级 `reward` 如何聚合成整体指标。[`Job` 也能在运行时上传](https://www.harborframework.com/docs/sharing/jobs)，并在之后下载完整试验或单个 `Trial`。

这些东西放在一起，已经很像一个评测资产注册表。但资产能被上传和共享，还不等于市场成立。市场要回答三个问题。谁交付了什么，谁愿意为它付钱，结果出错后又由谁负责。

## `Harbor` 之上还缺一个 `EvalOps Control Plane`

一家公司可以用现有 `GitHub Actions`、`GitLab CI`、`Jenkins` 或 `Argo Workflows` 拼出第一版流水线。当参与的仓库、`Agent`、评测集和部署环境变多，每个团队都会重复写同一批胶水代码。

```text
Git commit
  -> CI build
  -> Agent image digest
  -> Preview deployment
  -> Harbor Job
  -> evaluation policy gate
  -> promote the same digest / reject
```

这条链路里有三个已经很成熟的平面。

| 平面 | 负责的对象 | 常见基础设施 |
| --- | --- | --- |
| `Artifact Plane` | 代码、依赖、镜像与 `digest` | `CI` 和镜像仓库 |
| `Evaluation Plane` | `Task`、`Dataset`、`Trial`、轨迹与 `reward` | `Harbor` 和 `Harbor Hub` |
| `Release Plane` | `Preview`、`Canary`、生产、回滚 | `CD` 与部署平台 |

缺失的 `Control Plane` 不再发明一套评分器或容器平台。它接收 `commit` 和 `image digest`，等待 `Preview` 通过健康检查，把 `Dataset` 与 `Evaluator` 的确切版本传给 `Harbor`，再把评测结果写回 `PR Check` 或发布单。

```text
candidate_id
agent_commit
agent_image_digest
preview_deployment_id
dataset_digest
environment_digest
evaluator_digest
metric_policy_version
harbor_job_id
release_decision
production_deployment_id
```

对 `Agent` 来说，发布不应该由“这个 `Job` 跑完了”触发。一个 `nop Agent` 也能让 `Harbor` 正常退出，只是 `reward` 为零。`Policy gate` 还要检查失败样本、工具异常率、错误引用、成本、延迟和严重指标翻转。通过后，`CD` 推进的必须是刚被评测的同一个 `digest`。

## 从评测资产市场到能力认证市场

第一层生意是交易评测资产。一个懂保险条款的团队可以出售带专家 `GT` 的隐藏 `Dataset`；一个善于校验引用的团队可以提供 `Evaluator`；计算平台承接隔离运行和费用结算。`Agent` 团队不必从零整理每个垂直领域的试题与评分规则。

这层生意会遇到一个很现实的限制。企业不会为“我有 500 道题”长期付钱。它愿意付钱，通常是因为这次评测可以支持一个决定：阻止有问题的版本上线，选择供应商，或证明某个 `Agent` 有资格进入业务系统。

所以更深的交易标的应该是一份“`Agent` 在某类任务上达到什么水平”的可验证证书。

```text
Agent vendor 提交不可变 image digest
  -> 平台在受控环境中加载隐藏 Dataset
  -> 通过已认证 Evaluator 运行 Harbor Job
  -> 审核异常、泄题和 reward hacking
  -> 签发绑定版本的 Capability Certificate
```

证书不该只印一个 81 分。它至少要绑定：

```text
certificate_id
agent_image_digest
agent_config_digest
dataset_digest
environment_digest
evaluator_digest
metric_policy_version
harbor_job_id
issued_at
expires_at
```

这些字段让买家知道自己采购的是哪个版本的能力。供应商更新模型、`prompt`、工具或运行环境后，旧证书不会自动继承。

## 尺子也要持证上岗

能力证书最难的部分不是跑完 `Job`，而是证明评测器值得信任。如果一个 `LLM Judge` 喜欢更长的答案，或者同一份报告重复评测时忽高忽低，它签发的证书只是一张价格昂贵的随机数。

在 [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]] 中，我用 `ESF`、`SCE` 和 `RCR` 检查评测器是否复现专家判分、总分是否偏离，以及重复评测是否稳定。这些指标在这个市场里不再只是研发参数，它们决定一个 `Evaluator` 有没有资格参与认证。

评测器的认证同样需要版本和有效期。只要专家 `GT`、评分 `prompt`、基础模型或指标计算方式发生变化，它就应该重新做元评测。一个没有通过元评测的新 `Evaluator`，不能用来证明新 `Agent` 比旧版更好。

## 谁会在这个市场里付钱

| 参与者 | 他交付的东西 | 他愿意付钱或分成的原因 |
| --- | --- | --- |
| `Agent` 开发者 | 不可变镜像和运行接口 | 获得上线资格、排行榜成绩和客户信任 |
| 企业采购方 | 任务和风险要求 | 减少选型试错、事故和人工验收成本 |
| `Dataset` 作者 | 领域样本、隐藏 `GT` 和对抗题 | 按调用、认证或订阅获得收入 |
| `Evaluator` 提供者 | 结构化评分与元评测记录 | 按评测量或领域认证分成 |
| 计算与环境提供者 | 隔离执行、网络策略、`GPU` 和日志 | 按 `Trial`、时长或资源用量结算 |
| 平台 | 身份绑定、调度、审计、门禁和结算 | 席位费、平台费、认证费或交易抽成 |

最早愿意付钱的不会是一个抽象的“`Agent` 市场”。更可能是一家有明确上线门槛的企业：保险报告不允许错引条款，客服 `Agent` 不能改变退费政策，代码 `Agent` 不能让安全测试退步。平台先替它们决定“这个版本能不能上线”，再慢慢获得替行业决定“这个 `Agent` 值不值得买”的资格。

## 这个想法最容易死在哪里

分数一旦开始影响合同和发布，所有参与者都会学会针对分数优化。这不是一个边缘风险，而是市场成立后必然出现的行为。

- 隐藏测试集如果泄露，能力证书会退化成背题证明。
- `Dataset` 太窄，排行榜分数不能迁移到客户的真实任务。
- `Evaluator` 由单一模型支撑，模型升级后尺子会悄悄改变。
- `Agent` 需要访问外部网页和业务接口，完全可复现与真实性之间会冲突。
- 私有 `GT` 和 `Agent Image` 都是商业机密，平台需要可验证的隔离、权限和销毁记录。
- 一次高分不能承担无限责任，证书必须写清任务边界、时间、版本和失效条件。

平台如果只有一个更漂亮的排行榜，这些问题一个也不会消失。它要经营的是证据链，包括版本、运行环境、轨迹、评测器资格和例外审核。

## 先做发布门禁，再做公开市场

第一版不需要交易和抽成。它只需要把一家公司内部已经断开的工具接起来：

```text
GitHub App / CI integration
  -> 捕获 PR、commit 和 image digest
  -> 等待 Preview 健康
  -> 选择已锁定版本的 Harbor Dataset
  -> 运行 Job 并上传证据
  -> 执行 eval policy
  -> 写回 PR Check
  -> 推进或拒绝同一个 image digest
```

这个内部 `EvalOps` 产品能否站住，可以用几个很实在的数字检查：拦下了多少个回归版本，一次完整验收节省了多少人工，失败样本进入下一轮优化需要多久，以及评测通过后是否真的发布了同一个 `digest`。

内部门禁稳定后，再允许组织分享私有 `Dataset`、`Evaluator` 和 `Job`；等隐藏测试、元评测、受信执行和申诉机制都被实际客户磨过，再签发公开的能力证书。

我现在不确定这个产品最后会叫 `Agent EvalOps`、评测交易所，还是能力认证平台。第一个应该存入数据库的也不是名字，而是那串真正被评测过、之后又被发布的 `image digest`。

## Related

- [[用 Harbor 构建稳定的 Agent 评测与进化环境]]
- [[AI 系统如何进化：生成器、评估器、优化器的关系]]
- [[如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测]]
- [[AI 应用公司的利润从哪里来]]
