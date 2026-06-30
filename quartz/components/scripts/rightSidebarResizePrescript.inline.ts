const rightSidebarWidthStorageKey = "quartz:right-sidebar-width"
const rightSidebarWidthCssVar = "--right-sidebar-width"

try {
  const storedWidth = window.localStorage.getItem(rightSidebarWidthStorageKey)
  if (storedWidth) {
    const width = Number.parseInt(storedWidth, 10)
    if (Number.isFinite(width)) {
      document.documentElement.style.setProperty(rightSidebarWidthCssVar, `${width}px`)
    }
  }
} catch {}

export {}
