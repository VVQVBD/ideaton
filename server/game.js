// Открытый урок: командная игра. Этапы: lobby (сбор команд) -> quiz (опрос по прошлой теме)
// -> lesson (новая тема с копилотом) -> quest (5 замков) -> finish (итоги).
// Одна игра за раз (где хранится - см. game-store.js). Экраны узнают новости, опрашивая сервер раз в 1,5 секунды.
const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const store = require('./game-store');
const { TEAMS, QUIZ, QUEST } = require('./game-content');

const PHASES = ['lobby', 'quiz', 'lesson', 'quest', 'finish'];
const LESSON_ID = 'l7'; // урок по новой теме из seed.js

// ---------- Вход преподавателя по PIN ----------
// PIN задаётся в .env (TEACHER_PIN). Токен - это время входа + подпись, сделанная из PIN.
// Серверу не нужно его запоминать, поэтому он работает и на Vercel. Действует 24 часа, смена PIN отменяет все входы
const teacherPin = () => String(process.env.TEACHER_PIN || '1234');
const TOKEN_HOURS = 24;
const sign = (ts) => crypto.createHmac('sha256', 'teacher:' + teacherPin() + ':' + (process.env.SESSION_SECRET || '')).update(ts).digest('hex');
const makeToken = () => { const ts = Date.now().toString(36); return ts + '.' + sign(ts); };

function isTeacher(req) {
  const [ts, sig] = String(req.get('x-teacher-token') || '').split('.');
  if (!ts || !sig || Date.now() - parseInt(ts, 36) > TOKEN_HOURS * 3600 * 1000) return false;
  const good = Buffer.from(sign(ts));
  const got = Buffer.from(sig);
  return got.length === good.length && crypto.timingSafeEqual(got, good);
}
function onlyTeacher(req, res, next) {
  if (!isTeacher(req)) return res.status(401).json({ error: 'Нужен вход преподавателя' });
  next();
}

// ---------- Оценка урока (используется и в обычном прохождении) ----------
// За каждую лишнюю попытку снимаем 10 баллов
function scoreLesson(lesson, answers) {
  const questions = lesson.steps.filter((s) => s.type === 'question');
  const scored = questions.map((q) => {
    const a = (answers || []).find((x) => x.stepId === q.id);
    return a ? { stepId: q.id, score: a.score, tries: a.tries || 1, final: Math.max(0, a.score - 10 * ((a.tries || 1) - 1)) } : { stepId: q.id, score: 0, tries: 0, final: 0 };
  });
  const score = questions.length ? Math.round(scored.reduce((s, x) => s + x.final, 0) / questions.length) : 100;
  return { score, scored };
}

function newGame(count) {
  const n = Math.max(2, Math.min(TEAMS.length, Number(count) || 4));
  return {
    code: String(1000 + crypto.randomInt(9000)),
    phase: 'lobby',
    createdAt: new Date().toISOString(),
    teams: TEAMS.slice(0, n).map((t, i) => ({
      id: 'k' + (i + 1), name: t.name, color: t.color, joined: false, members: '',
      quiz: {},   // номер вопроса -> { option, points }
      lesson: null, // { score }
      locks: {},  // id замка -> { open, tries, hints, points }
    })),
    quiz: { idx: -1, startedAt: null, revealed: false },
  };
}

// ---------- Подсчёт очков ----------
const quizPoints = (t) => Object.values(t.quiz).reduce((s, a) => s + a.points, 0);
const questPoints = (t) => Object.values(t.locks).reduce((s, l) => s + (l.open ? l.points : 0), 0);
const totalScore = (t) => quizPoints(t) + (t.lesson ? t.lesson.score : 0) + questPoints(t);
const openCount = (t) => QUEST.locks.filter((l) => t.locks[l.id] && t.locks[l.id].open).length;

// Вопрос квиза закрыт, если преподаватель показал ответ, вышло время или ответили все команды
function quizClosed(g) {
  const q = g.quiz;
  if (q.idx < 0) return false;
  if (q.revealed) return true;
  if (Date.now() > new Date(q.startedAt).getTime() + (QUIZ.seconds + 1) * 1000) return true;
  const joined = g.teams.filter((t) => t.joined);
  return joined.length > 0 && joined.every((t) => t.quiz[q.idx]);
}

