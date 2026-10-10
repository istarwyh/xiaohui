import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  outputDir: `test-results/${process.env.SHARE_QA_RUN || "fixtures"}/playwright`,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: `test-results/${process.env.SHARE_QA_RUN || "fixtures"}/report`,
        open: "never",
      },
    ],
  ],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
})
