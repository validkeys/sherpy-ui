import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5180",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
        }
      : undefined,
  },
});
