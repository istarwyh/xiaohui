---
name: curate-quotes
description: Use this skill whenever the user wants to create, update, or discuss a curated quote exhibition, 金句展览, quote wall, homepage quote sidebar, or theme-based excerpt collection from a Quartz/Markdown knowledge base. This skill helps Claude collaborate with the author and reader perspective to choose a compelling theme, search project articles, extract 3-5 exact source quotes, verify every quote exists in the original article, link each quote back to its source, and output a maintainable curation proposal or structured data. Do not skip this skill when the user mentions 金句, 策展, quote exhibition, theme curation, article-derived excerpts, or filling a homepage/sidebar with quotes.
---

# Curate Quotes

Use this skill to create a curator-quality quote exhibition from real articles in the current project. The outcome is not a random quote list: it is a small thematic exhibition where each excerpt helps a reader understand what the site is thinking about and gives them a reason to enter the source article.

## Core principles

- Treat the author as the curator, the reader as the visitor, and Claude as the research assistant.
- Choose a theme before choosing quotes. A good exhibition answers one reader-facing question.
- Never invent, paraphrase, or “improve” text inside quotation marks. Quotes must come from the original Markdown content.
- Every displayed quote must link to its source article and include enough metadata to verify it later.
- Prefer 3-5 strong quotes from different articles over many weak quotes.
- Produce a proposal first. Only write data files or change site rendering after the user approves the curation direction.

## Workflow

### 1. Establish the curation frame

If the user has not already provided enough direction, ask up to three focused questions:

1. Who is the target reader for this exhibition?
2. What question should the theme answer?
3. Should the tone feel more like technical practice, personal growth, product thinking, or methodology?

If the user wants help choosing the theme, scan the project articles first, then propose 3-5 theme candidates. Each candidate should have:

- `theme`: short, attractive title
- `reader_question`: the question a visitor brings
- `curator_thesis`: what the exhibition argues
- `likely_article_clusters`: article groups or keywords that may contain evidence

Use the three-lens check before continuing:

- **Reader lens:** Would a first-time visitor understand why these quotes are grouped together?
- **Author lens:** Does the theme reflect a real thesis across the author's writing?
- **Agent lens:** Can the theme be supported by multiple source articles, not just one isolated post?

### 2. Search project articles

Search local project content, usually `content/**/*.md` or the project's equivalent article directory. Use filenames, frontmatter titles, headings, tags, and body text.

For broad searches, use project search tools or an Explore agent. For targeted verification, read source files directly.

Good search targets:

- Theme keywords and synonyms in Chinese and English
- Repeated concepts across titles, headings, and tags
- Sentences near strong claims, conclusions, definitions, or turning points
- Article introductions and endings, which often contain thesis-level statements

Avoid relying on search snippets alone. Read the source article before selecting a quote.

### 3. Extract candidate quotes

For each candidate article, extract concise source excerpts that can stand alone in a sidebar or quote card.

Prefer quotes that are:

- 1-3 sentences or a short paragraph
- Specific enough to reveal the author's thinking
- Intriguing enough to invite a click-through
- Connected to the theme without needing too much context
- From the article body rather than only the title, unless the title itself is intentionally aphoristic

Preserve the original wording and punctuation. If Markdown syntax makes the display awkward, keep both:

- `quote`: reader-facing text with only harmless Markdown cleanup
- `source_excerpt`: verbatim source text used for verification

Do not use a quote if the source text cannot be found in the article.

### 4. Verify authenticity

Before presenting final selections, re-open each source file and verify that the quote or `source_excerpt` appears in that file.

For every selected quote, capture:

- Article title from frontmatter or first heading
- Article path
- Article link or slug if derivable from project routing
- Line number range when available
- Verbatim source excerpt
- Short curator reason explaining why this quote belongs in the theme

Reject any candidate that fails verification. If there are not enough verified quotes, say so and either broaden the theme or ask the user for a different direction.

### 5. Curate the exhibition arc

Choose 3-5 verified quotes and arrange them as a small narrative, not a leaderboard.

A useful default arc:

1. **Hook:** the quote that names the tension
2. **Problem:** the quote that makes the stakes concrete
3. **Insight:** the quote that reframes the topic
4. **Method:** the quote that shows what to do
5. **Invitation:** the quote that makes the reader want to continue

Not every exhibition needs all five roles. Use only the roles that fit the available evidence.

### 6. Present the curation proposal

Use this structure for the first proposal:

```markdown
# 金句策展提案：{theme}

## 策展命题

{1-2 sentences explaining what these articles collectively answer.}

## 目标读者

{Who this is for and what curiosity it serves.}

## 展览动线

1. {role}: {why this position comes first}
2. {role}: {why this position follows}
   ...

## 入选金句

### 1. {role label}

> {quote}

- 来源：[{article_title}]({article_href_or_path})
- 路径：`{article_path}`
- 位置：`L{start}-L{end}` if available
- 策展理由：{one concise reason}

## 备用候选

- {quote summary} — `{article_path}` — {why it was not selected}

## 需要作者确认

- {theme wording, quote count, ordering, data destination, or unresolved source-link issues}
```

### 7. Output maintainable data after approval

After the author approves the proposal, ask where the data should live unless the project already has a clear convention. Do not silently change homepage rendering.

Recommended schema:

```json
{
  "theme": "AI Agent 与交付信任",
  "slug": "ai-agent-delivery-trust",
  "curatorNote": "这些文章共同回答：人如何放心把需求交给 Agent 系统闭环？",
  "targetReader": "对 AI Agent 工程化交付感兴趣的新访客",
  "updatedAt": "YYYY-MM-DD",
  "quotes": [
    {
      "role": "hook",
      "quote": "展示用原文摘录",
      "sourceExcerpt": "用于校验的原文片段",
      "articleTitle": "文章标题",
      "articlePath": "content/path/to/article.md",
      "articleHref": "/path/to/article",
      "lineStart": 12,
      "lineEnd": 14,
      "curatorReason": "为什么这句放在这里"
    }
  ]
}
```

If the user wants a TypeScript module instead of JSON, keep the same fields and export a typed object. If the homepage component is not implemented yet, save the approved curation as a proposal/data file and clearly state that rendering is a separate step.

## Quality checklist

Before finishing, confirm:

- The theme is specific, attractive, and reader-facing.
- There are 3-5 selected quotes unless the user requested a different count.
- Every selected quote is from a real local article.
- Every quote has a source title, path, and link or slug.
- The selected quotes come from multiple articles when possible.
- The sequence forms a coherent thought arc.
- The output is maintainable and can be updated without editing component code.

## Failure modes to avoid

- Do not fabricate “representative” quotes.
- Do not turn the exhibition into a generic recommendations list.
- Do not select quotes only because they are short; select them because they advance the theme.
- Do not bury the source article path. Future maintenance depends on traceability.
- Do not write production UI code during curation unless the user explicitly asks for implementation.