// Что видят все экраны. Правильные ответы не отдаём, пока вопрос не закрыт
function publicState(g, teamId) {
  const q = g.quiz;
  const closed = quizClosed(g);
  const cur = q.idx >= 0 ? QUIZ.questions[q.idx] : null;
  const me = g.teams.find((t) => t.id === teamId);
  const lesson = db.read('lessons').find((l) => l.id === LESSON_ID);
  return {
    code: g.code, phase: g.phase, phases: PHASES, lessonId: LESSON_ID, lessonTitle: lesson ? lesson.title : '', now: Date.now(),
    teams: g.teams.map((t) => ({
      id: t.id, name: t.name, color: t.color, joined: t.joined, members: t.members,
      score: totalScore(t), quizScore: quizPoints(t), questScore: questPoints(t),
      answered: q.idx >= 0 && !!t.quiz[q.idx], lesson: t.lesson, open: openCount(t),
    })),
    quiz: {
      topic: QUIZ.topic, idx: q.idx, total: QUIZ.questions.length, seconds: QUIZ.seconds,
      endsAt: q.startedAt ? new Date(q.startedAt).getTime() + QUIZ.seconds * 1000 : null,
      closed,
      question: cur ? { text: cur.text, options: cur.options } : null,
      answer: cur && closed ? cur.answer : null,
      counts: cur && closed ? cur.options.map((_, i) => g.teams.filter((t) => t.quiz[q.idx] && t.quiz[q.idx].option === i).length) : null,
    },
    quest: {
      topic: QUEST.topic, hintCost: QUEST.hintCost, tryCost: QUEST.tryCost, minPoints: QUEST.minPoints,
      // Содержание замков без ответов
      locks: QUEST.locks.map((l) => ({
        id: l.id, title: l.title, points: l.points, type: l.type, task: l.task, unit: l.unit,
        categories: l.categories, items: l.items ? l.items.map((x) => x.text) : undefined,
        sentences: l.sentences ? l.sentences.map((x) => x.text) : undefined,
      })),
    },
    // Данные своей команды: ответ в квизе, подсказки, разбор открытых замков
    me: me ? {
      id: me.id, name: me.name, color: me.color, members: me.members,
      quiz: q.idx >= 0 ? me.quiz[q.idx] || null : null,
      locks: QUEST.locks.map((l) => {
        const st = me.locks[l.id] || { open: false, tries: 0, hints: 0, points: 0 };
        return {
          id: l.id, open: st.open, tries: st.tries, points: st.points,
          hints: l.hints.slice(0, st.hints), hintsLeft: l.hints.length - st.hints,
          // После открытия показываем разбор (для замка с ошибками ИИ)
          fixes: st.open && l.sentences ? l.sentences.map((x, i) => (x.wrong ? { i, fix: x.fix } : null)).filter(Boolean) : undefined,
        };
      }),
    } : null,
  };
}

// Баллы за замок: базовые минус подсказки и неверные попытки, но не меньше минимума
function lockPoints(lock, st) {
  return Math.max(QUEST.minPoints, lock.points - st.hints * QUEST.hintCost - st.tries * QUEST.tryCost);
}

// Проверка ответа на замок. Возвращает { correct, right } (right - сколько карточек верно)
function checkLock(lock, answer) {
  if (lock.type === 'sort') {
    const a = Array.isArray(answer) ? answer : [];
    const right = lock.items.filter((x, i) => Number(a[i]) === x.cat).length;
    return { correct: right === lock.items.length, right, total: lock.items.length };
  }
  if (lock.type === 'number') {
    const n = Number(String(answer || '').replace(/[^\d-]/g, ''));
    return { correct: n === lock.answer };
  }
  if (lock.type === 'errors') {
    const picked = new Set((Array.isArray(answer) ? answer : []).map(Number));
    const wrong = lock.sentences.map((x, i) => (x.wrong ? i : -1)).filter((i) => i >= 0);
    const found = wrong.filter((i) => picked.has(i)).length;
    return { correct: found === wrong.length && picked.size === wrong.length, right: found, total: wrong.length };
  }
  return { correct: false };
}

// ---------- Маршруты /api/game ----------
const router = express.Router();

router.post('/teacher/login', (req, res) => {
  if (String(req.body.pin || '').trim() !== teacherPin()) return res.status(403).json({ error: 'Неверный PIN' });
  res.json({ token: makeToken() });
});
router.get('/teacher/check', (req, res) => res.json({ ok: isTeacher(req) }));

// Текущая игра. Студенту нужен правильный код, преподавателю - токен
router.get('/game', async (req, res) => {
  const g = await store.load();
  if (!g) return res.json({ game: null });
  if (!isTeacher(req) && req.query.code !== g.code) return res.status(404).json({ error: 'Игра с таким кодом не найдена' });
  res.json({ game: publicState(g, req.query.teamId) });
});

// Новая игра (старая удаляется)
router.post('/game', onlyTeacher, async (req, res) => {
  const g = newGame(req.body.teams);
  await store.clear();
  await store.saveAll(g);
  res.json({ game: publicState(g) });
});

// Завершить игру (преподаватель снова увидит экран создания)
router.delete('/game', onlyTeacher, async (req, res) => { await store.clear(); res.json({ game: null }); });

router.post('/game/phase', onlyTeacher, async (req, res) => {
  const g = await store.load();
  if (!g) return res.status(404).json({ error: 'Игра не создана' });
  if (!PHASES.includes(req.body.phase)) return res.status(400).json({ error: 'Неизвестный этап' });
  g.phase = req.body.phase;
  await store.saveMeta(g);
  res.json({ game: publicState(g) });
});

// Следующий вопрос квиза
router.post('/game/quiz/next', onlyTeacher, async (req, res) => {
  const g = await store.load();
  if (!g) return res.status(404).json({ error: 'Игра не создана' });
  if (g.quiz.idx >= QUIZ.questions.length - 1) return res.status(400).json({ error: 'Вопросы закончились' });
  g.phase = 'quiz';
  g.quiz = { idx: g.quiz.idx + 1, startedAt: new Date().toISOString(), revealed: false };
  await store.saveMeta(g);
  res.json({ game: publicState(g) });
});

