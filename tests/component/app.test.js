// @vitest-environment jsdom
// Компонентные тесты интерфейса: настоящие index.html, utils.js, fx.js и app.js в jsdom.
// fetch уходит в настоящий Express-сервер (через supertest) на временной копии демо-данных.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { screen, within, waitFor, fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
require('../helpers/data-dir.cjs').useTempDataDir();
const request = require('supertest');
const app = require('../../server.js');
const db = require('../../server/db');

const PUB = path.join(__dirname, '..', '..', 'public');
let failPaths = []; // пути, на которых API "падает" (для проверки состояния ошибки)

// fetch из браузера -> запрос к Express-приложению
async function fakeFetch(url, opt = {}) {
  const u = new URL(url, 'http://localhost:3000');
  if (failPaths.some((p) => u.pathname.startsWith(p))) return { ok: false, status: 500, json: async () => ({ error: 'Сервер недоступен' }) };
  if (u.pathname.startsWith('/i18n/')) {
    const data = JSON.parse(fs.readFileSync(path.join(PUB, u.pathname), 'utf8'));
    return { ok: true, status: 200, json: async () => data };
  }
  let req = request(app)[(opt.method || 'GET').toLowerCase()](u.pathname + u.search);
  Object.entries(opt.headers || {}).forEach(([k, v]) => { req = req.set(k, v); });
  const r = await (opt.body ? req.send(JSON.parse(opt.body)) : req);
  return { ok: r.status < 400, status: r.status, json: async () => r.body };
}

const sidebar = () => within(document.getElementById('sidebar'));
const main = () => within(document.getElementById('main'));
const go = (hash) => { window.location.hash = hash; };

beforeAll(async () => {
  vi.stubGlobal('fetch', fakeFetch);
  localStorage.setItem('lang', 'ru');
  localStorage.setItem('session', JSON.stringify({ role: 'student', studentId: 's1' }));
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  document.body.innerHTML = html.split('<body>')[1].split('</body>')[0].replace(/<script[\s\S]*?<\/script>/g, '');
  for (const f of ['js/utils.js', 'js/fx.js', 'js/app.js']) {
    new Function(fs.readFileSync(path.join(PUB, f), 'utf8'))();
  }
  await waitFor(() => expect(document.querySelector('.home-hero')).toBeTruthy(), { timeout: 5000 });
});

beforeEach(() => { failPaths = []; });

