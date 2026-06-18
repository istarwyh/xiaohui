import yaml from "js-yaml"

function lineEnd(source, start) {
  const newline = source.indexOf("\n", start)
  return newline === -1 ? source.length : newline
}

function lineAfter(source, end) {
  return end >= source.length ? source.length : end + 1
}

function lineText(source, start, end) {
  return source.slice(start, source[end - 1] === "\r" ? end - 1 : end)
}

export function parseFrontmatter(input) {
  const source = Buffer.isBuffer(input) ? input.toString("utf8") : String(input)
  const firstLineEnd = lineEnd(source, 0)
  const firstLine = lineText(source, 0, firstLineEnd).replace(/^\uFEFF/, "")

  if (firstLine.trim() !== "---") {
    return { data: {}, content: source }
  }

  const frontmatterStart = lineAfter(source, firstLineEnd)
  let lineStart = frontmatterStart

  while (lineStart < source.length) {
    const currentLineEnd = lineEnd(source, lineStart)
    if (lineText(source, lineStart, currentLineEnd).trim() === "---") {
      const frontmatter = source.slice(frontmatterStart, lineStart)
      const contentStart = lineAfter(source, currentLineEnd)
      const parsed = yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA })

      return {
        data: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {},
        content: source.slice(contentStart),
      }
    }

    lineStart = lineAfter(source, currentLineEnd)
  }

  return { data: {}, content: source }
}
