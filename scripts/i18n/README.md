# Internationalization Architecture

This repository treats Chinese Markdown in `content/` as the source of truth. Translated pages are derived content with explicit metadata, review status, and source pointers.

## Research Notes

- Quartz v4/v5 `locale` is for interface text and date formatting. It does not provide content-level multilingual routing by itself. See Quartz documentation: <https://quartz.jzhao.xyz/features/i18n> and <https://quartz.jzhao.xyz/configuration>.
- Google recommends separate URLs for each language version instead of cookie or browser-language dependent content switching. See Google Search Central: <https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites>.
- Google supports HTML `hreflang`, HTTP headers, or sitemap annotations. This repo starts with HTML head annotations because every Markdown page already renders through `Head.tsx`. See: <https://developers.google.com/search/docs/specialty/international/localized-versions>.
- Each language version should list itself and its alternates. The generated head links are bidirectional as long as the translated page declares `source`.

## URL Strategy

Default Chinese pages keep their current URLs:

```text
/program/llm/...
/learning/...
/society/...
```

English pages live under an `en` prefix:

```text
/en
/en/program/llm/...
/en/learning/...
/en/society/...
```

Future languages should use the same top-level language prefix:

```text
/ja/...
/ko/...
/es/...
/fr/...
/de/...
```

Do not mix two full languages in one article body. Use separate URLs and link them with `hreflang`.

## Frontmatter Contract

Translated pages should include:

```yaml
lang: en
source: program/llm/source-slug
translationKey: stable-content-id
translationStatus: machine-draft
created: 2026-06-29
modified: 2026-06-29
published: 2026-06-29
rss: false
```

Field meanings:

- `lang`: BCP 47-style language code. Use `en`, `ja`, `ko`, `es`, `fr`, `de`, or regional variants only when the content is actually localized for a region.
- `source`: the Quartz slug of the Chinese source page, not the filesystem path.
- `translationKey`: stable ID shared by all language variants.
- `translationStatus`: one of `machine-draft`, `human-draft`, `reviewed`, or `stale`.
- `rss: false`: translated drafts should not enter the main RSS feed until intentionally reviewed.

Chinese source files do not need to be edited immediately. `Head.tsx` can discover translated pages by scanning all files whose `source` equals the current slug.

## Runtime Behavior

- `Head.tsx` emits canonical URLs for the current page and `hreflang` alternates discovered through `source` or `translationKey`.
- `LanguageSwitcher` appears only when at least two language versions exist.
- `TerminalHome` supports both `/` and `/en`, with separate featured links, badges, awards, and recent-page filtering.
- Chinese homepage recent items exclude `en/` pages; English homepage recent items include only `en/` pages.

## Future LLM CI/CD Flow

The future API integration should generate translation PRs, not push directly to `main`.

Recommended flow:

1. Detect changed Chinese Markdown files under `content/`, excluding `content/en`, generated output, drafts, and private content.
2. Compute a source hash from normalized frontmatter plus Markdown body.
3. For each target language, find the translated page by `source` or `translationKey`.
4. If missing, generate a new translation draft.
5. If the stored source hash differs, update the translated page and set `translationStatus: machine-draft` or `stale`.
6. Preserve frontmatter, code blocks, links, image URLs, tables, Mermaid diagrams, math, and Obsidian wikilinks.
7. Apply glossary terms from `scripts/i18n/glossary.yml`.
8. Run `npm run check:frontmatter`, `npx quartz build`, and a link/hreflang validation script.
9. Open a bot PR named `i18n: update translations`.

Target language rollout:

```text
phase 1: en
phase 2: ja, ko
phase 3: es, fr, de
```

English should stay the first reviewed language because it is the bridge language for most international readers and future multilingual QA.
