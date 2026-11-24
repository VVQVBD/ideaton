// Чистые функции интерфейса из public/js/utils.js
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const U = require('../../public/js/utils.js');

describe('esc', () => {
  it('экранирует HTML-символы', () => {
    expect(U.esc('<b>"Tom" & \'Jerry\'</b>')).toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  });
  it('null и undefined превращает в пустую строку, числа - в текст', () => {
    expect(U.esc(null)).toBe('');
    expect(U.esc(undefined)).toBe('');
    expect(U.esc(0)).toBe('0');
  });
});

describe('format', () => {
  it('подставляет все вхождения переменных', () => {
    expect(U.format('{n} из {n}, {x}', { n: 3, x: 'ok' })).toBe('3 из 3, ok');
  });
  it('без переменных возвращает строку как есть', () => {
    expect(U.format('Привет')).toBe('Привет');
  });
});

describe('имена', () => {
  it('initials: две первые буквы заглавными', () => {
    expect(U.initials('виктория ким')).toBe('ВК');
    expect(U.initials('Айгерим Сапарова Ивановна')).toBe('АС');
  });
  it('initials: одно слово, лишние пробелы, пустое имя', () => {
    expect(U.initials('Команда')).toBe('К');
    expect(U.initials('  Анна   Ли ')).toBe('АЛ');
    expect(U.initials('')).toBe('?');
    expect(U.initials(null)).toBe('?');
  });
  it('firstName берёт первое слово', () => {
    expect(U.firstName('Виктория Ким')).toBe('Виктория');
    expect(U.firstName(undefined)).toBe('');
  });
});

describe('заголовки', () => {
  it('longestWord: длина самого длинного слова, 0 для пустой строки', () => {
    expect(U.longestWord('Здравствуйте, Айгерим!')).toBe(13);
    expect(U.longestWord('')).toBe(0);
  });
  it('accentLast: последнее слово в <em>, текст экранирован', () => {
    expect(U.accentLast('Следующий урок ждёт')).toBe('Следующий урок <em>ждёт</em>');
    expect(U.accentLast('Один')).toBe('<em>Один</em>');
    expect(U.accentLast('<x> y')).toBe('&lt;x&gt; <em>y</em>');
    expect(U.accentLast('   ')).toBe('');
  });
  it('navLabel: первое слово видно всегда, остальное прячется на узком экране', () => {
    expect(U.navLabel('Открытый урок')).toBe('<span>Открытый<span class="nav-rest"> урок</span></span>');
    expect(U.navLabel('Уроки')).toBe('<span>Уроки</span>');
  });
});

describe('даты', () => {
  const d = new Date(2026, 10, 24); // 24 ноября 2026, вторник
  it('todayLabel на казахском собирается вручную', () => {
    expect(U.todayLabel('kk', d)).toBe('24 қараша, сейсенбі');
  });
  it('todayLabel на русском содержит число и месяц', () => {
    expect(U.todayLabel('ru', d)).toMatch(/24 ноября/);
  });
  it('monthLabel: русский и казахский с заглавной буквы', () => {
    expect(U.monthLabel('2026-11', 'ru')).toMatch(/^Ноябрь 2026/);
    expect(U.monthLabel('2026-01', 'kk')).toBe('Қаңтар 2026');
  });
  it('monthLabel: некорректный месяц возвращается как есть', () => {
    expect(U.monthLabel('2026-13', 'ru')).toBe('2026-13');
    expect(U.monthLabel('abc', 'kk')).toBe('abc');
  });
});
