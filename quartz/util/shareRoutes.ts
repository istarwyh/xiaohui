import path from "node:path"
import { readdir } from "node:fs/promises"
import { BuildCtx } from "./ctx"
import { ProcessedContent } from "../plugins/vfile"
import { isRelativeURL, simplifySlug, slugifyFilePath, FilePath } from "./path"
import { parseShareSlug } from "./share"

// Root entries emitted without a Markdown input. Reserve their namespaces too.
const generatedRoots = ["index", "404", "tags", "static", "brand", "agent"]

export async function validateShareRoutes(ctx: BuildCtx, content: ProcessedContent[]) {
  const occupied = new Set(generatedRoots)
  for (const file of ctx.allFiles) {
    const relative = path.isAbsolute(file) ? path.relative(ctx.argv.directory, file) : file
    const slug = slugifyFilePath(relative.replaceAll("\\", "/") as FilePath)
    occupied.add(simplifySlug(slug).split("/")[0])
  }
  // npm run build copies these after Quartz, so checking only Markdown is insufficient.
  try {
    for (const entry of await readdir("extra-pages")) occupied.add(entry.replace(/\.html$/, ""))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const owners = new Map<string, string>()
  for (const [, file] of content) {
    const share = parseShareSlug(file.data.frontmatter?.shareSlug)
    if (!share) continue
    if (occupied.has(share) || owners.has(share)) {
      throw new Error(`Conflicting shareSlug '${share}' in ${file.data.slug}`)
    }
    owners.set(share, file.data.slug!)
  }
  for (const [, file] of content) {
    for (const alias of file.data.aliases ?? []) {
      const target = isRelativeURL(alias)
        ? path.posix.normalize(path.posix.join(simplifySlug(file.data.slug!), "..", alias))
        : alias
      if (path.posix.normalize(target).startsWith("../")) {
        throw new Error(`Unsafe alias '${alias}' escapes output directory`)
      }
      const root = path.posix
        .normalize(target)
        .replace(/^\/+/, "")
        .replace(/\.html$/, "")
        .split("/")[0]
      const owner = owners.get(root)
      if (owner && !(owner === file.data.slug && target === file.data.frontmatter?.shareSlug)) {
        throw new Error(
          `Share route '${root}' conflicts with alias '${alias}' in ${file.data.slug}`,
        )
      }
    }
  }
}
