// Тестовые данные для демо. Вызов seed() полностью пересоздаёт файлы в data/
const db = require('./db');

const COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#0ea5e9', '#eab308', '#ef4444', '#14b8a6'];

const users = [
  { id: 't1', name: 'Айгерим Сарсенова', role: 'teacher', title: 'Преподаватель информатики', color: COLORS[0] },
  { id: 's1', name: 'Виктория Ким', role: 'student', group: 'ПО 24-2', color: COLORS[1] },
  { id: 's2', name: 'Айдар Бекенов', role: 'student', group: 'ПО 24-2', color: COLORS[2] },
  { id: 's3', name: 'Мадина Серикова', role: 'student', group: 'ПО 24-2', color: COLORS[3] },
  { id: 's4', name: 'Дамир Жумабаев', role: 'student', group: 'ПО 24-2', color: COLORS[4] },
  { id: 's5', name: 'Алина Петрова', role: 'student', group: 'ПО 24-2', color: COLORS[5] },
  { id: 's6', name: 'Нурлан Оспанов', role: 'student', group: 'ПО 24-2', color: COLORS[6] },
  { id: 's7', name: 'София Иванова', role: 'student', group: 'ПО 24-2', color: COLORS[7] },
  { id: 's8', name: 'Арман Касымов', role: 'student', group: 'ПО 24-2', color: COLORS[8] },
];

const courses = [
  { id: 'c1', title: 'Программирование', subtitle: 'Основы Python · 2 семестр', icon: 'code', color: 'blue', type: 'it' },
  { id: 'c2', title: 'Математика', subtitle: 'Высшая математика · 1 семестр', icon: 'sigma', color: 'red', type: 'math' },
  { id: 'c3', title: 'Английский для IT', subtitle: 'Языковой курс · B1-B2', icon: 'lang', color: 'green', type: 'language' },
];

