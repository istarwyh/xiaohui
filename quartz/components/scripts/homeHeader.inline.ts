document.addEventListener("nav", () => {
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
