/**
 * 阅读进度指示器脚本
 * 根据页面滚动位置更新进度条
 */

function initReadingProgress() {
  const progressBar = document.querySelector(
    ".reading-progress-bar",
  ) as HTMLElement | null
  const progressContainer = document.querySelector(
    ".reading-progress",
  ) as HTMLElement | null

  if (!progressBar || !progressContainer) return

  // 检查是否禁用了动画
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (prefersReducedMotion) {
    progressContainer.style.display = "none"
    return
  }

  function updateProgress() {
    // 计算滚动进度
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const scrollTop = window.scrollY || document.documentElement.scrollTop

    // 计算可滚动区域（排除视口高度）
    const scrollableHeight = documentHeight - windowHeight

    if (scrollableHeight <= 0) {
      progressBar.style.width = "100%"
      progressContainer.setAttribute("aria-valuenow", "100")
      return
    }

    // 计算进度百分比
    const progress = Math.min((scrollTop / scrollableHeight) * 100, 100)
    progressBar.style.width = `${progress}%`
    progressContainer.setAttribute("aria-valuenow", progress.toFixed(0))
  }

  // 节流函数
  let ticking = false
  function throttledUpdateProgress() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress()
        ticking = false
      })
      ticking = true
    }
  }

  // 初始更新
  updateProgress()

  // 监听滚动事件
  window.addEventListener("scroll", throttledUpdateProgress, { passive: true })
  window.addEventListener("resize", throttledUpdateProgress, { passive: true })

  // SPA 导航时重新初始化
  document.addEventListener("nav", () => {
    setTimeout(updateProgress, 100)
  })
}

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", initReadingProgress)

// SPA 导航时重新初始化
document.addEventListener("nav", () => {
  setTimeout(initReadingProgress, 100)
})
