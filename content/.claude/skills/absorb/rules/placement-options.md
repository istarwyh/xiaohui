# Placement Options

After searching existing content, choose one or more options.

## Option A: Merge into an existing article

Use when the input naturally extends an existing topic.

Examples:

- a new insight for an existing wisdom note
- technical details that expand an existing how-to article
- a new example or case study for an existing framework

Tell the user:

> This fits well into `[[existing-article]]` because [reason]. I'll add it as [a new section / an addition to section X / a footnote].

## Option B: New article in an existing directory

Use when the input covers a new topic but belongs to an existing domain.

Examples:

- new LLM technique → `program/llm/`
- new book note → `learning/reading/`
- new social observation → `society/`

Tell the user:

> This is a new topic but fits the `program/llm/` directory. I'll create a new article called `[proposed-name].md`.

## Option C: New directory + article

Use when the input represents an entirely new category not covered by the blog.

Tell the user:

> This doesn't fit any existing directory. I'd suggest creating `[new-directory]/` with an article called `[proposed-name].md`.

## Option D: Whiteboard first

Use when the input is rough, unstructured, or placement is uncertain.

Target:

- `whiteboard/`

Tell the user:

> This feels like a working draft. I'll put it in `whiteboard/` for now, and we can organize it later.

## Option E: Update `journey.md` as a growth index

Use when the input is a meaningful growth milestone.

Signals:

- new responsibility, role, or identity shift
- project that changed capability or judgment
- award/public recognition that validates a direction
- failure, lesson, or reflection that changed beliefs
- domain transition, such as engineering → AI Agent → product/system responsibility

Pattern:

```md
- [time/event summary]: [why it mattered]. 相关记录：[[deeper article]]
```

If no deeper article exists and the input is substantial, create or update a detailed article first, then link to it from `journey.md`.

Tell the user:

> This is a growth milestone. I'll keep the detailed content in `[target article]` and add a concise milestone to `journey.md` under `[year/period]`.

## Option F: Update portfolio/profile surfaces

Use when the input proves capability rather than primarily adding knowledge or growth narrative.

Signals:

- shipped products, tools, projects with metrics
- awards, talks, publications, public recognition
- consulting/service offers
- new role titles or credibility markers

Targets:

- `Farming in the cyber world.md`
- `aboutme/`
- `show/`
- `membership.md`
- future `projects.md`

Tell the user:

> This strengthens the portfolio layer. I'll update `[profile/project page]`; if it also marks a growth turning point, I'll add a short link in `journey.md`.

## Tool/resource recommendations — Full Stream organizing principle

When the input is a tool, service, or resource recommendation, classify it by the Full Stream development lifecycle phase before choosing a target. Each tool belongs to a specific phase:

- **Requirements Analysis / Modeling / Prototype / Task Breakdown / Test / Coding / Test&Review / Releasing / Operation**

The canonical target for most development tools is `content/program/full-stream/Full Stream.md`, which already has phase-organized subsections (e.g., `DataBase` → `数据库管理工具`, `Operation` → `内容创作`).

Place the tool under the most specific phase subsection that matches its primary use case. A database client goes under Coding → DataBase; a teleprompter goes under Operation → 内容创作; a CI/CD tool goes under Releasing.

Only create a separate page (e.g., in `store/`) when the tool category doesn't fit any existing Full Stream phase.

## Multi-option plans

If the input touches multiple layers, prefer a multi-layer plan:

- detailed content goes to the best knowledge article or new article,
- one concise milestone goes to `journey.md` only if it changes the growth narrative,
- portfolio/profile surfaces are updated only if the input provides external proof or capability evidence.
