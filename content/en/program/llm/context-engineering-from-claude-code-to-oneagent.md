---
title: "From Claude Code to OneAgent: Context Engineering"
description: An initial English draft of Xiaohui's OneAgent and context engineering methodology, inspired by Claude Code and Manus-style loop agents.
lang: en
source: program/llm/从Claude-Code到-OneAgent：如何做好上下文工程
translationKey: claude-code-oneagent-context-engineering
translationStatus: machine-draft
created: 2025-11-23
modified: 2026-06-29
published: 2025-11-23
tags:
  - Context Engineering
  - OneAgent
  - MCP
  - LLM
rss: false
---

This article is part of my series on building and applying production-grade Agent systems from the perspective of Claude Code.

In May, we proposed the `OneAgent + MCPs` paradigm inspired by Manus and Claude Code. It was later recognized as one of the top Agent practices inside Alibaba and Ant.

The "One" in OneAgent means unification and reuse. OneAgent is a strong reusable base Agent. Domain Agents and sub-Agents can be derived from it. The system combines LangGraph, Claude Code's architecture ideas, Agent construction, service deployment, and MCP microservice calls.

## A Simple Loop That Is Not Fragile

OneAgent is essentially a model using tools inside a loop.

This architecture looks simple, but the key question is whether a loop can handle long and complex tasks. Manus and Claude Code show that it can, when the loop is supported by good context engineering.

I summarize the key ingredients as four elements:

- a planning tool such as `write_todos`;
- sub-Agents delegated through a `task` method;
- access to a real or virtual filesystem;
- a carefully designed prompt with enough task constraints and working rules.

The loop works not because the code is complicated, but because the model receives a context structure that allows planning, isolation, retrieval, reduction, and continuation.

## Host Agent and Sub-Agent

In my system, I separate Host Agent and Sub-Agent.

For simple tasks, the Host Agent can finish the work inside one loop. For complex tasks, it can delegate to Sub-Agents so that context is isolated and the main loop stays focused. This mirrors the way Claude Code uses task delegation to extend the loop.

## OneAgent Application Architecture

Compared with Claude Code, the OneAgent system described in the source article is designed more for web applications.

The main Agent follows a ReAct or loop paradigm, while intent recognition can route some cases into workflow-style Agents. In practice, the reusable ReAct-style Agent is the most convenient default.

## Implementation Direction

The implementation stack is Python, LangChain, and LangGraph. The article also draws from the `deepagents` project.

At the code level, the core loop can be simplified as:

```python
context = Context()
tools = Tools(env)
system_prompt = "Goals, constraints, and how to act"
user_prompt = get_user_prompt()

while True:
    action = llm.run(system_prompt + user_prompt + context.state)
    if action != continue:
        break
    context.state = tools.run(action)
```

The actual system turns this simple loop into a reliable service by adding Agent builders, executors, sessions, checkpointers, tool loading, audit records, and runtime isolation.

## Core Claim

Context engineering is not prompt decoration. It is the engineering discipline of deciding what the Agent can see, what it can offload, how it can retrieve previous work, how it can reduce noise, and how it can continue long tasks without losing control.
