import FlexSearch from "flexsearch"
import type { DocumentSearchResults, DocumentValue } from "flexsearch"
import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug, normalizeRelativeURLs, resolveRelative } from "../../util/path"
import { escapeHTML } from "../../util/escape"
import {
  highlightSearchText,
  nextSearchResultIndex,
  parseSearchQuery,
  searchTermPattern,
  type SearchQuery,
} from "./search.helpers"

interface Item {
  id: number
  slug: FullSlug
  title: string
  content: string
  tags: string[]
  [key: string]: DocumentValue | DocumentValue[]
}

const index = new FlexSearch.Document<Item>({
  encode: (str: string) => str.toLowerCase().split(/([^a-z]|[^\x00-\x7F])/),
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

const parser = new DOMParser()
const fetchContentCache = new Map<FullSlug, Promise<Element[]>>()
type SearchData = Record<FullSlug, ContentDetails>
const numSearchResults = 8
const numTagResults = 5
let indexReady: Promise<SearchData> | undefined

function loadIndex(): Promise<SearchData> {
  // One shared build across navigation and all responsive search controls.
  indexReady ??= fetchData.then(async (data) => {
    await Promise.all(
      Object.entries<ContentDetails>(data).map(([slug, fileData], id) =>
        index.addAsync(id, {
          id,
          slug: slug as FullSlug,
          title: fileData.title,
          content: fileData.content,
          tags: fileData.tags,
        }),
      ),
    )
    return data
  })
  return indexReady
}

function highlightHTML(searchTerm: string, el: Element): HTMLElement {
  const html = parser.parseFromString(el.innerHTML, "text/html")
  const pattern = searchTermPattern(searchTerm)
  if (!pattern) return html.body

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue ?? ""
      const matches = [...value.matchAll(pattern!)]
      if (matches.length === 0) return
      const fragment = document.createDocumentFragment()
      let offset = 0
      for (const match of matches) {
        fragment.appendChild(document.createTextNode(value.slice(offset, match.index)))
        const mark = document.createElement("span")
        mark.className = "highlight"
        mark.textContent = match[0]
        fragment.appendChild(mark)
        offset = match.index! + match[0].length
      }
      fragment.appendChild(document.createTextNode(value.slice(offset)))
      node.parentNode?.replaceChild(fragment, node)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      if (element.matches(".highlight, script, style, textarea")) return
      Array.from(node.childNodes).forEach(visit)
    }
  }

  visit(html.body)
  return html.body
}

