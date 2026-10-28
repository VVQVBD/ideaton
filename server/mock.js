// Заготовленные ответы для режима MOCK_AI (демо без интернета и без ключа)

// Улучшенная версия урока про циклы (с break и continue) - показывает, как урок "дорабатывается" после отчёта
const loopsLesson = {
  title: 'Циклы в Python: for, while, break, continue',
  goals: [
    'Понимать, как работают циклы for и while',
    'Уметь управлять циклом с помощью break и continue',
    'Помнить, что range начинается с нуля',
  ],
  steps: [
    { id: 's1', type: 'theory', text: 'Цикл повторяет блок кода несколько раз. Цикл for перебирает значения по очереди. Функция range(3) создаёт числа 0, 1, 2: отсчёт всегда идёт с нуля, а последнее число (3) в набор не входит.' },
    { id: 's2', type: 'question', text: 'Что выведет код: for i in range(3): print(i)?', correctAnswer: '0, 1, 2', keywords: ['0', '1', '2'], hint: 'Отсчёт в range начинается с нуля, а число 3 в набор не входит.' },
    { id: 's3', type: 'theory', text: 'Цикл while работает, пока условие истинно. Разберём по шагам: n = 3, условие n > 0 истинно, выводим 3, n становится 2; снова выводим 2, n становится 1; выводим 1, n становится 0, условие ложно и цикл заканчивается. Если не менять n внутри цикла, он будет повторяться вечно.' },
    { id: 's4', type: 'question', text: 'Как называется цикл, который никогда не завершается?', correctAnswer: 'Бесконечный цикл', keywords: ['бесконечн'], hint: 'Что будет, если внутри while не менять переменную из условия?' },
    { id: 's5', type: 'theory', text: 'Оператор break немедленно прерывает цикл. Оператор continue пропускает остаток текущего шага и переходит к следующему. Пример: for i in range(5): if i == 3: break; print(i) выведет 0, 1, 2 и остановится на тройке.' },
    { id: 's6', type: 'question', text: 'Какой оператор досрочно прерывает цикл?', correctAnswer: 'break', keywords: ['break'], hint: 'Название по-английски означает "сломать, прервать".' },
  ],
};

const loopsNotes = {
  sections: [
    { heading: 'Что такое цикл', points: ['Цикл повторяет блок кода несколько раз', 'Нужен, чтобы не писать одно и то же много раз'] },
    { heading: 'Цикл for', points: ['for перебирает значения по очереди', 'range(3) даёт числа 0, 1, 2', 'Отсчёт в range идёт с нуля, последнее число не входит'] },
    { heading: 'Цикл while', points: ['while работает, пока условие истинно', 'Переменную из условия нужно менять внутри цикла', 'Если не менять - цикл бесконечный'] },
    { heading: 'break и continue', points: ['break сразу прерывает цикл', 'continue пропускает остаток шага и идёт к следующему'] },
  ],
  terms: [{ term: 'Итерация', def: 'один проход цикла' }, { term: 'range', def: 'функция, создающая последовательность чисел' }, { term: 'Бесконечный цикл', def: 'цикл, который никогда не завершается' }],
  example: 'for i in range(5):\n    if i == 3:\n        break\n    print(i)\nВыведет 0, 1, 2 и остановится на тройке.',
};
const listsNotes = {
  sections: [
    { heading: 'Что такое список', points: ['Список хранит несколько значений в одной переменной', 'Элементы нумеруются с нуля: fruits[0] - первый'] },
    { heading: 'Основные действия', points: ['append добавляет элемент в конец', 'len возвращает количество элементов', 'Список можно перебирать циклом for'] },
  ],
  terms: [{ term: 'Индекс', def: 'номер элемента в списке, начиная с нуля' }, { term: 'append', def: 'метод добавления элемента в конец списка' }],
  example: 'fruits = ["яблоко", "банан"]\nfruits.append("груша")\nprint(len(fruits))  # 3',
};

loopsLesson.notes = loopsNotes;

const listsLesson = {
  title: 'Списки в Python',
  goals: ['Создавать списки', 'Обращаться к элементам по индексу', 'Добавлять элементы через append'],
  notes: listsNotes,
  steps: [
    { id: 's1', type: 'theory', text: 'Список хранит несколько значений в одной переменной: fruits = ["яблоко", "банан", "груша"]. Элементы нумеруются с нуля, поэтому fruits[0] - это "яблоко".' },
    { id: 's2', type: 'question', text: 'Какой элемент списка fruits из примера находится под индексом 1?', correctAnswer: 'банан', keywords: ['банан'], hint: 'Индексы идут 0, 1, 2...' },
    { id: 's3', type: 'theory', text: 'Чтобы добавить элемент в конец списка, используют метод append: fruits.append("слива"). Длину списка возвращает функция len(fruits).' },
    { id: 's4', type: 'question', text: 'Какой метод добавляет элемент в конец списка?', correctAnswer: 'append', keywords: ['append'], hint: 'По-английски это слово значит "добавить в конец".' },
    { id: 's5', type: 'theory', text: 'Список можно перебирать циклом: for f in fruits: print(f). Так мы выведем каждый элемент по очереди.' },
    { id: 's6', type: 'question', text: 'Какая функция возвращает количество элементов в списке?', correctAnswer: 'len', keywords: ['len'], hint: 'Сокращение от английского "length".' },
  ],
};