// Уроки: теория (theory) чередуется с вопросами (question).
// keywords нужны только для проверки ответов в режиме MOCK_AI.
const lessons = [
  {
    id: 'l1', courseId: 'c1', title: 'Циклы в Python', topic: 'Циклы for и while',
    goals: ['Понимать, как работает цикл for', 'Отличать for от while', 'Уметь прерывать цикл'],
    language: 'ru', status: 'published', createdBy: 't1',
    steps: [
      { id: 's1', type: 'theory', text: 'Цикл повторяет блок кода несколько раз. Цикл for перебирает значения по очереди. Например, for i in range(3): print(i) выведет числа 0, 1, 2. Функция range(3) создаёт последовательность из трёх чисел.' },
      { id: 's2', type: 'question', text: 'Что выведет код: for i in range(3): print(i)?', correctAnswer: '0, 1, 2', keywords: ['0', '1', '2'], hint: 'Подумай, с какого числа начинается range, если начало не указано.' },
      { id: 's3', type: 'theory', text: 'Цикл while выполняется, пока условие истинно. Пример: n = 3; while n > 0: print(n); n = n - 1. Если внутри цикла не менять переменную из условия, цикл никогда не закончится.' },
      { id: 's4', type: 'question', text: 'Как называется цикл, который никогда не завершается?', correctAnswer: 'Бесконечный цикл', keywords: ['бесконечн'], hint: 'Вспомни, что будет, если не менять n внутри while.' },
      { id: 's5', type: 'theory', text: 'Цикл for умеет перебирать списки: for fruit in ["яблоко", "банан"]: print(fruit). Для управления циклом есть специальные операторы.' },
      { id: 's6', type: 'question', text: 'Какой оператор досрочно прерывает цикл?', correctAnswer: 'break', keywords: ['break'], hint: 'Название по-английски означает "сломать, прервать".' },
    ],
  },
  {
    id: 'l2', courseId: 'c1', title: 'Условные операторы if / else', topic: 'Ветвление в Python',
    goals: ['Писать условия с if и else', 'Сравнивать значения'],
    language: 'ru', status: 'published', createdBy: 't1',
    steps: [
      { id: 's1', type: 'theory', text: 'Оператор if выполняет код только если условие истинно. Блок else выполняется, если условие ложно. Пример: if age >= 18: print("взрослый") else: print("ребёнок").' },
      { id: 's2', type: 'question', text: 'Какой блок выполнится, если условие в if ложно?', correctAnswer: 'else', keywords: ['else'], hint: 'Это слово переводится как "иначе".' },
      { id: 's3', type: 'theory', text: 'Для сравнения используются операторы ==, !=, <, >, <=, >=. Один знак = нужен для присваивания, а два == для сравнения.' },
      { id: 's4', type: 'question', text: 'Каким оператором проверяют равенство двух значений?', correctAnswer: '==', keywords: ['=='], hint: 'Один знак = уже занят под другое действие.' },
    ],
  },
  {
    id: 'l3', courseId: 'c1', title: 'Функции в Python', topic: 'Создание и вызов функций',
    goals: ['Создавать функции через def', 'Возвращать значения через return'],
    language: 'ru', status: 'published', createdBy: 't1',
    steps: [
      { id: 's1', type: 'theory', text: 'Функция - это именованный блок кода, который можно вызывать много раз. Она создаётся словом def: def hello(name): print("Привет,", name). Вызов: hello("Айдар").' },
      { id: 's2', type: 'question', text: 'Каким ключевым словом создают функцию в Python?', correctAnswer: 'def', keywords: ['def'], hint: 'Сокращение от английского "define".' },
      { id: 's3', type: 'theory', text: 'Чтобы функция вернула результат, используется return: def add(a, b): return a + b. Тогда add(2, 3) даст число 5, которое можно сохранить в переменную.' },
      { id: 's4', type: 'question', text: 'Что вернёт функция add(2, 3) из примера?', correctAnswer: '5', keywords: ['5'], hint: 'Функция складывает два аргумента.' },
    ],
  },
  {
    id: 'l4', courseId: 'c2', title: 'Производная функции', topic: 'Основы дифференцирования',
    goals: ['Понимать смысл производной', 'Находить производную степенной функции'],
    language: 'ru', status: 'published', createdBy: 't1',
    steps: [
      { id: 's1', type: 'theory', text: 'Производная показывает скорость изменения функции. Для степенной функции x^n производная равна n * x^(n-1). Например, производная x^3 равна 3 * x^2.' },
      { id: 's2', type: 'question', text: 'Чему равна производная функции x^2?', correctAnswer: '2x', keywords: ['2x'], hint: 'Используй правило: степень выходит вперёд, а в показателе вычитаем единицу.' },
      { id: 's3', type: 'theory', text: 'Производная константы равна нулю, потому что константа не меняется. Производная суммы равна сумме производных.' },
      { id: 's4', type: 'question', text: 'Чему равна производная числа 7?', correctAnswer: '0', keywords: ['0'], hint: 'Число не меняется при изменении x.' },
    ],
  },
  {
    id: 'l5', courseId: 'c3', title: 'IT Vocabulary: Software Development', topic: 'Английские термины в разработке',
    goals: ['Знать базовые термины разработчика', 'Понимать профессиональную лексику'],
    language: 'ru', status: 'published', createdBy: 't1',
    steps: [
      { id: 's1', type: 'theory', text: 'Основные термины: bug - ошибка в программе, feature - функция продукта, deploy - выложить программу на сервер, review - проверка кода коллегой.' },
      { id: 's2', type: 'question', text: 'Как по-английски называется ошибка в программе?', correctAnswer: 'bug', keywords: ['bug'], hint: 'Дословно это слово переводится как "жук".' },
      { id: 's3', type: 'theory', text: 'Команда обычно работает по циклу: plan - планирование, develop - разработка, test - тестирование, release - выпуск версии.' },
      { id: 's4', type: 'question', text: 'Как называется выпуск готовой версии продукта?', correctAnswer: 'release', keywords: ['release'], hint: 'Последний этап цикла из примера.' },
    ],
  },
];

