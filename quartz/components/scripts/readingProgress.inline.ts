/**
 * 阅读进度指示器脚本
 * 根据页面滚动位置更新进度条
 */

document.addEventListener("nav", () => {
  const progressBar = document.querySelector(".reading-progress-bar") as HTMLElement | null
  const progressContainer = document.querySelector(".reading-progress") as HTMLElement | null

  if (!progressBar || !progressContainer) return

  // 闭包中再次引用变量，让 TS 能保持窄化后的非空类型
  const bar = progressBar
  const container = progressContainer

  // 检查是否禁用了动画
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (prefersReducedMotion) {
    container.style.display = "none"
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
      bar.style.width = "100%"
      container.setAttribute("aria-valuenow", "100")
      return
    }

    // 计算进度百分比
    const progress = Math.min((scrollTop / scrollableHeight) * 100, 100)
    bar.style.width = `${progress}%`
    container.setAttribute("aria-valuenow", progress.toFixed(0))
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

  // 清理函数：在下次导航前移除事件监听器
  window.addCleanup(() => {
    window.removeEventListener("scroll", throttledUpdateProgress)
    window.removeEventListener("resize", throttledUpdateProgress)
  })
})
