// Word-отчёт по уроку и Excel-таблица оценок
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle,
} = require('docx');
const ExcelJS = require('exceljs');
const db = require('./db');
const { ratingFor, monthKey } = require('./rating');
const { stepNo } = require('./mock');

const T = {
  ru: {
    report: 'Отчёт по уроку', lesson: 'Урок', date: 'Дата', group: 'Группа', goals: 'Цели урока', plan: 'План урока',
    stats: 'Статистика', passed: 'Студентов прошли урок', avg: 'Средняя оценка', hard: 'Самый сложный вопрос',
    errors: 'Частые ошибки', none: 'нет данных', gaps: 'Недочёты урока', recs: 'Рекомендации по улучшению',
    step: 'Шаг', type: 'Тип', problem: 'Проблема', students: 'Студентов', theory: 'Теория', question: 'Вопрос',
    unclear: 'Непонятно', common_error: 'Типичная ошибка', noGaps: 'Недочётов не найдено.', of: 'из',
    footer: 'Отчёт сформирован автоматически ИИ-ассистентом платформы',
  },
  kk: {
    report: 'Сабақ бойынша есеп', lesson: 'Сабақ', date: 'Күні', group: 'Топ', goals: 'Сабақтың мақсаттары', plan: 'Сабақ жоспары',
    stats: 'Статистика', passed: 'Сабақты өткен студенттер', avg: 'Орташа баға', hard: 'Ең қиын сұрақ',
    errors: 'Жиі қателер', none: 'дерек жоқ', gaps: 'Сабақтың кемшіліктері', recs: 'Жақсарту бойынша ұсыныстар',
    step: 'Қадам', type: 'Түрі', problem: 'Мәселе', students: 'Студент саны', theory: 'Теория', question: 'Сұрақ',
    unclear: 'Түсініксіз', common_error: 'Типтік қате', noGaps: 'Кемшіліктер табылмады.', of: '/',
    footer: 'Есепті платформаның ЖИ-көмекшісі автоматты түрде жасады',
  },
};

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideHorizontal: BORDER, insideVertical: BORDER };

function cell(text, { bold = false, fill, width } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold })] })],
  });
}

const h = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
const p = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 80 } });
const bullet = (text) => new Paragraph({ text, bullet: { level: 0 } });

