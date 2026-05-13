import fs from "fs"
import { Repository } from "@napi-rs/simple-git"
import { QuartzTransformerPlugin } from "../types"
import path from "path"
import { styleText } from "util"
import { execFileSync } from "child_process"

// Build a map of {repoRelativePath: firstAuthorDate(ms)} by walking git history
// once. Uses --follow per file would be expensive across hundreds of files, so
// instead we walk all add/copy/rename events and keep the earliest timestamp
// per current path. This is best-effort: rename chains beyond a single hop are
// approximated by their latest known name.
function detectIgnoreCase(workdir: string): boolean {
  try {
    const v = execFileSync("git", ["-C", workdir, "config", "--get", "core.ignorecase"], {
      encoding: "utf8",
    })
    return v.trim().toLowerCase() === "true"
  } catch {
    return false
  }
}

interface GitDateLookup {
  getFirst(path: string): number | undefined
  getLatest(path: string): number | undefined
}

function buildGitDateLookup(workdir: string): GitDateLookup {
  const first = new Map<string, number>()
  const latest = new Map<string, number>()
  const ignoreCase = detectIgnoreCase(workdir)
  const firstL = ignoreCase ? new Map<string, number>() : undefined
  const latestL = ignoreCase ? new Map<string, number>() : undefined
  try {
    const text = execFileSync(
      "git",
      [
        "-C",
        workdir,
        "log",
        "--reverse",
        "--all",
        "--name-status",
        "--pretty=format:__C__%at",
      ],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    )
    let curMs: number | undefined
    const recordFirst = (p: string) => {
      if (curMs === undefined) return
      if (!first.has(p)) first.set(p, curMs)
      if (firstL) {
        const k = p.toLowerCase()
        if (!firstL.has(k)) firstL.set(k, curMs)
      }
    }
    const recordLatest = (p: string) => {
      if (curMs === undefined) return
      const prev = latest.get(p)
      if (prev === undefined || curMs > prev) latest.set(p, curMs)
      if (latestL) {
        const k = p.toLowerCase()
        const prevL = latestL.get(k)
        if (prevL === undefined || curMs > prevL) latestL.set(k, curMs)
      }
    }
    for (const line of text.split("\n")) {
      if (!line) continue
      if (line.startsWith("__C__")) {
        const ts = parseInt(line.slice(5), 10)
        if (Number.isFinite(ts)) curMs = ts * 1000
        continue
      }
      if (curMs === undefined) continue
      const parts = line.split("\t")
      const status = parts[0]
      let touched: string | undefined
      if (parts.length >= 3 && (status.startsWith("R") || status.startsWith("C"))) {
        touched = parts[2]
        if (status.startsWith("R") || status.startsWith("C")) {
          // For rename/copy, also inherit "first added" from the source if absent
          const src = parts[1]
          const srcFirst = first.get(src)
          if (srcFirst !== undefined && !first.has(touched)) first.set(touched, srcFirst)
          if (firstL) {
            const srcLow = firstL.get(src.toLowerCase())
            if (srcLow !== undefined && !firstL.has(touched.toLowerCase()))
              firstL.set(touched.toLowerCase(), srcLow)
          }
        }
      } else if (parts.length >= 2 && (status === "A" || status === "M" || status === "D")) {
        touched = parts[1]
      }
      if (!touched) continue
      if (status === "A" || status.startsWith("R") || status.startsWith("C")) recordFirst(touched)
      recordLatest(touched)
    }
  } catch {
    // shallow clone, no git, missing CLI, etc. — return empty lookup.
  }
  return {
    getFirst(p) {
      return first.get(p) ?? (firstL ? firstL.get(p.toLowerCase()) : undefined)
    },
    getLatest(p) {
      return latest.get(p) ?? (latestL ? latestL.get(p.toLowerCase()) : undefined)
    },
  }
}

export interface Options {
  priority: ("frontmatter" | "git" | "filesystem")[]
}

const defaultOptions: Options = {
  priority: ["frontmatter", "git", "filesystem"],
}

// YYYY-MM-DD
const iso8601DateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

function coerceDate(fp: string, d: any): Date {
  // check ISO8601 date-only format
  // we treat this one as local midnight as the normal
  // js date ctor treats YYYY-MM-DD as UTC midnight
  if (typeof d === "string" && iso8601DateOnlyRegex.test(d)) {
    d = `${d}T00:00:00`
  }

  const dt = new Date(d)
  const invalidDate = isNaN(dt.getTime()) || dt.getTime() === 0
  if (invalidDate && d !== undefined) {
    console.log(
      styleText(
        "yellow",
        `\nWarning: found invalid date "${d}" in \`${fp}\`. Supported formats: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format`,
      ),
    )
  }

  return invalidDate ? new Date() : dt
}

type MaybeDate = undefined | string | number
export const CreatedModifiedDate: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "CreatedModifiedDate",
    markdownPlugins(ctx) {
      return [
        () => {
          let repo: Repository | undefined = undefined
          let repositoryWorkdir: string
          let gitDates: GitDateLookup | undefined
          if (opts.priority.includes("git")) {
            try {
              repo = Repository.discover(ctx.argv.directory)
              repositoryWorkdir = repo.workdir() ?? ctx.argv.directory
              gitDates = buildGitDateLookup(repositoryWorkdir)
            } catch (e) {
              console.log(
                styleText(
                  "yellow",
                  `\nWarning: couldn't find git repository for ${ctx.argv.directory}`,
                ),
              )
            }
          }

          return async (_tree, file) => {
            let created: MaybeDate = undefined
            let modified: MaybeDate = undefined
            let published: MaybeDate = undefined

            const fp = file.data.relativePath!
            const fullFp = file.data.filePath!
            for (const source of opts.priority) {
              if (source === "filesystem") {
                const st = await fs.promises.stat(fullFp)
                created ||= st.birthtimeMs
                modified ||= st.mtimeMs
              } else if (source === "frontmatter" && file.data.frontmatter) {
                created ||= file.data.frontmatter.created as MaybeDate
                modified ||= file.data.frontmatter.modified as MaybeDate
                published ||= file.data.frontmatter.published as MaybeDate
              } else if (source === "git" && repo) {
                const relativePath = path.relative(repositoryWorkdir, fullFp)
                let modifiedFromGit = false
                try {
                  modified ||= await repo.getFileLatestModifiedDateAsync(relativePath)
                  modifiedFromGit = true
                } catch {
                  // napi-rs simple-git couldn't find this path; fall back below
                }
                let firstMs: number | undefined
                let latestMs: number | undefined
                if (gitDates) {
                  firstMs = gitDates.getFirst(relativePath)
                  latestMs = gitDates.getLatest(relativePath)
                  if (firstMs !== undefined) created ||= firstMs
                  if (!modifiedFromGit && latestMs !== undefined) {
                    modified ||= latestMs
                    modifiedFromGit = true
                  }
                }
                if (!modifiedFromGit && firstMs === undefined && latestMs === undefined) {
                  console.log(
                    styleText(
                      "yellow",
                      `\nWarning: ${file.data.filePath!} isn't yet tracked by git, dates will be inaccurate`,
                    ),
                  )
                }
              }
            }

            file.data.dates = {
              created: coerceDate(fp, created),
              modified: coerceDate(fp, modified),
              published: coerceDate(fp, published),
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    dates: {
      created: Date
      modified: Date
      published: Date
    }
  }
}