router.post('/game/quiz/reveal', onlyTeacher, async (req, res) => {
  const g = await store.load();
  if (!g) return res.status(404).json({ error: 'Игра не создана' });
  g.quiz.revealed = true;
  await store.saveMeta(g);
  res.json({ game: publicState(g) });
});

// Команда входит в игру со своего устройства
router.post('/game/join', async (req, res) => {
  const g = await store.load();
  if (!g || req.body.code !== g.code) return res.status(404).json({ error: 'Игра с таким кодом не найдена' });
  const t = g.teams.find((x) => x.id === req.body.teamId);
  if (!t) return res.status(404).json({ error: 'Команда не найдена' });
  t.joined = true;
  if (req.body.members !== undefined) t.members = String(req.body.members).slice(0, 200);
  await store.saveTeam(g, t);
  res.json({ game: publicState(g, t.id) });
});

// Общая проверка: игра есть, код верный, команда существует
async function teamOf(req, res) {
  const g = await store.load();
  if (!g || req.body.code !== g.code) { res.status(404).json({ error: 'Игра с таким кодом не найдена' }); return {}; }
  const t = g.teams.find((x) => x.id === req.body.teamId);
  if (!t) { res.status(404).json({ error: 'Команда не найдена' }); return {}; }
  return { g, t };
}

// Ответ на вопрос квиза: 100 баллов за верный ответ и до 50 за скорость
router.post('/game/quiz/answer', async (req, res) => {
  const { g, t } = await teamOf(req, res);
  if (!g) return;
  const q = g.quiz;
  if (g.phase !== 'quiz' || q.idx < 0) return res.status(400).json({ error: 'Сейчас нет вопроса' });
  if (t.quiz[q.idx]) return res.status(400).json({ error: 'Команда уже ответила' });
  if (quizClosed(g)) return res.status(400).json({ error: 'Время вышло' });
  const option = Number(req.body.option);
  const left = Math.max(0, new Date(q.startedAt).getTime() + QUIZ.seconds * 1000 - Date.now());
  const correct = option === QUIZ.questions[q.idx].answer;
  t.quiz[q.idx] = { option, points: correct ? 100 + Math.round((left / (QUIZ.seconds * 1000)) * 50) : 0 };
  await store.saveTeam(g, t);
  res.json({ game: publicState(g, t.id) });
});

// Урок по новой теме пройден командой: оценка 0-100 идёт в общий счёт
router.post('/game/lesson', async (req, res) => {
  const { g, t } = await teamOf(req, res);
  if (!g) return;
  const lesson = db.read('lessons').find((l) => l.id === LESSON_ID);
  if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
  const { score } = scoreLesson(lesson, req.body.answers);
  // Если урок проходили дважды, оставляем лучший результат
  if (!t.lesson || score > t.lesson.score) t.lesson = { score };
  await store.saveTeam(g, t);
  res.json({ score, game: publicState(g, t.id) });
});

// Подсказка копилота к замку (стоит баллов)
router.post('/game/quest/hint', async (req, res) => {
  const { g, t } = await teamOf(req, res);
  if (!g) return;
  const lock = QUEST.locks.find((l) => l.id === req.body.lock);
  if (!lock) return res.status(404).json({ error: 'Замок не найден' });
  const st = t.locks[lock.id] || (t.locks[lock.id] = { open: false, tries: 0, hints: 0, points: 0 });
  if (st.open) return res.status(400).json({ error: 'Замок уже открыт' });
  if (st.hints >= lock.hints.length) return res.status(400).json({ error: 'Подсказки закончились' });
  st.hints++;
  await store.saveTeam(g, t);
  res.json({ hint: lock.hints[st.hints - 1], game: publicState(g, t.id) });
});

// Попытка открыть замок. Замки открываются по порядку
router.post('/game/quest/check', async (req, res) => {
  const { g, t } = await teamOf(req, res);
  if (!g) return;
  if (g.phase !== 'quest') return res.status(400).json({ error: 'Квест ещё не начался' });
  const idx = QUEST.locks.findIndex((l) => l.id === req.body.lock);
  const lock = QUEST.locks[idx];
  if (!lock) return res.status(404).json({ error: 'Замок не найден' });
  if (idx > 0 && !(t.locks[QUEST.locks[idx - 1].id] || {}).open) return res.status(400).json({ error: 'Сначала откройте предыдущий замок' });
  const st = t.locks[lock.id] || (t.locks[lock.id] = { open: false, tries: 0, hints: 0, points: 0 });
  if (st.open) return res.json({ correct: true, game: publicState(g, t.id) });
  const r = checkLock(lock, req.body.answer);
  if (r.correct) { st.open = true; st.points = lockPoints(lock, st); } else st.tries++;
  await store.saveTeam(g, t);
  res.json({ ...r, points: st.points, game: publicState(g, t.id) });
});

module.exports = { router, scoreLesson, onlyTeacher, clear: store.clear };
