---
title: What Is Stable Beneath Fast-Moving Agent Frameworks?
description: An initial English draft of the argument that production Agent systems converge around stable protocol objects such as Thread, Run, Step, Event, Artifact, and Checkpoint.
lang: en
source: program/llm/相比层出不穷的-Agent-框架，不变的-Agent-Protocol-是什么
translationKey: agent-protocol-stable-boundaries
translationStatus: machine-draft
created: 2026-06-16
modified: 2026-06-29
published: 2026-06-16
tags:
  - AI Agent
  - Agent Protocol
  - Agent Runtime
rss: false
---

Agent frameworks keep appearing. LangGraph talks about `Checkpoint`; OpenAI talks about `Thread` and `Run`; A2A talks about `Task`; AG-UI talks about `Event`; Deep Agents adds `Todo`, `Subagent`, and `Virtual Filesystem`.

The names change, but the underlying problems do not. Every serious Agent runtime must answer the same questions:

- How is a task started?
- What context does it carry?
- How can progress be observed?
- How can it pause, resume, retry, or be cancelled?
- Where do final artifacts live?
- How can state be recovered after interruption?

This article argues that the stable layer is not a specific framework API. The stable layer is a set of protocol objects and lifecycle operations that repeatedly appear across frameworks.

## The Six Objects

A production-grade Agent protocol needs at least six conceptual objects.

| Object | Plain meaning | Question it answers |
| --- | --- | --- |
| `Thread` / `Session` | Long-lived context | Which user or task context is this? |
| `Run` / `Task` | One concrete execution | What exactly is being executed now? |
| `Step` | Observable unit of work | Which model, tool, or sub-Agent step happened? |
| `Event` | Runtime progress signal | What changed during execution? |
| `Artifact` | Durable output | Where is the result and which run produced it? |
| `Checkpoint` | Recoverable state snapshot | Where can execution resume after failure? |

Around these objects, the protocol also needs operations such as `stream`, `interrupt`, `resume`, `cancel`, and `retry`.

## Protocol and Runtime

Protocol is the external boundary of a runtime. Runtime is the internal implementation that fulfills the protocol.

This distinction matters because many framework debates confuse three layers:

- concrete standards such as A2A, AG-UI, LangChain Agent Protocol, AITP, or ACP;
- general protocol objects such as Thread, Run, Step, Event, Artifact, and Checkpoint;
- runtime capabilities such as persistence, interrupt recovery, tracing, permission control, and evaluation.

The article focuses on the second layer. Specific standards and frameworks are evidence, not the main point.

## Why This Matters

The core of an Agent runtime is not a model call. It is task lifecycle management.

A toy Agent can call a model and tools. A production Agent must define task boundaries, manage state, expose progress, support interruption, recover from failures, and produce auditable artifacts.

That is why long-term attention should go to protocol boundaries and runtime abstractions rather than API names. Frameworks will change. The lifecycle problems will not.

## Reading Guide

Use this draft as an English entry point to the Chinese source article. The source contains the full framework comparison, diagrams, and detailed runtime analysis.
