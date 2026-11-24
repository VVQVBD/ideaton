// Ключевые сценарии студента
import { test, expect } from '@playwright/test';
import { resetData, login, ready, menu } from './helpers.mjs';

test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await login(page, request);
});

// Урок, который студент s1 ещё не проходил и в котором есть вопросы
async function freshLesson(request) {
  const list = await (await request.get('/api/lessons?studentId=s1')).json();
  return list.find((l) => l.status === 'published' && !l.done && l.steps.some((s) => s.type === 'question'));
}

// Пройти урок в интерфейсе: конспект -> все шаги -> результат. На вопросы вводится эталонный ответ
async function passLesson(page, lesson) {
  await page.goto('/#/lesson/' + lesson.id);
  await ready(page);
  const main = page.locator('#main');
  if (lesson.notes) await main.getByRole('button', { name: 'Начать вопросы' }).click();
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i];
    const last = i === lesson.steps.length - 1;
    await expect(main.getByText(`Шаг ${i + 1} из ${lesson.steps.length}`)).toBeVisible();
    if (step.type === 'question') {
      await main.getByRole('textbox', { name: 'Твой ответ' }).fill(step.correctAnswer);
      await main.getByRole('button', { name: 'Проверить' }).click();
      await expect(main.locator('.feedback.ok')).toBeVisible();
    }
    await main.getByRole('button', { name: last ? 'Завершить урок' : 'Далее' }).click();
  }
  await expect(main.locator('.result')).toBeVisible();
}

test('1. главная -> Курсы -> курс -> урок', async ({ page, request }) => {
  const courses = await (await request.get('/api/courses')).json();
  const course = courses.find((c) => c.lessonsCount > 0);
  const lessons = (await (await request.get('/api/lessons')).json()).filter((l) => l.courseId === course.id && l.status === 'published');

  await page.goto('/#/home');
  await ready(page);
  await expect(page.locator('.home-hero')).toBeVisible();
  await menu(page).getByRole('button', { name: 'Курсы' }).click();
  await expect(page).toHaveURL(/#\/courses$/);

  const card = page.locator('.course-card', { has: page.getByRole('heading', { name: course.title }) });
  await card.getByRole('button', { name: 'Открыть уроки' }).click();
  await expect(page).toHaveURL(/#\/lessons$/);
  await expect(page.locator('.filter.active')).toHaveText(course.title);
  await expect(page.locator('.lesson-card')).toHaveCount(lessons.length);

  await page.getByRole('link', { name: lessons[0].title }).click();
  await expect(page).toHaveURL(new RegExp('#/lesson/' + lessons[0].id + '$'));
  await expect(page.locator('#main h1')).toHaveText(lessons[0].title);
});

test('2. пройти все шаги урока -> статус "Пройден" и баллы', async ({ page, request }) => {
  const lesson = await freshLesson(request);
  await passLesson(page, lesson);
  await expect(page.locator('.result .chip')).toHaveText('Урок пройден');
  await expect(page.locator('.result .big')).toContainText('100');

  await menu(page).getByRole('button', { name: 'Уроки' }).click();
  const card = page.locator('.lesson-card', { has: page.getByRole('link', { name: lesson.title }) });
  await expect(card.locator('.chip.green')).toHaveText('Пройден · 100');
  await expect(card.getByRole('button', { name: /Пройти ещё раз/ })).toBeVisible();
});

test('3. после урока рейтинг обновился', async ({ page, request }) => {
  const rowOf = async () => (await (await request.get('/api/rating')).json()).rows.find((r) => r.userId === 's1');
  const before = await rowOf();
  await passLesson(page, await freshLesson(request));
  const after = await rowOf();
  expect(after.lessons).toBe((before ? before.lessons : 0) + 1);
  expect(after.points).not.toBe(before && before.points);

  await menu(page).getByRole('button', { name: 'Рейтинг' }).click();
  await ready(page);
  // Строка студента (на подиуме или в таблице) показывает новые баллы
  const row = page.locator('.pod, .table tr').filter({ hasText: after.name });
  await expect(row).toContainText(String(after.points));
  await expect(row).toContainText(String(after.lessons));
});

test('4. настройки сохраняются после перезагрузки', async ({ page, request }) => {
  const users = await (await request.get('/api/users')).json();
  const other = users.find((u) => u.role === 'student' && u.id !== 's1');
  await page.goto('/#/home');
  await ready(page);

  // Тема
  await page.getByRole('button', { name: 'Сменить тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Студент в окне настроек
  await page.locator('.user-chip').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(other.id);
  // Язык
  await page.getByRole('button', { name: 'KZ' }).click();
  await expect(menu(page).getByRole('button', { name: 'Басты бет' })).toBeVisible();

  await page.reload();
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(menu(page).getByRole('button', { name: 'Басты бет' })).toBeVisible();
  const initials = other.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  await expect(page.locator('.user-chip .avatar')).toHaveText(initials);
});

test('5. навигация через меню по всем 5 разделам', async ({ page }) => {
  await page.goto('/#/home');
  await ready(page);
  const sections = [['Уроки', 'lessons', 'Уроки'], ['Курсы', 'courses', 'Курсы'], ['Рейтинг', 'rating', 'Рейтинг'], ['Главная', 'home', null]];
  for (const [name, hash, title] of sections) {
    const item = menu(page).getByRole('button', { name });
    await item.click();
    await expect(page).toHaveURL(new RegExp(`#/${hash}$`));
    await expect(item).toHaveAttribute('aria-current', 'page');
    await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1);
    if (title) await expect(page.locator('#main h1')).toHaveText(title);
    else await expect(page.locator('.home-hero')).toBeVisible();
  }
  await menu(page).getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