// Выбор готового урока по теме
function mockLesson(topic, goals, size) {
  const t = (topic || '').toLowerCase();
  const base = /цикл|loop|for|while/.test(t) ? loopsLesson : listsLesson;
  const lesson = JSON.parse(JSON.stringify(base));
  // Короткий конспект: оставляем первые разделы и по 3 тезиса
  if (size !== 'detailed') { lesson.notes.sections = lesson.notes.sections.slice(0, 3).map((x) => ({ ...x, points: x.points.slice(0, 3) })); }
  if (goals && goals.trim()) lesson.goals = goals.split(/\n|;/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  return lesson;
}

// Простая проверка ответа по ключевым словам
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[.,!?;:"'«»()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function mockCheck(step, answer) {
  const a = normalize(answer);
  let keys = step.keywords;
  if (!keys || !keys.length) {
    // Если ключевых слов нет (урок сгенерирован), берём слова из правильного ответа
    keys = normalize(step.correctAnswer).split(' ').filter((w) => w.length > 2).map((w) => w.slice(0, 5));
    if (!keys.length) keys = [normalize(step.correctAnswer)];
  }
  if (!a) return { correct: false, score: 0, feedback: 'Напиши ответ в поле, и я проверю.' };
  const found = keys.filter((k) => a.includes(String(k).toLowerCase())).length;
  // Если ключи - короткие числа или символы, частичный ответ не засчитываем
  const strict = keys.every((k) => String(k).length <= 2);
  const score = strict && found < keys.length ? 0 : Math.round((found / keys.length) * 100);
  if (score >= 100) return { correct: true, score: 100, feedback: 'Верно! Отличная работа.' };
  if (score >= 50) return { correct: false, score, feedback: 'Ты на правильном пути, но ответ неполный. Подумай ещё: ' + (step.hint || 'перечитай теорию.') };
  return { correct: false, score: 0, feedback: 'Пока не совсем. Подсказка: ' + (step.hint || 'перечитай теорию выше.') };
}

function stepNo(lesson, stepId) {
  const i = lesson.steps.findIndex((s) => s.id === stepId);
  return i < 0 ? 1 : i + 1;
}

// Находим теорию, которая относится к текущему шагу
function theoryFor(lesson, stepId) {
  const i = Math.max(0, lesson.steps.findIndex((s) => s.id === stepId));
  for (let k = i; k >= 0; k--) if (lesson.steps[k].type === 'theory') return lesson.steps[k];
  return lesson.steps[0];
}

// Ответ ассистента по простым правилам. Возвращает {reply, gap}
function mockChat({ lesson, stepId, message, action }) {
  const step = lesson.steps.find((s) => s.id === stepId) || lesson.steps[0];
  const no = stepNo(lesson, stepId);
  const msg = normalize(message);

  if (action === 'simpler' || /проще|simpler/.test(msg)) {
    const th = theoryFor(lesson, stepId);
    const firstSentence = th.text.split(/(?<=[.!?])\s/)[0];
    return {
      reply: 'Давай проще. Главная мысль шага: ' + firstSentence + ' Представь это как инструкцию, которую компьютер выполняет по порядку. Хочешь, разберём на примере?',
      gap: null,
    };
  }
  if (action === 'hint' || /подсказ|hint/.test(msg)) {
    return { reply: step.type === 'question' ? 'Подсказка: ' + (step.hint || 'перечитай теорию выше.') : 'Сначала прочитай этот блок теории, а в следующем шаге я помогу с вопросом.', gap: null };
  }
  if (/break|continue|прерв|пропуск/.test(msg) && lesson.id === 'l1') {
    return {
      reply: 'Хороший вопрос. break полностью останавливает цикл, а continue пропускает только текущий шаг и идёт дальше. Попробуй сам: что выведет цикл for i in range(5), если при i == 3 написать break?',
      gap: { type: 'unclear', note: 'Студент просит объяснить break и continue: в теории урока нет описания и примера, только упоминание "специальные операторы"' },
    };
  }
  if (/ответ|скажи|реши за меня|напиши за меня/.test(msg)) {
    return { reply: 'Готовый ответ я не подскажу, но помогу дойти самому. Подсказка: ' + (step.hint || 'вернись к теории и найди ключевое слово.'), gap: null };
  }
  if (/не понял|не понимаю|непонятно|не ясно|что такое|почему|объясни/.test(msg)) {
    return {
      reply: 'Давай разберёмся по шагам. ' + (step.hint ? 'Подсказка: ' + step.hint + ' ' : '') + 'Напиши, какую часть ты понял, а где возникла путаница - и пойдём дальше.',
      gap: { type: 'unclear', note: 'Шаг ' + no + ': студент не понял материал, спросил "' + String(message).slice(0, 120) + '". Стоит добавить пояснение или пример' },
    };
  }
  return {
    reply: 'Давай подумаем вместе. ' + (step.type === 'question' ? 'Вспомни теорию выше и попробуй ответить своими словами. Если застрянешь, нажми "Дай подсказку".' : 'Если что-то непонятно в теории, напиши, что именно, и я объясню.'),
    gap: null,
  };
}

function mockRecommendations(gaps, lesson) {
  const byStep = {};
  gaps.forEach((g) => { (byStep[g.stepId] = byStep[g.stepId] || []).push(g); });
  const list = Object.entries(byStep)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([stepId, items]) => {
      const no = stepNo(lesson, stepId);
      const kind = items.some((g) => g.type === 'unclear') ? 'Добавить пояснение и короткий пример' : 'Явно выделить типичную ошибку';
      return 'Шаг ' + no + ': ' + kind + '. Причина: ' + items[0].note + '.';
    });
  if (!list.length) list.push('Недочётов не найдено: материал можно оставить без изменений.');
  return list;
}

module.exports = { mockLesson, mockCheck, mockChat, mockRecommendations, stepNo, normalize };
