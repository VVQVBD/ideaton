// Скриншоты сайта для презентации: node docs/presentation/shots.mjs
// Поднимает сайт на копии демо-данных (data/ не меняется), снимает экраны в высоком качестве в docs/presentation/img
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('@playwright/test');
const OUT = path.join(HERE, 'img');
fs.mkdirSync(OUT, { recursive: true });

// Копия демо-данных
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideaton-shots-'));
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) fs.copyFileSync(path.join(ROOT, 'data', f), path.join(dataDir, f));
const PORT = 3333;
const B = 'http://localhost:' + PORT;
const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT, DATA_DIR: dataDir, MOCK_AI: 'true', TEACHER_PIN: '1234' }, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(B + '/api/config'); break; } catch (e) { await new Promise((r) => setTimeout(r, 200)); } }
const post = async (url, body, headers = {}) => (await fetch(B + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();
await post('/api/reset', {}, { 'x-teacher-token': (await post('/api/teacher/login', { pin: '1234' })).token });
const token = (await post('/api/teacher/login', { pin: '1234' })).token;
const T = { role: 'teacher', token };
const S = { role: 'student', studentId: 's1' };

const browser = await chromium.launch({ channel: 'msedge' });
async function shoot(name, sess, url, { w = 1440, h = 900, before } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript((s) => { localStorage.setItem('lang', 'ru'); localStorage.setItem('theme', 'light'); if (s) localStorage.setItem('session', JSON.stringify(s)); }, sess);
  await page.goto(B + url);
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.querySelector('#main') && !document.querySelector('#main .skel-wrap') && document.querySelector('#main').children.length);
  if (before) await before(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 88 });
  console.log('ok', name);
  await ctx.close();
}

const lessons = await (await fetch(B + '/api/lessons')).json();
const loops = lessons.find((l) => l.id === 'l1');

await shoot('home', S, '/#/home');
await shoot('home-mobile', S, '/#/home', { w: 390, h: 844 });
// Урок: вопрос + чат, где Copilot подсказывает и передаёт заметку преподавателю
await shoot('lesson-chat', S, '/#/lesson/' + loops.id, {
  before: async (page) => {
    await page.click('[data-act="startSteps"]');
    await page.click('[data-act="next"]');
    await page.fill('#chat-in', 'Не понял, что такое break');
    await page.click('[data-act="send"]');
    await page.waitForSelector('.msg .note');
    await page.waitForTimeout(2500); // ответ "печатается"
    // Отдельно - только переписка с Copilot (для слайда 6)
    await page.locator('#chat').screenshot({ path: path.join(OUT, 'chat.jpg'), type: 'jpeg', quality: 90 });
  },
});
// Преподаватель видит недочёты, которые собрал Copilot
await shoot('teacher-gaps', T, '/#/lesson/' + loops.id, {
  before: async (page) => {
    await page.evaluate(() => { const h = [...document.querySelectorAll('.section-head')][1]; h.scrollIntoView(); document.getElementById('main').scrollTop -= 16; });
  },
});
await shoot('teacher-draft', T, '/#/create', {
  before: async (page) => {
    await page.fill('[data-form="topic"]', 'Циклы в Python');
    await page.click('[data-act="generate"]');
    await page.waitForSelector('[data-act="publish"]', { timeout: 20000 });
  },
});
await shoot('lessons', S, '/#/lessons');
await shoot('rating', S, '/#/rating');
// Открытый урок: экран преподавателя на вопросе квиза
const H = { 'x-teacher-token': token };
const g = (await post('/api/game', { teams: 4 }, H)).game;
for (const [id, m] of [['k1', 'Аня, Болат'], ['k2', 'Вера, Дамир'], ['k3', 'Ерлан, Жанна']]) await post('/api/game/join', { code: g.code, teamId: id, members: m });
await post('/api/game/quiz/next', {}, H);
await post('/api/game/quiz/answer', { code: g.code, teamId: 'k1', option: 0 });
await shoot('game-quiz', T, '/#/game');

await browser.close();
srv.kill();
fs.rmSync(dataDir, { recursive: true, force: true });
