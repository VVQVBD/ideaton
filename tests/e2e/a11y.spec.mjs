// Доступность: axe на каждой странице, ноль серьёзных и критичных нарушений
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resetData, login, ready } from './helpers.mjs';

const PAGES = [
  ['вход', null, '/'],
  ['главная', 'student', '/#/home'], ['уроки', 'student', '/#/lessons'], ['курсы', 'student', '/#/courses'],
  ['рейтинг', 'student', '/#/rating'], ['урок', 'student', 'LESSON'],
  ['главная преподавателя', 'teacher', '/#/home'], ['открытый урок', 'teacher', '/#/game'],
  ['новый урок', 'teacher', '/#/create'], ['урок у преподавателя', 'teacher', 'LESSON'],
];

test.beforeEach(async ({ request }) => { await resetData(request); });

async function serious(page) {
  const r = await new AxeBuilder({ page }).analyze();
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

for (const [name, role, url] of PAGES) {
  test(`axe: ${name}`, async ({ page, request }) => {
    if (role) await login(page, request, role);
    let target = url;
    if (url === 'LESSON') target = '/#/lesson/' + (await (await request.get('/api/lessons')).json()).find((l) => l.notes).id;
    await page.goto(target);
    if (role) await ready(page); else await page.waitForSelector('.auth-card');
    expect(await serious(page)).toEqual([]);
  });
}

test('axe: открытое окно настроек', async ({ page, request }) => {
  await login(page, request);
  await page.goto('/#/home');
  await ready(page);
  await page.locator('.user-chip').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test('клавиатура: Tab доходит до меню и фокус виден', async ({ page, request }) => {
  await login(page, request);
  await page.goto('/#/home');
  await ready(page);
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.closest('#sidebar')) return false;
      const cs = getComputedStyle(el);
      return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
    });
  }
  expect(found).toBe(true);
});
