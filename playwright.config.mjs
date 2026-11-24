// E2E, визуальные тесты и проверка доступности (Playwright). Браузер - установленный Microsoft Edge.
import { defineConfig } from '@playwright/test';

const PORT = 3200;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  // Все тесты работают с одним сервером и сбрасывают данные перед собой, поэтому идут по очереди
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'msedge',
    locale: 'ru-RU',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/server.cjs',
    url: `http://localhost:${PORT}/api/config`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
});