async function buildLessonReport({ lessonId, lang = 'ru', recommendations }) {
  const t = T[lang] || T.ru;
  const lesson = db.read('lessons').find((l) => l.id === lessonId);
  if (!lesson) throw new Error('Урок не найден');
  const users = db.read('users');
  const attempts = db.read('attempts').filter((a) => a.lessonId === lessonId);
  const gaps = db.read('gaps').filter((g) => g.lessonId === lessonId);

  // Статистика
  const studentIds = [...new Set(attempts.map((a) => a.studentId))];
  const totalStudents = users.filter((u) => u.role === 'student').length;
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : null;
  const groups = [...new Set(users.filter((u) => studentIds.includes(u.id)).map((u) => u.group).filter(Boolean))].join(', ') || '-';

  // Самый сложный вопрос: минимальный средний балл
  const stepScores = {};
  attempts.forEach((a) => a.answers.forEach((r) => { (stepScores[r.stepId] = stepScores[r.stepId] || []).push(r.score); }));
  let hardest = null;
  Object.entries(stepScores).forEach(([sid, arr]) => {
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    if (!hardest || m < hardest.avg) hardest = { sid, avg: Math.round(m) };
  });

  // Недочёты, сгруппированные по шагам
  const byStep = {};
  gaps.forEach((g) => { (byStep[g.stepId] = byStep[g.stepId] || []).push(g); });
  const gapRows = Object.entries(byStep).sort((a, b) => b[1].length - a[1].length).map(([sid, items]) => {
    const kinds = [...new Set(items.map((g) => t[g.type] || g.type))].join(', ');
    const notes = [...new Set(items.map((g) => g.note))].join('; ');
    const count = new Set(items.map((g) => g.studentId)).size;
    return { sid, kinds, notes, count };
  });
  const commonErrors = gaps.filter((g) => g.type === 'common_error');

  const children = [
    new Paragraph({ text: t.report, heading: HeadingLevel.TITLE }),
    p(`${t.lesson}: ${lesson.title}`, { bold: true, size: 26 }),
    p(`${t.date}: ${new Date().toLocaleDateString('ru-RU')}`),
    p(`${t.group}: ${groups}`),

    h(t.goals),
    ...(lesson.goals.length ? lesson.goals.map(bullet) : [p('-')]),

    h(t.plan),
    ...lesson.steps.map((s, i) => p(`${t.step} ${i + 1} (${t[s.type]}): ${s.text.length > 110 ? s.text.slice(0, 107) + '...' : s.text}`)),

    h(t.stats),
    bullet(`${t.passed}: ${studentIds.length} ${t.of} ${totalStudents}`),
    bullet(`${t.avg}: ${avg === null ? t.none : avg + ' / 100'}`),
    bullet(`${t.hard}: ${hardest ? `${t.step} ${stepNo(lesson, hardest.sid)} (${hardest.avg} / 100)` : t.none}`),
    bullet(`${t.errors}: ${commonErrors.length ? [...new Set(commonErrors.map((g) => g.note))].slice(0, 3).join('; ') : t.none}`),

    h(t.gaps),
  ];

  if (gapRows.length) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDERS,
      rows: [
        new TableRow({ tableHeader: true, children: [t.step, t.type, t.problem, t.students].map((x, i) => cell(x, { bold: true, fill: 'DBEAFE', width: [10, 18, 58, 14][i] })) }),
        ...gapRows.map((r) => new TableRow({ children: [
          cell(stepNo(lesson, r.sid), { width: 10 }), cell(r.kinds, { width: 18 }), cell(r.notes, { width: 58 }), cell(r.count, { width: 14 }),
        ] })),
      ],
    }));
  } else {
    children.push(p(t.noGaps));
  }

  children.push(h(t.recs));
  (recommendations && recommendations.length ? recommendations : [t.none]).forEach((r, i) => children.push(p(`${i + 1}. ${r}`)));
  children.push(new Paragraph({ children: [new TextRun({ text: t.footer, italics: true, color: '64748B', size: 18 })], spacing: { before: 400 } }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

// Excel с оценками. month - 'YYYY-MM' для листа "Сводка"; lessonId - фильтр листа "Оценки"
async function buildGradesWorkbook({ month, lessonId }) {
  const users = db.read('users');
  const lessons = db.read('lessons');
  const courses = db.read('courses');
  let attempts = db.read('attempts');
  if (lessonId) attempts = attempts.filter((a) => a.lessonId === lessonId);

  const wb = new ExcelJS.Workbook();
  const styleHeader = (ws) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    row.alignment = { vertical: 'middle' };
    row.height = 22;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const ws = wb.addWorksheet('Оценки');
  ws.columns = [
    { header: 'Студент', key: 'student', width: 26 }, { header: 'Группа', key: 'group', width: 10 },
    { header: 'Курс', key: 'course', width: 22 }, { header: 'Урок', key: 'lesson', width: 36 },
    { header: 'Оценка', key: 'score', width: 10 }, { header: 'Дата', key: 'date', width: 14 },
  ];
  attempts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).forEach((a) => {
    const u = users.find((x) => x.id === a.studentId) || {};
    const l = lessons.find((x) => x.id === a.lessonId) || {};
    const c = courses.find((x) => x.id === l.courseId) || {};
    ws.addRow({ student: u.name, group: u.group, course: c.title, lesson: l.title, score: a.score, date: new Date(a.completedAt) });
  });
  ws.getColumn('date').numFmt = 'dd.mm.yyyy';
  styleHeader(ws);

  const m = month || monthKey(new Date());
  const rating = ratingFor(m);
  const ws2 = wb.addWorksheet('Сводка');
  ws2.columns = [
    { header: 'Студент', key: 'student', width: 26 }, { header: 'Группа', key: 'group', width: 10 },
    { header: 'Средняя оценка', key: 'avg', width: 16 }, { header: 'Пройдено уроков', key: 'lessons', width: 17 },
    { header: 'Активность, %', key: 'act', width: 15 }, { header: 'Баллы рейтинга (' + m + ')', key: 'points', width: 22 },
    { header: 'Место', key: 'rank', width: 8 },
  ];
  users.filter((u) => u.role === 'student').forEach((u) => {
    const r = rating.find((x) => x.userId === u.id);
    ws2.addRow({ student: u.name, group: u.group, avg: r ? r.avgGrade : 0, lessons: r ? r.lessons : 0, act: r ? r.activity : 0, points: r ? r.points : 0, rank: r ? r.rank : '-' });
  });
  styleHeader(ws2);

  return wb.xlsx.writeBuffer();
}

// Word-конспект урока (для студента и преподавателя)
async function buildNotesDoc(lesson, lang) {
  const L = lang === 'kk' ? { notes: 'Конспект', goals: 'Мақсаттар', terms: 'Терминдер', example: 'Мысал' } : { notes: 'Конспект', goals: 'Цели', terms: 'Термины', example: 'Пример' };
  const n = lesson.notes || { sections: [], terms: [], example: '' };
  const kids = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: lesson.title, font: 'Calibri' })] }),
    new Paragraph({ children: [new TextRun({ text: L.notes, italics: true, color: '64748B', font: 'Calibri' })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: L.goals, font: 'Calibri' })] }),
    ...(lesson.goals || []).map((g) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: g, font: 'Calibri' })] })),
  ];
  n.sections.forEach((sec) => {
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: sec.heading, font: 'Calibri' })] }));
    sec.points.forEach((p) => kids.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: p, font: 'Calibri' })] })));
  });
  if (n.terms.length) {
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: L.terms, font: 'Calibri' })] }));
    kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: n.terms.map((x) => new TableRow({ children: [cell(x.term, { bold: true, fill: 'EEF2FF', width: 30 }), cell(x.def, { width: 70 })] })) }));
  }
  if (n.example) {
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: L.example, font: 'Calibri' })] }));
    n.example.split('\n').forEach((line) => kids.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas' })] })));
  }
  return Packer.toBuffer(new Document({ sections: [{ children: kids }] }));
}

module.exports = { buildNotesDoc, buildLessonReport, buildGradesWorkbook };
