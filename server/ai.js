// Работа с ИИ: Gemini (или OpenAI) или заготовленные ответы (MOCK_AI)
require('dotenv').config();
const mock = require('./mock');

let mockMode = process.env.MOCK_AI !== 'false';
const isMock = () => mockMode;
const setMock = (v) => { mockMode = !!v; };

// Какой ИИ использовать: gemini (по умолчанию) или openai
const provider = () => (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const hasKey = () => !!(provider() === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);

// ---------- Gemini (обычный HTTP-запрос, отдельные пакеты не нужны) ----------
async function geminiJSON(messages) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY не задан в .env');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  // Gemini: роли user/model, диалог начинается с user, одинаковые роли подряд склеиваем
  const contents = [];
  messages.filter((m) => m.role !== 'system').forEach((m) => {
    const role = m.role === 'user' ? 'user' : 'model';
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n' + m.content;
    else contents.push({ role, parts: [{ text: m.content }] });
  });
  while (contents.length && contents[0].role !== 'user') contents.shift();
  const body = {
    contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75000);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + ((j.error && j.error.message) || 'ошибка'));
    const text = (((j.candidates || [])[0] || {}).content || {}).parts;
    if (!text || !text.length) throw new Error('Gemini вернул пустой ответ');
    return JSON.parse(text.map((p) => p.text || '').join('').replace(/^```json\s*|```\s*$/g, ''));
  } finally { clearTimeout(timer); }
}

// ---------- OpenAI (запасной вариант, пакет openai подключается только если нужен) ----------
let client = null;
async function openaiJSON(messages) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY не задан в .env');
  if (!client) { const OpenAI = require('openai'); client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, response_format: { type: 'json_object' }, temperature: 0.7,
  });
  return JSON.parse(res.choices[0].message.content);
}

// Запрос к ИИ, который обязан вернуть JSON. При невалидном JSON повторяем один раз
async function askJSON(messages, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await (provider() === 'openai' ? openaiJSON(messages) : geminiJSON(messages));
    } catch (e) {
      lastErr = e;
      if (/\b(400|401|403|404|429)\b/.test(e.message) || /не задан|aborted/.test(e.message)) break; // повтор не поможет
    }
  }
  throw lastErr;
}

// Выполнить настоящий запрос; если не вышло (нет интернета, ключа), вернуть заготовку
async function run(realFn, mockFn) {
  if (mockMode) return { data: mockFn(), mode: 'mock' };
  try {
    return { data: await realFn(), mode: 'gpt' };
  } catch (e) {
    console.error('[ai] ошибка ИИ, используем запасной режим:', e.message);
    return { data: mockFn(), mode: 'fallback' };
  }
}

const LANG_NAME = { ru: 'русском', kk: 'казахском', en: 'английском' };
const langName = (l) => LANG_NAME[l] || LANG_NAME.ru;

// Приводим урок от модели к нужному виду
function normalizeLesson(raw) {
  const steps = (raw.steps || []).map((s, i) => ({
    id: 's' + (i + 1),
    type: s.type === 'question' ? 'question' : 'theory',
    text: String(s.text || '').trim(),
    ...(s.type === 'question' ? { correctAnswer: String(s.correctAnswer || ''), hint: String(s.hint || '') } : {}),
  })).filter((s) => s.text);
  if (steps.length < 2) throw new Error('Модель вернула слишком короткий урок');
  const n = raw.notes || {};
  const notes = {
    sections: (n.sections || []).map((x) => ({ heading: String(x.heading || '').trim(), points: (x.points || []).map(String).filter(Boolean) })).filter((x) => x.heading && x.points.length),
    terms: (n.terms || []).map((x) => ({ term: String(x.term || '').trim(), def: String(x.def || '').trim() })).filter((x) => x.term && x.def),
    example: String(n.example || '').trim(),
  };
  if (!notes.sections.length) throw new Error('Модель не вернула конспект');
  return {
    notes,
    title: String(raw.title || 'Новый урок').trim(),
    goals: Array.isArray(raw.goals) ? raw.goals.map(String) : [],
    steps,
  };
}

