// 内容分析器（内联版本）
class ContentAnalyzer {
  private currentContext = {
    codeSnippets: [] as string[],
    techKeywords: [] as string[],
    programmingLanguage: "general",
    articleTopic: "general",
  }

  analyzeCurrentPage() {
    this.extractCodeSnippets()
    this.extractTechKeywords()
    this.detectProgrammingLanguage()
    this.detectArticleTopic()
    return this.currentContext
  }

  private extractCodeSnippets() {
    const codeBlocks = document.querySelectorAll("pre code, code")
    const snippets: string[] = []

    codeBlocks.forEach((block) => {
      const text = block.textContent || ""
      if (text.length > 10 && text.length < 100) {
        const lines = text.split("\n").filter((line) => line.trim().length > 0)
        lines.forEach((line) => {
          const trimmed = line.trim()
          if (this.isValidCodeSnippet(trimmed)) {
            snippets.push(trimmed)
          }
        })
      }
    })

    this.currentContext.codeSnippets = [...new Set(snippets)].slice(0, 20)
  }

  private isValidCodeSnippet(text: string): boolean {
    const codePatterns = [
      /function\s+\w+/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /if\s*\(/,
      /for\s*\(/,
      /return\s+/,
      /\w+\.\w+\(/,
      /\w+\s*=>\s*/,
      /async\s+/,
      /await\s+/,
    ]

    return codePatterns.some((pattern) => pattern.test(text)) && text.length > 5 && text.length < 80
  }

  private extractTechKeywords() {
    const content = document.body.textContent || ""
    const techKeywords = [
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "React",
      "Vue",
      "Node.js",
      "MySQL",
      "MongoDB",
      "Redis",
      "Docker",
      "Kubernetes",
      "AWS",
      "API",
      "算法",
      "数据结构",
      "前端",
      "后端",
      "数据库",
      "微服务",
      "人工智能",
    ]

    const foundKeywords = techKeywords.filter((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase()),
    )

    this.currentContext.techKeywords = foundKeywords.slice(0, 15)
  }

  private detectProgrammingLanguage() {
    const content = document.body.textContent || ""
    const codeBlocks = document.querySelectorAll('pre code[class*="language-"]')

    if (codeBlocks.length > 0) {
      const className = codeBlocks[0].className
      const langMatch = className.match(/language-(\w+)/)
      if (langMatch) {
        this.currentContext.programmingLanguage = langMatch[1]
        return
      }
    }

    const languagePatterns = {
      javascript: /function\s*\(|const\s+\w+\s*=|console\.log/,
      python: /def\s+\w+\(|import\s+\w+|print\(/,
      java: /public\s+class|System\.out\.println/,
      cpp: /#include\s*<|std::|cout\s*<</,
    }

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(content)) {
        this.currentContext.programmingLanguage = lang
        return
      }
    }
  }

  private detectArticleTopic() {
    const title = document.querySelector("h1")?.textContent || ""
    const content = document.body.textContent || ""
    const fullText = title + " " + content

    const topicPatterns = {
      algorithm: /算法|algorithm|leetcode|数据结构/i,
      frontend: /前端|frontend|react|vue|css|html/i,
      backend: /后端|backend|server|api|database/i,
      ai: /人工智能|AI|机器学习|深度学习/i,
    }

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(fullText)) {
        this.currentContext.articleTopic = topic
        return
      }
    }
  }

  getContextualWords(): string[] {
    const words: string[] = []
    words.push(...this.currentContext.codeSnippets)
    words.push(...this.currentContext.techKeywords)

    const languageWords = {
      javascript: ["function", "const", "let", "async", "await", "Promise"],
      python: ["def", "class", "import", "if", "for", "while"],
      java: ["public", "private", "static", "void", "class"],
      cpp: ["#include", "using", "namespace", "std", "cout"],
    }

    if (languageWords[this.currentContext.programmingLanguage]) {
      words.push(...languageWords[this.currentContext.programmingLanguage])
    }

    return [...new Set(words)].slice(0, 30)
  }
}

// 全局黑客帝国数字流效果
function initMatrixEffect() {
  // 检查用户是否设置了减少动画偏好
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (prefersReducedMotion) {
    console.log("⏸️ Matrix effect disabled: user prefers reduced motion")
    return
  }

  // 创建数字流背景容器
  const matrixBg = document.createElement("div")
  matrixBg.className = "matrix-bg"
  matrixBg.id = "matrix-bg"
  document.body.appendChild(matrixBg)

  // 初始化内容分析器
  const analyzer = new ContentAnalyzer()
  let contextualContent: string[] = []

  // 分析当前页面内容
  function analyzePageContent() {
    try {
      analyzer.analyzeCurrentPage()
      contextualContent = analyzer.getContextualWords()

      const context = analyzer.currentContext
      console.log("🔍 页面内容分析完成:", {
        codeSnippets: context.codeSnippets.length,
        techKeywords: context.techKeywords.length,
        language: context.programmingLanguage,
        topic: context.articleTopic,
        contextualWords: contextualContent.length,
      })

      // 更新调试面板
      updateDebugPanel(context)
    } catch (error) {
      console.warn("内容分析失败，使用默认字符集:", error)
      contextualContent = []
    }
  }

  // 更新调试面板
  function updateDebugPanel(context: any) {
    const debugLanguage = document.getElementById("debug-language")
    const debugTopic = document.getElementById("debug-topic")
    const debugSnippets = document.getElementById("debug-snippets")
    const debugSnippetsCount = document.getElementById("debug-snippets-count")
    const debugKeywords = document.getElementById("debug-keywords")
    const debugKeywordsCount = document.getElementById("debug-keywords-count")
    const debugChars = document.getElementById("debug-chars")

    if (debugLanguage) debugLanguage.textContent = context.programmingLanguage
    if (debugTopic) debugTopic.textContent = context.articleTopic

    if (debugSnippetsCount) debugSnippetsCount.textContent = context.codeSnippets.length.toString()
    if (debugSnippets) {
      debugSnippets.innerHTML = context.codeSnippets
        .slice(0, 10) // 只显示前10个
        .map((snippet: string) => `<div class="debug-item">${snippet}</div>`)
        .join("")
    }

    if (debugKeywordsCount) debugKeywordsCount.textContent = context.techKeywords.length.toString()
    if (debugKeywords) {
      debugKeywords.innerHTML = context.techKeywords
        .map((keyword: string) => `<div class="debug-item">${keyword}</div>`)
        .join("")
    }

    if (debugChars) {
      const allChars = contextualContent.join("").slice(0, 200) // 只显示前200个字符
      debugChars.textContent = allChars
    }
  }

  const chars =
    "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const codeChars =
    "function(){return;}class extends implements interface async await const let var if else for while do switch case break continue try catch finally throw new delete typeof instanceof in of with debugger"

  // 性能优化：节流函数
  function throttle(func: Function, limit: number) {
    let inThrottle: boolean
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // 页面可见性检测
  let isPageVisible = !document.hidden

  function getRandomChar() {
    // 优先使用页面相关内容 (40% 概率)
    if (contextualContent.length > 0 && Math.random() < 0.4) {
      const randomWord = contextualContent[Math.floor(Math.random() * contextualContent.length)]
      // 如果是长词汇，随机选择其中的字符
      if (randomWord.length > 1) {
        return randomWord[Math.floor(Math.random() * randomWord.length)]
      }
      return randomWord
    }

    // 使用代码字符 (30% 概率)
    if (Math.random() < 0.3) {
      const words = codeChars.split(" ")
      return words[Math.floor(Math.random() * words.length)]
    }

    // 使用默认字符集 (30% 概率)
    return chars[Math.floor(Math.random() * chars.length)]
  }

  function getRandomWord() {
    // 50% 概率返回页面相关的完整词汇
    if (contextualContent.length > 0 && Math.random() < 0.5) {
      return contextualContent[Math.floor(Math.random() * contextualContent.length)]
    }

    // 否则返回单个字符
    return getRandomChar()
  }

  function createColumn() {
    if (!isPageVisible) return // 页面不可见时不创建新的数字流

    const column = document.createElement("div")

    // 判断是否为上下文相关内容
    const hasContextualContent = contextualContent.length > 0
    const isContextualColumn = hasContextualContent && Math.random() < 0.3 // 30% 概率为上下文相关

    if (isContextualColumn) {
      // 上下文相关的数字流
      column.className = "matrix-rain contextual"
    } else {
      // 普通数字流
      const brightness = ["bright", "medium", "medium", "dim", "dim", "dim"]
      const randomBrightness = brightness[Math.floor(Math.random() * brightness.length)]
      column.className = `matrix-rain ${randomBrightness}`
    }

    column.style.left = Math.random() * 100 + "%"
    column.style.animationDuration = Math.random() * 4 + 3 + "s"
    column.style.animationDelay = Math.random() * 2 + "s"
    column.style.fontSize = Math.random() * 4 + 10 + "px"

    // 添加随机闪烁效果
    if (Math.random() < 0.1) {
      // 10% 概率闪烁
      column.style.animation += ", matrix-flicker 0.1s infinite alternate"
    }

    let text = ""
    const length = Math.floor(Math.random() * 25) + 15

    if (isContextualColumn) {
      // 上下文相关列主要显示相关内容
      for (let i = 0; i < length; i++) {
        if (Math.random() < 0.7) {
          // 70% 概率显示相关内容
          text += getRandomWord() + "<br>"
        } else {
          text += getRandomChar() + "<br>"
        }
      }
    } else {
      // 普通列
      for (let i = 0; i < length; i++) {
        if (Math.random() < 0.15) {
          // 15% 概率显示相关内容
          text += getRandomWord() + "<br>"
        } else {
          text += getRandomChar() + "<br>"
        }
      }
    }

    column.innerHTML = text
    matrixBg.appendChild(column)

    // 动画结束后移除元素
    setTimeout(() => {
      if (column.parentNode) {
        column.parentNode.removeChild(column)
      }
    }, 7000)
  }

  function createBurst() {
    // 偶尔创建一个"爆发"效果，同时生成多个数字流
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      setTimeout(createColumn, i * 50)
    }
  }

  // 检查是否为暗色主题
  function isDarkTheme() {
    return document.documentElement.getAttribute("saved-theme") === "dark"
  }

  let matrixInterval: number | null = null
  let burstInterval: number | null = null
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null
  let animationFrameId: number | null = null
  let lastColumnTime = 0
  const columnInterval = 150 // ms between columns

  function startMatrix() {
    if (!isDarkTheme()) return

    // 使用 requestAnimationFrame 代替 setInterval 以获得更好的性能
    function animate(currentTime: number) {
      if (!isPageVisible || !isDarkTheme()) {
        animationFrameId = requestAnimationFrame(animate)
        return
      }

      // 节流创建数字流
      if (currentTime - lastColumnTime >= columnInterval) {
        createColumn()
        lastColumnTime = currentTime
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    // 启动动画循环
    animationFrameId = requestAnimationFrame(animate)

    // 偶尔创建爆发效果
    burstInterval = window.setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% 概率
        createBurst()
      }
    }, 2000)

    // 添加鼠标交互效果（节流优化）
    mouseMoveHandler = throttle((e: MouseEvent) => {
      if (!isPageVisible) return

      if (Math.random() < 0.08) {
        // 8% 概率在鼠标附近创建数字流
        const column = document.createElement("div")
        column.className = "matrix-rain bright"
        column.style.left = (e.clientX / window.innerWidth) * 100 + "%"
        column.style.animationDuration = "2s"
        column.style.fontSize = "8px"
        column.style.zIndex = "999" // 确保鼠标触发的数字流在最前面

        let text = ""
        for (let i = 0; i < 5; i++) {
          // 鼠标交互时更倾向于显示相关内容
          if (Math.random() < 0.6) {
            text += getRandomWord() + "<br>"
          } else {
            text += getRandomChar() + "<br>"
          }
        }
        column.innerHTML = text

        matrixBg.appendChild(column)

        setTimeout(() => {
          if (column.parentNode) {
            column.parentNode.removeChild(column)
          }
        }, 2000)
      }
    }, 50) // 50ms 节流

    document.addEventListener("mousemove", mouseMoveHandler)
  }

  function stopMatrix() {
    // 停止 requestAnimationFrame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    if (matrixInterval) {
      clearInterval(matrixInterval)
      matrixInterval = null
    }
    if (burstInterval) {
      clearInterval(burstInterval)
      burstInterval = null
    }
    if (mouseMoveHandler) {
      document.removeEventListener("mousemove", mouseMoveHandler)
      mouseMoveHandler = null
    }

    // 清除现有的数字流
    const existingRains = matrixBg.querySelectorAll(".matrix-rain")
    existingRains.forEach((rain) => rain.remove())
  }

