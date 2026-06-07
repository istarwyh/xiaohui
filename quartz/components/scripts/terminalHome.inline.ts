function setupTerminalSearch() {
  const terminalInput = document.querySelector<HTMLInputElement>(".terminal-search-input")
  const terminalResults = document.querySelector<HTMLElement>(".terminal-search-results")
  const searchBar = document.querySelector<HTMLInputElement>(".search-bar")
  const searchLayout = document.querySelector<HTMLElement>(".search-layout")
  const searchSpace = document.querySelector<HTMLElement>(".search-space")
  const searchButton = document.querySelector<HTMLButtonElement>(".search-button")

  if (!terminalInput || !terminalResults || !searchBar || !searchLayout || !searchSpace)
    return false
  if (searchLayout.dataset.ready !== "true") return false
  if (!searchLayout.querySelector(".results-container")) return false
  if (terminalInput.dataset.searchReady === "true") return true

  terminalInput.dataset.searchReady = "true"
  terminalInput.setAttribute("aria-expanded", "false")
  searchLayout.classList.add("terminal-search-layout")

  const mountTerminalResults = () => terminalResults.appendChild(searchLayout)
  const mountModalResults = () => {
    searchSpace.appendChild(searchLayout)
    terminalResults.classList.remove("active")
    terminalInput.setAttribute("aria-expanded", "false")
  }

  const syncSearch = () => {
    mountTerminalResults()
    searchBar.value = terminalInput.value
    searchBar.dispatchEvent(new Event("input", { bubbles: true }))
    const hasQuery = terminalInput.value.trim() !== ""
    terminalResults.classList.toggle("active", hasQuery)
    terminalInput.setAttribute("aria-expanded", String(hasQuery))
  }

  const resultCards = () => [
    ...terminalResults.querySelectorAll<HTMLAnchorElement>(".result-card:not(.no-match)"),
  ]
  const clearFocus = (cards: HTMLAnchorElement[]) => {
    cards.forEach((card) => card.classList.remove("focus", "terminal-focus"))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const cards = resultCards()
    const activeIndex = cards.findIndex((card) => card.classList.contains("terminal-focus"))

    if (event.key === "Enter" && !event.isComposing) {
      const target = cards[activeIndex] ?? cards[0]
      if (target) {
        event.preventDefault()
        target.click()
      }
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (cards.length === 0) return
      event.preventDefault()
      const nextIndex =
        event.key === "ArrowDown"
          ? (activeIndex + 1) % cards.length
          : activeIndex <= 0
            ? cards.length - 1
            : activeIndex - 1
      clearFocus(cards)
      cards[nextIndex].classList.add("terminal-focus")
      cards[nextIndex].scrollIntoView({ block: "nearest" })
    }

    if (event.key === "Escape") {
      event.preventDefault()
      terminalInput.value = ""
      syncSearch()
    }
  }

  const onSearchShortcut = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      mountModalResults()
    }
  }

  terminalInput.addEventListener("focus", mountTerminalResults)
  terminalInput.addEventListener("input", syncSearch)
  terminalInput.addEventListener("keydown", onKeyDown)
  document.addEventListener("keydown", onSearchShortcut, true)
  searchButton?.addEventListener("click", mountModalResults)
  window.addCleanup(() => terminalInput.removeEventListener("focus", mountTerminalResults))
  window.addCleanup(() => terminalInput.removeEventListener("input", syncSearch))
  window.addCleanup(() => terminalInput.removeEventListener("keydown", onKeyDown))
  window.addCleanup(() => document.removeEventListener("keydown", onSearchShortcut, true))
  window.addCleanup(() => searchButton?.removeEventListener("click", mountModalResults))

  syncSearch()
  return true
}

let cancelPendingSetup: (() => void) | undefined

function startTerminalSearchSetup() {
  cancelPendingSetup?.()
  if (!document.querySelector(".terminal-search-input")) return

  let stopped = false
  let attempts = 0
  let interval: number | undefined

  const stop = () => {
    if (stopped) return
    stopped = true
    if (interval !== undefined) window.clearInterval(interval)
    window.removeEventListener("quartz:search-ready", onSearchReady)
    if (cancelPendingSetup === stop) cancelPendingSetup = undefined
  }

  const trySetup = () => {
    attempts += 1
    if (setupTerminalSearch() || attempts >= 600) stop()
  }

  const onSearchReady = () => trySetup()

  window.addEventListener("quartz:search-ready", onSearchReady)
  interval = window.setInterval(trySetup, 100)
  cancelPendingSetup = stop
  window.addCleanup(stop)
  trySetup()
}

document.addEventListener("nav", startTerminalSearchSetup)
