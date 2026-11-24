// Настройки unit- и компонентных тестов (Vitest). E2E-тесты запускает Playwright: playwright.config.mjs
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/component/**/*.test.js'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      // Считаем покрытие логики сервера и чистых функций интерфейса
      include: ['server.js', 'server/**/*.js', 'public/js/utils.js'],
      exclude: ['server/game-content.js'],
      reporter: ['text', 'text-summary'],
    },
  },
});
