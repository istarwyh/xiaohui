const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
  const updateAriaLabel = (button: HTMLElement, theme: "light" | "dark") => {
    const lightLabel = button.dataset.lightLabel!
    const darkLabel = button.dataset.darkLabel!
    const label = theme === "dark" ? lightLabel : darkLabel
    button.setAttribute("aria-label", label)
    button.setAttribute("title", label)
  }

  const switchTheme = () => {
    const newTheme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)

    // 更新所有暗色模式按钮的 aria-label
    for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
      updateAriaLabel(darkmodeButton as HTMLElement, newTheme)
    }

    emitThemeChangeEvent(newTheme)
  }

  const themeChange = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? "dark" : "light"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)

    // 更新所有暗色模式按钮的 aria-label
    for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
      updateAriaLabel(darkmodeButton as HTMLElement, newTheme)
    }

    emitThemeChangeEvent(newTheme)
  }

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    const button = darkmodeButton as HTMLElement
    button.addEventListener("click", switchTheme)
    // 设置初始 aria-label
    const currentTheme = document.documentElement.getAttribute("saved-theme") as "light" | "dark"
    updateAriaLabel(button, currentTheme)
    window.addCleanup(() => button.removeEventListener("click", switchTheme))
  }

  // Listen for changes in prefers-color-scheme
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
})
