// Открытый урок (командная игра) через API: создание, вход команд, квиз, урок, квест, доступ
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../helpers/data-dir.cjs').useTempDataDir();
const request = require('supertest');
const app = require('../../server.js');
const { QUIZ, QUEST } = require('../../server/game-content');
const db = require('../../server/db');

let token;
let code;
const T = () => ({ 'x-teacher-token': token });
const asTeacher = (method, url) => request(app)[method](url).set(T());
const team = (teamId, extra = {}) => ({ code, teamId, ...extra });

// Правильный ответ на замок
function rightAnswer(lock) {
  if (lock.type === 'sort') return lock.items.map((x) => x.cat);
  if (lock.type === 'number') return String(lock.answer);
  return lock.sentences.map((x, i) => (x.wrong ? i : -1)).filter((i) => i >= 0);
}

beforeAll(async () => {
  token = (await request(app).post('/api/teacher/login').send({ pin: '1234' })).body.token;
});

describe('создание игры и доступ', () => {
  it('без игры преподаватель видит пустое состояние', async () => {
    await asTeacher('delete', '/api/game').expect(200);
    const r = await asTeacher('get', '/api/game').expect(200);
    expect(r.body.game).toBeNull();
  });

  it('создать игру может только преподаватель', async () => {
    await request(app).post('/api/game').send({ teams: 3 }).expect(401);
    await request(app).post('/api/game/phase').send({ phase: 'quiz' }).expect(401);
    await request(app).post('/api/game/quiz/next').send({}).expect(401);
  });

  it('число команд ограничено: меньше 2 -> 2, без числа -> 4', async () => {
    let r = await asTeacher('post', '/api/game').send({ teams: 1 }).expect(200);
    expect(r.body.game.teams).toHaveLength(2);
    r = await asTeacher('post', '/api/game').send({}).expect(200);
    expect(r.body.game.teams).toHaveLength(4);
  });

  it('новая игра: 3 команды, этап "сбор", код из 4 цифр', async () => {
    const r = await asTeacher('post', '/api/game').send({ teams: 3 }).expect(200);
    code = r.body.game.code;
    expect(code).toMatch(/^\d{4}$/);
    expect(r.body.game.phase).toBe('lobby');
    expect(r.body.game.teams.every((t) => !t.joined && t.score === 0)).toBe(true);
  });

  it('студент видит игру только с правильным кодом', async () => {
    await request(app).get('/api/game?code=0000').expect(404);
    const r = await request(app).get('/api/game?code=' + code).expect(200);
    expect(r.body.game.code).toBe(code);
  });

  it('вход команды: неверный код и несуществующая команда -> 404', async () => {
    await request(app).post('/api/game/join').send({ code: '0000', teamId: 'k1' }).expect(404);
    await request(app).post('/api/game/join').send({ code, teamId: 'k99' }).expect(404);
  });

  it('команды входят, состав обрезается до 200 символов', async () => {
    const r = await request(app).post('/api/game/join').send(team('k1', { members: 'А'.repeat(300) })).expect(200);
    expect(r.body.game.me.members).toHaveLength(200);
    await request(app).post('/api/game/join').send(team('k2', { members: 'Болат, Вера' })).expect(200);
  });

  it('неизвестный этап -> 400', async () => {
    await asTeacher('post', '/api/game/phase').send({ phase: 'party' }).expect(400);
  });
});

describe('квиз', () => {
  it('ответить можно только когда идёт вопрос', async () => {
    await request(app).post('/api/game/quiz/answer').send(team('k1', { option: 0 })).expect(400);
  });

  it('верный ответ даёт 100 + бонус за скорость, неверный 0; правильный ответ скрыт до закрытия', async () => {
    const r = await asTeacher('post', '/api/game/quiz/next').send({}).expect(200);
    expect(r.body.game.quiz.idx).toBe(0);
    expect(r.body.game.quiz.answer).toBeNull();
    const q = QUIZ.questions[0];
    const a1 = await request(app).post('/api/game/quiz/answer').send(team('k1', { option: q.answer })).expect(200);
    expect(a1.body.game.me.quiz.points).toBeGreaterThanOrEqual(100);
    expect(a1.body.game.me.quiz.points).toBeLessThanOrEqual(150);
    // Повторный ответ той же команды запрещён
    await request(app).post('/api/game/quiz/answer').send(team('k1', { option: q.answer })).expect(400);
    const wrong = (q.answer + 1) % q.options.length;
    const a2 = await request(app).post('/api/game/quiz/answer').send(team('k2', { option: wrong })).expect(200);
    expect(a2.body.game.me.quiz.points).toBe(0);
    // Ответили все вошедшие команды -> вопрос закрыт, ответ и статистика видны
    expect(a2.body.game.quiz.closed).toBe(true);
    expect(a2.body.game.quiz.answer).toBe(q.answer);
    expect(a2.body.game.quiz.counts.reduce((s, x) => s + x, 0)).toBe(2);
  });

  it('после закрытия вопроса отвечать нельзя, преподаватель может показать ответ', async () => {
    await asTeacher('post', '/api/game/quiz/next').send({}).expect(200);
    await asTeacher('post', '/api/game/quiz/reveal').send({}).expect(200);
    await request(app).post('/api/game/quiz/answer').send(team('k1', { option: 0 })).expect(400);
  });

  it('когда вопросы закончились -> 400', async () => {
    for (let i = 2; i < QUIZ.questions.length; i++) await asTeacher('post', '/api/game/quiz/next').send({}).expect(200);
    await asTeacher('post', '/api/game/quiz/next').send({}).expect(400);
  });
});

