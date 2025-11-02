// 内容分析器 - 提取页面相关的代码片段和关键词
export interface ContentContext {
  codeSnippets: string[]
  techKeywords: string[]
  programmingLanguage: string
  articleTopic: string
}

export class ContentAnalyzer {
  private static instance: ContentAnalyzer
  private currentContext: ContentContext = {
    codeSnippets: [],
    techKeywords: [],
    programmingLanguage: "general",
    articleTopic: "general",
  }

  static getInstance(): ContentAnalyzer {
    if (!ContentAnalyzer.instance) {
      ContentAnalyzer.instance = new ContentAnalyzer()
    }
    return ContentAnalyzer.instance
  }

  // 分析当前页面内容
  analyzeCurrentPage(): ContentContext {
    this.extractCodeSnippets()
    this.extractTechKeywords()
    this.detectProgrammingLanguage()
    this.detectArticleTopic()

    return this.currentContext
  }

  // 提取代码片段
  private extractCodeSnippets(): void {
    const codeBlocks = document.querySelectorAll("pre code, code")
    const snippets: string[] = []

    codeBlocks.forEach((block) => {
      const text = block.textContent || ""
      if (text.length > 10 && text.length < 100) {
        // 提取有意义的代码片段
        const lines = text.split("\n").filter((line) => line.trim().length > 0)
        lines.forEach((line) => {
          const trimmed = line.trim()
          if (this.isValidCodeSnippet(trimmed)) {
            snippets.push(trimmed)
          }
        })
      }
    })

    this.currentContext.codeSnippets = [...new Set(snippets)].slice(0, 20) // 去重并限制数量
  }

