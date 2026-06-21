---
title: LangGraph Agent Event 消费指南
created: 2026-06-21T00:00:00+08:00
modified: 2026-06-21T00:00:00+08:00
published: 2026-06-21
description: 以 LangGraph 为例，说明生产级 Agent 系统如何消费 astream、stream_mode、astream_events 和 custom 事件，并把运行时事件翻译成稳定的产品事件流。
tags:
  - AI Agent
  - LangGraph
  - AgentEvent
  - Streaming
  - 事件流
---

生产级 `Agent` 系统里的流式输出，不应该被理解成“把 `LLM token` 一边生成一边打印出来”。

`token` 只是最容易被用户感知的那部分。真正复杂的是：一次 `Agent` 执行中，模型、工具、子图、`SubAgent`、状态更新、人工中断、自定义进度和错误都在同时发生。它们共同构成了一条运行时事件流。

如果直接把这条事件流交给前端，用户看到的往往不是“业务正在推进”，而是“系统内部调用栈在乱跳”。

所以，基于 LangGraph 的 `Agent` 系统消费 event 时，真正要解决的不是“怎么拿到事件”，而是：

**如何把运行时事件翻译成用户和产品能理解的任务进展。**

这篇文章只讨论进程内 LangGraph / LangChain 的事件消费。跨网络部署、断线重连和可恢复 SSE，可以看 [[LangGraph Platform 可恢复流协议深度解析]]。更上层的协议抽象，可以看 [[相比层出不穷的 Agent 框架，不变的 Agent Protocol 是什么]]。

## 一、先分清三层流

LangGraph / LangChain 里有几个名字很像的接口：

```text
graph.astream(stream_mode=...)
graph.astream_events(version="v3")
runnable.astream_events(version="v2")
```

它们不是同一层东西。

### 1. `astream` 是输出流

`astream()` 关注的是一个 `Runnable` 或一个 graph 对外产生的流式输出。

在普通 LangChain `Runnable` 里，`astream()` 的默认实现很简单：如果组件没有专门实现 streaming，它会调用 `ainvoke()`，然后只 `yield` 一次最终结果。

到了 LangGraph，`graph.astream(...)` 会多一个关键参数：`stream_mode`。

```python
async for part in graph.astream(
    input,
    stream_mode=["messages", "updates", "custom"],
    version="v2",
):
    ...
```

这时 `astream` 不只是“最终回答的 token 流”，而是 LangGraph 根据 `stream_mode` 整理出来的 graph runtime 输出。

### 2. `stream_mode` 是语义频道

`stream_mode` 可以理解成 LangGraph 给运行时事件开出的几条语义频道：

| `stream_mode` | 含义 | 适合场景 |
| --- | --- | --- |
| `messages` | `LLM token/message chunk` 与 metadata | 聊天 UI 逐 token 输出 |
| `updates` | 每个节点或 task 完成后的 state 增量 | 展示 `Agent` 每一步进展 |
| `values` | 每一步后的完整 state | 调试、状态快照 |
| `custom` | 节点或工具主动写出的自定义事件 | 业务进度、长任务状态 |
| `debug` | 尽可能详细的 graph 调试信息 | 开发排查 |
| `tasks` / `checkpoints` | task 与 checkpoint 相关事件 | 调试、恢复、观测 |

所以 `stream_mode` 不是“原始事件”。它已经是 LangGraph 按场景筛过的一层输出。

```text
原始运行过程
  -> messages：只看模型消息
  -> updates：只看 state 增量
  -> custom：只看业务主动发出的进度
  -> values：只看完整 state 快照
  -> debug：看调试细节
```

产品 UI 大多数时候应该优先消费 `messages`、`updates` 和 `custom`，而不是直接面对全部底层生命周期事件。

### 3. `astream_events(version="v2")` 是生命周期事件流

`astream_events(version="v2")` 来自 LangChain 的 `Runnable` 事件系统。

它返回的不是业务输出，而是标准生命周期事件：

```text
on_chain_start
on_chain_stream
on_chain_end
on_chat_model_start
on_chat_model_stream
on_chat_model_end
on_tool_start
on_tool_end
```

事件里通常会有：

```python
{
    "event": "on_chat_model_stream",
    "name": "ChatOpenAI",
    "run_id": "...",
    "parent_ids": ["..."],
    "tags": [...],
    "metadata": {...},
    "data": {
        "chunk": ...
    },
}
```

