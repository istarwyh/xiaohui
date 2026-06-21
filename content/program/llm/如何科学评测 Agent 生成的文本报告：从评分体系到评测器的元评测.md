---
title: 如何科学评测 Agent 生成的文本报告：从评分体系到评测器的元评测
created: 2026-06-20T00:00:00+08:00
modified: 2026-06-21T12:11:41+08:00
published: 2026-06-20T00:00:00+08:00
tags:
  - AI Agent
  - LLM Judge
  - Evaluation
  - Agent Report
aliases:
  - Agent 文本报告评测
  - 评测器元评测
---

现在很多团队都在做 `Agent`。

做完以后，大家很快会遇到一个比“怎么生成”更麻烦的问题：

> `Agent` 生成出来的东西，到底好不好？

如果产物是代码，还能跑测试；如果产物是 `SQL`，还能查结果；如果产物是网页，还能看点击率。但如果产物是一份文本报告，比如保险报告、投研报告、风控报告、法务分析、医学摘要、招投标材料，事情就没那么简单了。

很多团队的第一反应是：再找一个 `LLM` 当 `Judge`，给报告打个分。

```text
报告 -> LLM Judge -> 85 分
```

这个做法能跑起来，但不能长期用。

因为你很快会发现三个问题：

1. 85 分到底哪里好、哪里差，不清楚。
2. `Judge` 今天 85，明天 78，结果不稳定。
3. `Judge` 可能只是学会了“猜分”，没有学会专家为什么扣分。

所以问题要换一种问法：

> 能不能给报告打一个分？

这个问题太浅。生产系统得回答另一个问题：

> 能不能建立一套可解释、可计算、可复现的评测系统？

这篇文章讲一个比较实用的三层方法论：

```text
第一层：评测生成器产物
第二层：评测评测器本身
第三层：用元评测指标反过来提升评测器能力
```

说白了：不但要评 `Agent`，也要评“评测 `Agent`”。

这条路和 `Agent` 评测研究里的趋势是一致的。只看最终答案已经不够了。规划、工具、记忆、轨迹、安全、鲁棒性，都开始进入评测视野。[^agent-eval-survey]

## 一、问题：文本报告评测不能只靠一个总分

`Agent` 评测容易被讲玄。

什么规划能力、工具调用能力、记忆能力、反思能力，听起来都很重要。但在生产环境里，业务方通常不关心这些中间概念。业务方只关心一件事：

> 你生成出来的报告能不能用？

比如一份保险产品分析报告，通常要回答：

- 数值是不是准确？
- 引用有没有来源？
- 描述是否忠实于素材？
- 关键信息有没有覆盖？
- 内容有没有深度？
- 专业指标有没有用到？
- 前后逻辑是否一致？
- 是否符合不同险种的条件逻辑？
- 可读性是否足够？
- 有没有合规红线？

这类文本报告有几个共同特点：

```text
产物长
结构复杂
包含大量事实和数字
依赖原始素材
有领域规则
有合规约束
```

所以它不适合只用一个整体分数来评。一个总分只能告诉你“好像不太行”，说不清：

> 到底是哪一类能力不行？

![把报告质量拆到 checkpoint 层级](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260621-agent-report-eval-interior-01-checkpoint.png)

## 二、报告评分体系：从 Dimension 到 Checkpoint

我更推荐把报告评测拆成三层：

```text
Dimension -> Item -> Checkpoint
维度 -> 评分项 -> 检查点
```

举个例子。

```text
D1 基础信息质量
  └── I1 数值准确
        ├── 等待期
        ├── 犹豫期
        ├── 投保年龄
        ├── 保额
        ├── 轻症保额
        ├── 疾病种类
        └── 偿付能力指标
```

每个 `checkpoint` 给一个简单分：

| 分值 | 含义 |
| --- | --- |
| `1.0` | 通过 |
| `0.5` | 部分通过 |
| `0.0` | 不通过 |
| `N/A` | 不适用 |

然后逐层聚合：

