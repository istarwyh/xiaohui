---
name: article-image-oss
description: Add suitable images to existing xiaohui.cool Quartz/Markdown blog articles and publish them through Alibaba Cloud OSS. Use when the user asks to 给既有文章加图/配图, 完善文章视觉, generate or choose article illustrations, upload local/generated images to public OSS, replace local image paths with OSS URLs, or embed image Markdown links in an existing article.
---

# Article Image OSS

## Goal

Improve an existing blog article with relevant images, upload final image files to public Alibaba Cloud OSS, and embed the resulting URLs back into the Markdown article without disrupting the author's structure.

## Workflow

1. Locate the source article.
   - Prefer the local Markdown file under `content/` over the published URL.
   - Read the frontmatter, headings, code blocks, tables, and surrounding paragraphs before editing.
   - If the user only gives a published `xiaohui.cool` URL, map it back to the local Markdown file with `rg` on title keywords or slug fragments.

2. Build an image plan.
   - Extract 3-5 core ideas from the article unless the user gives a different count.
   - Assign each image to a concrete insertion point between paragraphs, never inside a table, list, footnote definition, or fenced code block.
   - Prefer conceptual, editorial images over literal screenshots unless screenshots are requested or already available.
   - Avoid generated in-image text unless the exact text is essential; generated text is often unreliable.
   - Write concise Chinese alt text that states the image's role in the article.

3. Create or select images.
   - If new raster images are needed, use the `imagegen` skill/tool and keep a consistent series style.
   - For technical essays on this blog, a safe default is editorial technical-manual style: warm paper, engraved linework, restrained color, no logo, no watermark, and no readable title text.
   - Save project-bound generated images into the workspace before upload; do not leave final project assets only under `$CODEX_HOME/generated_images`.

4. Upload final images to OSS.
   - Use `scripts/upload_oss.cjs`.
   - In this repository the usual working directory is `content/`, so examples call `../.claude/skills/article-image-oss/scripts/upload_oss.cjs`; adjust the path if running from a different cwd.
   - The script reads OSS config from environment variables first, then falls back to the local PicGo config at `~/Library/Application Support/picgo/data.json`.
   - Never print or paste access keys. Only report public URLs.
   - Use stable ASCII object names, usually:

     ```bash
     node ../.claude/skills/article-image-oss/scripts/upload_oss.cjs \
       --prefix image/ \
       --remote-prefix "$(date +%Y%m%d)-article-slug-" \
       path/to/image-01.png path/to/image-02.png
     ```

   - For this blog's existing OSS convention, the default public URL shape is:

     ```text
     https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/<file>
     ```

5. Embed images in Markdown.
   - Use normal Markdown image syntax:

     ```markdown
     ![简短中文 alt 文本](https://.../image-name.png)
     ```

   - Place images after the paragraph that introduces the concept, or just before the heading where the visual becomes useful.
   - Update `modified`/`lastmod` frontmatter to the current Asia/Shanghai timestamp when editing the article.
   - Preserve the author's Markdown formatting; do not run broad formatters on content files.

6. Verify.
   - Run `rg -n "<object-name>|https://.*oss" <article.md>` to confirm all links are embedded.
   - Verify public access with `curl -I <url>` or rely on `scripts/upload_oss.cjs` verification output.
   - Check `git diff -- <article.md>` to ensure only intended article edits were made.
   - Mention unrelated dirty files separately instead of modifying or reverting them.

## OSS Configuration

`scripts/upload_oss.cjs` accepts either environment variables or PicGo config.

Environment variables, first match wins:

| Purpose | Accepted variables |
| --- | --- |
| Access key ID | `ALIYUN_OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_ID`, `ALIYUN_ACCESS_KEY_ID` |
| Access key secret | `ALIYUN_OSS_ACCESS_KEY_SECRET`, `OSS_ACCESS_KEY_SECRET`, `ALIYUN_ACCESS_KEY_SECRET` |
| Bucket | `ALIYUN_OSS_BUCKET`, `OSS_BUCKET` |
| Region / area | `ALIYUN_OSS_REGION`, `ALIYUN_OSS_AREA`, `OSS_REGION`, `OSS_AREA` |
| Object prefix | `ALIYUN_OSS_PREFIX`, `OSS_PREFIX` |
| Public base URL | `ALIYUN_OSS_PUBLIC_BASE_URL`, `OSS_PUBLIC_BASE_URL` |
| Endpoint host | `ALIYUN_OSS_ENDPOINT`, `OSS_ENDPOINT` |
| PicGo config path | `PICGO_CONFIG_PATH` |

PicGo fallback expects the Aliyun config used by PicGo GUI:

```text
~/Library/Application Support/picgo/data.json
```

## Common Commands

Dry run object naming without upload:

```bash
node ../.claude/skills/article-image-oss/scripts/upload_oss.cjs \
  --dry-run \
  --remote-prefix 20260620-example- \
  path/to/image.png
```

Upload and print Markdown image lines:

```bash
node ../.claude/skills/article-image-oss/scripts/upload_oss.cjs \
  --markdown \
  --remote-prefix 20260620-example- \
  path/to/image-01.png path/to/image-02.png
```

Allow overwriting an existing OSS object only when the user explicitly asks:

```bash
node ../.claude/skills/article-image-oss/scripts/upload_oss.cjs \
  --overwrite \
  --remote-name fixed-name.png \
  path/to/image.png
```
