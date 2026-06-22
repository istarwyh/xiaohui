let isReaderMode = true
let articleEndObserver: IntersectionObserver | undefined

const emitReaderModeChangeEvent = (mode: "on" | "off") => {
  const event: CustomEventMap["readermodechange"] = new CustomEvent("readermodechange", {
    detail: { mode },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
  document.documentElement.classList.remove("article-end-visible")
  articleEndObserver?.disconnect()

  const switchReaderMode = () => {
    isReaderMode = !isReaderMode
    const newMode = isReaderMode ? "on" : "off"
    document.documentElement.setAttribute("reader-mode", newMode)

    // 更新所有阅读模式按钮的 aria-pressed 属性
    for (const readerModeButton of document.getElementsByClassName("readermode")) {
      readerModeButton.setAttribute("aria-pressed", isReaderMode.toString())
    }

    emitReaderModeChangeEvent(newMode)
  }

  const article = document.querySelector("article")
  if (article && "IntersectionObserver" in window) {
    articleEndObserver = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        document.documentElement.classList.toggle("article-end-visible", isVisible)
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0,
      },
    )

    const marker = document.createElement("span")
    marker.setAttribute("aria-hidden", "true")
    marker.className = "article-end-observer"
    article.appendChild(marker)
    articleEndObserver.observe(marker)
    window.addCleanup(() => {
      articleEndObserver?.disconnect()
      articleEndObserver = undefined
      marker.remove()
      document.documentElement.classList.remove("article-end-visible")
    })
  }

  for (const readerModeButton of document.getElementsByClassName("readermode")) {
    readerModeButton.addEventListener("click", switchReaderMode)
    // 设置初始 aria-pressed 状态
    readerModeButton.setAttribute("aria-pressed", isReaderMode.toString())
    window.addCleanup(() => readerModeButton.removeEventListener("click", switchReaderMode))
  }

  // Set initial state
  document.documentElement.setAttribute("reader-mode", isReaderMode ? "on" : "off")
})
