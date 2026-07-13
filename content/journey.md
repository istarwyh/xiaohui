---
title: 晓灰的成长时间线
created: 2026-05-14T01:35:48+08:00
modified: 2026-07-13
published: 2026-05-14T01:35:48+08:00
description: 从求学、工程实践到 AI Agent 的成长过程、思考脉络与经验地图。
tags:
  - about
  - journey
  - growth
---

如果说作品集回答的是「我做成过什么」，这条时间线更想回答的是：**我为什么会成为今天的晓灰，以及我在每个阶段如何升级自己的判断力。**

我长期关注三类问题：

- 如何把复杂系统做可靠
- 如何把 AI Agent 真正落到业务里
- 如何在高速变化里持续学习、表达和创造

## git log --since=earlier

### 更早 · 求学期：把好奇心变成长期能力

北大阶段给我留下最重要的东西，不是某个具体知识点，而是三种训练：

- 对问题保持追问，而不是只接受标准答案
- 在不确定中建立自己的判断框架
- 用写作整理知识，用项目验证想法

这些习惯后来延续到了我的技术博客、开源项目和 Agent 实践里。

代表记录：

- [[自我管理]]
- [[自适应学习]]
- [[Information-Handler]]
- [[Frequently-Used-Prompt]]

### 2021 · 校招启程：从学生到工程师

2021 年北大毕业后，我校招加入阿里，从真实业务系统开始理解工程：代码不是写完就结束，而是要在复杂链路、多人协作和长期演进中持续工作。

这一阶段我开始形成对「高质量开发」的底层偏好：测试、可维护性、边界感，以及对业务问题的建模能力。

关键经历：

- 参与淘宝淘工厂补货计划链路重建
- 开发雅思写作助手 WritingHelper，累计 15000+ 下载
- 开始系统整理 Java、测试、数据库与工程实践经验

代表文章：

- [[Unit Level Test Theory、Tool、Discussion]]
- [[JUnit5 & Mockito]]
- [[补货计划链路]]

### 2022 · 业务系统重建：理解复杂系统的真实约束

这一年我更深入地参与业务系统建设，开始理解大型系统里真正困难的部分：不是单点技术，而是需求变化、数据一致性、链路稳定性、业务语义和协作成本交织在一起。

我逐渐意识到，工程师的核心能力不是「会用很多工具」，而是能在复杂约束下给出可靠方案。

沉淀方向：

- Java 后端工程
- 单元测试与 TDD
- 分布式系统问题
- 数据库与资源建模

代表文章：

- [[Distributed System Problems]]
- [[How-to-Choose-the-Suitable-Database]]
- [[Optimize Kinds of Resource Use]]

### 2023 · 全栈与业财：把系统能力放到业务深处

2023 年，我参与淘宝淘工厂钱账票一体化以及业财一体相关建设。这个阶段让我意识到，越接近业务本质，越需要把技术抽象和业务语义放在一起思考。

工程能力不只是「把需求实现出来」，还包括：

- 看懂资金、账务、票据背后的业务闭环
- 识别系统边界和长期演进风险
- 在多角色协作中保证方案可落地

代表文章：

- [[假如你五行属商家，如何和淘天做生意？]]
- [[Practices-for-Processing-l0-Billion-Bill-data]]
- [[Possible Problems with Sharding and Partitioning]]

### 2024 · 从工程到 AI Agent：用 AI 重新理解软件

2024 年，我从传统业务系统逐渐转向 AI Agent 落地，先后负责淘宝客服知识库与问答、蚂蚁保风控 AI Agent 驱动的案件分析工作。

这一阶段最大的变化是：我开始把 Agent 看成一种新的软件架构范式，而不是一个更聪明的聊天入口。

关键经历：

- 负责淘宝淘工厂客服知识库和问答相关工作
- 负责蚂蚁保风控 AI Agent 驱动的案件分析工作
- 开始系统思考 Agent 的上下文、工具调用、可靠性和评估问题

代表文章：

- [[Case Analysis AI Agent]]
- [[痛定思痛，AI Agent 给我的教训]]
- [[从指令到意图：AI Agent 架构范式演进史]]

### 2025 · Agent 深水区：从 demo 到可靠系统

2025 年，我更深入地进入 Agent 工程化阶段，开始关注 MCP、上下文工程、Agent Runtime、工具生态和可持续交付。

