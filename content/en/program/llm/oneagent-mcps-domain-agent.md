---
title: "OneAgent + MCPs: Fast Domain Agent Creation"
description: An initial English draft about the OneAgent + MCPs paradigm for creating reusable domain Agents inspired by Manus and Claude Code.
lang: en
source: program/llm/如何快速创建领域Agent---OneAgent-+-MCPs-范式
translationKey: oneagent-mcps-domain-agent
translationStatus: machine-draft
created: 2025-06-15
modified: 2026-06-29
published: 2025-06-15
tags:
  - AI Agent
  - OneAgent
  - MCP
  - LLM
rss: false
---

This article introduces the `OneAgent + MCPs` paradigm for creating domain Agents quickly.

The starting point is a simple observation: Manus-style delivery of business needs through to-dos represents a new single-domain Agent development paradigm.

## From Simple LLM Calls to Agents

The article walks through several stages:

1. **Single LLM call**: send a prompt to a model and receive generated text. This is direct, easy to integrate, and still the foundation of AI systems.
2. **Workflow orchestration**: split a task into fixed steps, such as intent recognition, material collection, stage analysis, synthesis, and report output.
3. **Multi-Agent systems**: organize multiple Agent calls and let them interact under a framework such as AutoGen, CrewAI, LangGraph, or AgentUniverse.
4. **Loop Agents**: a model uses tools in a loop, observes results, updates its plan, and continues until the task is complete.

The article argues that the loop model is the key step toward more general business delivery.

## The Loop Abstraction

A simplified loop looks like this:

```python
env = Environment()
tools = Tools(env)
system_prompt = "Goals, constraints, and how to act"
user_prompt = get_user_prompt()

while True:
    action = llm.run(system_prompt + user_prompt + env.state)
    env.state = tools.run(action)
```

This is close to the ReAct idea, but the focus is not just reasoning and acting. The focus is that the model operates in an environment, calls tools, receives feedback, and continues.

## Why OneAgent

OneAgent is a reusable base Agent. Instead of building a separate Agent from scratch for every domain, the base Agent provides planning, tool use, context handling, and runtime conventions. Domain-specific ability is added through MCP servers and business tools.

In this paradigm:

- OneAgent provides the loop, planning, and runtime behavior.
- MCP servers expose domain tools and resources.
- Sub-Agents can isolate complex tasks.
- Business systems can build domain Agents faster without rewriting the whole runtime.

## Core Claim

The value of `OneAgent + MCPs` is reuse. A strong base Agent plus a tool protocol lets domain teams create specialized Agents faster while keeping a consistent runtime model.

The Chinese source article includes the full development history, examples from Ant Insurance, and detailed diagrams.