```text
checkpoint 分
    ↓
item 分
    ↓
dimension 分
    ↓
裸分
    ↓
合规乘数
    ↓
最终分
```

这个结构有几个好处。

第一，它能解释分数。你拿到的不再只是一句“这份报告 82 分”，还会有更细的拆解：

```text
数值准确：0.85
原因：7 个数值准确，3 个偿付能力指标有标注但无法验证
```

第二，它能定位问题。你知道该修等待期、保额，还是修引用溯源。

第三，它能自动计算。只要输出结构化结果，就可以批量统计、回归测试、版本对比。

这就是文本报告评测的第一条原则：

> 不要直接评总分，要评 `checkpoint`。

这个思想并不新。机器翻译评测里的 `MQM` / `WMT` 人工评测路线，早就在做显式错误标注、严重度加权和分数聚合。[^mqm] 复杂业务报告只是换了错误类型：数字错、引用缺失、事实幻觉、合规风险、逻辑矛盾、关键信息遗漏。

## 三、结构化评测器：把 LLM Judge 变成测量仪器

很多人做评测器，会让 `LLM` 输出一段点评：

> 这份报告整体较好，但部分信息引用不够充分，建议加强说明。

这种话没有工程价值。

能进生产的评测器，应该输出结构化结果。

```json
{
  "checkpoint_id": "waiting_period",
  "checkpoint_name": "等待期",
  "score": 1.0,
  "status": "pass",
  "evidence": "90天",
  "source": "条款原文",
  "reason_code": "exact_match"
}
```

对于一个文本报告评测器，最小单元应该包含：

| 字段 | 含义 |
| --- | --- |
| `checkpoint_id` | 检查点 ID |
| `score` | 评分 |
| `status` | 通过状态 |
| `evidence` | 报告中的证据 |
| `source` | 素材来源 |
| `reason_code` | 判分原因 |

这一步非常关键。

评测器一旦结构化，它就从“点评器”升级成了“测量仪器”。

点评器只能看。测量仪器可以校准、回归、监控、优化。

![结构化评测器像一台可校准的测量仪器](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260621-agent-report-eval-interior-02-structured-evaluator.png)

`G-Eval` 用 `CoT` 和表单化评分提升 `LLM` 评价和人类评价的一致性，`Prometheus 2` 走的是专门训练评测模型、支持自定义 `rubric` 的路线。[^g-eval] [^prometheus] 它们都指向同一个工程结论：`LLM Judge` 可以用，但要关进评分表、证据要求和输出格式里。

### 为什么不能让 LLM Judge 自由发挥

`LLM Judge` 当然有价值。

但不要把它当神。

`LLM Judge` 适合做：

```text
语义判断
模糊质量判断
开放文本比较
证据解释
```

但在生产系统里，`LLM Judge` 必须被约束在结构化框架里。

也就是说，不要让它自由发挥：

```text
请评价这份报告，给一个分数。
```

而应该让它按 `schema` 输出：

```text
请逐个 checkpoint 判断：
score 是 1.0 / 0.5 / 0.0 / N/A
status 是 pass / partial / fail / not_applicable
reason_code 必须从枚举里选择
evidence 必须来自报告
source 必须来自素材
```

这就是工程和 `Demo` 的区别。

`Demo` 追求“看起来聪明”。工程追求“出了问题能定位”。

`Claw-Eval` 对自主 `Agent` 的评测也给了类似启发：只看最终输出不够，执行轨迹、审计日志、环境快照、细粒度 `rubric item`、安全和鲁棒性都要进入证据链。[^claw-eval] 文本报告评测虽然不一定需要完整动作轨迹，但至少要保留“报告证据 -> 原始素材 -> 判分理由”这条链路。

## 四、元评测：评估评测器本身靠不靠谱

当我们有了评测器以后，新的问题来了：

> 这个评测器自己靠谱吗？

这就是元评测。

![用专家评分结果校验评测器评分结果](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260621-agent-report-eval-interior-03-expert-alignment.png)

普通评测是：

```text
报告 -> 评测器 -> 评分结果
```

