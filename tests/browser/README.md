# Share poster browser acceptance

Run from the repository root after installing development dependencies:

```sh
npx playwright install --with-deps chromium
npx quartz build -d docs -o public
SHARE_QA_SITE_DIRECTORY=public npx playwright test tests/browser/sharePoster.spec.mjs --workers=1
```

For readable CJK screenshots, the runner needs a CJK font such as the Ubuntu
`fonts-noto-cjk` package. The renderer retains its production fallback font stack.

The suite compiles the real share component, renderer, SCSS and design tokens, then
serves synthetic articles on a temporary loopback server. It does not build or
publish the writing vault, contact sharing services, or send any messages. It uses
real Chromium canvas export and independently decodes QR pixels with `jsqr`.

A required integration smoke also serves the fresh Quartz documentation build
specified by `SHARE_QA_SITE_DIRECTORY`, opens its actual share control, exports a
long PNG and decodes its canonical QR. Missing build configuration fails the test
rather than silently skipping it. Remote requests in this smoke are fulfilled
with empty typed responses, so analytics and remote assets never leave the runner.
The requested remote URLs are recorded in an artifact for transparency.

Evidence is saved in `test-results/share-posters`:

- Full exported PNGs for short, near-800-character, long, structured and single
  long-paragraph content at 320, 390 and 1280 pixel viewports
- Short-card PNGs, panel screenshots, side-by-side mobile iframe screenshots and
  a delayed-generation screenshot, dark-page evidence, and a built-Quartz smoke image
- Per-viewport JSON with measured preview geometry and exported image dimensions

The tests also exercise repeated format switches, close/reopen, late generation,
export failure/retry and simulated Web Share cancellation/rejection. These mocks
validate application behavior; they do not validate an operating system share
sheet or WeChat. The fixture uses the production component styles/tokens in a
minimal article shell; the separate built-Quartz smoke checks integration. These
focused checks are not a full-site browser audit.

Review the complete PNGs visually in addition to the assertions. In particular,
check glyph quality, comfortable spacing, fade transition, code and quote layout,
and the footer/QR on long images. A successful assertion run does not replace
this visual review.

The suite currently contains ten tests. It records canvas encoding and preview
readiness timings alongside successful PNGs, and keeps screenshots, traces and
state diagnostics for failures. Poster readiness has a bounded 15-second wait:
Chromium's native PNG encoder can use a 1-second idle-start watchdog plus a
5.7-second completion watchdog, in addition to the renderer's 1.2-second font
wait. This allows the browser's documented scheduling behavior without relaxing
image, QR, content or interaction assertions. See the [Chromium encoder source](https://chromium.googlesource.com/chromium/src/+/lkgr/third_party/blink/renderer/core/html/canvas/canvas_async_blob_creator.cc).
