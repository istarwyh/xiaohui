# Real article image fixture

`vector-euclidean.png` is the unchanged PNG already referenced by
`content/program/llm/vector-database.md`, in the “欧几里得距离” section.

- Source: <https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202311220110685.png>
- Retrieved: 2026-10-10
- Bytes: 13,962
- SHA-256: `092cc26b171edad61bd0ba5fe131cba98f04dea36e3a2b93efb7dbc2345677f4`

The explicitly labeled real-section excerpt test serves these original bytes from
the test page's own HTTP origin for deterministic image-layout and PNG inspection.
It does not claim that the original image host permits cross-origin embedding.
Separate browser tests use two actual HTTP origins with and without
`Access-Control-Allow-Origin`, and require failure rather than missing image pixels
when the image cannot be embedded. No Node image proxy or request interception is
used to manufacture a successful cross-origin export.
