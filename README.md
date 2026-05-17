# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>

## Environment Setup

This site uses environment variables for configuration. Follow these steps to set up your local development environment:

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Unsplash API (Optional)

The homepage card feed can use [Unsplash](https://unsplash.com) images. This is **optional** - the site will work without it using pre-selected photo IDs.

**To enable dynamic Unsplash image selection:**

1. Create a free account at [Unsplash Developers](https://unsplash.com/developers)
2. Create a new application to get your API key
3. Add your API key to `.env`:

```bash
UNSPLASH_ACCESS_KEY=your_actual_api_key_here
```

**If you don't set the API key:**

- The site will still work perfectly
- The `update-homepage.js` script uses curated, pre-selected Unsplash photo IDs
- You'll see a warning message during build (this is normal and safe to ignore)

### 3. Build the Site

```bash
npm install
npm run build
```

### Security Notes

- ✅ `.env` files are excluded from Git (see `.gitignore`)
- ✅ Never commit API keys to the repository
- ✅ The `.env.example` file contains placeholders only, not real credentials
