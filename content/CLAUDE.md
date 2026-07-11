---
published: 2026-06-30
created: 2026-05-08
modified: 2026-07-11
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
- For technical essays, prefer business-practice writing over concept-explanation writing: start from a real use case, implementation constraint, or production judgment before naming the abstraction.

## Article Editing Review Agent

- After creating or substantially editing any article-level Markdown prose, run the `prose-style-editor` subagent before finalizing.
- Use it to remove weak transition sentences, reader-instruction sentences, label-and-explain scaffolding, unnecessary colon-shaped Chinese prose, empty summaries, and polite report-generator language.
- Treat this review as part of the normal editing workflow, not as an optional polish step. Apply its useful cuts before committing.
- If the current runtime cannot directly load Claude subagents, use `.claude/agents/prose-style-editor.md` as the prompt for a separate review pass or multi-agent review task.
- The subagent prompt lives at `.claude/agents/prose-style-editor.md`.

## Expression Rules

The first priority is to remove obvious `AI` flavor. The writing should sound like a person who has memory, preference, hesitation, irritation, taste, and judgment. Do not write like a polite report generator, a content marketing assistant, or an answer that is trying to be universally safe.

Treat the following as hard constraints unless the user explicitly asks for a formal report:

- Do not use generic openings such as `在这个 AI 加速发展的时代`, `随着技术的发展`, `这个问题没有标准答案`, `我们需要辩证地看`.
- Do not rely on label-and-explain scaffolding such as `问题：...`, `核心原因：...`, `关键在于：...`, `我的判断是：...`. Treat `xxxx：xxxx` as a strong `AI`-flavor signal in Chinese prose. Rewrite it into natural sentence movement, paragraph breaks, examples, or direct judgment unless the colon is structurally necessary.
- Avoid stock transitions such as `值得注意的是`, `不可否认的是`, `与此同时`, `总的来说`, `综上所述`, `更重要的是`.
- Avoid formulaic balance: `一方面...另一方面...`, `既要...也要...`, `不是 A，而是 B`, unless the contrast is sharp and necessary. If many paragraphs use this structure, rewrite them into direct judgments, examples, or process descriptions.
- Cut decorative abstractions such as `本质上`, `底层逻辑`, `核心是`, `赋能`, `闭环`, `沉淀`, `抓手`, `范式迁移`, `价值共创`.
- Do not manufacture three-part parallel slogans. If a sentence sounds ready for a keynote slide, rewrite it.
- Do not end with forced elevation such as `技术的终点依然是人`, `答案或许就在路上`, `这才是真正的成长`.
- Do not smooth every edge. A human draft can have a short sentence, a pause, a small doubt, or an unresolved tension.
- For public technical articles, make the reader feel the method can be used: explain what was built, what constraint forced the design, how the system behaves, or what operational lesson was learned. Do not stop at explaining why a concept is correct.
- Replace concept taxonomy with user-helpful detail when possible. A sentence about `Agentic Search` is stronger when it says what the `Agent` actually receives, opens, compares, rejects, or verifies.

Prefer this direction instead:

- Start from a specific judgment, memory, scene, conflict, object, or person before naming the larger point.
- Use concrete nouns and verbs: a room, a screen, a sentence someone said, a bug, a train station, a tired afternoon.
- Let examples carry the argument. Explain after the reader has seen something real.
- Keep the author's original stance, factual content, and emotional temperature. Improve texture, not personality.
- Allow proportion: small things should stay small; do not inflate every observation into a theory.
- When borrowing from admired writers, learn mechanisms rather than surface style: sentence movement, timing, humor, angle, restraint, and how details carry judgment.

Useful target movement:

> Light judgment -> concrete scene -> specific people or objects -> a small turn in perception -> restrained ending on detail.

Before finalizing prose, do a strict anti-`AI` pass:

- Delete any sentence that merely sounds reasonable but adds no observation.
- Replace at least one abstract claim with a concrete detail if the paragraph feels airy.
- Remove unnecessary colons and repeated `不是 A，而是 B` contrasts.
- For technical essays, check whether the piece moved from concept explanation toward business practice, implementation detail, or reader-useful judgment.
- Remove summary endings unless the ending says something more exact than the body already said.
- Check whether the piece could have been written without having lived through anything. If yes, add lived texture or cut.
- Read the first and last paragraph especially hard: most `AI` flavor leaks from safe openings and over-neat endings.

Harder anti-`AI` tests:

- A paragraph that only gives a correct attitude is not enough. It needs at least one of: scene, object, action, cost, failure, constraint, quoted speech, or a judgment whose source can be felt.
- Do not fake human texture. If the source material does not contain lived detail, do not invent private memories. Use observable details instead: a screen, a meeting sentence, a log line, a product behavior, a reader's likely confusion, a decision cost.
- Reduce hedge words such as `可能`, `某种程度上`, `也许`, `可以说`, `需要注意`, `并不意味着`. Keep them only when the uncertainty itself matters.
- Avoid abstract nouns as lazy subjects. Sentences beginning with `价值`, `意义`, `本质`, `时代`, `技术`, `系统`, `能力`, `认知` must earn their place by quickly landing on a person, object, behavior, or consequence.
- Do not use first-person confession as decoration. `我以前...`, `我发现...`, `我意识到...` must be followed by a concrete trigger, not a generic conclusion.
- Do not let a clean structure replace thought. If headings can be swapped into any other article without damage, rewrite the headings or remove them.
- Keep one sharp edge when the draft has one. Do not sand every judgment into a polite universal statement.
- Do not over-explain a metaphor. Let the image do work, then move on.
- Technical prose must expose the work surface: input, output, constraints, failure modes, tradeoffs, verification, rollback, or operational consequence. If none of these appears, the article is probably explaining a concept rather than sharing usable knowledge.
- A final paragraph should not lift the topic into the sky. End on a remaining problem, a concrete detail, a cost, a decision, or a sentence that could not be pasted into a motivational poster.
