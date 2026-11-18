import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: false,
    viewport: { width: 1400, height: 860 },
    actionTimeout: 10000,
    video: 'on',
    launchOptions: {
      slowMo: 900,
      args: ['--window-position=0,0', '--window-size=1420,960'],
    },
  },
});
