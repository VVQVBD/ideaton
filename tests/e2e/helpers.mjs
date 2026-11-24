// Общие действия E2E-тестов
import { expect } from '@playwright/test';

// Токен преподавателя (PIN 1234 задаёт tests/e2e/server.cjs)
export async function teacherToken(request) {
  const r = await request.post('/api/teacher/login', { data: { pin: '1234' } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).token;
}

// Свежие демо-данные перед тестом
export async function resetData(request) {
  const token = await teacherToken(request);
  const r = await request.post('/api/reset', { data: {}, headers: { 'x-teacher-token': token } });
  expect(r.ok()).toBeTruthy();
}

// Вход: студент через демо-вход, преподаватель по токену. Язык русский, тема светлая.
export async function login(page, request, role = 'student', studentId = 's1') {
  const sess = role === 'teacher' ? { role: 'teacher', token: await teacherToken(request) } : { role: 'student', studentId };
  await page.addInitScript((s) => {
    // Только при первой загрузке вкладки: перезагрузка не должна стирать сохранённые настройки
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('lang', 'ru');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('session', JSON.stringify(s));
  }, sess);
}

// Дождаться, пока страница отрисуется и шрифты загрузятся
// (до первой отрисовки у #main тоже нет aria-busy, поэтому ждём ещё и содержимое без скелетона)
export async function ready(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector('#main');
    return main && main.children.length > 0 && !main.hasAttribute('aria-busy') && !main.querySelector('.skel-wrap') && document.fonts.status === 'loaded';
  });
}

// Меню: на компьютере колонка слева, на телефоне нижний таб-бар - в обоих случаях #sidebar
export const menu = (page) => page.locator('#sidebar');
