# Offline Satori OG regression fonts

`QuartzOGFixture-Regular.otf` and `QuartzOGFixture-Bold.otf` are small,
renamed subsets of Noto Sans CJK SC, version 2.004, derived from the Simplified Chinese face
(index 2) in Debian's Noto Sans CJK TTCs. Upstream:
https://github.com/notofonts/noto-cjk. Copyright and SIL OFL 1.1 are in `OFL.txt`.
These fonts are test fixtures, not production font assets.

They include printable ASCII, every character in `quartz/util/og.test.ts`, and
`2026年01月07日分钟阅读…` (including Satori’s generated ellipsis). They were subset with fontTools, preserving name/license
records. Name IDs 1/16 and CFF FamilyName use `Quartz OG Fixture`; IDs 2/17
use the weight; IDs 3/4 and CFF FullName append the weight to the family.
Name ID 6 and CFF fontNames use `QuartzOGFixture-Regular` or
`QuartzOGFixture-Bold`. Regenerate both subsets when adding fixture text
outside this character set. The purpose is deterministic, offline CJK/Latin
layout coverage without a network-dependent Google Fonts download.

Run `node --import tsx --test quartz/util/og.test.ts`. Set `OG_QA_OUTPUT` to a
local output directory to inspect the actual SVG and WebP for homepage, long
Chinese title and English homepage examples. The tests use Satori's measured
layout and Sharp's production WebP rasterizer, not the DOM share-poster path.

The regression came from CSS content-box sizing: a 1200×630 root with 40px
padding became 1280×710, cutting off its right edge and footer. Explicit
border-box sizing preserves the existing canvas. A shrinkable description
region also keeps long excerpts from pushing the footer below the canvas.
Satori's supported CSS/box-sizing semantics are documented at:
https://github.com/vercel/satori/blob/0.47.1/README.md
