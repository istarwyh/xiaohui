const rightSidebarWidthStorageKey = "quartz:right-sidebar-width"
const rightSidebarWidthCssVar = "--right-sidebar-width"
const minRightSidebarWidth = 340
const defaultRightSidebarWidth = 340
const maxRightSidebarWidth = 640
const minDesktopCenterWidth = 560
const minDesktopLeftWidth = 220
const keyboardStep = 20

function getMaxRightSidebarWidth() {
  return Math.max(
    minRightSidebarWidth,
    Math.min(maxRightSidebarWidth, window.innerWidth - minDesktopLeftWidth - minDesktopCenterWidth),
  )
}

function clampRightSidebarWidth(width: number) {
  return Math.round(Math.min(Math.max(width, minRightSidebarWidth), getMaxRightSidebarWidth()))
}

function readStoredRightSidebarWidth() {
  try {
    const storedWidth = window.localStorage.getItem(rightSidebarWidthStorageKey)
    if (!storedWidth) return undefined

    const width = Number.parseInt(storedWidth, 10)
    return Number.isFinite(width) ? width : undefined
  } catch {
    return undefined
  }
}

function persistRightSidebarWidth(width: number) {
  try {
    window.localStorage.setItem(rightSidebarWidthStorageKey, `${width}`)
  } catch {}
}

function clearStoredRightSidebarWidth() {
  try {
    window.localStorage.removeItem(rightSidebarWidthStorageKey)
  } catch {}
}

function updateRightSidebarHandle(handle: HTMLElement, width: number) {
  handle.setAttribute("aria-valuemin", `${minRightSidebarWidth}`)
  handle.setAttribute("aria-valuemax", `${getMaxRightSidebarWidth()}`)
  handle.setAttribute("aria-valuenow", `${width}`)
  handle.setAttribute("aria-valuetext", `${width}px`)
}

function currentRightSidebarWidth(sidebar: HTMLElement) {
  const storedWidth = readStoredRightSidebarWidth()
  if (storedWidth !== undefined) {
    return clampRightSidebarWidth(storedWidth)
  }

  const measuredWidth = sidebar.getBoundingClientRect().width
  return clampRightSidebarWidth(measuredWidth || defaultRightSidebarWidth)
}

function setRightSidebarWidth(handle: HTMLElement, width: number, persist: boolean) {
  const clampedWidth = clampRightSidebarWidth(width)
  document.documentElement.style.setProperty(rightSidebarWidthCssVar, `${clampedWidth}px`)
  updateRightSidebarHandle(handle, clampedWidth)

  if (persist) {
    persistRightSidebarWidth(clampedWidth)
  }
}

function resetRightSidebarWidth(handle: HTMLElement, sidebar: HTMLElement) {
  document.documentElement.style.removeProperty(rightSidebarWidthCssVar)
  clearStoredRightSidebarWidth()
  window.requestAnimationFrame(() =>
    updateRightSidebarHandle(handle, currentRightSidebarWidth(sidebar)),
  )
}

function setupRightSidebarResize() {
  const body = document.getElementById("quartz-body")
  const sidebar = document.getElementById("right-sidebar")
  const handle = document.querySelector<HTMLElement>(".right-sidebar-resizer")

  if (!body || !sidebar || !handle) return

  const storedWidth = readStoredRightSidebarWidth()
  if (storedWidth !== undefined) {
    setRightSidebarWidth(handle, storedWidth, false)
  } else {
    updateRightSidebarHandle(handle, currentRightSidebarWidth(sidebar))
  }

  const setWidthFromPointer = (event: PointerEvent, persist = true) => {
    const bodyRect = body.getBoundingClientRect()
    setRightSidebarWidth(handle, bodyRect.right - event.clientX, persist)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return

    event.preventDefault()
    handle.setPointerCapture(event.pointerId)
    document.documentElement.classList.add("is-resizing-right-sidebar")
    setWidthFromPointer(event)

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      setWidthFromPointer(moveEvent)
    }

    const onPointerUp = () => {
      document.documentElement.classList.remove("is-resizing-right-sidebar")
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId)
      }
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const currentWidth = currentRightSidebarWidth(sidebar)
    const step = event.shiftKey ? keyboardStep * 2 : keyboardStep

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      setRightSidebarWidth(handle, currentWidth + step, true)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      setRightSidebarWidth(handle, currentWidth - step, true)
    } else if (event.key === "Home") {
      event.preventDefault()
      setRightSidebarWidth(handle, minRightSidebarWidth, true)
    } else if (event.key === "End") {
      event.preventDefault()
      setRightSidebarWidth(handle, getMaxRightSidebarWidth(), true)
    }
  }

  const onDoubleClick = () => resetRightSidebarWidth(handle, sidebar)

  const onResize = () => {
    const storedWidth = readStoredRightSidebarWidth()
    if (storedWidth !== undefined) {
      setRightSidebarWidth(handle, storedWidth, false)
    } else {
      updateRightSidebarHandle(handle, currentRightSidebarWidth(sidebar))
    }
  }

  handle.addEventListener("pointerdown", onPointerDown)
  handle.addEventListener("keydown", onKeyDown)
  handle.addEventListener("dblclick", onDoubleClick)
  window.addEventListener("resize", onResize)

  window.addCleanup(() => {
    handle.removeEventListener("pointerdown", onPointerDown)
    handle.removeEventListener("keydown", onKeyDown)
    handle.removeEventListener("dblclick", onDoubleClick)
    window.removeEventListener("resize", onResize)
    document.documentElement.classList.remove("is-resizing-right-sidebar")
  })
}

document.addEventListener("nav", setupRightSidebarResize)

export {}
