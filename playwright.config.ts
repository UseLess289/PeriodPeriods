import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'fr-FR',
    timezoneId: 'UTC',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      name: 'chromium-iphone-emulation',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
