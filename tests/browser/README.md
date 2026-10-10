# Share-image browser acceptance

Run `npx playwright install --with-deps chromium webkit` once, then build the
Quartz docs and run the share suite:

```sh
npx quartz build -d docs
SHARE_QA_SITE_DIRECTORY=public npm run test:share-browser
```

The Playwright config runs Chromium and WebKit independently. The suite checks
actual PNG bytes and QR decoding, semantic DOM and computed styles, resource
failures and retries, real HTTP CORS, and the existing preview/download/share,
format-switch, dismissal and SPA lifecycle behavior. It does not replace
production rendering with mocked image output. Source-resource tests use the
actual SDK and fail when required images or fonts are unavailable.

For freshly built real articles:

```sh
npx quartz build -o .quartz-cache/share-production
SHARE_QA_SITE_DIRECTORY=.quartz-cache/share-production \
SHARE_QA_REAL_ARTICLES=1 SHARE_QA_RUN=production \
npm run test:share-browser -- --grep 'built Quartz article'
```

Real examples include DDD, vector-database, and explicitly labeled source
sections from vector-database that exercise formulas, a table, and an image.
The image's original bytes, source and SHA256 are recorded in
[fixtures/README.md](./fixtures/README.md). A same-origin copy is not evidence
that its source host permits cross-origin browser reads. Independent local HTTP
origins test both permissive and denied CORS without a server-side fetch proxy.

Images, mobile panels and generation metadata are saved under
`test-results/{fixtures,production}/share-posters/{chromium,webkit}`. Separate run
and browser paths prevent later article checks from overwriting earlier
fixtures. CI uploads each browser's evidence for the exact pull request SHA.

Review actual full PNGs and the footer at phone width; DOM presence, pixel counts
and QR decoding alone do not establish visual quality. WebKit automation does
not establish iPhone/WeChat or native OS share-sheet compatibility. Record any
launch/network limitations and which checks actually ran. The suite retains
bounded waits and does not silently skip required article builds.