关键经历：

- 2025 年 1 月 21 日，因给 `AgentUniverse` 开源项目提交 [#202 PR](https://github.com/agentuniverse-ai/agentUniverse/pull/202)，获得蚂蚁开源轻训营-最佳贡献奖。这是我从使用 `Agent` 框架走向参与 `Agent` 开源生态的一次早期证明。相关记录：[[Case Analysis AI Agent]]、[[如何快速创建领域Agent - OneAgent + MCPs 范式]]
- 负责蚂蚁保保险科技 MCP 相关工作
- 开发 MCPAdvisor，获得 2025 OceanBase AI 黑客松二等奖
- 带队获得 2025 蚂蚁集团黑客松三等奖
- 获得首届阿里&蚂蚁 ATA 个人 Agent 最佳实践奖
- 获得 2025 蚂蚁集团年度优秀创作者
- 2025 年 8 月 28 日，在阿里集团奇点学堂分享 `AI Coding` 工具与实战案例，主打 `Claude Code` 最佳实践。[AI Speeds](https://aispeeds.me) 最早也是为了分享 `Claude Code` 最佳实践而诞生。相关记录：[[【万字长文】 最强 AI Coding：Claude Code 最佳实践]]
- 2025 年 12 月 23 日，面向钱塘征信同事分享 C 端 `AIGC` 实践、`Agent` 上下文工程与应用架构。这次分享把真实业务里的 `Agent` 实践进一步沉淀成可迁移的方法论。相关记录：[[Harness Engineering - C 端 AIGC 实时生成系统]]、[[从Claude Code到 OneAgent：如何做好上下文工程]]

代表文章：

- [[如何快速创建领域Agent - OneAgent + MCPs 范式]]
- [[【万字长文】 最强 AI Coding：Claude Code 最佳实践]]
- [[从Claude Code到 OneAgent：如何做好上下文工程]]
- [[如何打造可靠的Agent系统]]
- [[Agent Teams 的原理与实践]]

### 2026 · 百万 MAU Agent 应用：把 Agent 放进真实流量

2026 年，我继续在蚂蚁保推进 Agent 应用落地，作为百万 MAU 产品「保险快查」的 Agent 应用负责人，更关注 AI 能力在真实用户、真实业务和真实稳定性约束下的表现。

这个阶段我最关心的问题变成：

- Agent 如何从「可用」走向「可信」
- 上下文工程如何服务长期业务演进
- MCP 和工具生态如何降低领域 Agent 的创建成本
- AI 产品如何在体验、效率和风控之间取得平衡

关键经历：

- 2026 年 6 月，高考日，我回望从淘宝来到蚂蚁的两年：从 Java 转向 `Agent`，从使用框架到参与开源生态，从黑客松项目到 `Claude Code` / `Harness Engineering` 分享，也从确定性更强的工程题走进没有标准答案的 `AI` 考场。相关记录：[[另一间考场]]
- 2026 年 3 月，我围绕 `Claude Code` 工作提效连续做了几场内部分享：先面向财富与保险事业群 HR 团队分享 `Claude Code` 提效案例，随后面向蚂蚁保产品团队分享 `Claude Code` 进阶课程，并受奕安对接邀请，面向蚂蚁保 `BI` 团队分享 `Claude Code` 入门与进阶课程。这让我把自己在 `AI Coding`、上下文工程和 `Claude Code` 使用中的经验，进一步沉淀成面向 HR、产品与 `BI` 同学的超级个体方法论。相关记录：[[【万字长文】 最强 AI Coding：Claude Code 最佳实践]]、[AI Speeds](https://aispeeds.me)
- 2026 年 3–6 月，`Harness Engineering` 从项目实践走向连续技术传播：受聪安、行见、Kris、经香、心令对接或邀请，先后面向阿里国际 Accio 团队、蚂蚁集团平台体验技术部智能工程技术团队、阿里集团 ATH 事业群心流团队分享 `Harness` 提效与工程化实践；4 月在蚂蚁集团“技术夜校”做 `Harness` 开放麦专场，分享 1 小时并回答问题半个多小时；6 月 11 日将于高德大群直播分享。这让我意识到，`Harness Engineering` 不只是保险场景里的项目经验，而是一套可以迁移到更多智能工程团队的工作方法。相关记录：[[如何放心 100% AI 交付需求(3) -- 为 AI 打造可持续迭代的环境]]
- 2026 年，保险产品解读与评测系统从单一生成链路演进为“确定性主链路 + 可组合独立 Agent”：报告生成、内部增量补充、外部认知对齐、质量校验、评分和产品评测被拆成可治理的生产能力。这让我对 `Harness Engineering` 的理解从“让 AI 自举”推进到“让 AI 产物进入可交付的业务系统”。相关记录：[[保险产品解读报告系统：Multi-Agent 生产链路与评测闭环]]
- 2026 年 6 月 25 日，在 CCF TF 第 179 期“智能体加速金融创新”中分享保险快查 `Agent Native` 实践。我把保险快查里的离线认知资本、`OneAgent`、`Agentic Search` 和事件流经验，放到金融智能体落地的公共语境里。CCF 公众号后来在[《智能体加速金融创新 | TF技术前线179期回顾》](https://mp.weixin.qq.com/s/hrxFK6xPFgREx4mUOX7msg)里做了回顾。相关记录：[[构建 Agent Native Product：保险快查离线与在线实践演讲稿]]
- 受周建华邀约，在平安健康险团队进行首次外部技术分享（`Harness Engineering`），两小时分享反响热烈。这是我第一次在公司外扩大技术影响，帮助外部团队解决 `AI` 工程与 `AI` 转型问题。相关记录：[[Harness Engineering - C 端 AIGC 实时生成系统]]
- 重新审视价值投资的"长期持有"教条：认识到策略有效性依赖于宏观环境——单边向上时持有不动是最优解，经济承压时机械持有可能是糟糕策略。从机械执行投资理念，升级为根据宏观环境判断策略适配性。相关记录：[[Invest Consider]]、[[AI 周期、滞胀与四层仓位框架]]

当前标签：

- 蚂蚁 P7 · Agent 专家
- 百万 MAU「保险快查」Agent 应用负责人
- 财保 ACE「AI 先锋」获得者
- 财保技术部「AI 年度之星」

持续写作：

- [[如何让 AI Agent 实时个性化可视交互]]
- [[如何放心 100% AI 交付需求(2) -- Loop 与 Agent Loop]]
- [[NARE (Nexus Agent Runtime Enviroment)]]

## domains --depth

| 领域 | 深度 | 经验说明 | 代表内容 |
| --- | --- | --- | --- |
| AI Agent / MCP | █████████░ | 从客服问答、案件分析到百万 MAU 保险快查 Agent 应用 | [[如何快速创建领域Agent - OneAgent + MCPs 范式]] |
| 上下文工程 | ████████░░ | 关注 Agent 记忆、工具、任务状态、压缩与可观察性 | [[从Claude Code到 OneAgent：如何做好上下文工程]] |
| Java / 全栈工程 | █████████░ | 从后端业务系统到 React 全栈与工程质量实践 | [[Unit Level Test Theory、Tool、Discussion]] |
| 分布式系统 | ███████░░░ | 复杂链路、数据一致性、资源建模与系统稳定性 | [[Distributed System Problems]] |
| 数据库 / 数据系统 | ███████░░░ | MySQL、Redis、Hologres、TDDL、TableStore、HavenAsk 等工程经验 | [[How-to-Choose-the-Suitable-Database]] |
| 写作与知识管理 | ████████░░ | 用长期写作沉淀经验、迭代认知、建立个人知识库 | [[Farming in the cyber world]] |

## 我现在相信的几件事

1. **长期主义不是慢，而是愿意积累复利。** 文章、项目、代码和经验都会在未来某个时刻互相连接。
2. **工程师真正的壁垒是判断力。** 技术栈会变化，但识别问题本质、权衡方案、推动落地的能力会迁移。
3. **Agent 不是 prompt 工程的延长线，而是软件工程的新分支。** 它需要架构、评估、工具、上下文、产品体验和业务理解共同支撑。
4. **写作是我的第二套编译系统。** 代码把想法编译成系统，写作把经验编译成可复用的认知。

## next

接下来我会继续围绕这些问题写作：

- 真实业务里的 Agent 可靠性
- MCP 与领域 Agent 创建范式
- 上下文工程与长期记忆
- AI 产品的体验、风控和组织落地

如果你想了解我做过什么，可以看 [[Farming in the cyber world]]；如果你想了解我如何成长，这一页就是入口。