describe('меню', () => {
  it('пять пунктов для студента, активна "Главная"', () => {
    const names = sidebar().getAllByRole('button').map((b) => b.textContent.trim());
    expect(names).toEqual(['Главная', 'Уроки', 'Курсы', 'Рейтинг', 'Настройки']);
    const active = sidebar().getByRole('button', { name: 'Главная' });
    expect(active.classList.contains('active')).toBe(true);
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('клик по пункту меняет страницу и подсвечивает новый пункт', async () => {
    await userEvent.click(sidebar().getByRole('button', { name: 'Рейтинг' }));
    await waitFor(() => expect(window.location.hash).toBe('#/rating'));
    await waitFor(() => expect(main().getByRole('heading', { level: 1 }).textContent).toBe('Рейтинг'));
    expect(sidebar().getByRole('button', { name: 'Рейтинг' }).getAttribute('aria-current')).toBe('page');
    expect(sidebar().getByRole('button', { name: 'Главная' }).getAttribute('aria-current')).toBeNull();
  });
});

describe('карточка урока и бейджи статуса', () => {
  let lessons;
  beforeAll(async () => {
    lessons = (await fakeFetch('/api/lessons?studentId=s1').then((r) => r.json())).filter((l) => l.status === 'published');
    go('#/lessons');
    await waitFor(() => expect(document.querySelectorAll('.lesson-card').length).toBe(lessons.length));
  });

  it('у каждой карточки число шагов и ссылка на урок', () => {
    lessons.forEach((l) => {
      const link = main().getByRole('link', { name: l.title });
      expect(link.getAttribute('href')).toBe('#/lesson/' + l.id);
      const card = link.closest('.lesson-card');
      expect(card.textContent).toContain(`Шагов: ${l.steps.length}`);
    });
  });

  it('пройденный урок: зелёный бейдж "Пройден · балл" и кнопка "Пройти ещё раз"', () => {
    const done = lessons.find((l) => l.done);
    const card = main().getByRole('link', { name: done.title }).closest('.lesson-card');
    const badge = card.querySelector('.chip.green');
    expect(badge.textContent).toBe(`Пройден · ${done.myScore}`);
    expect(within(card).getByRole('button', { name: /Пройти ещё раз/ })).toBeTruthy();
  });

  it('непройденный урок: без бейджа, кнопка "Начать"', () => {
    const todo = lessons.find((l) => !l.done);
    const card = main().getByRole('link', { name: todo.title }).closest('.lesson-card');
    expect(card.querySelector('.chip.green')).toBeNull();
    expect(within(card).getByRole('button', { name: /Начать/ })).toBeTruthy();
  });

  it('клик по кнопке карточки открывает урок', async () => {
    const todo = lessons.find((l) => !l.done);
    const card = main().getByRole('link', { name: todo.title }).closest('.lesson-card');
    await userEvent.click(within(card).getByRole('button', { name: /Начать/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/lesson/' + todo.id));
    await waitFor(() => expect(main().getByRole('heading', { level: 1 }).textContent).toBe(todo.title));
    // Кнопка "назад" возвращает к урокам
    await userEvent.click(main().getByRole('button', { name: 'Назад' }));
    await waitFor(() => expect(window.location.hash).toBe('#/lessons'));
  });

  it('фильтр по курсу оставляет только уроки этого курса', async () => {
    const courses = await fakeFetch('/api/courses').then((r) => r.json());
    const c = courses.find((x) => x.lessonsCount > 0);
    await waitFor(() => expect(document.querySelector('.filters')).toBeTruthy());
    await userEvent.click(main().getByRole('button', { name: c.title }));
    await waitFor(() => expect(document.querySelectorAll('.lesson-card').length).toBe(lessons.filter((l) => l.courseId === c.id).length));
    expect(main().getByRole('button', { name: c.title }).classList.contains('active')).toBe(true);
  });
});

describe('состояния страниц', () => {
  it('поиск без результатов показывает пустое состояние', async () => {
    const input = screen.getByPlaceholderText('Поиск по урокам...');
    await userEvent.clear(input);
    await userEvent.type(input, 'нет-такого-урока{Enter}');
    await waitFor(() => expect(main().getByText('Уроков пока нет')).toBeTruthy());
    // "Сбросить" возвращает полный список
    await userEvent.click(main().getByRole('button', { name: 'Сбросить' }));
    await waitFor(() => expect(document.querySelectorAll('.lesson-card').length).toBeGreaterThan(0));
  });

  it('ошибка API показывает сообщение, а не пустой экран', async () => {
    failPaths = ['/api/rating'];
    go('#/home');
    await waitFor(() => expect(document.querySelector('.home-hero')).toBeTruthy());
    go('#/rating');
    await waitFor(() => expect(document.querySelector('#main .empty').textContent).toMatch(/Ошибка: Сервер недоступен/));
  });

  it('прогресс на главной совпадает с данными сервера', async () => {
    const home = await fakeFetch('/api/student/s1/home').then((r) => r.json());
    go('#/home');
    await waitFor(() => expect(document.querySelector('.cell-prog .stat-num')).toBeTruthy());
    expect(document.querySelector('.cell-prog .stat-num').textContent).toBe(String(home.progress));
    expect(document.querySelector('.cell-prog .meter i').style.width).toBe(home.progress + '%');
  });

  it('строка задания открывается с клавиатуры (Enter)', async () => {
    const task = document.querySelector('#main .task');
    expect(task.getAttribute('tabindex')).toBe('0');
    expect(task.getAttribute('role')).toBe('link');
    task.focus();
    fireEvent.keyDown(task, { key: 'Enter' });
    await waitFor(() => expect(window.location.hash).toBe('#/lesson/' + task.dataset.v));
  });
});

describe('кнопки верхней панели и настройки', () => {
  it('настройки открываются диалогом и закрываются по Esc', async () => {
    await userEvent.click(sidebar().getByRole('button', { name: 'Настройки' }));
    const dialog = await screen.findByRole('dialog', { name: 'Настройки' });
    expect(within(dialog).getByRole('button', { name: 'Закрыть' })).toBe(document.activeElement);
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('смена студента в настройках сохраняется', async () => {
    // Настройки открываются и по кнопке-аватару в верхней панели ("ВК - Настройки")
    await userEvent.click(screen.getByRole('button', { name: /^ВК - Настройки$/ }));
    const dialog = await screen.findByRole('dialog');
    const select = within(dialog).getByRole('combobox');
    const other = db.read('users').find((u) => u.role === 'student' && u.id !== 's1');
    await userEvent.selectOptions(select, other.id);
    expect(localStorage.getItem('studentId')).toBe(other.id);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('кнопка темы переключает тему и запоминает выбор', async () => {
    const before = document.documentElement.dataset.theme || 'light';
    await userEvent.click(screen.getAllByRole('button', { name: 'Сменить тему' })[0]);
    const after = document.documentElement.dataset.theme;
    expect(after).toBe(before === 'dark' ? 'light' : 'dark');
    expect(localStorage.getItem('theme')).toBe(after);
  });

  it('у кнопок-иконок есть подписи', () => {
    document.querySelectorAll('#topbar button, #panel button, #fab').forEach((b) => {
      const name = (b.getAttribute('aria-label') || b.textContent).trim();
      expect(name.length, b.outerHTML.slice(0, 80)).toBeGreaterThan(0);
    });
  });
});
