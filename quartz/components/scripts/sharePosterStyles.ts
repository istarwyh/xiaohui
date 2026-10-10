/** Share-only reading layout. Brand values are installed from design/tokens.ts. */
export const sharePosterStyles = `
.share-poster-host { position: fixed; left: -10000px; top: 0; width: 360px; pointer-events: none; z-index: -1; }
.share-poster { box-sizing: border-box; width: 360px; padding: 24px; background: var(--color-canvas); color: var(--color-text); font: 18px/var(--leading-reading) var(--font-body); color-scheme: light; text-align: left; overflow-wrap: anywhere; }
.share-poster, .share-poster * { box-sizing: border-box; animation: none; transition: none; caret-color: transparent; }
.share-poster-header { display: block; position: static; width: 100%; margin: 0 0 24px; opacity: 1; }
.share-poster-brand { margin: 0 0 12px; color: var(--color-accent); font-size: 14px; line-height: 1.5; font-weight: 600; }
.share-poster-title { margin: 0; color: var(--color-text-strong); font: 700 27px/var(--leading-tight) var(--font-body); overflow-wrap: anywhere; }
.share-poster-author { margin: 12px 0 0; color: var(--color-text-muted); font-size: 14px; line-height: 1.5; }
.share-poster-body { position: relative; overflow: hidden; }
.share-poster-article { display: flow-root; max-width: none; width: 100%; margin: 0; padding: 0; font: inherit; color: inherit; }
.share-poster-article, .share-poster-article *::before, .share-poster-article *::after { background-image: none; mask-image: none; -webkit-mask-image: none; border-image-source: none; list-style-image: none; }
.share-poster-article p, .share-poster-article li, .share-poster-article tbody { line-height: var(--leading-reading); }
.share-poster-article p { margin: 0 0 16px; }
.share-poster-article > :first-child { margin-top: 0; }
.share-poster-article > :last-child { margin-bottom: 0; }
.share-poster-article h1, .share-poster-article h2, .share-poster-article h3, .share-poster-article h4, .share-poster-article h5, .share-poster-article h6 { color: var(--color-text-strong); font-family: var(--font-body); font-weight: 700; line-height: var(--leading-tight); margin: 24px 0 12px; }
.share-poster-article h1 { font-size: 25px; }
.share-poster-article h2 { font-size: 23px; }
.share-poster-article h3 { font-size: 20px; }
.share-poster-article h4, .share-poster-article h5, .share-poster-article h6 { font-size: 18px; }
.share-poster-article strong, .share-poster-article b { font-weight: 700; }
.share-poster-article em, .share-poster-article i { font-style: italic; }
.share-poster-article a { color: var(--color-accent); text-decoration: underline; text-underline-offset: .15em; }
.share-poster-article mark, .share-poster-article .text-highlight { background: var(--color-mark); color: var(--color-text-strong); }
.share-poster-article ul, .share-poster-article ol { margin: 0 0 16px; padding-left: 1.5em; }
.share-poster-article li { margin: 4px 0; }
.share-poster-article li > p { margin: 0 0 8px; }
.share-poster-article li > ul, .share-poster-article li > ol { margin-bottom: 4px; }
.share-poster-article blockquote { margin: 16px 0; padding: 8px 14px; background: var(--color-surface); border-left: 3px solid var(--color-accent); color: var(--color-text); }
.share-poster-article blockquote > :last-child { margin-bottom: 0; }
.share-poster-article code { font-family: var(--font-code); font-size: .85em; background: var(--color-surface); border-radius: var(--radius-small); padding: .1em .2em; white-space: break-spaces; overflow-wrap: anywhere; }
.share-poster-article pre { margin: 16px 0; padding: 10px 8px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-medium); font: 14px/var(--leading-code) var(--font-code); max-width: 100%; min-width: 0; white-space: pre-wrap; overflow: visible; tab-size: 2; }
.share-poster-article pre code { display: block; margin: 0; padding: 0; font: inherit; border: 0; background: none; white-space: pre-wrap; overflow-wrap: anywhere; overflow: visible; }
.share-poster-article pre code:has(> [data-line]) { display: grid; }
.share-poster-article pre code > [data-line] { display: block; min-width: 0; padding: 0 3px; min-height: 1.6em; white-space: pre-wrap; overflow-wrap: anywhere; }
.share-poster-article pre code > [data-line]::before { content: none; }
.share-poster-article [data-highlighted-line] { background: var(--color-accent-soft); border-left: 3px solid var(--color-accent); }
.share-poster-article [data-highlighted-chars] { background: var(--color-accent-soft); }
.share-poster-article figure { margin: 16px 0; max-width: 100%; }
.share-poster-article figcaption, .share-poster-article [data-rehype-pretty-code-title] { font-size: 14px; line-height: 1.5; color: var(--color-text-muted); margin: 6px 0; }
.share-poster img { content-visibility: visible; contain: none; }
.share-poster-article p > img + em { transform: none; }
.share-poster-article img { display: block; max-width: 100%; width: auto; height: auto; max-height: 720px; margin: 12px auto; border-radius: var(--radius-small); object-fit: contain; }
.share-poster-article .table-container { overflow: visible; width: 100%; }
.share-poster-article table { border-collapse: collapse; table-layout: fixed; width: 100%; max-width: 100%; margin: 16px 0; padding: 0; font-size: 14px; }
.share-poster-article th, .share-poster-article td { min-width: 0; width: auto; padding: 6px; border: 1px solid var(--color-border); vertical-align: top; overflow-wrap: anywhere; word-break: normal; white-space: normal; line-height: 1.6; }
.share-poster-article th { background: var(--color-surface); font-weight: 700; }
.share-poster-article caption { text-align: left; margin: 0 0 8px; font-weight: 600; }
.share-poster-article .share-poster-table-wide { table-layout: auto; }
.share-poster-article .share-poster-table-wide, .share-poster-article .share-poster-table-wide tbody, .share-poster-article .share-poster-table-wide thead, .share-poster-article .share-poster-table-wide tfoot { display: block; width: 100%; }
.share-poster-article .share-poster-table-wide tr { display: flex; flex-wrap: wrap; margin-bottom: 10px; border: 1px solid var(--color-border); }
.share-poster-article .share-poster-table-wide th, .share-poster-article .share-poster-table-wide td { display: block; flex: 1 1 50%; min-width: 0; border: 0; border-bottom: 1px solid var(--color-border); }
.share-poster-article .share-poster-cell-label { display: block; margin-bottom: 3px; color: var(--color-text-muted); font-size: 12px; font-weight: 600; }
.share-poster-article hr { margin: 20px 0; border: 0; border-top: 1px solid var(--color-border); }
.share-poster-article .katex, .share-poster-article .katex * { color: var(--color-text-strong); }
.share-poster-article .katex-display { margin: 16px 0; overflow: visible; }
.share-poster-article .katex-mathml { display: none; }
.share-poster-article svg { max-width: 100%; height: auto; }
.share-poster-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 90px; background: linear-gradient(to bottom, transparent, var(--color-canvas)); pointer-events: none; }
.share-poster-footer { display: flex; position: static; width: 100%; opacity: 1; align-items: center; gap: 16px; margin: 24px 0 0; padding: 20px 0 0; border-top: 1px solid var(--color-border); color: var(--color-text); }
.share-poster-qr { display: block; flex: 0 0 auto; margin: 0; padding: 0; background: var(--color-surface-raised); border-radius: var(--radius-medium); image-rendering: pixelated; }
.share-poster-footer-copy { display: flex; flex: 1; flex-direction: column; align-self: stretch; justify-content: center; min-width: 0; padding-left: 16px; border-left: 1px solid var(--color-border); }
.share-poster-footer-label { margin: 0; color: var(--color-accent); font-size: 16px; line-height: 1.5; font-weight: 700; }
.share-poster-footer-note { margin: 5px 0 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.6; }
.share-poster-footer-site { margin: 12px 0 0; color: var(--color-text-muted); font-size: 12px; line-height: 1.5; }
`
