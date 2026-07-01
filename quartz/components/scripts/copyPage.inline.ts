import * as QRCode from "qrcode"

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
const svgImage =
  '<svg aria-hidden="true" height="22" viewBox="0 0 24 24" version="1.1" width="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>'

type CopyFormat = "markdown" | "html"
type ShareAction = "wechat" | "timeline" | "poster" | "copy"
type WebShareNavigator = Navigator & {
  share?: (data: FileShareData) => Promise<void>
  canShare?: (data: FileShareData) => boolean
}
type FileShareData = ShareData & {
  files?: File[]
}
type PosterResult = {
  blob: Blob
  file: File
  objectUrl: string
}

document.addEventListener("nav", () => {
  const titleEl = document.querySelector<HTMLElement>(".article-title")
  if (!titleEl) return
  const articleTitle = titleEl

  // Don't insert duplicate buttons
  if (articleTitle.querySelector(".copy-page-control")) return

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
      <div class="share-page-poster" hidden>
        <img class="share-page-poster-image" alt="分享图片预览" />
        <a class="share-page-poster-download" download="xiaohui-share.png">保存分享图</a>
      </div>
      <div class="share-page-actions">
        <button type="button" data-share-action="wechat">
          <span class="share-page-action-icon wechat">${svgMessage}</span>
          <span>微信好友</span>
        </button>
        <button type="button" data-share-action="timeline">
          <span class="share-page-action-icon timeline">${svgTimeline}</span>
          <span>朋友圈</span>
        </button>
        <button type="button" data-share-action="poster">
          <span class="share-page-action-icon poster">${svgImage}</span>
          <span>保存图片</span>
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
  const sharePosterPreview = shareSheet.querySelector<HTMLElement>(".share-page-poster")!
  const sharePosterImage = shareSheet.querySelector<HTMLImageElement>(".share-page-poster-image")!
  const sharePosterDownload = shareSheet.querySelector<HTMLAnchorElement>(
    ".share-page-poster-download",
  )!

  let resetTimer: ReturnType<typeof setTimeout> | undefined
  let shareResetTimer: ReturnType<typeof setTimeout> | undefined
  let posterPromise: Promise<PosterResult> | undefined
  let cachedPoster: PosterResult | undefined
  let posterObjectUrl: string | undefined
  let disposed = false

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

  function articleExcerpt() {
    const paragraph = document.querySelector("article p")
    return paragraph?.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }

  function articleHeadingText() {
    const clone = articleTitle.cloneNode(true) as HTMLElement
    clone.querySelector(".copy-page-control")?.remove()
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }

  function stripSiteTitleSuffix(title: string) {
    return title.replace(/\s+\|\s+AI Agent\s*[·•]\s*MCP\s*(实践者|Practitioner)\s*$/i, "").trim()
  }

  function shareData(): ShareData {
    return {
      title:
        articleHeadingText() ||
        stripSiteTitleSuffix(metaContent('meta[property="og:title"]')) ||
        stripSiteTitleSuffix(document.title),
      text:
        metaContent('meta[property="og:description"]') ||
        metaContent('meta[name="description"]') ||
        articleExcerpt(),
      url: canonicalUrl(),
    }
  }

  function normalizeCanvasText(text: string, preserveBreaks = false) {
    const normalized = text.replace(/\r\n?/g, "\n")
    if (preserveBreaks) {
      return normalized
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    }

    return normalized.replace(/\s+/g, " ").trim()
  }

  function truncateText(text: string, maxLength: number, preserveBreaks = false) {
    const trimmed = normalizeCanvasText(text, preserveBreaks)
    let count = 0
    let result = ""

    for (const character of Array.from(trimmed)) {
      if (character !== "\n") count += 1
      if (count >= maxLength) return `${result.trimEnd()}…`
      result += character
    }

    return result
  }

  function wrapCanvasText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
    preserveBreaks = false,
  ) {
    const lines: string[] = []
    const paragraphs = normalizeCanvasText(text, preserveBreaks).split(preserveBreaks ? "\n" : /\n/)
    let truncated = false

    function addEllipsis() {
      let lastTextLineIndex = -1
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (lines[index].length > 0) {
          lastTextLineIndex = index
          break
        }
      }
      if (lastTextLineIndex < 0) return

      let shortened = lines[lastTextLineIndex]
      while (shortened.length > 0 && context.measureText(`${shortened}…`).width > maxWidth) {
        shortened = shortened.slice(0, -1)
      }
      lines[lastTextLineIndex] = `${shortened}…`
    }

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        if (preserveBreaks && lines.length < maxLines) lines.push("")
        continue
      }

      const units = Array.from(paragraph)
      let line = ""

      for (const unit of units) {
        const candidate = `${line}${unit}`
        if (context.measureText(candidate).width <= maxWidth || line.length === 0) {
          line = candidate
          continue
        }

        lines.push(line.trim())
        line = unit.trimStart()

        if (lines.length === maxLines) {
          truncated = true
          break
        }
      }

      if (truncated) break
      if (lines.length < maxLines && line) lines.push(line.trim())

      if (lines.length === maxLines) {
        const consumed = lines.join("").length >= paragraphs.join("").length
        truncated = !consumed
        break
      }
    }

    if (truncated) addEllipsis()

    return lines
  }

  function drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(x + width - radius, y)
    context.quadraticCurveTo(x + width, y, x + width, y + radius)
    context.lineTo(x + width, y + height - radius)
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    context.lineTo(x + radius, y + height)
    context.quadraticCurveTo(x, y + height, x, y + height - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.closePath()
  }

  function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Unable to load generated QR code."))
      image.src = src
    })
  }

  function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("Unable to render share image."))
        }
      }, "image/png")
    })
  }

  async function generateSharePoster() {
    const data = shareData()
    const url = data.url ?? canonicalUrl()
    const canvas = document.createElement("canvas")
    const width = 1200
    const height = 720
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is not supported in this browser.")

    const ink = "#111827"
    const muted = "#4b5563"
    const accent = "#2563eb"
    const panel = "#ffffff"
    const border = "#e5e7eb"
    const cardX = 52
    const cardY = 60
    const cardWidth = width - cardX * 2
    const cardHeight = height - cardY * 2
    const dividerX = 486
    const textX = 556
    const textWidth = 520

    context.fillStyle = "#f5f7fb"
    context.fillRect(0, 0, width, height)

    drawRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 32)
    context.fillStyle = panel
    context.fill()
    context.strokeStyle = border
    context.lineWidth = 2
    context.stroke()

    context.beginPath()
    context.moveTo(dividerX, 126)
    context.lineTo(dividerX, height - 126)
    context.stroke()

    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 300,
      color: {
        dark: ink,
        light: "#ffffff",
      },
    })
    const qrImage = await loadImage(qrDataUrl)

    drawRoundedRect(context, 118, 194, 332, 332, 28)
    context.fillStyle = "#ffffff"
    context.fill()
    context.drawImage(qrImage, 134, 210, 300, 300)

    context.fillStyle = ink
    context.font =
      '700 50px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    const titleLines = wrapCanvasText(context, String(data.title ?? document.title), textWidth, 3)
    titleLines.forEach((line, index) => {
      context.fillText(line, textX, 180 + index * 64)
    })

    context.fillStyle = muted
    context.font =
      '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    const titleBottom = 180 + Math.max(titleLines.length - 1, 0) * 64
    const description = truncateText(String(data.text ?? articleExcerpt()), 190, true)
    const descriptionLines = wrapCanvasText(context, description, textWidth, 6, true)
    descriptionLines.forEach((line, index) => {
      context.fillText(line, textX, titleBottom + 68 + index * 42)
    })

    context.fillStyle = accent
    context.font =
      '600 30px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    context.textAlign = "right"
    context.fillText("xiaohui.cool", cardX + cardWidth - 64, cardY + cardHeight - 64)
    context.textAlign = "start"

    const blob = await canvasToBlob(canvas)
    const objectUrl = URL.createObjectURL(blob)

    if (disposed) {
      URL.revokeObjectURL(objectUrl)
    } else {
      if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl)
      posterObjectUrl = objectUrl
    }

    return {
      blob,
      file: new File([blob], "xiaohui-share.png", { type: "image/png" }),
      objectUrl,
    }
  }

  async function ensureSharePoster() {
    setShareStatus("正在生成分享图…")
    const poster = await cacheSharePoster()
    showSharePoster(poster)
    return poster
  }

  function cacheSharePoster() {
    if (!posterPromise) {
      posterPromise = generateSharePoster()
        .then((poster) => {
          cachedPoster = poster
          return poster
        })
        .catch((error) => {
          posterPromise = undefined
          cachedPoster = undefined
          throw error
        })
    }

    return posterPromise
  }

  function showSharePoster(poster: PosterResult) {
    sharePosterPreview.hidden = false
    sharePosterImage.src = poster.objectUrl
    sharePosterDownload.href = poster.objectUrl
  }

  function warmSharePoster() {
    cacheSharePoster()
      .then((poster) => {
        sharePosterDownload.href = poster.objectUrl
      })
      .catch((error) => console.error(error))
  }

  function handlePosterError(error: unknown) {
    console.error(error)
    setShareStatus("当前浏览器无法生成分享图，请先复制链接。")
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
        ? "微信内会生成带二维码的分享图；长按保存后发送给好友或朋友圈。"
        : "微信分享会生成带二维码的图片；系统不支持图片分享时可保存后发送。"
      setShareStatus("")
      if (!posterObjectUrl) sharePosterPreview.hidden = true
      warmSharePoster()
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

  function trySharePosterFile(
    poster: PosterResult,
    statusMessage: string,
    fallbackMessage: string,
  ) {
    const data = shareData()
    const webShare = navigator as WebShareNavigator
    const fileShareData: FileShareData = { files: [poster.file] }
    const shareDataWithFile: FileShareData = {
      files: [poster.file],
      title: data.title,
      text: data.text,
    }

    if (
      !webShare.share ||
      (navigator.userActivation && !navigator.userActivation.isActive) ||
      (webShare.canShare && !webShare.canShare(fileShareData))
    ) {
      return false
    }

    try {
      void webShare
        .share(shareDataWithFile)
        .then(() => {
          showSharedState("已打开系统分享")
          setShareStatus(statusMessage)
        })
        .catch((error) => {
          if ((error as DOMException)?.name === "AbortError") return
          if ((error as DOMException)?.name !== "NotAllowedError") console.error(error)
          showSharePoster(poster)
          showSharedState("已生成分享图")
          setShareStatus(fallbackMessage)
        })
      return true
    } catch (error) {
      if ((error as DOMException)?.name !== "NotAllowedError") console.error(error)
      return false
    }
  }

  async function shareGeneratedPoster(target: "wechat" | "timeline") {
    try {
      const targetLabel = target === "wechat" ? "微信好友" : "朋友圈"
      const fallbackMessage =
        target === "wechat"
          ? "已生成分享图。长按图片保存后发送给微信好友。"
          : "已生成分享图。长按图片保存后发到朋友圈。"

      if (cachedPoster && !isWeChatBrowser()) {
        showSharePoster(cachedPoster)
        const sharing = trySharePosterFile(
          cachedPoster,
          `已打开系统分享。请选择${targetLabel}发送这张图片。`,
          fallbackMessage,
        )
        if (sharing) return
      }

      await ensureSharePoster()
      showSharedState("已生成分享图")
      setShareStatus(fallbackMessage)
    } catch (error) {
      handlePosterError(error)
    }
  }

  function shareToTimeline() {
    void shareGeneratedPoster("timeline")
  }

  function shareToWechat() {
    void shareGeneratedPoster("wechat")
  }

  function saveSharePoster() {
    ensureSharePoster()
      .then(() => {
        sharePosterDownload.click()
        showSharedState("已生成分享图")
        setShareStatus("分享图已生成；如果浏览器没有下载，请长按图片保存。")
      })
      .catch((error) => handlePosterError(error))
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
      case "poster":
        saveSharePoster()
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
    disposed = true
    button.removeEventListener("click", onButtonClick)
    shareButton.removeEventListener("click", onShareButtonClick)
    shareCloseButton.removeEventListener("click", onShareCloseClick)
    shareSheet.removeEventListener("click", onShareSheetClick)
    menu.removeEventListener("click", onMenuClick)
    document.removeEventListener("click", onDocumentClick)
    document.removeEventListener("keydown", onKeyDown)
    if (resetTimer) clearTimeout(resetTimer)
    if (shareResetTimer) clearTimeout(shareResetTimer)
    if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl)
    document.body.classList.remove("share-sheet-open")
    shareSheet.remove()
  })
  articleTitle.appendChild(control)
})

export {}
