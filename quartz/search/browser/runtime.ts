import { Document as SearchDocument } from "flexsearch"
import type { DocumentValue } from "flexsearch"
import type { SearchData, SearchRuntime, FieldResult } from "../contracts/runtime"

interface Item {
  id: number
  title: string
  content: string
  tags: string[]
  [key: string]: DocumentValue | DocumentValue[]
}

type Options = {
  now?: () => number
  yieldTask?: () => Promise<void>
}

export function createSearchRuntime(
  load: (reload: boolean) => Promise<SearchData>,
  options: Options = {},
): SearchRuntime {
  const now = options.now ?? (() => performance.now())
  const yieldTask = options.yieldTask ?? (() => new Promise((resolve) => setTimeout(resolve, 0)))
  let ready: Promise<{ data: SearchData; index: SearchDocument<Item> }> | undefined
  let reload = false
  let generation = 0
  let refreshing: Promise<SearchData> | undefined

  function initialize(): Promise<{ data: SearchData; index: SearchDocument<Item> }> {
    if (!ready) {
      const refresh = reload
      const version = generation
      const pending = (async () => {
        const data = await load(refresh)
        if (version !== generation) return initialize()
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          Object.values(data).some(
            (p) =>
              !p ||
              typeof p.title !== "string" ||
              typeof p.content !== "string" ||
              !Array.isArray(p.tags) ||
              p.tags.some((t) => typeof t !== "string"),
          )
        ) {
          throw new Error("Invalid shared search index")
        }
        const index = new SearchDocument<Item>({
          encode: (str: string) =>
            str
              .normalize("NFKC")
              .toLowerCase()
              .split(/([^a-z]|[^\x00-\x7F])/),
          document: {
            id: "id",
            tag: "tags",
            index: [
              { field: "title", tokenize: "forward" },
              { field: "content", tokenize: "forward" },
              { field: "tags", tokenize: "forward" },
            ],
          },
        })
        let deadline = now() + 8
        for (const [id, p] of Object.values(data).entries()) {
          index.add(id, { id, title: p.title, content: p.content, tags: p.tags })
          if (now() >= deadline) {
            await yieldTask()
            if (version !== generation) return initialize()
            deadline = now() + 8
          }
        }
        return { data, index }
      })().catch((error) => {
        if (ready === pending) {
          ready = undefined
          reload = true
        }
        throw error
      })
      ready = pending
    }
    return ready
  }

  return {
    async load() {
      return (await initialize()).data
    },
    reload() {
      if (refreshing) return refreshing
      reload = true
      generation++
      ready = undefined
      const pending = initialize()
        .then((value) => value.data)
        .finally(() => {
          if (refreshing === pending) refreshing = undefined
        })
      refreshing = pending
      return pending
    },
    async search(query) {
      const { data, index } = await initialize()
      return { data, fields: (await index.searchAsync(query)) as FieldResult[] }
    },
  }
}

export function installSearchRuntime(
  host: Pick<Window, "quartzSearch">,
  load: (reload: boolean) => Promise<SearchData>,
) {
  host.quartzSearch ??= createSearchRuntime(load)
}