元评测是：

```text
专家评分结果
        vs
评测器评分结果
```

它先把报告放到一边，转头追问：

> 评测器有没有学会专家的评测能力？

这件事特别重要。

因为 `LLM Judge` 很容易给你一种错觉：它写得头头是道，就好像它真的懂。但生产系统不能靠“好像”。评测器也必须被测。

`MetaCritique` 这类工作已经把 critique 拆成原子信息单元，再在原子层面计算事实性、完整性和 `F1`。[^metacritique] 这个方向和文本报告评测很像：少看大段评论写得顺不顺，多看每个原子判断有没有跟上专家。

### 三个元评测指标

指标不能太多。指标太多，团队就不知道优化什么。

对于文本报告评测器，我建议保留三个指标：

| 指标 | 全称 | 中文 |
| --- | --- | --- |
| `ESF` | `Expert Scoring Fidelity` | 专家判分复现率 |
| `SCE` | `Score Calibration Error` | 分数校准误差 |
| `REC` | `Repeated Evaluation Consistency` | 重复评测一致率 |

它们分别回答三个问题：

```text
ESF：评测器是否像专家？
SCE：评测器最终分数离专家有多远？
REC：评测器是否稳定地像自己？
```

![ESF、SCE、REC 三个元评测指标](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260621-agent-report-eval-interior-04-metrics.png)

### ESF：专家判分复现率

`ESF` 是主指标。

它不盯总分，盯的是：

> 专家在 `checkpoint` 层面怎么判，评测器有没有跟上。

`ESF` 由两个部分组成。

#### 1. 加权扣分召回率

专家认为应该扣分的 `checkpoint`，评测器有没有也扣分？

```text
加权扣分召回率
=
评测器命中的专家扣分 checkpoint 权重之和
/
专家扣分 checkpoint 权重之和
```

这里的“扣分 `checkpoint`”指：

```text
expert.score < 1.0
```

权重用来表达风险差异。

| 类型 | 权重示例 |
| --- | --- |
| 合规红线 | 10 |
| 核心事实错误 | 5 |
| 引用缺失 | 3 |
| 表达问题 | 1 |

错一个标点，和错一个保额，不能一样算。

#### 2. 正常项通过率

专家认为没问题的 `checkpoint`，评测器有没有乱扣分？

```text
正常项通过率
=
评测器正确放行的专家满分 checkpoint 权重之和
/
专家满分 checkpoint 权重之和
```

也就是：

```text
expert.score = 1.0 且 evaluator.score = 1.0
```

这个指标防止评测器变成“杠精”。

一个评测器如果什么都挑毛病，扣分召回率会很高，但业务上不可用。

#### 3. 合成 ESF

最终用 `F-score` 把两者合起来。

如果更重视不漏问题，用 `F2`：

```text
ESF-F2
=
5 × 扣分召回率 × 正常项通过率
/
(4 × 正常项通过率 + 扣分召回率)
```

如果两者同等重要，用 `F1`：

```text
ESF-F1
=
2 × 扣分召回率 × 正常项通过率
/
(扣分召回率 + 正常项通过率)
```

文本报告，尤其是金融、保险、法务、医疗这类场景，我更建议用 `F2`。因为漏掉严重问题，比多报一个轻微问题更危险。

一句话：

> `ESF` 看的是评测器有没有学会专家在哪里扣分、在哪里放行；猜出一个差不多的总分没有意义。

### SCE：分数校准误差

`SCE` 的公式很简单：

```text
SCE
=
平均 |评测器总分 - 专家总分|
```

比如：

```text
专家：85
评测器：82
误差：3
```

100 份报告平均下来，如果误差是 4.2 分：

```text
SCE = 4.2
```

`SCE` 越低越好。

但是注意，`SCE` 不能作为主指标。因为总分可能被错误抵消。

例如：

```text
专家：A 项扣 10 分，B 项不扣分
评测器：A 项没扣，B 项误扣 10 分
```

最后总分一样，但评测逻辑是错的。