describe('урок с копилотом', () => {
  it('оценка урока идёт в счёт команды, остаётся лучшая', async () => {
    await asTeacher('post', '/api/game/phase').send({ phase: 'lesson' }).expect(200);
    const lesson = db.read('lessons').find((l) => l.id === 'l7');
    const qs = lesson.steps.filter((s) => s.type === 'question');
    const good = qs.map((s) => ({ stepId: s.id, score: 100, tries: 1 }));
    const r1 = await request(app).post('/api/game/lesson').send(team('k1', { answers: good })).expect(200);
    expect(r1.body.score).toBe(100);
    const r2 = await request(app).post('/api/game/lesson').send(team('k1', { answers: [] })).expect(200);
    expect(r2.body.score).toBe(0);
    expect(r2.body.game.teams.find((t) => t.id === 'k1').lesson.score).toBe(100);
  });
});

describe('квест', () => {
  it('замки нельзя открывать до начала квеста', async () => {
    await request(app).post('/api/game/quest/check').send(team('k1', { lock: QUEST.locks[0].id, answer: rightAnswer(QUEST.locks[0]) })).expect(400);
  });

  it('замки открываются по порядку', async () => {
    await asTeacher('post', '/api/game/phase').send({ phase: 'quest' }).expect(200);
    const r = await request(app).post('/api/game/quest/check').send(team('k1', { lock: QUEST.locks[1].id, answer: rightAnswer(QUEST.locks[1]) })).expect(400);
    expect(r.body.error).toMatch(/предыдущий/);
    await request(app).post('/api/game/quest/check').send(team('k1', { lock: 'nope', answer: 1 })).expect(404);
  });

  it('неверная попытка снимает баллы, подсказка тоже, но не ниже минимума', async () => {
    const lock = QUEST.locks[0];
    const bad = await request(app).post('/api/game/quest/check').send(team('k1', { lock: lock.id, answer: [] })).expect(200);
    expect(bad.body.correct).toBe(false);
    expect(bad.body.total).toBe(lock.items.length);
    const h = await request(app).post('/api/game/quest/hint').send(team('k1', { lock: lock.id })).expect(200);
    expect(h.body.hint).toBe(lock.hints[0]);
    const ok = await request(app).post('/api/game/quest/check').send(team('k1', { lock: lock.id, answer: rightAnswer(lock) })).expect(200);
    expect(ok.body.correct).toBe(true);
    expect(ok.body.points).toBe(Math.max(QUEST.minPoints, lock.points - QUEST.hintCost - QUEST.tryCost));
    // Подсказку к открытому замку взять нельзя
    await request(app).post('/api/game/quest/hint').send(team('k1', { lock: lock.id })).expect(400);
  });

  it('подсказки заканчиваются', async () => {
    const lock = QUEST.locks[1];
    for (let i = 0; i < lock.hints.length; i++) await request(app).post('/api/game/quest/hint').send(team('k2', { lock: lock.id })).expect(200);
    await request(app).post('/api/game/quest/hint').send(team('k2', { lock: lock.id })).expect(400);
  });

  it('все 8 замков открываются верными ответами, итог = квиз + урок + квест', async () => {
    let last;
    for (const lock of QUEST.locks) {
      last = await request(app).post('/api/game/quest/check').send(team('k1', { lock: lock.id, answer: rightAnswer(lock) })).expect(200);
      expect(last.body.correct).toBe(true);
    }
    const me = last.body.game.teams.find((t) => t.id === 'k1');
    expect(me.open).toBe(QUEST.locks.length);
    expect(me.score).toBe(me.quizScore + me.lesson.score + me.questScore);
    // У замков с ошибками ИИ после открытия есть разбор
    const errLock = last.body.game.me.locks.find((l) => l.fixes);
    expect(errLock.fixes.length).toBeGreaterThan(0);
  });

  it('числовой ответ понимается и с пробелами и единицами', async () => {
    const num = QUEST.locks.find((l) => l.type === 'number');
    const idx = QUEST.locks.indexOf(num);
    // Команда k2 открывает замки до числового
    for (const lock of QUEST.locks.slice(0, idx)) await request(app).post('/api/game/quest/check').send(team('k2', { lock: lock.id, answer: rightAnswer(lock) }));
    const r = await request(app).post('/api/game/quest/check').send(team('k2', { lock: num.id, answer: `${num.answer.toLocaleString('ru-RU')} ${num.unit || ''}` })).expect(200);
    expect(r.body.correct).toBe(true);
  });

  it('итоги и завершение игры', async () => {
    const r = await asTeacher('post', '/api/game/phase').send({ phase: 'finish' }).expect(200);
    expect(r.body.game.phase).toBe('finish');
    await asTeacher('delete', '/api/game').expect(200);
    await request(app).post('/api/game/join').send(team('k1')).expect(404);
  });
});
