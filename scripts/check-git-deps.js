#!/usr/bin/env node

/**
 * Post-install script to verify platform-specific git dependencies
 * Checks for @napi-rs/simple-git native modules based on the current platform
 */

import os from "os"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

const platformModules = {
  darwin: "@napi-rs/simple-git-darwin-x64",
  linux: "@napi-rs/simple-git-linux-x64-gnu",
  win32: "@napi-rs/simple-git-win32-x64-msvc",
}

const platform = os.platform()
const expectedModule = platformModules[platform]

if (!expectedModule) {
  console.log(`⚠️  Platform '${platform}' may not have native git support. Using fallback.`)
  process.exit(0)
}

try {
  require(expectedModule)
  console.log(`✅ Native git module for ${platform} loaded successfully`)
} catch (error) {
  console.log(`ℹ️  Platform-specific git module (${expectedModule}) not needed or using fallback`)
  // Don't fail the install - optional dependency can fail gracefully
}

process.exit(0)