这更像一棵执行树的运行日志。它适合调试、追踪、分析调用链，不适合作为长期稳定的产品事件协议。

### 4. `astream_events(version="v3")` 是 typed projections

LangGraph 新的 `event streaming` 则是在 graph streaming 之上再做了一层 projection。

它会把底层事件整理成更好消费的视图：

```text
stream.messages
stream.values
stream.output
stream.subgraphs
stream.interrupts
stream.extensions
```

旧写法里，你可能需要在一个混合流里判断：

```python
async for part in graph.astream(
    input,
    stream_mode=["messages", "updates"],
    version="v2",
):
    if part["type"] == "messages":
        ...
    elif part["type"] == "updates":
        ...
```

新写法更像：

```python
stream = await graph.astream_events(input, version="v3")

async for message in stream.messages:
    ...

final_state = await stream.output
```

它把“消息”“状态”“最终输出”“子图”拆成不同 projection。新项目可以优先评估这层接口，但也要注意版本演进和团队对 v3 API 的接受成本。

## 二、`stream_mode` 和原始事件流是什么关系

可以用一句话区分：

```text
astream_events(version="v2") 是按组件生命周期看执行。
stream_mode 是按应用需要的数据类型看执行。
```

假设一个 graph 里有一个 `model_node` 调用模型，然后把回答写入 state。

底层生命周期事件可能是：

```text
on_chain_start: graph
on_chain_start: model_node
on_chat_model_start
on_chat_model_stream: "你"
on_chat_model_stream: "好"
on_chat_model_end
on_chain_end: model_node
on_chain_end: graph
```

如果消费 `stream_mode="messages"`，你看到的是：

```text
"你"
"好"
```

如果消费 `stream_mode="updates"`，你看到的是：

```python
{
    "model_node": {
        "messages": [AIMessage(content="你好")]
    }
}
```

如果消费 `stream_mode="values"`，你看到的是完整 state：

```python
{
    "messages": [
        HumanMessage(...),
        AIMessage(content="你好"),
    ],
    "other_state_key": ...
}
```

如果消费 `stream_mode="custom"`，你只会看到节点或工具里主动写出的业务事件：

```python
from langgraph.config import get_stream_writer

def search_node(state):
    writer = get_stream_writer()
    writer({"stage": "searching", "message": "开始检索"})
    ...
```

所以，`stream_mode` 可以看作 LangGraph 帮应用开发者从运行时事件里抽出的“可消费频道”。它不是全部真相，但更适合产品系统。

## 三、并行节点下，事件会落到同一条流里

复杂图里多个节点可能在同一个 step 内并行执行。

LangGraph 底层采用类似 `Pregel` / `Bulk Synchronous Parallel` 的执行模型：每一步先选出可以运行的节点，然后并行执行；这些节点写出的 channel update 要到 step 边界才统一应用，下一步才能看到。

但 streaming 事件不必等到整个 step 完成。`messages`、`custom` 这类事件可以在节点执行过程中流出来。

一次 `graph.astream(...)` 会对应一个 graph run 的统一输出流。并行节点产生的事件会被 multiplex 到同一个 async iterator 里：

```text
graph.astream(...)
  -> 创建本次 run 的 stream queue
  -> 并行执行 node_a / node_b / node_c
      -> node_a 产生 token/update/custom
      -> node_b 产生 token/update/custom
      -> node_c 产生 token/update/custom
  -> 都写入同一个 stream sink
  -> 外层 async for 逐个 yield
```

所以你可能看到：

```text
node_a token: "A1"
node_b token: "B1"
node_a token: "A2"
node_c update: {...}
node_b token: "B2"
```

这个顺序是到达顺序，不是业务顺序，也不是节点定义顺序。

因此消费端不能把所有 token 无脑拼成一条文本。必须根据来源字段分流：

```text
node name
namespace / ns
run_id
parent_ids
message_id
tool_call_id
metadata["langgraph_node"]
```

例如：

```python
async for part in graph.astream(
    input,
    stream_mode=["messages", "updates"],
    version="v2",
):
    if part["type"] == "messages":
        token, metadata = part["data"]
        node = metadata.get("langgraph_node")
        # 按 node / message id 分 bucket

    elif part["type"] == "updates":
        # updates 通常天然带 node name
        ...
```

