# Writing Rules

## File format

- Use Markdown.
- Use YAML frontmatter when creating new articles.
- Use Obsidian `[[wikilink]]` syntax for cross-references.
- Wrap English technical terms in backticks.

## YAML frontmatter

For new articles:

```yaml
---
title: 文章标题
---
```

## Writing style

- Concise yet thoughtful.
- Use imagery and metaphor when useful.
- Naturally integrate personal perspective into narratives.
- Balance objective reasoning with subjective insight.
- Primarily Chinese with English technical terms in backticks.

## When merging

- Find the natural insertion point in the existing article.
- Add a transition sentence if needed.
- Add `[[wikilinks]]` to related articles when the new content references them.
- Do not break the existing article's flow.

## When creating new articles

- Give the file a descriptive name.
- Use English with hyphens for technical topics when appropriate.
- Use Chinese names for life/society/personal essays when appropriate.
- Add links to related existing articles.
- If useful, add a `Related` section at the bottom.

## When updating `journey.md`

- Keep entries selective and high-signal.
- Do not add every small event.
- Place the entry under the correct year or life stage.
- Prefer a short paragraph or 1-3 bullets per milestone.
- Link to the detailed article using `[[wikilink]]` when available.

Each milestone should answer, explicitly or implicitly:

- What happened?
- Why did it matter?
- What capability, responsibility, identity, or belief changed?
- Where can readers see the deeper record?

Recommended shape:

```md
- [事件/角色/项目]：这件事让我从 [旧阶段] 进入 [新阶段]，开始真正关注 [能力/判断/方向]。相关记录：[[文章名]]
```

If the input is just an award, connect it to the direction it validates rather than listing it mechanically.

If the input is a project, distinguish between:

- the project result (portfolio layer),
- the lessons/methods (knowledge layer),
- the capability upgrade (journey layer).

## When updating portfolio/profile surfaces

- Use concrete proof: metrics, role, responsibility, shipped artifact, award name, public link.
- Avoid over-selling.
- Keep the tone credible and specific.
- If the same event also matters to growth, add only a concise pointer in `journey.md`.
- Portfolio/profile pages prove "what I can do"; `journey.md` explains "why I became this person"; normal articles preserve "what I know".