  // 监听主题变化
  function handleThemeChange() {
    if (isDarkTheme()) {
      startMatrix()
    } else {
      stopMatrix()
    }
  }

  // 创建调试切换按钮
  function createDebugToggle() {
    const toggleBtn = document.createElement("button")
    toggleBtn.innerHTML = "🔍"
    toggleBtn.className = "matrix-debug-toggle"
    toggleBtn.title = "显示/隐藏内容分析调试信息"
    toggleBtn.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #7cb342;
      color: #9acd32;
      padding: 0.5rem;
      border-radius: 50%;
      cursor: pointer;
      z-index: 1001;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 16px;
    `

    toggleBtn.addEventListener("mouseenter", () => {
      toggleBtn.style.background = "rgba(0, 15, 0, 0.9)"
      toggleBtn.style.boxShadow = "0 0 10px rgba(154, 205, 50, 0.3)"
    })

    toggleBtn.addEventListener("mouseleave", () => {
      toggleBtn.style.background = "rgba(0, 0, 0, 0.8)"
      toggleBtn.style.boxShadow = "none"
    })

    toggleBtn.addEventListener("click", () => {
      const debugPanel = document.getElementById("matrix-debug")
      if (debugPanel) {
        const isVisible = debugPanel.style.display !== "none"
        debugPanel.style.display = isVisible ? "none" : "block"
        toggleBtn.innerHTML = isVisible ? "🔍" : "❌"
      }
    })

    document.body.appendChild(toggleBtn)
  }

  // 初始化内容分析
  analyzePageContent()

  // 创建调试按钮（仅在开发环境或特定条件下）
  if (window.location.hostname === "localhost" || window.location.search.includes("debug=true")) {
    createDebugToggle()
  }

  // 初始化主题
  handleThemeChange()

  // 页面可见性变化监听
  document.addEventListener("visibilitychange", () => {
    isPageVisible = !document.hidden
    if (!isPageVisible) {
      // 页面不可见时暂停所有动画
      const allRains = matrixBg.querySelectorAll(".matrix-rain")
      allRains.forEach((rain) => {
        ;(rain as HTMLElement).style.animationPlayState = "paused"
      })
    } else {
      // 页面可见时恢复动画
      const allRains = matrixBg.querySelectorAll(".matrix-rain")
      allRains.forEach((rain) => {
        ;(rain as HTMLElement).style.animationPlayState = "running"
      })
    }
  })

  // 监听主题切换
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "saved-theme") {
        handleThemeChange()
      }
    })
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["saved-theme"],
  })

  // 页面导航时重新分析内容
  function handleNavigation() {
    // 延迟分析，确保新页面内容已加载
    setTimeout(() => {
      analyzePageContent()
      handleThemeChange()
    }, 500)
  }

  // 页面导航时重新初始化
  document.addEventListener("nav", handleNavigation)
}

// 页面加载完成后启动效果
document.addEventListener("DOMContentLoaded", initMatrixEffect)

// SPA 导航时重新初始化
document.addEventListener("nav", () => {
  // 延迟重新初始化，确保页面内容已更新
  setTimeout(initMatrixEffect, 300)
})
