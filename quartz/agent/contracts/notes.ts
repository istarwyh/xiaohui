export interface Heading {
  depth: number
  text: string
  id?: string
  url?: string
}

export interface Note {
  slug: string
  title: string
  url: string
  markdownUrl: string
  language: "zh" | "en"
  kind: "article" | "home" | "list"
  hash: string
}

export interface Catalog {
  schemaVersion: "1.0"
  revision: string
  pages: Note[]
}

export interface SearchPage {
  language: "zh" | "en"
  slug: string
  title: string
  url: string
  markdownUrl: string
  tags: string[]
  description: string
  headings: Heading[]
  text: string
  hash: string
}

export interface SearchCorpus {
  schemaVersion: "1.0"
  revision: string
  pages: SearchPage[]
}

export interface Sections {
  schemaVersion: "1.0"
  revision: string
  hash: string
  headings: Heading[]
  available: boolean
  ranges?: Array<{ id: string; start: number; end: number }>
  markdownDigest: string
}

export interface NoteSource {
  note: Note
  sections: Sections
  markdown: string
  revision: string
}

export interface NoteRepository {
  getCatalog(signal?: AbortSignal, refresh?: boolean): Promise<Catalog>
  readMarkdown(slug: string, signal?: AbortSignal): Promise<NoteSource>
  getSections(note: Note, revision: string, signal?: AbortSignal): Promise<Sections>
}

export interface SearchInput {
  query: string
  topic?: string
  language: "zh" | "en" | "all"
  limit: number
}

export interface ReadInput {
  slug: string
  headingId?: string
  offset: number
  length: number
}
