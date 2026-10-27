import { createShareMetadata } from "./shareMetadata"
import * as QRCode from "qrcode"
import { generateLongSharePoster } from "./sharePoster"
import { light, foundations } from "../../design/tokens"

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
type PosterFormat = "short" | "long"
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
  const english = document.documentElement.lang.startsWith("en")
  const tr = (zh: string, en: string) => (english ? en : zh)

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
  shareButton.ariaLabel = tr("打开分享面板", "Open share panel")
  shareButton.title = tr("打开分享面板", "Open share panel")
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
  markdownOption.textContent = tr("原始 Markdown", "Raw Markdown")

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
  shareSheet.setAttribute("aria-label", tr("分享这篇文章", "Share this article"))
  shareSheet.innerHTML = `
    <section class="share-page-panel">
      <div class="share-page-header">
        <strong>${tr("分享至", "Share to")}</strong>
        <button class="share-page-close" type="button" aria-label="${tr("关闭分享面板", "Close share panel")}" title="${tr("关闭分享面板", "Close share panel")}">${svgClose}</button>
      </div>
      <div class="share-page-preview">
        <p class="share-page-preview-label">${tr("将分享", "Sharing")}</p>
        <h2 class="share-page-preview-title"></h2>
        <p class="share-page-preview-description"></p>
        <p class="share-page-preview-url"></p>
      </div>
      <div class="share-page-formats" role="group" aria-label="${tr("分享图版式", "Share image format")}">
        <button type="button" data-poster-format="short" aria-pressed="true">${tr("二维码短卡", "QR card")}</button>
        <button type="button" data-poster-format="long" aria-pressed="false">${tr("长文分享图", "Full article image")}</button>
      </div>
      <p class="share-page-hint"></p>
      <div class="share-page-poster" hidden>
        <img class="share-page-poster-image" alt="${tr("分享图片预览", "Share image preview")}" />
        <a class="share-page-poster-download" data-router-ignore download="xiaohui-share.png">${tr("保存分享图", "Save share image")}</a>
      </div>
      <div class="share-page-actions">
        <button type="button" data-share-action="wechat">
          <span class="share-page-action-icon wechat">${svgMessage}</span>
          <span>${tr("微信好友", "WeChat friend")}</span>
        </button>
        <button type="button" data-share-action="timeline">
          <span class="share-page-action-icon timeline">${svgTimeline}</span>
          <span>${tr("朋友圈", "WeChat Moments")}</span>
        </button>
        <button type="button" data-share-action="poster">
          <span class="share-page-action-icon poster">${svgImage}</span>
          <span>${tr("保存图片", "Save image")}</span>
        </button>
        <button type="button" data-share-action="copy">
          <span class="share-page-action-icon copy">${svgLink}</span>
          <span>${tr("复制链接", "Copy link")}</span>
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
  const posters = new Map<PosterFormat, Promise<PosterResult>>()
  const cachedPosters = new Map<PosterFormat, PosterResult>()
  let posterFormat: PosterFormat = "short"
  // Every open, close, format switch or action invalidates older UI continuations.
  let shareRequest = 0
  let disposed = false
  const posterAbort = new AbortController()

  function setMenuOpen(open: boolean) {
    menu.hidden = !open
    button.setAttribute("aria-expanded", String(open))
  }

  function sourceFor(format: CopyFormat) {
    if (format === "markdown") {
      return markdownSource()
    }

    const article = document.querySelector("article")
    return article?.innerHTML ?? ""
  }

  const { shareUrlForPage, markdownSource, articleExcerpt, shareData } = createShareMetadata(
    document,
    articleTitle,
    () => location.href,
  )

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

  async function generateShortSharePoster() {
    const data = shareData()
    if (document.fonts?.ready) {
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        document.fonts.ready.catch(() => undefined),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 1200)
        }),
      ])
      clearTimeout(timer)
    }
    const url = data.url ?? shareUrlForPage()
    const canvas = document.createElement("canvas")
    const width = 1144
    const height = 632
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is not supported in this browser.")

    const ink = light["color-text-strong"]
    const muted = light["color-text-muted"]
    const accent = light["color-accent"]
    const border = light["color-border"]
    const panel = light["color-canvas"]
    const cardX = 0
    const cardY = 0
    const cardWidth = width
    const cardHeight = height
    const dividerX = 428
    const textX = 482
    const textRightPadding = 56
    const textWidth = cardX + cardWidth - textRightPadding - textX
    const qrBoxSize = 356
    const qrImageSize = 324
    const qrBoxX = cardX + 52
    const qrBoxY = (height - qrBoxSize) / 2
    const qrPadding = (qrBoxSize - qrImageSize) / 2
    const titleY = 122
    const titleLineHeight = 64

    context.fillStyle = panel
    context.fillRect(0, 0, width, height)

    drawRoundedRect(context, 1, 1, width - 2, height - 2, 30)
    context.fillStyle = panel
    context.fill()
    context.strokeStyle = border
    context.lineWidth = 2
    context.stroke()

    context.beginPath()
    context.moveTo(dividerX, cardY + 62)
    context.lineTo(dividerX, cardY + cardHeight - 62)
    context.stroke()

    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: qrImageSize,
      color: {
        dark: ink,
        light: light["color-surface-raised"],
      },
    })
    const qrImage = await loadImage(qrDataUrl)

    drawRoundedRect(context, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28)
    context.fillStyle = light["color-surface-raised"]
    context.fill()
    context.drawImage(qrImage, qrBoxX + qrPadding, qrBoxY + qrPadding, qrImageSize, qrImageSize)

    context.fillStyle = ink
    context.font = `700 50px ${foundations["font-body"]}`
    const titleLines = wrapCanvasText(context, String(data.title ?? document.title), textWidth, 3)
    titleLines.forEach((line, index) => {
      context.fillText(line, textX, titleY + index * titleLineHeight)
    })

    context.fillStyle = muted
    context.font = `400 28px ${foundations["font-body"]}`
    const titleBottom = titleY + Math.max(titleLines.length - 1, 0) * titleLineHeight
    const description = truncateText(String(data.text ?? articleExcerpt()), 220, true)
    const descriptionMaxLines = Math.min(6, Math.floor((height - 124 - titleBottom - 68) / 42) + 1)
    const descriptionLines = wrapCanvasText(
      context,
      description,
      textWidth,
      descriptionMaxLines,
      true,
    )
    descriptionLines.forEach((line, index) => {
      context.fillText(line, textX, titleBottom + 68 + index * 42)
    })

    context.fillStyle = accent
    context.font = `600 30px ${foundations["font-body"]}`
    context.textAlign = "right"
    context.fillText("xiaohui.cool", cardX + cardWidth - textRightPadding, cardY + cardHeight - 54)
    context.textAlign = "start"

    return canvasToBlob(canvas)
  }

  function currentShareRequest(request: number, format: PosterFormat) {
    return !disposed && !shareSheet.hidden && shareRequest === request && posterFormat === format
  }

  function cacheSharePoster(format: PosterFormat) {
    let pending = posters.get(format)
    if (!pending) {
      pending = (async () => {
        const data = shareData()
        const article = document.querySelector("article")
        if (format === "long" && !article) throw new Error("Article content is unavailable.")
        const blob =
          format === "long"
            ? await generateLongSharePoster({
                title: data.title ?? document.title,
                url: data.url ?? shareUrlForPage(),
                author: article?.getAttribute("data-share-author") || undefined,
                article: article!,
                signal: posterAbort.signal,
              })
            : await generateShortSharePoster()
        const objectUrl = URL.createObjectURL(blob)
        const poster = {
          blob,
          file: new File(
            [blob],
            format === "long" ? "xiaohui-long-share.png" : "xiaohui-share.png",
            { type: "image/png" },
          ),
          objectUrl,
        }
        if (disposed) URL.revokeObjectURL(objectUrl)
        else cachedPosters.set(format, poster)
        return poster
      })().catch((error) => {
        posters.delete(format)
        throw error
      })
      posters.set(format, pending)
    }
    return pending
  }

  function showSharePoster(poster: PosterResult) {
    sharePosterPreview.hidden = false
    sharePosterImage.src = poster.objectUrl
    sharePosterImage.alt =
      posterFormat === "long"
        ? tr("文章原文长图预览", "Full article image preview")
        : tr("二维码短卡预览", "QR card preview")
    sharePosterDownload.href = poster.objectUrl
    sharePosterDownload.download = poster.file.name
  }

  function warmSharePoster(request: number, format: PosterFormat) {
    setShareStatus(tr("正在生成分享图…", "Creating share image\u2026"))
    cacheSharePoster(format)
      .then((poster) => {
        if (!currentShareRequest(request, format)) return
        showSharePoster(poster)
        setShareStatus("")
      })
      .catch((error) => {
        if (currentShareRequest(request, format)) handlePosterError(error)
      })
  }

  function handlePosterError(error: unknown) {
    console.error(error)
    const detail =
      error instanceof Error && error.name === "SharePosterError" ? `${error.message} ` : ""
    setShareStatus(
      `${tr("分享图生成失败，", "Could not create the share image. ")}${detail}${tr("可以再次点击保存图片重试，或先复制链接。", "Try saving again, or copy the link.")}`,
    )
  }

  function selectPosterFormat(format: PosterFormat) {
    posterFormat = format
    shareSheet.dataset.posterFormat = format
    for (const option of shareSheet.querySelectorAll<HTMLButtonElement>("[data-poster-format]")) {
      option.setAttribute("aria-pressed", String(option.dataset.posterFormat === format))
    }
    sharePosterPreview.hidden = true
    sharePosterImage.removeAttribute("src")
    sharePosterDownload.removeAttribute("href")
    shareHint.textContent =
      format === "long"
        ? tr(
            "长图展示文章原文；过长时末尾渐隐，扫码可阅读全文。预览可向下滚动。",
            "The image includes the article text. Long articles fade at the end; scan the QR code to keep reading. Scroll to preview.",
          )
        : isWeChatBrowser()
          ? tr(
              "微信内长按图片保存后发送给好友或朋友圈。",
              "In WeChat, press and hold to save the image, then send it to a friend or Moments.",
            )
          : tr(
              "系统不支持图片分享时，可保存后发送。",
              "If image sharing is unavailable, save the image and send it yourself.",
            )
    warmSharePoster(++shareRequest, format)
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
      shareButton.ariaLabel = tr("打开分享面板", "Open share panel")
      shareButton.title = tr("打开分享面板", "Open share panel")
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
      shareUrl.textContent = data.url ?? shareUrlForPage()
      selectPosterFormat(posterFormat)
      shareCloseButton.focus()
    } else {
      shareRequest += 1
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
      if (!document.execCommand("copy")) throw new Error("Copy command was rejected.")
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
    request: number,
    format: PosterFormat,
  ) {
    const data = shareData()
    const webShare = navigator as WebShareNavigator
    const fileShareData: FileShareData = { files: [poster.file] }
    const shareDataWithFile: FileShareData = {
      files: [poster.file],
      title: data.title,
      text: data.text,
      url: data.url,
    }

    try {
      if (
        !webShare.share ||
        (navigator.userActivation && !navigator.userActivation.isActive) ||
        (webShare.canShare && !webShare.canShare(fileShareData))
      ) {
        return false
      }

      void webShare
        .share(shareDataWithFile)
        .then(() => {
          if (!currentShareRequest(request, format)) return
          showSharedState(tr("已打开系统分享", "Share dialog opened"))
          setShareStatus(statusMessage)
        })
        .catch((error) => {
          if (!currentShareRequest(request, format)) return
          if ((error as DOMException)?.name === "AbortError") return
          if ((error as DOMException)?.name !== "NotAllowedError") console.error(error)
          showSharePoster(poster)
          showSharedState(tr("已生成分享图", "Share image ready"))
          setShareStatus(fallbackMessage)
        })
      return true
    } catch (error) {
      if ((error as DOMException)?.name !== "NotAllowedError") console.error(error)
      return false
    }
  }

  async function shareGeneratedPoster(target: "wechat" | "timeline") {
    const request = ++shareRequest
    const format = posterFormat
    try {
      const targetLabel =
        target === "wechat" ? tr("微信好友", "WeChat friend") : tr("朋友圈", "WeChat Moments")
      const fallbackMessage =
        target === "wechat"
          ? tr(
              "已生成分享图。长按图片保存后发送给微信好友。",
              "Image ready. Save it and send it to a WeChat friend.",
            )
          : tr(
              "已生成分享图。长按图片保存后发到朋友圈。",
              "Image ready. Save it and post it to WeChat Moments.",
            )

      const cachedPoster = cachedPosters.get(format)
      if (cachedPoster && !isWeChatBrowser()) {
        showSharePoster(cachedPoster)
        setShareStatus("")
        const sharing = trySharePosterFile(
          cachedPoster,
          `${tr("已打开系统分享。请选择", "Share dialog opened. Select ")}${targetLabel}${tr("发送这张图片。", " to send this image.")}`,
          fallbackMessage,
          request,
          format,
        )
        if (sharing) return
      }

      setShareStatus(tr("正在生成分享图…", "Creating share image\u2026"))
      const poster = await cacheSharePoster(format)
      if (!currentShareRequest(request, format)) return
      showSharePoster(poster)
      showSharedState(tr("已生成分享图", "Share image ready"))
      setShareStatus(fallbackMessage)
    } catch (error) {
      if (currentShareRequest(request, format)) handlePosterError(error)
    }
  }

  function shareToTimeline() {
    void shareGeneratedPoster("timeline")
  }

  function shareToWechat() {
    void shareGeneratedPoster("wechat")
  }

  function saveSharePoster() {
    const request = ++shareRequest
    const format = posterFormat
    setShareStatus(tr("正在生成分享图…", "Creating share image\u2026"))
    cacheSharePoster(format)
      .then((poster) => {
        if (!currentShareRequest(request, format)) return
        showSharePoster(poster)
        sharePosterDownload.click()
        showSharedState(tr("已生成分享图", "Share image ready"))
        setShareStatus(
          tr(
            "分享图已生成；如果浏览器没有下载，请长按图片保存。",
            "Image ready. If the download did not start, press and hold to save it.",
          ),
        )
      })
      .catch((error) => {
        if (currentShareRequest(request, format)) handlePosterError(error)
      })
  }

  function copyShareLink() {
    const request = ++shareRequest
    const format = posterFormat
    copyText(shareUrlForPage()).then(
      () => {
        if (!currentShareRequest(request, format)) return
        showSharedState(tr("链接已复制", "Link copied"))
        setShareStatus(tr("链接已复制。", "Link copied."))
      },
      (error) => {
        console.error(error)
        if (currentShareRequest(request, format))
          setShareStatus(
            tr("复制失败，请从上方选取文章链接。", "Copy failed. Select the article link above."),
          )
      },
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
      CopyFormat | undefined

    if (format) copy(format)
  }

  function onShareSheetClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (event.target === shareSheet) {
      setShareSheetOpen(false)
      return
    }

    const format = target.closest<HTMLButtonElement>("button[data-poster-format]")?.dataset
      .posterFormat
    if (format === "short" || format === "long") {
      selectPosterFormat(format)
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
      if (!shareSheet.hidden) setShareSheetOpen(false)
    }
    if (event.key === "Tab" && !shareSheet.hidden) {
      const focusable = Array.from(
        shareSheet.querySelectorAll<HTMLElement>("button, a[href]"),
      ).filter((element) => !element.closest("[hidden]"))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
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
    posterAbort.abort()
    button.removeEventListener("click", onButtonClick)
    shareButton.removeEventListener("click", onShareButtonClick)
    shareCloseButton.removeEventListener("click", onShareCloseClick)
    shareSheet.removeEventListener("click", onShareSheetClick)
    menu.removeEventListener("click", onMenuClick)
    document.removeEventListener("click", onDocumentClick)
    document.removeEventListener("keydown", onKeyDown)
    if (resetTimer) clearTimeout(resetTimer)
    if (shareResetTimer) clearTimeout(shareResetTimer)
    for (const poster of cachedPosters.values()) URL.revokeObjectURL(poster.objectUrl)
    cachedPosters.clear()
    document.body.classList.remove("share-sheet-open")
    shareSheet.remove()
  })
  articleTitle.appendChild(control)
})

export {}
