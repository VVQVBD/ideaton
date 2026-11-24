// Оценка урока: средняя по вопросам, за каждую лишнюю попытку -10, не ниже 0
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../helpers/data-dir.cjs').useTempDataDir();
const { scoreLesson } = require('../../server/game');

const lesson = {
  steps: [
    { id: 's1', type: 'theory' },
    { id: 's2', type: 'question' },
    { id: 's3', type: 'question' },
  ],
};

describe('scoreLesson', () => {
  it('урок без вопросов оценивается в 100', () => {
    expect(scoreLesson({ steps: [{ id: 's1', type: 'theory' }] }, []).score).toBe(100);
  });

  it('все ответы верные с первой попытки -> 100', () => {
    const r = scoreLesson(lesson, [{ stepId: 's2', score: 100, tries: 1 }, { stepId: 's3', score: 100, tries: 1 }]);
    expect(r.score).toBe(100);
    expect(r.scored).toHaveLength(2);
  });

  it('лишние попытки снимают по 10 баллов', () => {
    const r = scoreLesson(lesson, [{ stepId: 's2', score: 100, tries: 3 }, { stepId: 's3', score: 100, tries: 1 }]);
    expect(r.score).toBe(90); // (80 + 100) / 2
  });

  it('баллы за вопрос не уходят ниже нуля', () => {
    const r = scoreLesson(lesson, [{ stepId: 's2', score: 10, tries: 9 }, { stepId: 's3', score: 0, tries: 1 }]);
    expect(r.score).toBe(0);
  });

  it('вопрос без ответа даёт 0, пустые и отсутствующие ответы не ломают расчёт', () => {
    expect(scoreLesson(lesson, [{ stepId: 's2', score: 100, tries: 1 }]).score).toBe(50);
    expect(scoreLesson(lesson, []).score).toBe(0);
    expect(scoreLesson(lesson, undefined).score).toBe(0);
  });

  it('ответ без числа попыток считается одной попыткой', () => {
    expect(scoreLesson(lesson, [{ stepId: 's2', score: 70 }, { stepId: 's3', score: 90 }]).score).toBe(80);
  });
});
