// Тесты API сервера на копии демо-данных (supertest, без запуска порта)
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../helpers/data-dir.cjs').useTempDataDir();
const request = require('supertest');
const app = require('../../server.js'); // при подключении сервер сам создаёт демо-данные в DATA_DIR
const db = require('../../server/db');

let teacherToken;
const published = () => db.read('lessons').filter((l) => l.status === 'published');
// Ответы "всё верно с первой попытки" для урока
const perfect = (lesson) => lesson.steps.filter((s) => s.type === 'question').map((s) => ({ stepId: s.id, score: 100, tries: 1 }));

beforeAll(async () => {
  const r = await request(app).post('/api/teacher/login').send({ pin: '1234' });
  teacherToken = r.body.token;
});

describe('справочники', () => {
  it('курсы содержат число опубликованных уроков', async () => {
    const r = await request(app).get('/api/courses').expect(200);
    const total = r.body.reduce((s, c) => s + c.lessonsCount, 0);
    expect(total).toBe(published().length);
  });

  it('уроки для студента: число шагов и отметка о прохождении', async () => {
    const r = await request(app).get('/api/lessons?studentId=s1').expect(200);
    const l = r.body[0];
    expect(l.steps.length).toBeGreaterThan(0);
    expect(typeof l.done).toBe('boolean');
    if (l.done) expect(l.myScore).toBeGreaterThanOrEqual(0); else expect(l.myScore).toBeNull();
  });

  it('несуществующий урок -> 404', async () => {
    await request(app).get('/api/lessons/nope').expect(404);
  });
});

describe('главная студента и прогресс', () => {
  it('новый студент без попыток: прогресс 0%, пройдено 0, задания с числом шагов', async () => {
    const users = db.read('users');
    users.push({ id: 'sNew', role: 'student', name: 'Новый Студент', group: 'X' });
    db.write('users', users);
    const r = await request(app).get('/api/student/sNew/home').expect(200);
    expect(r.body.progress).toBe(0);
    expect(r.body.lessonsDone).toBe(0);
    expect(r.body.tasksDue).toBe(published().length);
    expect(r.body.tasks.every((t) => Number.isInteger(t.steps) && t.steps > 0)).toBe(true);
  });

  it('после прохождения всех уроков прогресс 100% и заданий нет', async () => {
    for (const l of published()) {
      await request(app).post('/api/attempts').send({ lessonId: l.id, studentId: 'sNew', answers: perfect(l) }).expect(200);
    }
    const r = await request(app).get('/api/student/sNew/home').expect(200);
    expect(r.body.progress).toBe(100);
    expect(r.body.tasksDue).toBe(0);
    expect(r.body.tasks).toEqual([]);
    expect(r.body.courses.filter((c) => c.lessonsCount).every((c) => c.progress === 100)).toBe(true);
  });
});

describe('прохождение урока', () => {
  it('проверка ответа в демо-режиме: верный и неверный', async () => {
    const l = published().find((x) => x.steps.some((s) => s.type === 'question'));
    const q = l.steps.find((s) => s.type === 'question');
    const ok = await request(app).post('/api/answer').send({ lessonId: l.id, stepId: q.id, answer: q.correctAnswer }).expect(200);
    expect(ok.body.correct).toBe(true);
    const bad = await request(app).post('/api/answer').send({ lessonId: l.id, stepId: q.id, answer: 'совсем не то' }).expect(200);
    expect(bad.body.correct).toBe(false);
  });

  it('завершение нового урока сохраняет попытку и добавляет урок в рейтинг месяца', async () => {
    const rowOf = async () => (await request(app).get('/api/rating')).body.rows.find((x) => x.userId === 's3');
    const before = await rowOf();
    // Урок, который студент ещё не проходил в этом месяце
    const doneIds = new Set((await request(app).get('/api/lessons?studentId=s3')).body.filter((x) => x.done).map((x) => x.id));
    const l = published().find((x) => !doneIds.has(x.id));
    const r = await request(app).post('/api/attempts').send({ lessonId: l.id, studentId: 's3', answers: perfect(l) }).expect(200);
    expect(r.body.attempt.score).toBe(100);
    expect(r.body.rank).toBeGreaterThan(0);
    const after = await rowOf();
    expect(after.lessons).toBe((before ? before.lessons : 0) + 1);
    expect(r.body.points).toBe(after.points);
    expect(r.body.rank).toBe(after.rank);
  });

  it('урок, которого нет, нельзя завершить', async () => {
    await request(app).post('/api/attempts').send({ lessonId: 'nope', studentId: 's1', answers: [] }).expect(404);
  });

  it('чат ассистента отвечает в демо-режиме', async () => {
    const l = published()[0];
    const r = await request(app).post('/api/chat').send({ lessonId: l.id, stepId: l.steps[0].id, studentId: 's1', message: 'не понимаю', action: 'simpler' }).expect(200);
    expect(r.body.reply.length).toBeGreaterThan(0);
  });
});