这是做复杂 `Agent` UI 的第一条原则：**全局事件流是交错的，业务展示必须重新分组。**

## 四、子图事件如何进入外层流

LangGraph 支持子图。

如果子图是作为 graph node 被挂进父图，LangGraph 通常会负责 config、callback 和 runtime 上下文传播。

如果消费时打开：

```python
async for chunk in parent_graph.astream(
    input,
    stream_mode=["updates", "custom"],
    subgraphs=True,
):
    ...
```

子图事件会带着 namespace 出现在外层流中。namespace 可以理解成事件来源路径：

```text
("parent_node:<task_id>", "child_node:<task_id>")
```

这能让消费端知道：这个事件不是父图直接产生的，而是某个子图、某个子节点产生的。

### 手动调用子图时要注意 context 边界

有一种常见写法是在父节点里手动调用子图：

```python
async def parent_node(state):
    child_result = await child_graph.ainvoke({"text": state["text"]})
    return {"result": child_result["answer"]}
```

在当前 LangGraph 实现里，如果这次调用仍然处在父 run 的 context 传播范围内，子图事件也可能汇入外层流。也就是说，“没有显式传 `config`”不一定等于“必然断流”。

真正需要警惕的是跨越不继承 context 的执行边界，比如裸线程、外部任务队列、独立进程。

```python
from concurrent.futures import ThreadPoolExecutor

def parent_node_bad(state):
    with ThreadPoolExecutor(max_workers=1) as ex:
        child_result = ex.submit(
            lambda: child_graph.invoke({"text": state["text"]})
        ).result()

    return {"result": child_result["answer"]}
```

这时子图会像一次独立 run，外层 `parent_graph.astream(...)` 可能看不到它的 custom 事件和生命周期事件。

更稳妥的写法是让父节点接收当前 `config`，并显式传给子图：

```python
from langchain_core.runnables import RunnableConfig

def parent_node_good(state, config: RunnableConfig):
    with ThreadPoolExecutor(max_workers=1) as ex:
        child_result = ex.submit(
            lambda: child_graph.invoke(
                {"text": state["text"]},
                config=config,
            )
        ).result()

    return {"result": child_result["answer"]}
```

经验法则：

```text
同一 async context / graph context 内，LangGraph 通常能传播上下文。
一旦跨线程、跨进程、跨队列、跨服务，就要显式传递 config 或设计新的事件桥。
```

## 五、`custom` 事件是业务进度的出口

`custom` 事件是生产系统里非常重要的一类事件。

模型 token 只能表达“模型正在生成什么”，`updates` 只能表达“节点完成后 state 变成什么”。但很多业务进度不属于这两类：

```text
开始检索
已召回 100 条
正在重排
正在读取第 3 份材料
已生成报告草稿
正在二次校验
```

这些都应该用 `custom` 表达。

节点或工具内部：

```python
from langgraph.config import get_stream_writer

def retrieve_node(state):
    writer = get_stream_writer()
    writer({"stage": "retrieving", "message": "开始检索材料"})

    docs = search(...)

    writer({
        "stage": "retrieved",
        "message": "材料检索完成",
        "count": len(docs),
    })

    return {"docs": docs}
```

外部消费：

```python
async for part in graph.astream(
    input,
    stream_mode="custom",
):
    print(part)
```

`custom` 的设计原则：

1. 表达业务语义，不暴露框架内部细节。
2. payload 尽量保持 JSON serializable。
3. 字段要稳定，前端和日志系统会依赖它。
4. 不要把大文本、敏感 prompt、完整 tool args 直接塞进去。

`custom` 事件本质上是业务层主动声明：“这件事值得被外界看见。”

## 六、什么时候用哪种事件

可以按消费场景选：

| 场景 | 推荐 |
| --- | --- |
| 聊天 UI 打字效果 | `messages` 或 v3 `stream.messages` |
| 展示 `Agent` 步骤进展 | `updates` |
| 展示业务进度 | `custom` |
| 查看完整状态变化 | `values` |
| 调试节点、工具、模型调用链 | `astream_events(version="v2")` |
| 新项目希望结构化消费多种 projection | `astream_events(version="v3")` / `stream_events(version="v3")` |
| 跨网络可恢复流 | LangGraph Platform SSE / 自建 SSE 协议 |

不要把 `astream_events(version="v2")` 当成默认选择。它很强，但太底层。

它适合回答：

