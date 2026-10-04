/**
 * 首页 feeds 流无限滚动
 *
 * 静态站方案：构建时所有卡片已预渲染进 HTML，超出首批的卡片带
 * `feed-card--hidden` 类。这里用 Intersection Observer 监听底部哨兵元素，
 * 每次进入视口就移除下一批卡片的 hidden 类。
 */

const DEFAULT_BATCH_SIZE = 10

document.addEventListener("nav", () => {
  const list = document.getElementById("feed-list")
  const sentinel = document.getElementById("feed-sentinel")
  if (!list || !sentinel) return

  const parsedBatchSize = Number.parseInt(list.dataset.batchSize ?? "", 10)
  const batchSize =
    Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? parsedBatchSize : DEFAULT_BATCH_SIZE

  const cards = Array.from(list.querySelectorAll<HTMLElement>(".feed-card"))
  if (cards.length === 0) {
    sentinel.style.display = "none"
    return
  }

  let visibleCount = cards.findIndex((card) => card.classList.contains("feed-card--hidden"))
  if (visibleCount === -1) visibleCount = cards.length

  const revealNextBatch = () => {
    const next = Math.min(visibleCount + batchSize, cards.length)
    for (let i = visibleCount; i < next; i++) {
      cards[i].classList.remove("feed-card--hidden")
    }
    visibleCount = next
  }

  const finish = () => {
    observer.disconnect()
    sentinel.style.display = "none"
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      revealNextBatch()
      if (visibleCount >= cards.length) finish()
    },
    { rootMargin: "200px 0px" },
  )

  if (visibleCount >= cards.length) {
    sentinel.style.display = "none"
  } else {
    observer.observe(sentinel)
  }

  // SPA 导航离开首页时清理 observer，避免泄漏
  window.addCleanup(() => observer.disconnect())
})