describe('создание урока: валидация', () => {
  it('генерация без темы -> 400', async () => {
    const r = await request(app).post('/api/lessons/generate').send({ topic: '   ' }).expect(400);
    expect(r.body.error).toBeTruthy();
  });

  it('генерация в демо-режиме возвращает черновик с шагами', async () => {
    const r = await request(app).post('/api/lessons/generate').send({ topic: 'Списки в Python', goals: 'append', language: 'ru' }).expect(200);
    expect(r.body.draft.steps.length).toBeGreaterThan(0);
    expect(r.body.draft.topic).toBe('Списки в Python');
  });

  it('сохранение без названия или без шагов -> 400', async () => {
    await request(app).post('/api/lessons').send({ title: '', steps: [{ type: 'theory', text: 'x' }] }).expect(400);
    await request(app).post('/api/lessons').send({ title: 'Урок', steps: [] }).expect(400);
  });

  it('корректный урок публикуется, шаги получают id по порядку', async () => {
    const r = await request(app).post('/api/lessons').send({ title: 'Тестовый урок', steps: [{ type: 'theory', text: 'a' }, { type: 'question', text: 'b', correctAnswer: 'c' }] }).expect(200);
    expect(r.body.status).toBe('published');
    expect(r.body.steps.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('рейтинг', () => {
  it('отдаёт месяц, список месяцев, цель и строки с местами по порядку', async () => {
    const r = await request(app).get('/api/rating').expect(200);
    expect(r.body.target).toBe(5);
    expect(r.body.months).toContain(r.body.month);
    r.body.rows.forEach((row, i) => expect(row.rank).toBe(i + 1));
  });

  it('месяц без данных -> пустой список', async () => {
    const r = await request(app).get('/api/rating?month=1999-01').expect(200);
    expect(r.body.rows).toEqual([]);
  });
});

describe('доступ преподавателя', () => {
  it('неверный PIN -> 403, верный -> токен', async () => {
    await request(app).post('/api/teacher/login').send({ pin: '0000' }).expect(403);
    expect(teacherToken).toMatch(/\./);
    const r = await request(app).get('/api/teacher/check').set('x-teacher-token', teacherToken);
    expect(r.body.ok).toBe(true);
  });

  it('сброс данных и режим ИИ без токена -> 401', async () => {
    await request(app).post('/api/reset').send({}).expect(401);
    await request(app).post('/api/config').send({ mock: true }).expect(401);
  });

  it('сброс с токеном возвращает демо-данные', async () => {
    await request(app).post('/api/reset').set('x-teacher-token', teacherToken).send({}).expect(200);
    expect(db.read('users').find((u) => u.id === 'sNew')).toBeUndefined();
  });

  it('главная преподавателя: сводка по урокам и студентам', async () => {
    const r = await request(app).get('/api/teacher/home').expect(200);
    expect(r.body.lessonsCreated).toBe(db.read('lessons').length);
    expect(r.body.totalStudents).toBe(db.read('users').filter((u) => u.role === 'student').length);
    expect(r.body.avgScore).toBeGreaterThanOrEqual(0);
    expect(r.body.avgScore).toBeLessThanOrEqual(100);
  });
});

describe('выгрузки', () => {
  it('Excel с оценками', async () => {
    const r = await request(app).get('/api/grades.xlsx').expect(200);
    expect(r.headers['content-type']).toMatch(/spreadsheetml/);
  });

  it('Word-конспект: есть у урока с конспектом, 404 у урока без него', async () => {
    const withNotes = db.read('lessons').find((l) => l.notes);
    const r = await request(app).get(`/api/lessons/${withNotes.id}/notes.docx`).expect(200);
    expect(r.headers['content-type']).toMatch(/wordprocessingml/);
    const created = await request(app).post('/api/lessons').send({ title: 'Без конспекта', steps: [{ type: 'theory', text: 'a' }] });
    await request(app).get(`/api/lessons/${created.body.id}/notes.docx`).expect(404);
  });

  it('Word-отчёт по уроку и JSON недочётов', async () => {
    const l = db.read('lessons')[0];
    const r = await request(app).get(`/api/lessons/${l.id}/report.docx`).expect(200);
    expect(r.headers['content-type']).toMatch(/wordprocessingml/);
    const g = await request(app).get(`/api/lessons/${l.id}/gaps.json`).expect(200);
    expect(Array.isArray(g.body)).toBe(true);
  });
});
