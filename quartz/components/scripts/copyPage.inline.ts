const svgCopy =
  '<svg aria-hidden="true" height="20" viewBox="0 0 16 16" version="1.1" width="20" data-view-component="true"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>'
const svgCheck =
  '<svg aria-hidden="true" height="20" viewBox="0 0 16 16" version="1.1" width="20" data-view-component="true"><path fill-rule="evenodd" fill="rgb(63, 185, 80)" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>'
const svgChevron =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16"><path fill-rule="evenodd" d="M3.22 5.72a.75.75 0 011.06 0L8 9.44l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 6.78a.75.75 0 010-1.06z"></path></svg>'
const svgShare =
  '<svg aria-hidden="true" height="20" viewBox="0 0 24 24" version="1.1" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'
const svgClose =
  '<svg aria-hidden="true" height="20" viewBox="0 0 24 24" version="1.1" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
const svgMessage =
  '<svg aria-hidden="true" height="22" viewBox="0 0 24 24" version="1.1" width="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"></path></svg>'
const svgTimeline =
  '<svg aria-hidden="true" height="22" viewBox="0 0 24 24" version="1.1" width="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 0 0 18"></path><path d="M3 12h18"></path><path d="M12 3a9 9 0 0 1 0 18"></path></svg>'
const svgLink =
  '<svg aria-hidden="true" height="22" viewBox="0 0 24 24" version="1.1" width="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"></path></svg>'

