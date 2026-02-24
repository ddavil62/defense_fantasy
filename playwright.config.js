import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3456',
    headless: true,
    viewport: { width: 360, height: 640 },
    screenshot: 'on',
  },
  reporter: 'list',
});
