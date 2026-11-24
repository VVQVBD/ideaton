// Визуальные тесты: скриншот каждой страницы (375px - проект mobile, 1440px - проект desktop)
// и проверки меню: сплошной фон, не перекрывает контент.
import { test, expect } from '@playwright/test';
import { resetData, login, ready, menu } from './helpers.mjs';

const STUDENT_PAGES = [['home', '/#/home'], ['lessons', '/#/lessons'], ['courses', '/#/courses'], ['rating', '/#/rating'], ['lesson', null]];
const TEACHER_PAGES = [['teacher-home', '/#/home'], ['teacher-game', '/#/game'], ['teacher-create', '/#/create']];

// Меняющиеся со временем места (дата, месяц рейтинга) закрываем маской
const masks = (page) => [page.locator('.home-hero .eyebrow'), page.locator('select[data-change="ratingMonth"]')];

test.beforeEach(async ({ request }) => { await resetData(request); });

test('экран входа', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.querySelector('.auth-card'));
  await expect(page).toHaveScreenshot('auth.png');
});

for (const [name, url] of STUDENT_PAGES) {
  test(`студент: ${name}`, async ({ page, request }) => {
    await login(page, request);
    let target = url;
    if (!target) {
      const list = await (await request.get('/api/lessons')).json();
      target = '/#/lesson/' + list.find((l) => l.notes).id;
    }
    await page.goto(target);
    await ready(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { mask: masks(page) });
  });
}

for (const [name, url] of TEACHER_PAGES) {
  test(`преподаватель: ${name}`, async ({ page, request }) => {
    await login(page, request, 'teacher');
    await page.goto(url);
    await ready(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { mask: masks(page) });
  });
}

test('меню: сплошной непрозрачный фон, рамка и тень', async ({ page, request }) => {
  await login(page, request);
  await page.goto('/#/home');
  await ready(page);
  const s = await menu(page).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, img: cs.backgroundImage, opacity: cs.opacity, backdrop: cs.backdropFilter, border: cs.borderTopWidth, shadow: cs.boxShadow, z: cs.zIndex };
  });
  expect(s.bg).toBe('rgb(17, 17, 17)');
  expect(s.img).toBe('none');
  expect(s.opacity).toBe('1');
  expect(['none', '']).toContain(s.backdrop);
  expect(s.border).toBe('3px');
  expect(s.shadow).toContain('6px 6px 0px');
  expect(s.z).toBe('50');
});

test('меню не перекрывает конец страницы', async ({ page, request }) => {
  await login(page, request);
  for (const url of ['/#/home', '/#/lessons', '/#/rating']) {
    await page.goto(url);
    await ready(page);
    // Прокручиваем до самого низа (на компьютере прокручивается колонка #main, на телефоне - страница)
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const m = document.getElementById('main'); m.scrollTop = m.scrollHeight; });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#main > *')].filter((el) => el.getBoundingClientRect().height > 0);
      const last = items[items.length - 1].getBoundingClientRect();
      const nav = document.getElementById('sidebar').getBoundingClientRect();
      const fixed = getComputedStyle(document.getElementById('sidebar')).position === 'fixed';
      return { lastBottom: last.bottom, navTop: nav.top, fixed };
    });
    if (r.fixed) expect(r.lastBottom, url).toBeLessThanOrEqual(r.navTop);
  }
});