function setupSearch(searchElement: HTMLElement, currentSlug: FullSlug) {
  const container = searchElement.querySelector<HTMLElement>(".search-container")!
  const searchButton = searchElement.querySelector<HTMLButtonElement>(".search-button")!
  const searchBar = searchElement.querySelector<HTMLInputElement>(".search-bar")!
  const closeButton = searchElement.querySelector<HTMLButtonElement>(".search-close")!
  const searchLayout = searchElement.querySelector<HTMLElement>(".search-layout")!
  const status = searchElement.querySelector<HTMLElement>(".search-status")!
  if (!container || !searchButton || !searchBar || !closeButton || !searchLayout || !status) return

  const labels = searchElement.dataset
  const sidebar = container.closest<HTMLElement>(".sidebar")
  const results = document.createElement("div")
  results.className = "results-container"
  const preview =
    searchLayout.dataset.preview === "true" ? document.createElement("div") : undefined
  if (preview) preview.className = "preview-container"
  searchLayout.replaceChildren(results, ...(preview ? [preview] : []))
  searchLayout.dataset.ready = "false"

  let data: SearchData | undefined
  let idDataMap: FullSlug[] = []
  let disposed = false
  let composing = false
  let loadFailed = false
  let queryVersion = 0
  let previewVersion = 0
  let previewTerm = ""
  let returnFocus: HTMLElement | null = null
  const isOpen = () => container.classList.contains("active")
  const resultLinks = () => [...results.querySelectorAll<HTMLAnchorElement>("a.result-card")]
  const setStatus = (text = "") => (status.textContent = text)

  function clearResults() {
    previewVersion++
    results.replaceChildren()
    preview?.replaceChildren()
    searchLayout.classList.remove("display-results")
  }

  function hideSearch(restoreFocus = true) {
    if (!isOpen()) return
    queryVersion++
    container.classList.remove("active")
    searchButton.setAttribute("aria-expanded", "false")
    searchBar.value = ""
    composing = false
    clearResults()
    setStatus()
    if (sidebar) sidebar.style.zIndex = ""
    if (restoreFocus) {
      const target = returnFocus?.isConnected ? returnFocus : searchButton
      target.focus()
    }
    returnFocus = null
  }

  function showSearch(tags = false) {
    if (!isOpen()) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    if (sidebar) sidebar.style.zIndex = "1"
    container.classList.add("active")
    searchButton.setAttribute("aria-expanded", "true")
    searchBar.value = tags ? "#" : searchBar.value
    searchBar.focus()
    void runSearch()
  }

  function trapTab(event: KeyboardEvent) {
    const focusable = [
      ...container.querySelectorAll<HTMLElement>("input, button, a[href], [tabindex='0']"),
    ].filter((element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0)
    const first = focusable[0] ?? searchBar
    const last = focusable.at(-1) ?? first
    if (
      event.shiftKey &&
      (document.activeElement === first || !container.contains(document.activeElement))
    ) {
      event.preventDefault()
      last.focus()
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !container.contains(document.activeElement))
    ) {
      event.preventDefault()
      first.focus()
    }
  }

  function shortcutHandler(event: KeyboardEvent) {
    // IME uses Enter, Escape and arrows internally; never consume those events.
    if (composing || event.isComposing || event.keyCode === 229) return
    if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      if (event.repeat) return
      isOpen() ? hideSearch() : showSearch(event.shiftKey)
      return
    }
    if (!isOpen()) return
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      hideSearch()
    } else if (event.key === "Tab") {
      trapTab(event)
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const links = resultLinks()
      const current = links.indexOf(document.activeElement as HTMLAnchorElement)
      const next = nextSearchResultIndex(current, links.length, event.key === "ArrowDown" ? 1 : -1)
      if (next < 0) searchBar.focus()
      else links[next].focus()
    } else if (event.key === "Enter" && document.activeElement === searchBar) {
      event.preventDefault()
      // Navigation must never wait for a preview request.
      resultLinks()[0]?.click()
    }
  }

  function resolveUrl(slug: FullSlug): URL {
    return new URL(resolveRelative(currentSlug, slug), location.toString())
  }

  function fetchContent(slug: FullSlug): Promise<Element[]> {
    let cached = fetchContentCache.get(slug)
    if (!cached) {
      const targetUrl = resolveUrl(slug).toString()
      cached = fetch(targetUrl)
        .then(async (response) => {
          if (!response.ok) throw new Error(`Could not fetch ${targetUrl}`)
          const html = parser.parseFromString(await response.text(), "text/html")
          normalizeRelativeURLs(html, targetUrl)
          return [...html.getElementsByClassName("popover-hint")]
        })
        .catch((error: unknown) => {
          fetchContentCache.delete(slug)
          throw error
        })
      fetchContentCache.set(slug, cached)
    }
    return cached
  }

  async function displayPreview(link: HTMLAnchorElement) {
    resultLinks().forEach((result) => result.classList.toggle("focus", result === link))
    if (!preview) return
    const version = ++previewVersion
    const term = previewTerm
    const isCurrent = () =>
      !disposed && isOpen() && version === previewVersion && results.contains(link)
    preview.replaceChildren()
    try {
      const contents = await fetchContent(link.dataset.slug as FullSlug)
      if (!isCurrent()) return
      const inner = document.createElement("div")
      inner.className = "preview-inner"
      inner.append(...contents.flatMap((element) => [...highlightHTML(term, element).children]))
      preview.replaceChildren(inner)
      const highlights = [...preview.getElementsByClassName("highlight")].sort(
        (a, b) => b.textContent!.length - a.textContent!.length,
      )
      highlights[0]?.scrollIntoView({ block: "nearest" })
    } catch {
      if (!isCurrent()) return
      const message = document.createElement("p")
      message.textContent = labels.previewError ?? ""
      preview.replaceChildren(message)
    }
  }

  function createResult(id: number, query: SearchQuery): HTMLAnchorElement {
    const slug = idDataMap[id]
    const item = data![slug]
    const link = document.createElement("a")
    link.className = "result-card"
    link.dataset.slug = slug
    link.href = resolveUrl(slug).toString()
    const title =
      query.type === "tags" ? escapeHTML(item.title) : highlightSearchText(query.term, item.title)
    const tags =
      query.type === "tags"
        ? (item.tags ?? [])
            .slice(0, numTagResults)
            .map((tag) => {
              const className = tag.toLowerCase().includes(query.term.toLowerCase())
                ? ' class="match-tag"'
                : ""
              return `<li><p${className}>#${escapeHTML(tag)}</p></li>`
            })
            .join("")
        : ""
    link.innerHTML = `<h3 class="card-title">${title}</h3>${tags ? `<ul class="tags">${tags}</ul>` : ""}<p class="card-description">${highlightSearchText(query.term, item.content ?? "", true)}</p>`
    return link
  }

  async function runSearch() {
    const version = ++queryVersion
    clearResults()
    if (disposed || !isOpen()) return
    if (!data) {
      setStatus(loadFailed ? labels.error : labels.loading)
      return
    }
    const query = parseSearchQuery(searchBar.value)
    if (!query.term) {
      setStatus(labels.ready)
      return
    }
    setStatus(labels.searching)
    try {
      const searchResults: DocumentSearchResults<Item> = await index.searchAsync({
        query: query.term,
        limit: query.tag ? 10000 : numSearchResults,
        index: query.type === "tags" ? ["tags"] : ["title", "content"],
        ...(query.tag ? { tag: { tags: query.tag } } : {}),
      })
      if (disposed || !isOpen() || composing || version !== queryVersion) return
      const getByField = (field: string): number[] =>
        (searchResults.find((result) => result.field === field)?.result ?? []) as number[]
      const ids = [
        ...new Set([...getByField("title"), ...getByField("content"), ...getByField("tags")]),
      ]
        .filter((id) => idDataMap[id] !== undefined)
        .slice(0, numSearchResults)
      previewTerm = query.term
      searchLayout.classList.add("display-results")
      if (ids.length === 0) {
        const empty = document.createElement("div")
        empty.className = "result-card no-match"
        const title = document.createElement("h3")
        title.textContent = labels.noResults ?? ""
        const hint = document.createElement("p")
        hint.textContent = labels.noResultsHint ?? ""
        empty.append(title, hint)
        results.replaceChildren(empty)
        setStatus(labels.noResults)
      } else {
        const links = ids.map((id) => createResult(id, query))
        results.replaceChildren(...links)
        setStatus(labels.resultCount?.replace("{count}", String(ids.length)))
        void displayPreview(links[0])
      }
    } catch {
      if (!disposed && isOpen() && version === queryVersion) setStatus(labels.error)
    }
  }

  // Delegation keeps one listener per container; discarded result cards retain none.
  function previewResult(event: Event) {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a.result-card")
        : null
    if (target && results.contains(target)) void displayPreview(target)
  }
  function clickResult(event: MouseEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return
    const target = event.target instanceof Element ? event.target.closest("a.result-card") : null
    if (target && results.contains(target)) hideSearch(false)
  }
  function onBackdropClick(event: MouseEvent) {
    if (event.target === container) hideSearch()
  }
  const onSearchButtonClick = () => showSearch()
  const onCloseButtonClick = () => hideSearch()
  const onInput = (event: Event) => {
    if (!composing && !(event as InputEvent).isComposing) void runSearch()
  }
  const onCompositionStart = () => {
    composing = true
    queryVersion++
    previewVersion++
  }
  const onCompositionEnd = () => {
    composing = false
    void runSearch()
  }

  document.addEventListener("keydown", shortcutHandler)
  searchButton.addEventListener("click", onSearchButtonClick)
  closeButton.addEventListener("click", onCloseButtonClick)
  container.addEventListener("click", onBackdropClick)
  searchBar.addEventListener("input", onInput)
  searchBar.addEventListener("compositionstart", onCompositionStart)
  searchBar.addEventListener("compositionend", onCompositionEnd)
  results.addEventListener("mouseover", previewResult)
  results.addEventListener("focusin", previewResult)
  results.addEventListener("click", clickResult)

  // Register cleanup synchronously, before waiting for the index or a search.
  window.addCleanup(() => {
    hideSearch(false)
    disposed = true
    queryVersion++
    previewVersion++
    document.removeEventListener("keydown", shortcutHandler)
    searchButton.removeEventListener("click", onSearchButtonClick)
    closeButton.removeEventListener("click", onCloseButtonClick)
    container.removeEventListener("click", onBackdropClick)
    searchBar.removeEventListener("input", onInput)
    searchBar.removeEventListener("compositionstart", onCompositionStart)
    searchBar.removeEventListener("compositionend", onCompositionEnd)
    results.removeEventListener("mouseover", previewResult)
    results.removeEventListener("focusin", previewResult)
    results.removeEventListener("click", clickResult)
  })

  void loadIndex()
    .then((loaded) => {
      if (disposed) return
      data = loaded
      idDataMap = Object.keys(data) as FullSlug[]
      searchLayout.dataset.ready = "true"
      window.dispatchEvent(new Event("quartz:search-ready"))
      if (isOpen() && !composing) void runSearch()
    })
    .catch(() => {
      if (disposed) return
      loadFailed = true
      searchLayout.dataset.ready = "error"
      if (isOpen()) setStatus(labels.error)
    })
}

document.addEventListener("nav", (event: CustomEventMap["nav"]) => {
  for (const element of document.querySelectorAll<HTMLElement>(".search")) {
    setupSearch(element, event.detail.url)
  }
})