  // 判断是否为有效的代码片段
  private isValidCodeSnippet(text: string): boolean {
    const codePatterns = [
      /function\s+\w+/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /return\s+/,
      /\w+\.\w+\(/,
      /\w+\s*=>\s*/,
      /async\s+/,
      /await\s+/,
      /@\w+/,
      /\$\w+/,
      /SELECT\s+.*FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+.*SET/i,
      /DELETE\s+FROM/i,
    ]

    return codePatterns.some((pattern) => pattern.test(text)) && text.length > 5 && text.length < 80
  }

  // 提取技术关键词
  private extractTechKeywords(): void {
    const content = document.body.textContent || ""
    const techKeywords = [
      // 编程语言
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
      "C#",
      "Go",
      "Rust",
      "PHP",
      "Ruby",
      // 框架和库
      "React",
      "Vue",
      "Angular",
      "Node.js",
      "Express",
      "Spring",
      "Django",
      "Flask",
      "Laravel",
      // 数据库
      "MySQL",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "Elasticsearch",
      "SQLite",
      // 云服务
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Jenkins",
      // 前端技术
      "HTML",
      "CSS",
      "SCSS",
      "Webpack",
      "Vite",
      "Babel",
      // 后端技术
      "API",
      "REST",
      "GraphQL",
      "gRPC",
      "WebSocket",
      "JWT",
      // 开发工具
      "Git",
      "GitHub",
      "GitLab",
      "VSCode",
      "IntelliJ",
      "Vim",
      // 概念
      "Algorithm",
      "DataStructure",
      "Design Pattern",
      "Microservice",
      "DevOps",
      "CI/CD",
      // AI/ML
      "AI",
      "Machine Learning",
      "Deep Learning",
      "Neural Network",
      "TensorFlow",
      "PyTorch",
      // 中文技术词汇
      "算法",
      "数据结构",
      "设计模式",
      "微服务",
      "容器化",
      "云原生",
      "人工智能",
      "机器学习",
      "前端",
      "后端",
      "全栈",
      "数据库",
      "缓存",
      "消息队列",
      "负载均衡",
      "高并发",
    ]

    const foundKeywords = techKeywords.filter((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase()),
    )

    this.currentContext.techKeywords = foundKeywords.slice(0, 15)
  }

  // 检测编程语言
  private detectProgrammingLanguage(): void {
    const content = document.body.textContent || ""
    const codeBlocks = document.querySelectorAll('pre code[class*="language-"]')

    // 从代码块的 class 中检测语言
    if (codeBlocks.length > 0) {
      const firstCodeBlock = codeBlocks[0]
      const className = firstCodeBlock.className
      const langMatch = className.match(/language-(\w+)/)
      if (langMatch) {
        this.currentContext.programmingLanguage = langMatch[1]
        return
      }
    }

    // 通过内容特征检测语言
    const languagePatterns = {
      javascript: /function\s*\(|const\s+\w+\s*=|=>\s*{|console\.log/,
      typescript: /interface\s+\w+|type\s+\w+\s*=|as\s+\w+/,
      python: /def\s+\w+\(|import\s+\w+|from\s+\w+\s+import|print\(/,
      java: /public\s+class|public\s+static\s+void|System\.out\.println/,
      cpp: /#include\s*<|std::|cout\s*<<|cin\s*>>/,
      go: /func\s+\w+\(|package\s+\w+|fmt\.Print/,
      rust: /fn\s+\w+\(|let\s+mut|println!/,
      php: /<\?php|echo\s+|var_dump\(/,
      sql: /SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET/i,
    }

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(content)) {
        this.currentContext.programmingLanguage = lang
        return
      }
    }
  }

  // 检测文章主题
  private detectArticleTopic(): void {
    const title = document.querySelector("h1")?.textContent || ""
    const content = document.body.textContent || ""

    const topicPatterns = {
      algorithm: /算法|algorithm|leetcode|数据结构|data structure|排序|搜索|动态规划/i,
      frontend: /前端|frontend|react|vue|angular|css|html|javascript|typescript/i,
      backend: /后端|backend|server|api|database|微服务|microservice/i,
      ai: /人工智能|AI|机器学习|machine learning|深度学习|deep learning|神经网络/i,
      devops: /devops|docker|kubernetes|jenkins|ci\/cd|部署|运维/i,
      database: /数据库|database|mysql|postgresql|mongodb|redis|sql/i,
      system: /系统|system|架构|architecture|分布式|distributed/i,
      mobile: /移动|mobile|android|ios|react native|flutter/i,
    }

    const fullText = title + " " + content

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(fullText)) {
        this.currentContext.articleTopic = topic
        return
      }
    }

    this.currentContext.articleTopic = "general"
  }

  // 获取当前上下文
  getCurrentContext(): ContentContext {
    return this.currentContext
  }

  // 获取上下文相关的字符集
  getContextualCharacters(): string {
    const context = this.currentContext
    let chars = ""

    // 添加代码片段中的字符
    context.codeSnippets.forEach((snippet) => {
      chars += snippet.replace(/\s+/g, "")
    })

    // 添加技术关键词
    context.techKeywords.forEach((keyword) => {
      chars += keyword.replace(/\s+/g, "")
    })

    // 根据编程语言添加特定字符
    const languageChars = {
      javascript: "function(){}const let var async await Promise.then().catch()console.log",
      typescript: "interface type extends implements as any unknown void never",
      python: "def class import from if elif else for while try except finally",
      java: "public private protected static void class extends implements",
      cpp: "#include using namespace std cout cin endl vector map set",
      go: "func package import var const if else for range make chan",
      rust: "fn let mut impl trait struct enum match Some None Ok Err",
      php: "<?php echo var_dump array function class extends implements",
      sql: "SELECT FROM WHERE JOIN INSERT UPDATE DELETE CREATE TABLE INDEX",
    }

    if (languageChars[context.programmingLanguage]) {
      chars += languageChars[context.programmingLanguage]
    }

    // 根据主题添加相关字符
    const topicChars = {
      algorithm: "sort search tree graph dp bfs dfs binary heap stack queue",
      frontend: "component props state hook effect render dom css html",
      backend: "server api endpoint middleware database cache session",
      ai: "neural network model train predict accuracy loss gradient",
      devops: "docker container image build deploy pipeline ci cd",
      database: "table index query join transaction acid nosql",
      system: "architecture scalable distributed microservice load balance",
      mobile: "activity fragment view controller navigation lifecycle",
    }

    if (topicChars[context.articleTopic]) {
      chars += topicChars[context.articleTopic]
    }

    // 去重并返回
    return [...new Set(chars.split(""))].join("")
  }

  // 获取上下文相关的完整词汇
  getContextualWords(): string[] {
    const context = this.currentContext
    const words: string[] = []

    // 添加代码片段
    words.push(...context.codeSnippets)

    // 添加技术关键词
    words.push(...context.techKeywords)

    // 根据编程语言添加常用词汇
    const languageWords = {
      javascript: ["function", "const", "let", "var", "async", "await", "Promise", "console.log"],
      typescript: ["interface", "type", "extends", "implements", "as", "any", "unknown"],
      python: ["def", "class", "import", "from", "if", "elif", "else", "for", "while"],
      java: ["public", "private", "static", "void", "class", "extends", "implements"],
      cpp: ["#include", "using", "namespace", "std", "cout", "cin", "endl"],
      go: ["func", "package", "import", "var", "const", "if", "else", "for"],
      rust: ["fn", "let", "mut", "impl", "trait", "struct", "enum", "match"],
      php: ["<?php", "echo", "function", "class", "extends", "implements"],
      sql: ["SELECT", "FROM", "WHERE", "JOIN", "INSERT", "UPDATE", "DELETE"],
    }

    if (languageWords[context.programmingLanguage]) {
      words.push(...languageWords[context.programmingLanguage])
    }

    return [...new Set(words)].slice(0, 30) // 去重并限制数量
  }
}