所以：

```text
ESF 是主指标
SCE 是辅助校准指标
```

### REC：重复评测一致率

`REC` 衡量：

> 同一份报告，评测器多次评测是否一致。

这件事非常重要。

一个评测器如果第一次给 82，第二次给 91，第三次又说合规不通过，那就别叫评测系统了，叫随机点评器更准确。

`REC` 可以分三层算。

#### 1. Checkpoint 稳定性

同一 `checkpoint` 多次评分是否一致。

```text
Checkpoint Stability
=
多次评测中 checkpoint 分数一致的比例
```

#### 2. 总分稳定性

同一份报告多次总分的标准差。

```text
Score Std
=
std(score_run_1, score_run_2, ..., score_run_n)
```

#### 3. 合规翻转率

同一份报告多次评测中，合规是否发生通过 / 不通过翻转。

```text
Compliance Flip Rate
=
发生合规判定翻转的样本数
/
重复评测样本数
```

在高风险场景里，合规翻转率必须非常低。如果合规判断会摇摆，这个评测器不能上线。

`REC` 的定位是可信度门槛。评测器可以不完美，但不能不稳定。

近年的 `LLM-as-a-Judge` 可靠性研究也在把 consistency 和 human alignment 分开看：一个评测器既要接近人类专家，也要在等价评测条件下保持稳定。[^llm-judge-survey] [^judge-irt] 所以我会把 `REC` 单独拿出来，不只看和专家分数的相关性。

## 五、优化闭环：用元评测反过来提升评测器

有了指标，只是知道怎么量。要让评测器变强，还需要一个闭环。

最简单的一句话是：

> 用专家 `GT` + 构造样本训练评测器，再用独立验证集上的 `ESF`、`SCE`、`REC` 验证它有没有复现专家判断逻辑、能不能保持稳定。

展开来说，就是下面这条链路。

```text
专家历史评分文本
        ↓
结构化成 Expert JSON
        ↓
构造难例 / 对抗样本
        ↓
评测器输出同构 Evaluator JSON
        ↓
按 checkpoint_id 对齐
        ↓
计算 ESF / SCE / REC
        ↓
分析失败 case
        ↓
改 prompt / rubric / few-shot / 规则 / 模型
        ↓
再次验证
```

![从专家 GT 到评测器优化的闭环](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260621-agent-report-eval-interior-05-loop.png)

关键点有三个。

### 1. 不要拟合测试集，要拟合训练集

很多团队会犯一个低级错误：

> 拿测试集调 `prompt`。

这会让评测器看起来变强，其实只是过拟合。

正确做法是：

| 数据集 | 用途 |
| --- | --- |
| `Train` | 调 `prompt`、`rubric`、`few-shot` |
| `Dev` | 调阈值、权重、输出格式 |
| `Test` | 冻结后只评一次 |
| `Adversarial Test` | 专门测泛化和抗投机 |

### 2. 训练数据不能只有专家 GT，也要有构造样本

专家 `GT` 反映历史分布。构造样本负责暴露边界条件。

比如对文本报告可以构造：

| 样本类型 | 示例 |
| --- | --- |
| 数字篡改 | 50 万 -> 500 万 |
| 来源缺失 | 删除引用 |
| 事实幻觉 | 加入素材中不存在的信息 |
| 逻辑矛盾 | 前文说无等待期，后文说等待期 90 天 |
| 合规风险 | 加入绝对化承诺 |
| 结构缺失 | 删除关键章节 |

这些样本不是拿来耍评测器的。它们的作用是把边界条件打出来，逼评测器暴露有没有真的学到规则。

### 3. 优化目标不能只看总分

评测器优化时，优先级应该是：

```text
先提高 ESF
再降低 SCE
最后把 REC 稳住
```

更具体一点：

| 现象 | 说明 |
| --- | --- |
| `ESF` 低 | `checkpoint` 判断逻辑没学好 |
| `SCE` 高 | 聚合和分数校准有问题 |
| `REC` 低 | 输出不稳定，不能上线 |

