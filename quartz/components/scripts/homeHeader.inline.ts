const homeSections = new Set(["#featured", "#public-work", "#paths", "#writing", "#about"])

document.addEventListener("nav", () => {
  const languageLinks = document.querySelectorAll<HTMLAnchorElement>(
    ".home-header .home-language-link, .home-header .language-switcher a",
  )
  if (languageLinks.length) {
    const syncSection = () => {
      const hash = homeSections.has(window.location.hash) ? window.location.hash : ""
      for (const link of languageLinks) {
        const target = new URL(link.href)
        target.hash = hash
        link.href = target.href
      }
    }
    syncSection()
    window.addEventListener("hashchange", syncSection)
    window.addCleanup(() => window.removeEventListener("hashchange", syncSection))
  }
  const tools = document.querySelector<HTMLElement>(".home-tools")
  if (tools) tools.hidden = false
  const menu = document.querySelector<HTMLDetailsElement>(".home-menu")
  if (!menu) return
  const summary = menu.querySelector("summary")
  const close = (event: KeyboardEvent) => {
    if (
      !event.defaultPrevented &&
      !document.querySelector(".search-container.active") &&
      event.key === "Escape" &&
      menu.open
    ) {
      menu.open = false
      summary?.focus()
    }
  }
  const navigate = (event: MouseEvent) => {
    if ((event.target as Element).closest("a")) menu.open = false
  }
  document.addEventListener("keydown", close)
  menu.addEventListener("click", navigate)
  window.addCleanup(() => {
    document.removeEventListener("keydown", close)
    menu.removeEventListener("click", navigate)
  })
})
