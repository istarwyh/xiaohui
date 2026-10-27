---
title: Stable article sharing links
---

## One source, two addresses

Set `shareSlug: agent-audit` in an article's frontmatter. Use lowercase English words joined by single hyphens, without a leading slash. This derives a root alias and a page `share-url` meta value. Copy link, system share payload, short-card QR and long-poster QR all use that value. Unconfigured articles still use their canonical URL. This does not translate the article or rename its original Markdown slug.

Reuse evidence: the bundled `FrontMatter` and `AliasRedirects` plugins already support aliases/permalinks (`quartz/plugins/transformers/frontmatter.ts`, `quartz/plugins/emitters/aliases.ts`). Their redirect output is HTML meta refresh, not HTTP 301/308. A third-party URL shortener is unnecessary and would lose the first-party address requirement. The minimal addition is share intent metadata, unified consumption and collision checks; no new dependency or hosting rule is introduced.

The original article, canonical, translation alternates and sitemap remain unchanged. The short entry is `noindex`, contains the article title/description plus existing emitter-provided OG image metadata, and points to the original canonical. Crawlers may handle meta refresh differently: valid local HTML/OG is not proof of LinkedIn's actual preview.

## Preserve published entries

- Keep `shareSlug` unchanged when editing a title or moving a note; it belongs to the article identity, not its current filename.
- When moving a note, also preserve its previous original slug in `aliases`, so already-shared long URLs still work. Check both URLs and anchors after moving.
- Do not recycle a published share slug for another article. If another spelling is needed, keep the existing entry as an alias and document the change.
- The build rejects duplicate share slugs, existing content/folder/asset routes, existing alias namespaces, generated reserved roots and `extra-pages` entries. The guard runs for full and incremental alias emission. Keep the generated-root reservation list in `shareRoutes.ts` in sync if introducing a new emitter that owns a root namespace.

## Validation and rollout for #116

The first configured article is the Harness/DIPG audit article (`agent-audit`). `agent-evaluation` remains deliberately unbound until the intended Harbor article is confirmed in #116. No canonical migration or global Markdown rename is included.

Before publication:

1. Run `npm run check`, `npm test`, `npx quartz build`, and the existing Chromium/WebKit share browser checks. Inspect the real article's generated short entry, metadata, QR target and original page.
2. Verify duplicate/illegal routes fail the build rather than overwrite another page. Verify an unconfigured article, SPA navigation and both poster formats retain the correct target.
3. On an authorized deployed preview/production environment, GET short and original URLs, follow the browser redirect, check title/description/image and old anchors. Meta refresh is not followed by `curl -L` alone.
4. Obtain an actual LinkedIn Post Inspector or share-preview result for the public short URL. Record its title, description, image and landing page separately from ordinary browser tests. A spoofed crawler User-Agent is not that evidence.

This implementation does not claim LinkedIn acceptance or production publication. If real LinkedIn handling fails, evaluate a narrowly scoped hosting redirect only after recording the failure and confirming that deployment/configuration change is authorized.
