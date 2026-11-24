// Рейтинг: баллы = средняя оценка x 0,7 + активность x 0,3; активность = min(100, уроки / 5 x 100)
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../helpers/data-dir.cjs').useTempDataDir();
const db = require('../../server/db');
const { ratingFor, availableMonths, monthKey, LESSONS_TARGET } = require('../../server/rating');

const NOW = new Date();
const MONTH = monthKey(NOW);
// Дата внутри текущего месяца: день d, час h
const inMonth = (d, h = 10) => new Date(NOW.getFullYear(), NOW.getMonth(), d, h).toISOString();
const att = (studentId, lessonId, score, completedAt) => ({ id: 'a' + Math.random(), studentId, lessonId, score, completedAt });

beforeEach(() => {
  db.write('users', [
    { id: 's1', role: 'student', name: 'Аня' },
    { id: 's2', role: 'student', name: 'Болат' },
    { id: 's3', role: 'student', name: 'Вера' },
    { id: 't1', role: 'teacher', name: 'Учитель' },
  ]);
  db.write('attempts', []);
});

describe('ratingFor', () => {
  it('без попыток рейтинг пустой', () => {
    expect(ratingFor(MONTH)).toEqual([]);
  });

  it('считает баллы по формуле: 1 урок на 100 -> 100 x 0,7 + 20 x 0,3 = 76', () => {
    db.write('attempts', [att('s1', 'l1', 100, inMonth(1))]);
    const [row] = ratingFor(MONTH);
    expect(row).toMatchObject({ userId: 's1', lessons: 1, avgGrade: 100, activity: 20, points: 76, rank: 1 });
  });

  it('оценка 0 даёт баллы только за активность', () => {
    db.write('attempts', [att('s1', 'l1', 0, inMonth(1))]);
    expect(ratingFor(MONTH)[0]).toMatchObject({ avgGrade: 0, activity: 20, points: 6 });
  });

  it('активность не больше 100%, даже если уроков больше цели', () => {
    const list = Array.from({ length: LESSONS_TARGET + 3 }, (_, i) => att('s1', 'l' + i, 80, inMonth(1, 8 + i)));
    db.write('attempts', list);
    const [row] = ratingFor(MONTH);
    expect(row.activity).toBe(100);
    expect(row.points).toBe(80 * 0.7 + 30);
  });

  it('повтор урока не накручивает баллы: берётся последняя попытка', () => {
    db.write('attempts', [att('s1', 'l1', 40, inMonth(1, 9)), att('s1', 'l1', 90, inMonth(1, 12))]);
    const [row] = ratingFor(MONTH);
    expect(row.lessons).toBe(1);
    expect(row.avgGrade).toBe(90);
  });

  it('попытки другого месяца не учитываются', () => {
    const old = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 5).toISOString();
    db.write('attempts', [att('s1', 'l1', 100, old)]);
    expect(ratingFor(MONTH)).toEqual([]);
  });

  it('сортирует по баллам и проставляет места, преподавателя не считает', () => {
    db.write('attempts', [
      att('s1', 'l1', 50, inMonth(1)), att('s2', 'l1', 100, inMonth(1)), att('s2', 'l2', 100, inMonth(2)),
      att('t1', 'l1', 100, inMonth(1)),
    ]);
    const rows = ratingFor(MONTH);
    expect(rows.map((r) => [r.userId, r.rank])).toEqual([['s2', 1], ['s1', 2]]);
  });
});

describe('monthKey и availableMonths', () => {
  it('monthKey дополняет месяц нулём', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01');
    expect(monthKey('2026-11-30T10:00:00')).toBe('2026-11');
  });

  it('availableMonths: текущий месяц есть всегда, список по убыванию без повторов', () => {
    db.write('attempts', [att('s1', 'l1', 10, '2025-03-10T10:00:00Z'), att('s1', 'l2', 10, '2025-03-12T10:00:00Z'), att('s1', 'l3', 10, '2025-05-01T10:00:00Z')]);
    const months = availableMonths();
    expect(months[0]).toBe(MONTH);
    expect(months).toEqual([...new Set(months)]);
    expect(months.slice(1)).toEqual(['2025-05', '2025-03']);
  });
});
