---
published: 2026-06-30
created: 2026-05-08
modified: 2026-06-30
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A personal knowledge base and blog managed with Obsidian, published to [xiaohui.cool](https://xiaohui.cool) via [Quartz](https://github.com/jackyzha0/quartz). This `content/` directory is the canonical Obsidian vault — edit directly here, no external sync needed. All content is Markdown — no build step, no tests, no application code.

## Repository Structure

- `program/` — Software engineering notes (architecture, databases, LLM, networking, OS, full-stream dev, etc.)
- `learning/` — Reading notes, prompts, wisdom, self-management
- `java/` — Java-specific technical notes
- `the road to algorithm/` — Algorithm problem solving
- `society/` — Social observations and commentary
- `story/` — Narrative essays
- `life/` — Personal life reflections
- `aboutme/` — Personal profile and resume
- `show/` — Presentation templates, interview docs, public articles
- `whiteboard/` — Scratch notes and working drafts
- `store/` — Reference material

## Conventions

- **File format**: Markdown with YAML frontmatter (used by Quartz for metadata like `title`, `aliases`)
- **Internal links**: Use Obsidian `[[wikilink]]` syntax for cross-references
- **Images**: Hosted on Alibaba Cloud OSS (`xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com`)
- **Formatting**: Prettier configured — 2 spaces, no tabs, no semicolons, single quotes, 120 char width, LF line endings, no prose wrap
- **Language**: Primarily Chinese with English technical terms; wrap English technical terms in backticks

## Commit Guidelines

- Stage and commit all changes by default
- Generate commit messages based on content changes
- Check for mixed Chinese/English punctuation
- Check for typos and grammar errors
- Check that English technical terms are wrapped in backticks
- Provide at least 3 constructive suggestions when reviewing

## Writing Style

- Concise yet thoughtful; uses imagery and metaphor
- Naturally integrates personal perspective into narratives
- Balances objective reasoning with subjective insight
- Uses Obsidian double-links (`[[...]]`) to connect related concepts
- Technical content: AI, TDD, functional programming
- Humanistic content: literature, history, social observation

## Expression Rules

Avoid obvious AI-flavored prose. The writing should sound like someone with lived experience, judgment, and taste, not like a report generator.

These are warning signs, not banned words. Use them only when the sentence would become less accurate without them.

- Do not overuse label-and-explain patterns such as `问题：...`, `核心原因：...`, `关键在于：...`; use colons only when they are truly needed.
- Avoid formulaic contrast sentences like `不是 A，而是 B` unless the contrast is precise and carries real force.
- Avoid empty abstraction words such as `本质上`, `核心是`, `关键在于`, `赋能`, `闭环`, `沉淀`, `抓手`, `范式迁移` when they only decorate the sentence.
- Do not open with safe, generic setup lines such as `在这个 AI 加速发展的时代` or `这个问题没有标准答案`.
- Avoid three-part slogan-like parallelism when it adds rhythm but no information.
- Do not end essays with forced elevation such as `技术的终点依然是人`; stop on a concrete image, judgment, or unresolved tension when possible.
- Prefer concrete scenes over abstract conclusions: people, places, actions, objects, dialogue, and small observed details.
- Let arguments emerge from examples. Start from a light judgment, a remembered moment, or a specific conflict before naming the larger point.
- Keep some natural human texture: sentence length may vary; transitions do not need to be overly smooth; not every paragraph needs a summary sentence.
- When learning from admired writers, extract mechanisms rather than imitating surface style: rhythm, perspective, sentence movement, humor, degree of judgment, and how details carry ideas.

Useful target pattern:

> Light judgment -> concrete scene -> specific people or objects -> a small turn in perception -> restrained ending on detail.

Before finalizing prose, do one quiet revision pass:

- Remove decorative abstractions.
- Replace summary claims with concrete scenes where possible.
- Cut sentences that sound smooth but add no new observation.
- Check whether the ending lands on a lived detail instead of a slogan.
- Keep the author's original intent and factual content; improve texture without making the voice ornamental.