// Конспекты уроков (материал, из которого студент берёт знания перед вопросами)
const notes = {
 "l1": {
  "sections": [
   {
    "heading": "Что такое цикл",
    "points": [
     "Цикл повторяет блок кода несколько раз",
     "Нужен, чтобы не писать одно и то же много раз"
    ]
   },
   {
    "heading": "Цикл for",
    "points": [
     "for перебирает значения по очереди",
     "range(3) даёт числа 0, 1, 2",
     "Отсчёт в range идёт с нуля, последнее число не входит"
    ]
   },
   {
    "heading": "Цикл while",
    "points": [
     "while работает, пока условие истинно",
     "Переменную из условия нужно менять внутри цикла",
     "Если не менять - цикл бесконечный"
    ]
   },
   {
    "heading": "break и continue",
    "points": [
     "break сразу прерывает цикл",
     "continue пропускает остаток шага и идёт к следующему"
    ]
   }
  ],
  "terms": [
   {
    "term": "Итерация",
    "def": "один проход цикла"
   },
   {
    "term": "range",
    "def": "функция, создающая последовательность чисел"
   },
   {
    "term": "Бесконечный цикл",
    "def": "цикл, который никогда не завершается"
   }
  ],
  "example": "for i in range(5):\n    if i == 3:\n        break\n    print(i)\nВыведет 0, 1, 2 и остановится на тройке."
 },
 "l2": {
  "sections": [
   {
    "heading": "if и else",
    "points": [
     "if выполняет код, только если условие истинно",
     "else выполняется, если условие ложно"
    ]
   },
   {
    "heading": "Сравнение",
    "points": [
     "Операторы: ==, !=, <, >, <=, >=",
     "Один = это присваивание, два == это сравнение"
    ]
   }
  ],
  "terms": [
   {
    "term": "Условие",
    "def": "выражение, которое истинно или ложно"
   },
   {
    "term": "Ветвление",
    "def": "выбор, какой код выполнить"
   }
  ],
  "example": "if age >= 18:\n    print(\"взрослый\")\nelse:\n    print(\"ребёнок\")"
 },
 "l3": {
  "sections": [
   {
    "heading": "Функция",
    "points": [
     "Именованный блок кода, который можно вызывать много раз",
     "Создаётся ключевым словом def"
    ]
   },
   {
    "heading": "Результат функции",
    "points": [
     "return возвращает значение из функции",
     "Без return функция вернёт None"
    ]
   }
  ],
  "terms": [
   {
    "term": "Параметр",
    "def": "переменная в скобках при создании функции"
   },
   {
    "term": "Вызов",
    "def": "запуск функции по имени"
   }
  ],
  "example": "def add(a, b):\n    return a + b\nadd(2, 3) вернёт 5."
 },
 "l4": {
  "sections": [
   {
    "heading": "Смысл производной",
    "points": [
     "Показывает скорость изменения функции"
    ]
   },
   {
    "heading": "Правила",
    "points": [
     "(x^n)' = n * x^(n-1)",
     "Производная константы равна нулю"
    ]
   }
  ],
  "terms": [
   {
    "term": "Производная",
    "def": "скорость изменения функции"
   },
   {
    "term": "Константа",
    "def": "число, которое не меняется"
   }
  ],
  "example": "(x^2)' = 2x, а (7)' = 0."
 },
 "l5": {
  "sections": [
   {
    "heading": "Термины разработчика",
    "points": [
     "bug - ошибка в программе",
     "feature - функция продукта",
     "deploy - выкладка на сервер",
     "release - выпуск готовой версии"
    ]
   },
   {
    "heading": "Цикл работы команды",
    "points": [
     "plan - планирование",
     "develop - разработка",
     "test - проверка",
     "release - выпуск"
    ]
   }
  ],
  "terms": [
   {
    "term": "bug",
    "def": "ошибка"
   },
   {
    "term": "release",
    "def": "выпуск версии"
   }
  ],
  "example": "We found a bug before the release."
 }
};
lessons.forEach((l) => { l.notes = notes[l.id]; });

