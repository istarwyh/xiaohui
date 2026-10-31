import { AgentError } from "../../contracts/result"

/** Canonical metadata may name production; requests always stay on this deployment. */
export function assetUrl(path: string, origin: string, version: string): URL {
  const url = new URL(path, origin)
  if (url.origin !== origin || !url.pathname.startsWith("/agent/")) {
    throw new AgentError("INVALID_INPUT", "无效的站内内容地址。")
  }
  url.searchParams.set("v", version)
  return url
}

export function markdownPath(note: { url: string; markdownUrl: string }): string {
  const canonical = new URL(note.url)
  const markdown = new URL(note.markdownUrl)
  if (
    !["https:", "http:"].includes(canonical.protocol) ||
    markdown.origin !== canonical.origin ||
    !markdown.pathname.startsWith("/agent/pages/") ||
    !markdown.pathname.endsWith(".md") ||
    /%2f|%5c|%25/i.test(markdown.pathname) ||
    markdown.search ||
    markdown.hash
  ) {
    throw new AgentError("INVALID_INPUT", "无效的正文地址。")
  }
  return markdown.pathname
}

export function sectionsPath(path: string): string {
  return path.replace(/^\/agent\/pages\//, "/agent/sections/").replace(/\.md$/, ".json")
}
