#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, "../content")
const indexPath = path.join(contentDir, "index.md")

// Unsplash API configuration - read from environment variable
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

if (!UNSPLASH_ACCESS_KEY) {
  console.warn("⚠️  UNSPLASH_ACCESS_KEY not set. Using pre-selected photo IDs only.")
  console.warn("   To use dynamic Unsplash images, set UNSPLASH_ACCESS_KEY in your .env file")
}

// Curated Unsplash photo IDs for tech/coding themes
// These are hand-picked high-quality photos to avoid API rate limits
// Using actual photo hash IDs that work with Unsplash CDN
const unsplashPhotos = [
  {
    id: "1542831371-29b0f74f9713",
    alt: "lines of HTML codes",
  },
  {
    id: "1515879218367-8466d910aaa4",
    alt: "computer screen with code",
  },
  {
    id: "1562813733-b31f71025d54",
    alt: "man sitting facing laptop",
  },
  {
    id: "1555066931-4365d14bab8c",
    alt: "MacBook Pro with programming codes",
  },
  {
    id: "1461749280684-dccba630e2f6",
    alt: "monitor showing Java programming",
  },
  {
    id: "1498050108023-c5249f4df085",
    alt: "MacBook with lines of code on busy desk",
  },
  {
    id: "1614741118887-7a4ee193a5fa",
    alt: "black flat screen monitor with website",
  },
  {
    id: "1526374965328-7f61d4dc18c5",
    alt: "Matrix code visualization",
  },
]

// 精选作物 (Featured Posts)
const featuredPosts = [
  { title: "全流开发", slug: "program/full-stream/Full-Stream" },
  { title: "教育智慧", slug: "learning/wisdom/Education-Wisdom" },
  { title: "团队效能", slug: "learning/Team-Efficiency" },
  { title: "看见真相之后", slug: "learning/wisdom/After-I-Saw-The-Truth" },
  { title: "赛博农耕说明", slug: "Farming-in-the-cyber-world" },
]

// Get recent files
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
          slug: item.replace(".md", ""),
          mtime: stat.mtime,
        })
      }
    }
  }

  findMarkdownFiles(contentDir)

  // Sort by modification time and take latest 3
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, 3)
}

// Generate Unsplash URL for a photo
function getUnsplashUrl(photoId, width = 800, height = 600) {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&h=${height}&fit=crop&q=80`
}

// Map posts to images (cycling through available photos)
function mapPostsToImages(posts) {
  return posts.map((post, index) => {
    const photo = unsplashPhotos[index % unsplashPhotos.length]
    return {
      ...post,
      imageUrl: getUnsplashUrl(photo.id),
    }
  })
}

// Update homepage content
function updateHomepage() {
  const recentFiles = getRecentFiles()

  // Combine featured and recent posts
  const allPosts = [
    ...featuredPosts,
    ...recentFiles.map((f) => ({
      title: f.name.replace(/-/g, " "),
      slug: f.slug,
    })),
  ]

  // Map posts to Unsplash images
  const postsWithImages = mapPostsToImages(allPosts)

  // Generate TypeScript-compatible card data
  const cardsData = postsWithImages
    .map(
      (post) =>
        `    { title: "${post.title}", slug: "${post.slug}", imageUrl: "${post.imageUrl}" }`,
    )
    .join(",\n")

  const newContent = `---
title: 太阳总会升起
aliases:
  - index
  - home
---

<!-- This page uses the CardFeed component defined in quartz/components/CardFeed.tsx -->
<!-- Card data is injected via the layout configuration in quartz.layout.ts -->

<div id="card-feed-placeholder">
  <!-- Cards will be rendered here by the CardFeed component -->
</div>

<script async src="https://d3kno6bpmj270m.cloudfront.net/widget/userdesk.js" data-userdesk="clsok8vng0001aihcgmmbxfos"></script>

<script type="text/javascript"> (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window, document, "clarity", "script", "l799n31rgg"); </script>

<!--
Card Feed Data (for quartz.layout.ts):

Component.CardFeed({
  cards: [
${cardsData}
  ]
})
-->
`

  fs.writeFileSync(indexPath, newContent)

  // Also generate a cards-data.json for easier import
  const cardsDataPath = path.join(__dirname, "cards-data.json")
  fs.writeFileSync(
    cardsDataPath,
    JSON.stringify(
      {
        cards: postsWithImages,
      },
      null,
      2,
    ),
  )

  console.log("✅ Homepage updated successfully!")
  console.log(`📚 Total cards: ${postsWithImages.length}`)
  console.log(`📝 Featured posts: ${featuredPosts.length}`)
  console.log(`🆕 Recent posts: ${recentFiles.length}`)
  console.log(`📄 Card data saved to: ${cardsDataPath}`)
}

updateHomepage()
