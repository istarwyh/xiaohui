#!/usr/bin/env node

/**
 * Post-install script to verify platform-specific git dependencies
 * Checks that @napi-rs/simple-git can load its native module for the current
 * platform and CPU architecture.
 */

import os from "node:os"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

const nativeModules = {
  "darwin-arm64": "@napi-rs/simple-git-darwin-arm64",
  "darwin-x64": "@napi-rs/simple-git-darwin-x64",
  "linux-x64": "@napi-rs/simple-git-linux-x64-gnu",
  "win32-x64": "@napi-rs/simple-git-win32-x64-msvc",
}

const platform = os.platform()
const arch = os.arch()
const target = `${platform}-${arch}`
const expectedModule = nativeModules[target]

try {
  require("@napi-rs/simple-git")
  console.log(`✅ Native git binding for ${target} loaded successfully`)
} catch (error) {
  const suggestion = expectedModule ? ` Run \`npm install\` to restore ${expectedModule}.` : ""
  console.error(`❌ Failed to load @napi-rs/simple-git for ${target}.${suggestion}`)
  console.error(error)
  process.exit(1)
}
