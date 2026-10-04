/** All article links are server-rendered. Pagination is a progressive enhancement. */
const DEFAULT_BATCH_SIZE = 10

interface FeedState {
  visible: number
  anchor?: number
  offset?: number
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
  let restoreFrame: number | undefined
  const reset = () => {
    observer?.disconnect()
    if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame)
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
      const anchor = cards[saved.anchor!]
      const offset = saved.offset
      restoreFrame = window.requestAnimationFrame(() => {
        window.scrollBy({ top: anchor.getBoundingClientRect().top - offset, behavior: "auto" })
      })
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
