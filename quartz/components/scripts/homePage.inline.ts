/** Preserve the existing Chinese homepage services; no new providers or tracking IDs. */
document.addEventListener("nav", () => {
  if (document.body.dataset.layout !== "home" || document.body.dataset.slug !== "index") return
  if (!document.querySelector('script[data-userdesk="clsok8vng0001aihcgmmbxfos"]')) {
    const widget = document.createElement("script")
    widget.async = true
    widget.src = "https://d3kno6bpmj270m.cloudfront.net/widget/userdesk.js"
    widget.dataset.userdesk = "clsok8vng0001aihcgmmbxfos"
    widget.setAttribute("spa-preserve", "")
    document.head.append(widget)
  }
  if (!document.querySelector("script[data-home-clarity]")) {
    type ClarityQueue = ((...args: unknown[]) => void) & { q?: unknown[][] }
    const target = window as Window & { clarity?: ClarityQueue }
    target.clarity ??= Object.assign(
      (...args: unknown[]) => {
        target.clarity!.q!.push(args)
      },
      { q: [] as unknown[][] },
    )
    const clarity = document.createElement("script")
    clarity.async = true
    clarity.src = "https://www.clarity.ms/tag/l799n31rgg"
    clarity.dataset.homeClarity = "true"
    clarity.setAttribute("spa-preserve", "")
    document.head.append(clarity)
  }
})
