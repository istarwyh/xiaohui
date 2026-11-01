import type { PageSnapshot } from "./current-note"

export function createNavigation(document: Document, window: Window) {
  let generation = 0
  let navigating = false
  const before = () => {
    generation++
    navigating = true
  }
  const after = () => {
    navigating = false
  }
  document.addEventListener("prenav", before)
  document.addEventListener("nav", after)
  return {
    snapshot(): PageSnapshot {
      return {
        generation,
        navigating,
        slug: document.body.dataset.slug ?? "",
        kind: document.body.dataset.agentPageKind ?? "other",
        url: window.location.href,
      }
    },
    dispose() {
      document.removeEventListener("prenav", before)
      document.removeEventListener("nav", after)
    },
  }
}
