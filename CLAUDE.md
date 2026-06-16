# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a customized Quartz v4 static-site generator for the `xiaohui.cool` digital garden/blog. The repository combines the Quartz TypeScript/Preact build system with a human-authored Obsidian-style Markdown vault in `content/`.

- `content/` is the canonical writing vault. Follow `content/CLAUDE.md` before editing notes or essays there.
- `quartz/` contains the Quartz CLI, build pipeline, plugins, components, styles, and browser-side scripts.
- `quartz.config.ts` defines site metadata, locale, theme, ignored content patterns, and active plugin lists.
- `quartz.layout.ts` wires page layouts and sidebar/header/footer components for content and list pages.
- `scripts/` contains repository-specific automation for homepage cards, frontmatter dates, and git hooks.
- `public/` is generated output. Do not edit it directly; change source content/components/scripts instead.
- `extra-pages/` contains handcrafted pages copied into `public/` by the production build.
- `docs/` is the bundled Quartz documentation and can be served as an alternate content directory.

## Common commands

Use npm; the repo has `package-lock.json`, `.npmrc` has `engine-strict=true`, and `package.json` requires npm `>=9.3.1` with Node `20 || >=22`.

```bash
npm install
```

Installs dependencies and runs `postinstall`, which checks the native git dependency and installs local git hooks.

```bash
npx quartz build --serve
```

Local development preview for `content/` at `http://localhost:8080`. `--serve` enables watch mode and WebSocket reloads.

```bash
npm run docs
```

Serves `docs/` through Quartz with `npx quartz build --serve -d docs`.

```bash
npx quartz build
```

Builds the current content directory into `public/` without running the repository-specific homepage update step.

```bash
npm run build
```

Production build: fetches git history/tags if needed, runs `npm run update-homepage`, builds Quartz, then copies `extra-pages/*` into `public/`. This command may modify `content/index.md`, `quartz.layout.ts`, and `scripts/cards-data.json` before building.

```bash
npm run build:cf
./build.sh
```

Cloudflare/deployment-oriented builds. `build.sh` performs a verbose install with legacy peer deps before `npm run build`.

```bash
npm run check
```

Runs `tsc --noEmit` and `npx prettier . --check`. Root Prettier ignores generated output, Obsidian internals, handcrafted extra pages, and human-authored content Markdown/HTML.

```bash
npm run format
```

Runs Prettier over the non-ignored code/config files.

```bash
npm test
```

Runs the tests currently wired into `package.json`: `quartz/util/path.test.ts` and `quartz/depgraph.test.ts`.

Run a single test file with `tsx` or Node's test runner:

```bash
npx tsx ./quartz/util/path.test.ts
npx tsx ./quartz/depgraph.test.ts
npx tsx ./quartz/util/fileTrie.test.ts
node --test ./scripts/update-homepage.test.js
```

Additional content maintenance commands:

```bash
npm run check:frontmatter
npm run backfill:dates
node scripts/backfill-frontmatter-dates.js --write
npm run update-homepage
FORCE_UPDATE_INDEX=1 npm run update-homepage
```

`check:frontmatter` scans all Markdown under `content/`. `backfill:dates` is dry-run by default; add `--write` to modify files. `update-homepage` regenerates homepage/card data and only overwrites `content/index.md` when it contains the auto-generated marker or `FORCE_UPDATE_INDEX=1` is set.

Avoid `npm run sync` unless the user explicitly asks for it: it runs `update-homepage` and then Quartz sync, whose CLI defaults include committing and pushing.

## Architecture

### Build and CLI flow

The Quartz CLI starts at `quartz/bootstrap-cli.mjs`, which registers `create`, `update`, `restore`, `sync`, and `build` commands. The build command is handled in `quartz/cli/handlers.js`: it bundles `quartz/build.ts` with esbuild into `.quartz-cache/transpiled-build.mjs`, then imports that bundle to run the actual site build.

`quartz/build.ts` orchestrates the static-site pipeline:

1. Build context is created from CLI args plus `quartz.config.ts`.
2. The output directory is cleaned.
3. Input files are globbed from the content directory, respecting `configuration.ignorePatterns`.
4. Markdown files are parsed by `parseMarkdown()`.
5. Parsed content is filtered by configured filter plugins.
6. Emitter plugins write HTML, indexes, assets, RSS, sitemap, and other outputs.

In watch mode, content changes use incremental parsing and emitter `partialEmit` hooks where available. Source changes under Quartz code, styles, component scripts, or package config trigger a hard rebuild.

### Plugin model

Quartz behavior is driven by three plugin arrays in `quartz.config.ts`:

- Transformers perform text transforms, remark Markdown AST transforms, rehype HTML AST transforms, and can contribute external resources.
- Filters decide whether processed content should publish.
- Emitters write output files and can expose the components they render so shared CSS/JS resources can be optimized.

The type contracts are in `quartz/plugins/types.ts`. `quartz/plugins/index.ts` collects external resources from transformers and emitters and adds live-reload JavaScript when serving locally.

### Rendering model

`quartz.layout.ts` defines shared page components and the default layouts for content pages and folder/tag list pages. Emitters such as `quartz/plugins/emitters/contentPage.tsx` merge those layouts with page bodies and call `renderPage()` from `quartz/components/renderPage.tsx`.

Components are Preact function components under `quartz/components/`. Component-specific SCSS lives in `quartz/components/styles/`, and browser-side behavior is usually in `quartz/components/scripts/*.inline.ts`, which the esbuild inline loader bundles as text. Global styles are under `quartz/styles/`.

The homepage is special-cased by layout conditions: `TerminalHome` and `QuoteExhibit` render only for the `index` slug, while article title/meta/tag components are suppressed there. `scripts/update-homepage.js` still looks for a `Component.CardFeed(...)` block when syncing card data, so verify homepage assumptions when changing the layout.

### Content and publishing rules

`quartz.config.ts` currently publishes with `locale: "zh-CN"`, `baseUrl: "xiaohui.cool"`, Plausible analytics, Obsidian-flavored Markdown, GFM, KaTeX LaTeX, syntax highlighting, RSS/sitemap, and a custom `AgentIndex` emitter. Ignored content patterns include `private`, `templates`, `.obsidian`, `*.canvas`, `claude-code-*.html`, and `CLAUDE.md`.

For `content/` edits:

- Read and follow `content/CLAUDE.md`; it contains the author profile, writing style, content categories, and commit/review expectations for the vault.
- Markdown uses YAML frontmatter and Obsidian `[[wikilink]]` syntax.
- Frontmatter date checks require a created field (`created` or `date`) and a modified field (`modified`, `lastmod`, `updated`, or `last-modified`) with ISO-style dates.
- The vault is primarily Chinese with English technical terms. Existing guidance asks to wrap English technical terms in backticks.
- Images are generally hosted on Alibaba Cloud OSS rather than stored locally.
- Root Prettier deliberately ignores `content/**/*.md` and `content/**/*.html`; preserve authorial Markdown formatting unless the user asks for formatting changes.

## Hooks and generated files

`scripts/install-hooks.sh` installs:

- `pre-commit`: validates staged content frontmatter, runs `tsc --noEmit` when TypeScript files are staged, and runs Prettier on staged code/config files.
- `pre-push`: runs full `tsc --noEmit` and `npm test`.

Generated or derived files/directories include `public/`, `.quartz-cache/`, `tsconfig.tsbuildinfo`, and `scripts/cards-data.json`. `extra-pages/` is source for additional published HTML, not generated output.
