/** All article links are server-rendered. Pagination is a progressive enhancement. */
const DEFAULT_BATCH_SIZE = 10

interface FeedState {
  visible: number
  anchor?: number
  offset?: number
}

/** Restore against rendered geometry, without inheriting the site's smooth scrolling. */
function restoreFeedPosition(anchor: HTMLElement, offset: number) {
  let frame: number | undefined
  let stopped = false
  let started: number | undefined
  let stableFrames = 0
  const pending = new Set<Element>()
  const cleanups: (() => void)[] = []
  const stop = () => {
    if (stopped) return
    stopped = true
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    cleanups.forEach((cleanup) => cleanup())
  }
  const waitForResource = (resource: Element) => {
    pending.add(resource)
    const settled = () => pending.delete(resource)
    for (const type of ["load", "error"]) {
      resource.addEventListener(type, settled, { once: true })
      cleanups.push(() => resource.removeEventListener(type, settled))
    }
  }

  // The router has finished morphing, but font stylesheets and failed
  // thumbnails above the saved card can still change its document position.
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    if (!link.sheet && !link.disabled) waitForResource(link)
  })
  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (
      !image.complete &&
      image.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      waitForResource(image)
    }
  })

  // Never compete with a reader, a new route, or same-document fragment history.
  for (const type of [
    "wheel",
    "touchstart",
    "pointerdown",
    "keydown",
    "click",
    "popstate",
    "hashchange",
  ]) {
    window.addEventListener(type, stop, { passive: true, capture: true })
    cleanups.push(() => window.removeEventListener(type, stop, { capture: true }))
  }

  const restore = (now: number) => {
    if (stopped) return
    if (started !== undefined && now - started >= 1000) {
      stop()
      return
    }
    const firstFrame = started === undefined
    started ??= now
    const delta = anchor.getBoundingClientRect().top - offset
    if (firstFrame || Math.abs(delta) > 1) {
      window.scrollBy({ top: delta, behavior: "instant" })
      stableFrames = 0
    } else {
      stableFrames++
    }
    // Two unchanged rendered frames also cover native history's deferred scroll.
    // The deadline is only a safety bound for stalled resources, not a delayed
    // scroll: each observed geometry change is corrected on the next frame.
    // Async layout changes after this 1s bound are left to native scroll anchoring.
    const settled = stableFrames >= 2 && pending.size === 0 && document.fonts?.status !== "loading"
    if (settled) stop()
    else frame = window.requestAnimationFrame(restore)
  }
  frame = window.requestAnimationFrame(restore)
  return stop
}

