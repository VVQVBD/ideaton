// Небольшие чистые функции интерфейса: без DOM и без состояния, поэтому их легко проверять тестами.
// В браузере доступны как window.U, в тестах (Node) - через require.
(function (root) {
  'use strict';

  // Экранирование текста перед вставкой в HTML
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Подстановка {name} в строку из словаря
  function format(str, vars) {
    let s = String(str);
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return s;
  }

  const firstName = (n) => String(n || '').split(' ')[0];
  // Инициалы: "Виктория Ким" -> "ВК"
  const initials = (n) => String(n || '?').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  // Длина самого длинного слова: по ней CSS подбирает размер огромного заголовка
  const longestWord = (str) => Math.max(0, ...String(str || '').split(/\s+/).map((w) => w.length));

  // Последнее слово заголовка - курсивом с засечками
  function accentLast(text) {
    const w = String(text || '').trim().split(' ').filter(Boolean);
    if (!w.length) return '';
    const last = w.pop();
    return (w.length ? esc(w.join(' ')) + ' ' : '') + `<em>${esc(last)}</em>`;
  }

  // Подпись пункта меню: на узком таб-баре видно только первое слово ("Открытый урок" -> "Открытый")
  function navLabel(text) {
    const [first, ...rest] = String(text || '').split(' ');
    return `<span>${esc(first)}${rest.length ? `<span class="nav-rest"> ${esc(rest.join(' '))}</span>` : ''}</span>`;
  }

  // Казахские названия месяцев и дней: в браузерах часто нет казахской локали
  const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  const KK_DAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Подпись даты над приветствием: "вторник, 24 ноября" / "24 қараша, сейсенбі"
  function todayLabel(lang, date) {
    const d = date || new Date();
    if (lang === 'kk') return `${d.getDate()} ${KK_MONTHS[d.getMonth()]}, ${KK_DAYS[d.getDay()]}`;
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Месяц рейтинга "2026-11" -> "Ноябрь 2026 г." / "Қараша 2026"
  function monthLabel(m, lang) {
    const [y, mo] = String(m).split('-').map(Number);
    if (!y || !mo || mo < 1 || mo > 12) return String(m);
    if (lang === 'kk') return cap(KK_MONTHS[mo - 1]) + ' ' + y;
    return cap(new Date(y, mo - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }));
  }

  const U = { esc, format, firstName, initials, longestWord, accentLast, navLabel, todayLabel, monthLabel, KK_MONTHS, KK_DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = U;
  if (root) root.U = U;
})(typeof window !== 'undefined' ? window : null);