// Недочёты урока "Циклы в Python" - как будто их уже собрал ассистент
const gapNotes = [
  { lessonId: 'l1', stepId: 's5', studentId: 's6', type: 'unclear', note: 'Не объяснено, что такое break и continue: в теории только упоминание "специальные операторы"' },
  { lessonId: 'l1', stepId: 's5', studentId: 's4', type: 'unclear', note: 'Непонятно, чем break отличается от continue, нет примера' },
  { lessonId: 'l1', stepId: 's5', studentId: 's8', type: 'unclear', note: 'Просит пример с break, в уроке его нет' },
  { lessonId: 'l1', stepId: 's1', studentId: 's3', type: 'common_error', note: 'Ожидала, что range(3) выведет 1, 2, 3: не акцентировано, что отсчёт идёт с нуля' },
  { lessonId: 'l1', stepId: 's1', studentId: 's8', type: 'common_error', note: 'Ошибся в ответе: посчитал, что range(3) включает число 3' },
  { lessonId: 'l1', stepId: 's3', studentId: 's4', type: 'unclear', note: 'Не понял, как именно while заканчивается, нужен пошаговый разбор значений n' },
];

// Результаты прохождения: [студент, урок, оценка]
const results = [
  ['s1', 'l3', 85], ['s1', 'l2', 90],
  ['s2', 'l1', 92], ['s2', 'l2', 88], ['s2', 'l3', 95], ['s2', 'l4', 90], ['s2', 'l5', 85],
  ['s3', 'l1', 78], ['s3', 'l2', 82], ['s3', 'l3', 80], ['s3', 'l4', 75],
  ['s4', 'l1', 70], ['s4', 'l2', 65],
  ['s5', 'l1', 95], ['s5', 'l2', 97], ['s5', 'l3', 93], ['s5', 'l4', 96],
  ['s6', 'l1', 60], ['s6', 'l2', 72], ['s6', 'l3', 68],
  ['s7', 'l1', 88], ['s7', 'l2', 90], ['s7', 'l3', 84], ['s7', 'l4', 92], ['s7', 'l5', 89],
  ['s8', 'l1', 55],
];
// Прошлый месяц - чтобы в рейтинге работал выбор месяца
const prevResults = [
  ['s5', 'l1', 94], ['s5', 'l2', 96], ['s5', 'l3', 92], ['s5', 'l4', 95], ['s5', 'l5', 90],
  ['s3', 'l1', 85], ['s3', 'l2', 80], ['s3', 'l3', 83],
  ['s2', 'l1', 88], ['s2', 'l2', 84], ['s2', 'l3', 90], ['s2', 'l4', 86],
  ['s7', 'l1', 75], ['s7', 'l2', 80],
];

function seed() {
  const now = new Date();
  const day = now.getDate();

  // Оценка -> ответы шагов (для простоты у всех вопросов одинаковый балл)
  function makeAnswers(lessonId, score) {
    const lesson = lessons.find((l) => l.id === lessonId);
    return lesson.steps.filter((s) => s.type === 'question').map((s) => ({ stepId: s.id, score, tries: 1 }));
  }

  const attempts = [];
  const activity = [];
  results.forEach(([studentId, lessonId, score], i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1 + ((i * 3) % day), 10 + (i % 8), 15);
    attempts.push({ id: 'a' + (i + 1), lessonId, studentId, answers: makeAnswers(lessonId, score), score, completedAt: d.toISOString() });
    activity.push({ studentId, date: d.toISOString(), action: 'lesson_completed' });
  });
  prevResults.forEach(([studentId, lessonId, score], i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 3 + i * 2, 12, 0);
    attempts.push({ id: 'p' + (i + 1), lessonId, studentId, answers: makeAnswers(lessonId, score), score, completedAt: d.toISOString() });
    activity.push({ studentId, date: d.toISOString(), action: 'lesson_completed' });
  });
  // Немного сообщений в чат за последнюю неделю - для метрики "активные за неделю"
  ['s1', 's2', 's3', 's5', 's6', 's7'].forEach((studentId, i) => {
    const d = new Date(now.getTime() - (i + 1) * 20 * 3600 * 1000);
    activity.push({ studentId, date: d.toISOString(), action: 'chat_message' });
  });

  const gaps = gapNotes.map((g, i) => ({
    id: 'g' + (i + 1), ...g, date: new Date(now.getFullYear(), now.getMonth(), 1 + ((i * 4) % day), 14, 0).toISOString(),
  }));

  db.write('users', users);
  db.write('courses', courses);
  db.write('lessons', lessons);
  db.write('attempts', attempts);
  db.write('gaps', gaps);
  db.write('activity', activity);
}

module.exports = { seed };