type CopyFormat = "markdown" | "html"
type ShareAction = "wechat" | "timeline" | "system" | "copy"
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
  shareButton.ariaLabel = "打开分享面板"
  shareButton.title = "打开分享面板"
  shareButton.setAttribute("aria-haspopup", "dialog")
  shareButton.setAttribute("aria-expanded", "false")

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

  document.querySelector(".share-page-sheet")?.remove()

  const shareSheet = document.createElement("div")
  shareSheet.className = "share-page-sheet"
  shareSheet.hidden = true
  shareSheet.setAttribute("role", "dialog")
  shareSheet.setAttribute("aria-modal", "true")
  shareSheet.setAttribute("aria-label", "分享这篇文章")
  shareSheet.innerHTML = `
    <section class="share-page-panel">
      <div class="share-page-header">
        <strong>分享至</strong>
        <button class="share-page-close" type="button" aria-label="关闭分享面板" title="关闭分享面板">${svgClose}</button>
      </div>
      <div class="share-page-preview">
        <p class="share-page-preview-label">将分享</p>
        <h2 class="share-page-preview-title"></h2>
        <p class="share-page-preview-description"></p>
        <p class="share-page-preview-url"></p>
      </div>
      <p class="share-page-hint"></p>
      <div class="share-page-actions">
        <button type="button" data-share-action="wechat">
          <span class="share-page-action-icon wechat">${svgMessage}</span>
          <span>微信好友</span>
        </button>
        <button type="button" data-share-action="timeline">
          <span class="share-page-action-icon timeline">${svgTimeline}</span>
          <span>朋友圈</span>
        </button>
        <button type="button" data-share-action="system">
          <span class="share-page-action-icon system">${svgShare}</span>
          <span>系统分享</span>
        </button>
        <button type="button" data-share-action="copy">
          <span class="share-page-action-icon copy">${svgLink}</span>
          <span>复制链接</span>
        </button>
      </div>
      <p class="share-page-status" aria-live="polite"></p>
    </section>
  `
  document.body.appendChild(shareSheet)

  const shareCloseButton = shareSheet.querySelector<HTMLButtonElement>(".share-page-close")!
  const shareTitle = shareSheet.querySelector<HTMLElement>(".share-page-preview-title")!
  const shareDescription = shareSheet.querySelector<HTMLElement>(".share-page-preview-description")!
  const shareUrl = shareSheet.querySelector<HTMLElement>(".share-page-preview-url")!
  const shareHint = shareSheet.querySelector<HTMLElement>(".share-page-hint")!
  const shareStatus = shareSheet.querySelector<HTMLElement>(".share-page-status")!

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

  function shareData(): ShareData {
    return {
      title: metaContent('meta[property="og:title"]') || document.title,
      text:
        metaContent('meta[property="og:description"]') || metaContent('meta[name="description"]'),
      url: canonicalUrl(),
    }
  }

  function isWeChatBrowser() {
    return /MicroMessenger/i.test(navigator.userAgent)
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
      shareButton.ariaLabel = "打开分享面板"
      shareButton.title = "打开分享面板"
    }, 2000)
  }

  function setShareStatus(message: string) {
    shareStatus.textContent = message
  }

  function setShareSheetOpen(open: boolean) {
    shareSheet.hidden = !open
    shareButton.setAttribute("aria-expanded", String(open))
    document.body.classList.toggle("share-sheet-open", open)

    if (open) {
      const data = shareData()
      shareTitle.textContent = data.title ?? ""
      shareDescription.textContent = data.text ?? ""
      shareUrl.textContent = data.url ?? canonicalUrl()
      shareHint.textContent = isWeChatBrowser()
        ? "微信内请使用右上角菜单发送给好友或分享到朋友圈。"
        : "微信分享会优先尝试系统分享；不支持时会复制链接。"
      setShareStatus("")
      shareCloseButton.focus()
    } else {
      shareButton.focus()
    }
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

    copyText(source).then(
      () => {
        setMenuOpen(false)
        showCopiedState()
      },
      (error) => console.error(error),
    )
  }

  function useNativeShare(successLabel: string, fallbackLabel: string) {
    const data = shareData()
    const webShare = navigator as WebShareNavigator

    if (webShare.share && (!webShare.canShare || webShare.canShare(data))) {
      webShare
        .share(data)
        .then(() => {
          showSharedState(successLabel)
          setShareStatus(successLabel)
        })
        .catch((error) => {
          if (error?.name !== "AbortError") console.error(error)
        })
      return
    }

    copyText(data.url ?? canonicalUrl()).then(
      () => {
        showSharedState("链接已复制")
        setShareStatus(fallbackLabel)
      },
      (error) => console.error(error),
    )
  }

  function shareToWechat() {
    if (isWeChatBrowser()) {
      setShareStatus("请点右上角菜单，选择发送给朋友。")
      return
    }

    useNativeShare("已打开系统分享", "链接已复制。打开微信，粘贴给好友即可。")
  }

  function shareToTimeline() {
    if (isWeChatBrowser()) {
      setShareStatus("请点右上角菜单，选择分享到朋友圈。")
      return
    }

    copyText(canonicalUrl()).then(
      () => {
        showSharedState("链接已复制")
        setShareStatus("链接已复制。请在微信中打开链接，再用右上角菜单分享到朋友圈。")
      },
      (error) => console.error(error),
    )
  }

  function copyShareLink() {
    copyText(canonicalUrl()).then(
      () => {
        showSharedState("链接已复制")
        setShareStatus("链接已复制。")
      },
      (error) => console.error(error),
    )
  }

  function onShareAction(action: ShareAction) {
    switch (action) {
      case "wechat":
        shareToWechat()
        break
      case "timeline":
        shareToTimeline()
        break
      case "system":
        useNativeShare("已分享", "当前浏览器不支持系统分享，链接已复制。")
        break
      case "copy":
        copyShareLink()
        break
    }
  }

  function onButtonClick() {
    setMenuOpen(menu.hidden === true)
  }

  function onShareButtonClick() {
    setMenuOpen(false)
    setShareSheetOpen(true)
  }

  function onShareCloseClick() {
    setShareSheetOpen(false)
  }

  function onMenuClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const format = target.closest<HTMLButtonElement>("button[data-format]")?.dataset.format as
      | CopyFormat
      | undefined

    if (format) copy(format)
  }

  function onShareSheetClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (event.target === shareSheet) {
      setShareSheetOpen(false)
      return
    }

    const action = target.closest<HTMLButtonElement>("button[data-share-action]")?.dataset
      .shareAction as ShareAction | undefined
    if (action) onShareAction(action)
  }

  function onDocumentClick(event: MouseEvent) {
    if (!control.contains(event.target as Node)) setMenuOpen(false)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setMenuOpen(false)
      setShareSheetOpen(false)
    }
  }

  button.addEventListener("click", onButtonClick)
  shareButton.addEventListener("click", onShareButtonClick)
  shareCloseButton.addEventListener("click", onShareCloseClick)
  shareSheet.addEventListener("click", onShareSheetClick)
  menu.addEventListener("click", onMenuClick)
  document.addEventListener("click", onDocumentClick)
  document.addEventListener("keydown", onKeyDown)
  window.addCleanup(() => {
    button.removeEventListener("click", onButtonClick)
    shareButton.removeEventListener("click", onShareButtonClick)
    shareCloseButton.removeEventListener("click", onShareCloseClick)
    shareSheet.removeEventListener("click", onShareSheetClick)
    menu.removeEventListener("click", onMenuClick)
    document.removeEventListener("click", onDocumentClick)
    document.removeEventListener("keydown", onKeyDown)
    if (resetTimer) clearTimeout(resetTimer)
    if (shareResetTimer) clearTimeout(shareResetTimer)
    document.body.classList.remove("share-sheet-open")
    shareSheet.remove()
  })
  titleEl.appendChild(control)
})

export {}