// 1. Генерация урока
function generateLesson({ topic, goals, level, language, size }) {
  return run(async () => {
    const system = 'Ты методист колледжа. Составляешь короткие интерактивные уроки. Отвечай строго JSON без пояснений.';
    const user = `Составь урок на ${langName(language)} языке.
Тема: ${topic}
Цели: ${goals || 'определи сам'}
Уровень студентов: ${level || 'начальный'}
Формат JSON: {"title":"...","goals":["..."],"notes":{"sections":[{"heading":"название раздела","points":["короткий тезис"]}],"terms":[{"term":"термин","def":"короткое определение"}],"example":"один понятный пример"},"steps":[{"id":"s1","type":"theory","text":"..."},{"id":"s2","type":"question","text":"вопрос","correctAnswer":"короткий правильный ответ","hint":"подсказка, не раскрывающая ответ"}]}
Конспект - это письменный материал, из которого студент берёт знания до вопросов. ${size === 'detailed' ? 'Подробный: 5-6 разделов, по 3-5 тезисов, 4-6 терминов, пример с пояснением.' : 'Короткий: 3-4 раздела, всего до 10 тезисов, 3-4 термина, один короткий пример.'}
Требования: 3-4 блока теории и 3-4 вопроса, они чередуются (теория, вопрос, теория, вопрос...). Теория 2-4 предложения с примером. Вопросы с коротким однозначным ответом.`;
    return normalizeLesson(await askJSON([{ role: 'system', content: system }, { role: 'user', content: user }]));
  }, () => mock.mockLesson(topic, goals, size));
}

// 2. Чат студента с ассистентом
function chatWithStudent({ lesson, stepId, history = [], message, action, language }) {
  return run(async () => {
    const idx = Math.max(0, lesson.steps.findIndex((s) => s.id === stepId));
    const seen = lesson.steps.slice(0, idx + 1).map((s, i) =>
      `Шаг ${i + 1} (${s.type}): ${s.text}` + (s.type === 'question' ? ` [правильный ответ: ${s.correctAnswer}]` : '')).join('\n');
    const system = `Ты помощник студента колледжа на платформе с уроками. Урок: "${lesson.title}".
Содержание урока до текущего шага:
${seen}
Правила: не давай готовый ответ на вопросы урока, а наводи подсказками и примерами. Отвечай коротко (2-4 предложения) на ${langName(language)} языке.
Верни строго JSON: {"reply":"ответ студенту","gap":null или {"type":"unclear" или "common_error","note":"что именно в материале урока непонятно или где студент типично ошибается"}}.
Заполняй gap, только если студент просит объяснить то, что в уроке написано нечётко, или делает ошибку, указывающую на недочёт материала. Иначе gap = null.`;
    const userMsg = action === 'hint' ? 'Дай подсказку к текущему шагу.' : action === 'simpler' ? 'Объясни текущий шаг проще.' : message;
    const messages = [{ role: 'system', content: system }, ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })), { role: 'user', content: userMsg }];
    const out = await askJSON(messages);
    const gap = out.gap && out.gap.note ? { type: out.gap.type === 'common_error' ? 'common_error' : 'unclear', note: String(out.gap.note) } : null;
    return { reply: String(out.reply || ''), gap };
  }, () => mock.mockChat({ lesson, stepId, message, action }));
}

// 3. Проверка ответа студента на вопрос
function checkAnswer({ lesson, stepId, answer, language }) {
  const step = lesson.steps.find((s) => s.id === stepId);
  return run(async () => {
    const system = 'Ты строгий, но доброжелательный преподаватель. Проверяешь ответ студента. Отвечай строго JSON.';
    const user = `Вопрос: ${step.text}
Эталонный ответ: ${step.correctAnswer}
Ответ студента: ${answer}
Верни JSON: {"correct":true/false,"score":число 0-100,"feedback":"короткий комментарий на ${langName(language)} языке"}.
Если ответ неверный, направь студента, но не раскрывай правильный ответ.`;
    const out = await askJSON([{ role: 'system', content: system }, { role: 'user', content: user }]);
    return { correct: !!out.correct, score: Math.max(0, Math.min(100, Math.round(Number(out.score) || 0))), feedback: String(out.feedback || '') };
  }, () => mock.mockCheck(step, answer));
}

// 4. Рекомендации по улучшению урока (для Word-отчёта)
function recommend({ lesson, gaps, language }) {
  return run(async () => {
    if (!gaps.length) return mock.mockRecommendations(gaps, lesson);
    const list = gaps.map((g) => `Шаг ${mock.stepNo(lesson, g.stepId)} (${g.type}): ${g.note}`).join('\n');
    const system = 'Ты методист колледжа. Помогаешь улучшить учебный материал. Отвечай строго JSON.';
    const user = `Урок: "${lesson.title}". Ассистент собрал такие недочёты:
${list}
Сформулируй 3-5 конкретных правок материала на ${langName(language)} языке. Верни JSON: {"recommendations":["...","..."]}`;
    const out = await askJSON([{ role: 'system', content: system }, { role: 'user', content: user }]);
    const arr = (out.recommendations || []).map(String).filter(Boolean);
    if (!arr.length) throw new Error('пустые рекомендации');
    return arr;
  }, () => mock.mockRecommendations(gaps, lesson));
}

module.exports = { hasKey, isMock, setMock, generateLesson, chatWithStudent, checkAnswer, recommend };