```text
哪个 Runnable 被调用了？
哪个 Tool 开始和结束？
哪个 LLM invocation 正在吐 token？
这个事件的 parent_ids 是什么？
为什么某个子调用没有出现在外层流里？
```

而产品 UI 更关心：

```text
现在是搜索、取证、生成、校验还是完成？
这段 token 属于最终回答，还是属于中间思考？
这个工具进度应该展示成哪张卡？
用户能不能理解这个状态？
```

这两组问题不是一回事。

## 七、不要把运行时事件直接当产品协议

在 [[AgenticOne：OneAgent 范式在保险实时咨询中的应用]] 里，流式输出层遇到的核心问题就是：运行时事件和业务时序不一致。

一次保险咨询里可能同时存在：

- 主 `Agent` 的模型调用；
- 搜品子图的搜索事件；
- 取证 `SubAgent` 的并发材料读取；
- 报告工具内部裸 `LLM` 的 token；
- 问答工具内部裸 `LLM` 的 token；
- 工具卡、产品卡、最终回答；
- 可观测性与审计记录。

如果按事件到达顺序展示，用户看到的是并发执行树；但用户真正需要的是业务段落：

```text
正在理解需求
正在搜索产品
正在读取材料
正在生成回答
正在校验
最终回答
```

所以生产系统里应该有一层 adapter：

```text
LangGraph runtime events
  -> producer 收集、分组、脱敏
  -> event queue / dispatch state
  -> consumer 按业务顺序消费
  -> Product AgentEvent
  -> SSE / WebSocket / 前端
```

这层 adapter 至少要做几件事：

1. 根据 `node/ns/run_id/parent_ids/tool_call_id/message_id` 归属事件。
2. 把交错事件重排成业务段落。
3. 把底层事件名翻译成产品事件名。
4. 过滤 prompt、tool args、检索 query、内部错误堆栈等敏感信息。
5. 把错误、取消、中断、重试表达成稳定状态。
6. 为断线重连或回放预留事件 id 和持久化策略。

长期看，前端不应该直接消费：

```text
on_chain_start
on_chat_model_stream
on_tool_end
```

而应该消费你自己的：

```text
run_started
message_delta
message_completed
tool_started
tool_progress
tool_completed
node_updated
human_interrupt
error
run_completed
```

这就是后续 `AgentEvent` 建模要解决的问题。LangGraph event 是原料，不是产品协议。

## 八、测试时不要断言全局顺序

并行图里，事件顺序天然会受调度、网络、模型响应速度、工具耗时影响。

所以 event 消费测试不要写成：

```text
第 1 个事件必须是 A
第 2 个事件必须是 B
第 3 个事件必须是 C
```

更合理的是测试不变量：

```text
同一个 message_id 的 delta 顺序正确
tool_started 和 tool_completed 可以配对
error 能归属到正确 node/tool
custom payload 符合 schema
最终 run_completed 一定出现
敏感字段不会进入产品事件
adapter 输出的 AgentEvent schema 稳定
```

如果必须表达业务顺序，也应该测试 adapter 之后的产品事件，而不是 LangGraph 原始事件。

## 九、最小实践清单

做 LangGraph Agent event 消费时，至少记住这些原则：

1. 产品 UI 优先消费 `messages`、`updates`、`custom` 或 v3 projections。
2. `astream_events(version="v2")` 用于调试、trace 和调用链分析。
3. 并行节点的事件会交错，不能依赖全局到达顺序。
4. 子图事件要打开 `subgraphs=True`，并用 namespace 识别来源。
5. 跨线程、跨进程、跨队列时，显式传递 `config` 或设计事件桥。
6. 用 `custom` 表达业务进度，而不是让前端猜底层事件含义。
7. 对外暴露前做脱敏、归属、重排和协议翻译。
8. 不要把 LangGraph 原始 event schema 当作长期产品契约。

一句话总结：

**LangGraph 负责让运行时事件被看见；产品系统负责让这些事件变得可理解。**

`Agent` 的 event 消费不是日志转发，而是一次运行时语义到产品语义的翻译。

## Related

- [[AgenticOne：OneAgent 范式在保险实时咨询中的应用]]
- [[LangGraph Platform 可恢复流协议深度解析]]
- [[相比层出不穷的 Agent 框架，不变的 Agent Protocol 是什么]]
- [[如何打造可靠的Agent系统]]
