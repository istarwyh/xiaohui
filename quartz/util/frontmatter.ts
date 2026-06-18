import yaml from "js-yaml"
import toml from "toml"

export type FrontmatterLanguage = "yaml" | "toml"

export type FrontmatterOptions = {
  delimiters?: string | [string, string]
  language?: FrontmatterLanguage
}

export type ParsedFrontmatter = {
  data: Record<string, unknown>
  content: string
}

function delimiterPair(delimiters: string | [string, string] = "---"): [string, string] {
  return Array.isArray(delimiters) ? delimiters : [delimiters, delimiters]
}

function lineEnd(source: string, start: number) {
  const newline = source.indexOf("\n", start)
  return newline === -1 ? source.length : newline
}

function lineAfter(source: string, end: number) {
  return end >= source.length ? source.length : end + 1
}

function lineText(source: string, start: number, end: number) {
  return source.slice(start, source[end - 1] === "\r" ? end - 1 : end)
}

function parseData(frontmatter: string, language: FrontmatterLanguage) {
  const parsed =
    language === "toml"
      ? (toml.parse(frontmatter) as unknown)
      : (yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA }) as unknown)

  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

export function parseFrontmatter(
  input: string | Buffer | Uint8Array,
  options: FrontmatterOptions = {},
): ParsedFrontmatter {
  const source = Buffer.isBuffer(input)
    ? input.toString("utf8")
    : input instanceof Uint8Array
      ? Buffer.from(input).toString("utf8")
      : input

  const [open, close] = delimiterPair(options.delimiters)
  const firstLineEnd = lineEnd(source, 0)
  const firstLine = lineText(source, 0, firstLineEnd).replace(/^\uFEFF/, "")

  if (firstLine.trim() !== open) {
    return { data: {}, content: source }
  }

  const frontmatterStart = lineAfter(source, firstLineEnd)
  let lineStart = frontmatterStart

  while (lineStart < source.length) {
    const currentLineEnd = lineEnd(source, lineStart)
    if (lineText(source, lineStart, currentLineEnd).trim() === close) {
      const frontmatter = source.slice(frontmatterStart, lineStart)
      const contentStart = lineAfter(source, currentLineEnd)
      return {
        data: parseData(frontmatter, options.language ?? "yaml"),
        content: source.slice(contentStart),
      }
    }

    lineStart = lineAfter(source, currentLineEnd)
  }

  return { data: {}, content: source }
}

export function stripFrontmatter(
  input: string | Buffer | Uint8Array,
  options?: FrontmatterOptions,
) {
  return parseFrontmatter(input, options).content
}
