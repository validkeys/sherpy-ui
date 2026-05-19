import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    channel: "chromium",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
    },
  },
});