这比单纯追求“和专家总分相关性 0.9”更靠谱。

### 一个简单例子：ESF 怎么算

假设某个评分项叫“数值准确”，专家标了 10 个 `checkpoint`：

```text
7 个 1.0
3 个 0.5
```

也就是说：

```text
7 个正常项
3 个扣分项
```

评测器输出：

```text
3 个专家扣分项中，命中 2 个
7 个专家满分项中，正确放行 6 个
```

那么：

```text
扣分召回率 = 2 / 3 = 66.7%
正常项通过率 = 6 / 7 = 85.7%
```

用 `F1` 合成：

```text
ESF ≈ 75.0%
```

这比“评测器给了 0.82 分，专家给了 0.85 分”有用得多。

因为它告诉你：

```text
评测器漏了一个专家扣分点
还误伤了一个专家满分点
```

这才是可以优化的信息。

### 最终方法论

把整套方法压缩成一句话：

> 评测 `Agent` 生成的文本报告，先从 `checkpoint` 开始；评完产物，还要评评测器；看它像不像专家，也看它稳不稳、能不能扛住构造样本。

最终链路是：

```text
生成器 Agent
    ↓
文本报告
    ↓
结构化评测器
    ↓
checkpoint 级评分
    ↓
ESF / SCE / REC 元评测
    ↓
反向优化评测器
    ↓
再反向优化生成器
```

最后你会得到一个非常朴素但有用的结论：

> 只有评测器可靠，生成器优化才可靠。

如果评测器本身不可靠，那么你优化生成器，就是在追一个会漂移的靶子。

所以我越来越觉得，在 `Agent` 系统里，评测已经是核心基础设施。[[从RAG到DeepResearch：复杂业务报告生成的上下文工程]] 解决报告如何生成，[[Harness Engineering - C 端 AIGC 实时生成系统]] 解决生成产物如何进入生产闭环，这篇文章解决另一个问题：当我们说“质量变好了”的时候，这把尺子本身到底靠不靠谱。

## Related

- [[从RAG到DeepResearch：复杂业务报告生成的上下文工程]]：复杂业务报告如何从一次性 `RAG` 走向可验证的搜索推理轨迹。
- [[Harness Engineering - C 端 AIGC 实时生成系统]]：把 `Research Agent`、`Verify Agent` 和 `Host Agent` 组合成可生产交付的验证闭环。
- [[如何放心 100% AI 交付需求(3) -- 为 AI 打造可持续迭代的环境]]：`Harness Engineering` 如何通过标准化评测和闭环环境让 AI 自主迭代。

## 参考资料

[^agent-eval-survey]: Asaf Yehudai et al., [Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416), arXiv, 2025/2026.

[^g-eval]: Yang Liu et al., [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://aclanthology.org/2023.emnlp-main.153/), EMNLP 2023.

[^prometheus]: Seungone Kim et al., [Prometheus 2: An Open Source Language Model Specialized in Evaluating Other Language Models](https://aclanthology.org/2024.emnlp-main.248/), EMNLP 2024.

[^metacritique]: Shichao Sun et al., [The Critique of Critique](https://arxiv.org/abs/2401.04518), Findings of ACL 2024.

[^mqm]: Markus Freitag et al., [Experts, Errors, and Context: A Large-Scale Study of Human Evaluation for Machine Translation](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00437/108866/Experts-Errors-and-Context-A-Large-Scale-Study-of), TACL 2021.

[^llm-judge-survey]: Jiawei Gu et al., [A Survey on LLM-as-a-Judge](https://arxiv.org/abs/2411.15594), arXiv, 2024/2025.

[^judge-irt]: Junhyuk Choi et al., [Diagnosing the Reliability of LLM-as-a-Judge via Item Response Theory](https://arxiv.org/abs/2602.00521), ICML 2026.

[^claw-eval]: Bowen Ye et al., [Claw-Eval: Towards Trustworthy Evaluation of Autonomous Agents](https://arxiv.org/abs/2604.06132), arXiv 2026.
