let isReaderMode = true

const emitReaderModeChangeEvent = (mode: "on" | "off") => {
  const event: CustomEventMap["readermodechange"] = new CustomEvent("readermodechange", {
    detail: { mode },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
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

  for (const readerModeButton of document.getElementsByClassName("readermode")) {
    readerModeButton.addEventListener("click", switchReaderMode)
    // 设置初始 aria-pressed 状态
    readerModeButton.setAttribute("aria-pressed", isReaderMode.toString())
    window.addCleanup(() => readerModeButton.removeEventListener("click", switchReaderMode))
  }

  // Set initial state
  document.documentElement.setAttribute("reader-mode", isReaderMode ? "on" : "off")
})
