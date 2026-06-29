const svgCopy =
  '<svg aria-hidden="true" height="20" viewBox="0 0 16 16" version="1.1" width="20" data-view-component="true"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>'
const svgCheck =
  '<svg aria-hidden="true" height="20" viewBox="0 0 16 16" version="1.1" width="20" data-view-component="true"><path fill-rule="evenodd" fill="rgb(63, 185, 80)" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>'
const svgChevron =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16"><path fill-rule="evenodd" d="M3.22 5.72a.75.75 0 011.06 0L8 9.44l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 6.78a.75.75 0 010-1.06z"></path></svg>'
const svgShare =
  '<svg aria-hidden="true" height="20" viewBox="0 0 24 24" version="1.1" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'

type CopyFormat = "markdown" | "html"
type WebShareNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

document.addEventListener("nav", () => {
  const titleEl = document.querySelector(".article-title")
  if (!titleEl) return

  // Don't insert duplicate buttons
  if (titleEl.querySelector(".copy-page-control")) return

  const control = document.createElement("span")
  control.className = "copy-page-control"

  const button = document.createElement("button")
  button.className = "copy-page-button"
  button.type = "button"
  button.innerHTML = `${svgCopy}${svgChevron}`
  button.ariaLabel = "Copy article"
  button.title = "Copy article"
  button.setAttribute("aria-haspopup", "menu")
  button.setAttribute("aria-expanded", "false")

  const shareButton = document.createElement("button")
  shareButton.className = "share-page-button"
  shareButton.type = "button"
  shareButton.innerHTML = svgShare
  shareButton.ariaLabel = "分享链接"
  shareButton.title = "分享链接"

  const menu = document.createElement("span")
  menu.className = "copy-page-menu"
  menu.setAttribute("role", "menu")
  menu.hidden = true

  const markdownOption = document.createElement("button")
  markdownOption.type = "button"
  markdownOption.setAttribute("role", "menuitem")
  markdownOption.dataset.format = "markdown"
  markdownOption.textContent = "原始 Markdown"

  const htmlOption = document.createElement("button")
  htmlOption.type = "button"
  htmlOption.setAttribute("role", "menuitem")
  htmlOption.dataset.format = "html"
  htmlOption.textContent = "HTML"

  menu.append(markdownOption, htmlOption)
  control.append(button, shareButton, menu)

  let resetTimer: ReturnType<typeof setTimeout> | undefined
  let shareResetTimer: ReturnType<typeof setTimeout> | undefined

  function setMenuOpen(open: boolean) {
    menu.hidden = !open
    button.setAttribute("aria-expanded", String(open))
  }

  function sourceFor(format: CopyFormat) {
    if (format === "markdown") {
      const source = document.querySelector<HTMLTextAreaElement>("#copy-page-markdown-source")
      return source?.value ?? ""
    }

    const article = document.querySelector("article")
    return article?.innerHTML ?? ""
  }

  function canonicalUrl() {
    return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href
  }

  function metaContent(selector: string) {
    return document.querySelector<HTMLMetaElement>(selector)?.content ?? ""
  }

  function showCopiedState() {
    button.blur()
    button.innerHTML = `${svgCheck}${svgChevron}`
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      button.innerHTML = `${svgCopy}${svgChevron}`
    }, 2000)
  }

  function showSharedState(label: string) {
    shareButton.blur()
    shareButton.innerHTML = svgCheck
    shareButton.ariaLabel = label
    shareButton.title = label
    if (shareResetTimer) clearTimeout(shareResetTimer)
    shareResetTimer = setTimeout(() => {
      shareButton.innerHTML = svgShare
      shareButton.ariaLabel = "分享链接"
      shareButton.title = "分享链接"
    }, 2000)
  }

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text)
    }

    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()

    try {
      document.execCommand("copy")
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    } finally {
      textarea.remove()
    }
  }

  function copy(format: CopyFormat) {
    const source = sourceFor(format)
    if (!source) return

    navigator.clipboard.writeText(source).then(
      () => {
        setMenuOpen(false)
        showCopiedState()
      },
      (error) => console.error(error),
    )
  }

  function sharePage() {
    const url = canonicalUrl()
    const shareData: ShareData = {
      title: metaContent('meta[property="og:title"]') || document.title,
      text:
        metaContent('meta[property="og:description"]') || metaContent('meta[name="description"]'),
      url,
    }
    const webShare = navigator as WebShareNavigator

    if (webShare.share && (!webShare.canShare || webShare.canShare(shareData))) {
      webShare
        .share(shareData)
        .then(() => showSharedState("已分享"))
        .catch((error) => {
          if (error?.name !== "AbortError") console.error(error)
        })
      return
    }

    copyText(url).then(
      () => showSharedState("链接已复制"),
      (error) => console.error(error),
    )
  }

  function onButtonClick() {
    setMenuOpen(menu.hidden === true)
  }

  function onMenuClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const format = target.closest<HTMLButtonElement>("button[data-format]")?.dataset.format as
      | CopyFormat
      | undefined

    if (format) copy(format)
  }

  function onDocumentClick(event: MouseEvent) {
    if (!control.contains(event.target as Node)) setMenuOpen(false)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") setMenuOpen(false)
  }

  button.addEventListener("click", onButtonClick)
  shareButton.addEventListener("click", sharePage)
  menu.addEventListener("click", onMenuClick)
  document.addEventListener("click", onDocumentClick)
  document.addEventListener("keydown", onKeyDown)
  window.addCleanup(() => {
    button.removeEventListener("click", onButtonClick)
    shareButton.removeEventListener("click", sharePage)
    menu.removeEventListener("click", onMenuClick)
    document.removeEventListener("click", onDocumentClick)
    document.removeEventListener("keydown", onKeyDown)
    if (resetTimer) clearTimeout(resetTimer)
    if (shareResetTimer) clearTimeout(shareResetTimer)
  })
  titleEl.appendChild(control)
})

export {}