function enhanceFeed(container: HTMLElement, isBack: boolean) {
  const list = container.querySelector<HTMLElement>(".feed-list")
  const controls = container.querySelector<HTMLElement>(".feed-controls")
  const button = container.querySelector<HTMLButtonElement>(".feed-load-more")
  const status = container.querySelector<HTMLElement>(".feed-status")
  const announcement = container.querySelector<HTMLElement>(".feed-announcement")
  const sentinel = container.querySelector<HTMLElement>(".feed-sentinel")
  if (!list || !controls || !button || !status || !announcement || !sentinel) return
  if (list.dataset.feedInitialized === "true") return

  const cleanups: (() => void)[] = []
  const cards = Array.from(list.querySelectorAll<HTMLElement>(".feed-card"))
  let observer: IntersectionObserver | undefined
  let cancelRestore: (() => void) | undefined
  const reset = () => {
    observer?.disconnect()
    cancelRestore?.()
    cleanups.forEach((cleanup) => cleanup())
    delete list.dataset.feedInitialized
  }

  try {
    // Failed real images collapse completely; no artificial preview placeholders.
    list.querySelectorAll<HTMLImageElement>(".feed-card-image").forEach((image) => {
      const removeBrokenImage = () => {
        const row = image.closest(".feed-card-images")
        image.closest(".feed-card-image-link")?.remove()
        if (row && !row.querySelector(".feed-card-image")) row.remove()
      }
      if (image.complete && image.naturalWidth === 0) {
        removeBrokenImage()
      } else {
        image.addEventListener("error", removeBrokenImage, { once: true })
        cleanups.push(() => image.removeEventListener("error", removeBrokenImage))
      }
    })

    const parsedBatch = Number(list.dataset.batchSize)
    const batchSize =
      Number.isInteger(parsedBatch) && parsedBatch > 0 ? parsedBatch : DEFAULT_BATCH_SIZE
    // Store only per-path presentation state, never article URLs or search terms.
    const storageKey = `quartz-feed:${window.location.pathname}`
    let saved: FeedState | undefined
    try {
      const raw: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")
      if (
        raw &&
        typeof raw === "object" &&
        "visible" in raw &&
        typeof raw.visible === "number" &&
        Number.isInteger(raw.visible) &&
        raw.visible > 0
      ) {
        saved = raw as FeedState
      }
    } catch {
      // Storage may be denied, full, or contain an older version. Reading still works.
    }
    let visibleCount = Math.min(Math.max(saved?.visible ?? batchSize, batchSize), cards.length)
    const format = (template: string, added = 0) =>
      template
        .replaceAll("{visible}", String(visibleCount))
        .replaceAll("{total}", String(cards.length))
        .replaceAll("{remaining}", String(cards.length - visibleCount))
        .replaceAll("{added}", String(added))
    const updateControls = () => {
      const complete = visibleCount >= cards.length
      status.textContent = format(
        complete ? list.dataset.completeTemplate! : list.dataset.statusTemplate!,
      )
      button.hidden = complete
      sentinel.hidden = complete || !observer
      if (complete) observer?.disconnect()
    }
    const saveState = () => {
      const anchor = cards
        .slice(0, visibleCount)
        .findIndex((card) => card.getBoundingClientRect().bottom > 0)
      const state: FeedState = { visible: visibleCount }
      if (anchor >= 0) {
        state.anchor = anchor
        state.offset = Math.round(cards[anchor].getBoundingClientRect().top)
      }
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(state))
      } catch {
        // Persistence is optional, including in privacy-restricted browsers.
      }
    }
    const revealNextBatch = (userInitiated: boolean) => {
      const previousCount = visibleCount
      visibleCount = Math.min(visibleCount + batchSize, cards.length)
      for (let index = previousCount; index < visibleCount; index++) cards[index].hidden = false
      const added = visibleCount - previousCount
      updateControls()
      if (added) announcement.textContent = format(list.dataset.addedTemplate!, added)
      if (added && userInitiated) {
        const title = cards[previousCount].querySelector<HTMLAnchorElement>(".feed-card-title")
        title?.focus({ preventScroll: true })
        title?.scrollIntoView({ block: "nearest", inline: "nearest" })
      }
      saveState()
    }
    const onClick = () => revealNextBatch(true)
    button.addEventListener("click", onClick)
    cleanups.push(() => button.removeEventListener("click", onClick))
    window.addEventListener("pagehide", saveState)
    cleanups.push(() => window.removeEventListener("pagehide", saveState))

    // The button works without IntersectionObserver, including when construction fails.
    if (list.dataset.enhancement === "infinite" && typeof IntersectionObserver !== "undefined") {
      try {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) revealNextBatch(false)
          },
          { rootMargin: "200px 0px" },
        )
        observer.observe(sentinel)
      } catch {
        observer?.disconnect()
        observer = undefined
      }
    }

    // Validate all required server-rendered copy before hiding any static content.
    if (
      !list.dataset.statusTemplate ||
      !list.dataset.completeTemplate ||
      !list.dataset.addedTemplate
    ) {
      throw new Error("Missing feed status text")
    }
    window.addCleanup(() => {
      saveState()
      reset()
    })
    list.dataset.feedInitialized = "true"
    cards.forEach((card, index) => {
      card.hidden = index >= visibleCount
    })
    controls.hidden = cards.length === 0
    updateControls()

    if (
      isBack &&
      saved &&
      Number.isInteger(saved.anchor) &&
      saved.anchor! >= 0 &&
      saved.anchor! < visibleCount &&
      typeof saved.offset === "number" &&
      Number.isFinite(saved.offset)
    ) {
      cancelRestore = restoreFeedPosition(cards[saved.anchor!], saved.offset)
    }
  } catch {
    // Initialization failures must leave every static article available.
    reset()
    cards.forEach((card) => {
      card.hidden = false
    })
    controls.hidden = true
    sentinel.hidden = true
  }
}

let initialNavigation = true

document.addEventListener("nav", (event) => {
  const navigation = window.performance?.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined
  const isBack =
    Boolean(event.detail?.isBack) || (initialNavigation && navigation?.type === "back_forward")
  initialNavigation = false
  document.querySelectorAll<HTMLElement>(".feed-list-container").forEach((container) => {
    enhanceFeed(container, isBack)
  })
})
