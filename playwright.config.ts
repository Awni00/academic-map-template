import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  workers: 1,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    // The homepage always exists; the RSS feed moves with writing.route and
    // is not built at all when rss.enabled is false, which left the suite
    // waiting on a 404 until the timeout.
    url: "http://127.0.0.1:4321/",
    reuseExistingServer: true,
    timeout: 180_000
  },
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } }
  ]
});
