document.addEventListener("nav", () => {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-brand-copy]")
  const status = document.querySelector<HTMLElement>(".brand-copy-status")
  for (const button of buttons) {
    const copy = async () => {
      const text = button.dataset.brandCopy
      if (!text || !status) return
      try {
        await navigator.clipboard.writeText(text)
        status.textContent = text.startsWith("#") ? `已复制色值 ${text}` : "引用代码已复制"
      } catch {
        status.textContent = "此浏览器无法自动复制，请直接选择色值或代码复制"
      }
    }
    button.addEventListener("click", copy)
    window.addCleanup(() => button.removeEventListener("click", copy))
  }
})
