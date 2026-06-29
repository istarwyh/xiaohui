---
title: "From RAG to Deep Research: Context Engineering for Complex Reports"
description: An initial English draft about why reliable business reports require Agentic Search, search traces, and context engineering beyond ordinary RAG.
lang: en
source: program/llm/从RAG到DeepResearch：复杂业务报告生成的上下文工程
translationKey: rag-to-deep-research-context-engineering
translationStatus: machine-draft
created: 2026-06-03
modified: 2026-06-29
published: 2026-06-03
tags:
  - RAG
  - Deep Research
  - Context Engineering
  - AI Agent
rss: false
---

The value of `Deep Research` is not that the model reads more material. Its value is that the model organizes reading in a way closer to an expert.

Ordinary `RAG` is like moving a stack of documents onto a writer's desk. `Deep Research` is more like sending out a researcher. The researcher first maps the problem, follows clues, turns back when evidence conflicts, fills blind spots, and finally turns the investigation route into a report.

More precisely, `Deep Research` is a form of `Agentic Search`.

It is not a longer summarizer placed after ordinary retrieval. It asks the model to plan, search, read, compare evidence, revise direction, and generate a grounded report around a complex question.

## From RAG to Agentic Search

Traditional `RAG` follows a simple flow:

```text
user question
  -> retrieve relevant chunks
  -> concatenate context
  -> generate answer
```

This reduces hallucination, but it assumes that finding "relevant material" is enough.

That assumption often works for simple Q&A. It fails for complex business reports such as insurance product analysis, contract review, due diligence, policy compliance, investment research, and tender-document evaluation.

In these cases, the conclusion may depend on definitions, exceptions, restrictions, contradictory clauses, or cross-document comparisons. The most important evidence is often not the paragraph that looks most similar to the question.

## Why Search Trace Matters

Reliable reports are not compressed search results. They are the residue of a research process.

An expert asks:

- Is the source formal enough?
- Does the marketing page conflict with the official clause?
- What exceptions narrow the conclusion?
- Which reverse evidence must be checked?
- Where is evidence missing so that no firm conclusion can be made?

These questions form a search trace. Ordinary `RAG` often stores only retrieval results, not the route used to obtain and verify them. Complex report generation needs the route.

## A Shared Technical Line

The source article connects `Self-RAG`, `CRAG`, `Agentic RAG`, `OpenAI Deep Research`, `Gemini Deep Research`, and `LongTraceRL` as a shared technical direction.

The line is:

```text
RAG: put external material into context
  -> Self-RAG: judge when to retrieve and critique evidence
  -> CRAG: correct poor retrieval results
  -> Agentic RAG: turn retrieval into multi-step tool use
  -> Deep Research: productize Agentic Search for complex reports
  -> LongTraceRL: learn long-context reasoning from search traces
```

The common conclusion is that reliable generation depends less on "recalling more related text" and more on "organizing a better research trajectory."

## Core Claim

Complex business reporting requires context engineering around search trajectories: hypotheses, evidence, counter-evidence, blind spots, and final synthesis. Deep Research is useful because it turns retrieval into a planned and revisable investigation process.
