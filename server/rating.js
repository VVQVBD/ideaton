// Расчёт рейтинга студентов за месяц
const db = require('./db');

const LESSONS_TARGET = 5; // сколько уроков в месяц даёт 100% активности

function monthKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// Для каждого студента берём последнюю попытку по каждому уроку (повтор одного урока не накручивает баллы)
function ratingFor(month) {
  const users = db.read('users').filter((u) => u.role === 'student');
  const attempts = db.read('attempts').filter((a) => monthKey(a.completedAt) === month);

  const rows = users.map((u) => {
    const byLesson = {};
    attempts.filter((a) => a.studentId === u.id)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .forEach((a) => { byLesson[a.lessonId] = a; });
    const list = Object.values(byLesson);
    const lessons = list.length;
    const avgGrade = lessons ? list.reduce((s, a) => s + a.score, 0) / lessons : 0;
    const activity = Math.min(100, (lessons / LESSONS_TARGET) * 100);
    const points = avgGrade * 0.7 + activity * 0.3;
    return {
      userId: u.id, name: u.name, group: u.group, color: u.color,
      lessons, avgGrade: Math.round(avgGrade * 10) / 10, activity: Math.round(activity), points: Math.round(points * 10) / 10,
    };
  }).filter((r) => r.lessons > 0).sort((a, b) => b.points - a.points);

  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

// Месяцы, в которых есть данные (для выбора месяца)
function availableMonths() {
  const set = new Set(db.read('attempts').map((a) => monthKey(a.completedAt)));
  set.add(monthKey(new Date()));
  return [...set].sort().reverse();
}

module.exports = { ratingFor, availableMonths, monthKey, LESSONS_TARGET };
