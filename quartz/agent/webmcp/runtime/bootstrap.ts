import type {} from "webmcp-types"
import { createRepository } from "../../browser/data/repository"
import { createSearch } from "../../browser/search/engine"
import { createReader } from "../../browser/reading/service"
import { createCurrentNote } from "../../browser/context/current-note"
import { createNavigation } from "../../browser/context/navigation"
import { registerTools } from "../adapter/registration"
import { searchNotes } from "../tools/search-notes"
import { readNote } from "../tools/read-note"
import { getCurrentNote } from "../tools/get-current-note"

let startup: Promise<void> | undefined

export function bootstrap(document: Document, window: Window): Promise<void> {
  if (startup) return startup
  const context = document.modelContext
  if (!window.isSecureContext || typeof context?.registerTool !== "function")
    return Promise.resolve()
  startup = (async () => {
    const navigation = createNavigation(document, window)
    const build =
      document.querySelector('meta[name="quartz-build"]')?.getAttribute("content") ?? "unversioned"
    const repository = createRepository(window.location.origin, build)
    let dispose: (() => void) | undefined
    let closed = false
    const hide = (event: PageTransitionEvent) => {
      if (event.persisted) return
      closed = true
      dispose?.()
      navigation.dispose()
      window.removeEventListener("pagehide", hide)
      startup = undefined
    }
    window.addEventListener("pagehide", hide)
    try {
      dispose = await registerTools(context, [
        searchNotes(createSearch(repository, () => window.quartzSearch)),
        readNote(createReader(repository)),
        getCurrentNote(createCurrentNote(repository, navigation.snapshot)),
      ])
      if (closed) dispose()
    } catch {
      navigation.dispose()
      window.removeEventListener("pagehide", hide)
      startup = undefined
      // Local diagnosis only; never log content, queries, or credentials.
      console.warn("WebMCP: tool registration unavailable")
    }
  })()
  return startup
}
