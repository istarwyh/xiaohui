#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, "../content")
const indexPath = path.join(contentDir, "index.md")

// 精选作物池（可随机选择）
const featuredPosts = [
  "[[Farming in the cyber world|赛博农耕说明]]",
  "[[Full Stream|全流开发]]",
  "[[My Graduation Note Leaving Alibaba|阿里离职手记]]",
  "[[NARE (Nexus Agent Runtime Enviroment)]]",
  "[[忍不住看网络小说]]",
  "[[Truth]]",
  "[[AI时代的信息价值]]",
  "[[1050 每个月]]",
  "[[Team-Efficiency|团队效能]]",
  "[[Information-Handler|信息处理]]",
  "[[本科，硕士和博士的区别]]",
  "[[自我管理]]",
  "[[Good-Information-Channel|优质信息渠道]]",
  "[[Make Learning Happy|让学习快乐起来]]",
  "[[Education-Wisdom|教育智慧]]",
  "[[How-to-Choose-Note-Software|如何选择笔记软件]]",
  "[[一个人怎么建立独立的思维框架和逻辑体系]]",
  "[[After-I-Saw-The-Truth|看见真相之后]]",
  "[[Learning-Wisdom|学习智慧]]",
  "[[为什么要学文言文？]]",
  "[[为什么要学习基础知识？]]",
  "[[Information Diffusion|信息传播]]",
  "[[Frequently-Used-Prompt|常用提示词]]",
  "[[Interview Problem|面试问题]]",
  "[[自适应学习]]",
  "[[理性之外的教育方式]]",
  "[[Patent|专利]]",
  "[[演讲]]",
  "[[Create Once,Publish Where]]",
  "[[起个好名字多重要]]",
  "[[波特五力分析]]",
  "[[莫言：什么是真正的悲悯]]",
  "[[How the economic machine works by Ray Dalio|经济机器如何运作]]",
  "[[债权经济学]]",
  "[[708090|七零八零九零]]",
  "[[咳血的独角兽丨互联网幕后攻防]]",
]

// Hero文案池
const heroMessages = [
  "🌾 用代码播种 · 用思想灌溉",
  "🌱 在数字田野中耕耘智慧",
  "🚜 用技术犁地 · 用创意施肥",
  "🌳 代码如种子 · 思考如雨露",
  "⚡ 在赛博空间种植未来",
]

// 获取最新修改的markdown文件
function getRecentFiles() {
  const files = []

  function findMarkdownFiles(dir) {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory() && !item.startsWith(".") && item !== "templates") {
        findMarkdownFiles(fullPath)
      } else if (item.endsWith(".md") && item !== "index.md") {
        files.push({
          path: fullPath,
          name: item.replace(".md", ""),
          mtime: stat.mtime,
        })
      }
    }
  }

  findMarkdownFiles(contentDir)

  // 按修改时间排序，取最新的3个
  return files
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3)
    .map((f) => `- [[${f.name}]]`)
}

// 固定的精选作物（不再随机选择，保持首页稳定）
function getFeaturedPosts() {
  return [
    "[[Full Stream|全流开发]]",
    "[[Education-Wisdom|教育智慧]]",
    "[[Team-Efficiency|团队效能]]",
    "[[After-I-Saw-The-Truth|看见真相之后]]",
    "[[Farming in the cyber world|赛博农耕说明]]",
  ]
}

// 固定的Hero文案
function getHeroMessage() {
  return "🌾 用代码播种 · 用思想灌溉"
}

// 更新首页内容
function updateHomepage() {
  const recentFiles = getRecentFiles()
  const featuredItems = getFeaturedPosts()
  const heroMessage = getHeroMessage()

  const newContent = `---
title: 太阳总会升起
aliases:
  - index
  - home
---

<div class="hero">

<p class="typewriter">${heroMessage}</p>

</div>

<div class="content-wrapper">

## 🌟 精选作物

${featuredItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

</div>

<div class="content-wrapper">

## 🚜 最新耕作记录

${recentFiles.join("\n")}

</div>

<script async src="https://d3kno6bpmj270m.cloudfront.net/widget/userdesk.js" data-userdesk="clsok8vng0001aihcgmmbxfos"></script>

<script type="text/javascript"> (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window, document, "clarity", "script", "l799n31rgg"); </script>
`

  fs.writeFileSync(indexPath, newContent)
  console.log("✅ Homepage updated successfully!")
  console.log(`📝 Hero: ${heroMessage}`)
  console.log("📚 Featured posts:", featuredItems.length)
  console.log("🆕 Recent posts:", recentFiles.length)
}

updateHomepage()
