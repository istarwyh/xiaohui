export interface SearchRecord {
  title: string
  content: string
  tags: string[]
  hash?: string
}

export type SearchData = Record<string, SearchRecord>
export interface SearchQuery {
  query: string
  limit: number
  index: Array<"title" | "content" | "tags">
  tag?: { tags: string }
}
export interface FieldResult {
  field: string
  result: number[]
}

/** Shared by ordinary UI and agent adapters. No protocol or DOM dependencies. */
export interface SearchRuntime {
  load(): Promise<SearchData>
  reload(): Promise<SearchData>
  search(query: SearchQuery): Promise<{ data: SearchData; fields: FieldResult[] }>
}

declare global {
  interface Window {
    quartzSearch: SearchRuntime
  }
}
