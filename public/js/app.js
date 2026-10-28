// Клиентская часть платформы. Без фреймворков: простая навигация, шаблоны строками, события через data-act
(() => {
  'use strict';

  // ---------- Утилиты ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ничего */ } },
  };

  const S = {
    role: store.get('role', 'student'),
    studentId: store.get('studentId', 's1'),
    lang: store.get('lang', 'ru'),
    page: 'home', param: null, dict: {}, users: [], courses: [],
    config: { mock: true, hasKey: false },
    nav: 0, query: '', courseFilter: null, ratingMonth: null,
  };
  let P = null; // состояние прохождения урока
  let C = null; // состояние создания урока

  function t(key, vars) {
    let s = S.dict[key];
    if (s === undefined) s = key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return s;
  }

  async function api(url, body, method) {
    const opt = body !== undefined ? { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    const r = await fetch(url, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Ошибка ' + r.status);
    return j;
  }

  // Безопасный вызов анимаций: если fx.js не загрузился, сайт всё равно работает
  const fx = (name, ...a) => {
    try { return window.FX && window.FX[name] ? window.FX[name](...a) : undefined; } catch (e) { console.warn('fx', name, e); return undefined; }
  };

  function toast(msg, key) {
    if (key) document.querySelectorAll('.toast[data-k="' + key + '"]').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    if (key) el.dataset.k = key;
    el.setAttribute('role', 'status');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // ---------- Иконки ----------
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    lessons: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 14l2 2 4-4"/>',
    folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
    code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    send: '<path d="M21 3L3 11l7 3 3 7z"/><path d="M10 14l11-11"/>',
    clip: '<path d="M20 11l-8 8a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    json: '<path d="M8 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3"/>',
    refresh: '<path d="M20 11a8 8 0 00-14-4M4 5v4h4M4 13a8 8 0 0014 4M20 19v-4h-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M12 9c-3 0-5-1-5-3s3-3 5 3c2-6 5-5 5-3s-2 3-5 3z"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    board: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l4-4 4 4"/>',
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

  const ring = (p, big = false) => `<svg class="ring ${big ? 'big' : ''}" viewBox="0 0 36 36"><defs><linearGradient id="rg${big ? 'b' : 's'}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle class="trk" cx="18" cy="18" r="15.9" fill="none" stroke-width="3.4"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#rg${big ? 'b' : 's'})" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${p} ${100 - p}" transform="rotate(-90 18 18)"/></svg>`;

  // ---------- Помощники по данным ----------
  const me = () => (S.role === 'teacher' ? S.users.find((u) => u.role === 'teacher') : S.users.find((u) => u.id === S.studentId)) || { name: '?', color: '#999' };
  const firstName = (n) => String(n || '').split(' ')[0];
  const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${esc(u.color || '#2563eb')}">${esc(initials(u.name))}</span>`;
  const courseOf = (id) => S.courses.find((c) => c.id === id) || { title: '', color: 'blue', icon: 'code' };
  const courseChipClass = (c) => ({ blue: '', red: 'red', green: 'green' }[c.color] || '');
  const monthLabel = (m) => {
    const [y, mo] = m.split('-').map(Number);
    const s = new Date(y, mo - 1, 1).toLocaleDateString(S.lang === 'kk' ? 'kk-KZ' : 'ru-RU', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  // Скелетон вместо пустого экрана (появляется, только если загрузка не мгновенная)
  const loading = () => `<div class="skel-wrap" role="status" aria-label="${esc(t('loading'))}">
    <div class="skel" style="height:44px;width:46%;margin-top:10px"></div><div class="skel" style="height:22px;width:30%;margin-top:12px"></div>
    <div class="skel" style="height:210px;margin-top:20px;border-radius:22px"></div>
    <div class="grid c3" style="margin-top:18px"><div class="skel" style="height:92px"></div><div class="skel" style="height:92px"></div><div class="skel" style="height:92px"></div></div>
    <div class="grid c2" style="margin-top:26px"><div class="skel" style="height:170px"></div><div class="skel" style="height:170px"></div></div></div>`;

  // Картинка на главном экране: книга, звёздочки и парящие плашки
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z"/></svg>';
  function heroArt(kind) {
    const icons = kind === 't' ? ['file', 'table'] : ['sparkle', 'check'];
    return `<div class="art" aria-hidden="true"><span class="art-logo art-orb">${ic('sparkle')}</span>
      <span class="spark s1">${STAR}</span><span class="spark s2">${STAR}</span><span class="spark s3">${STAR}</span>
      <span class="float-chip f1">${ic(icons[0])}${esc(t('hero.' + kind + '.c1'))}</span>
      <span class="float-chip f2">${ic(icons[1])}${esc(t('hero.' + kind + '.c2'))}</span></div>`;
  }
  const CROWN = '<svg viewBox="0 0 46 34" fill="currentColor"><path d="M3 10l10 9 10-15 10 15 10-9-4 22H7z"/><circle cx="3" cy="9" r="3"/><circle cx="23" cy="4" r="3"/><circle cx="43" cy="9" r="3"/></svg>';

  // ---------- Загрузка словаря и стартовых данных ----------
  async function loadDict(lang) {
    const r = await fetch('/i18n/' + lang + '.json');
    S.dict = await r.json();
    S.lang = lang;
    store.set('lang', lang);
    document.documentElement.lang = lang;
    document.title = t('brand');
  }
  async function loadCourses() { S.courses = await api('/api/courses'); }

  // ---------- Навигация ----------
  function go(page, param) {
    const h = '#/' + page + (param ? '/' + param : '');
    if (location.hash === h) route(); else location.hash = h;
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let page = parts[0] || 'home';
    if (!['home', 'lessons', 'courses', 'rating', 'lesson', 'create'].includes(page)) page = 'home';
    if (page === 'create' && S.role !== 'teacher') page = 'home';
    S.page = page;
    S.param = parts[1] || null;
    S.nav++;
    P = null;
    togglePanel(false);
    renderSidebar();
    renderTop();
    renderMain();
    renderPanel();
  }

  // ---------- Каркас ----------
  function renderSidebar() {
    const items = [['home', 'home'], ['lessons', 'lessons'], ['courses', 'folder'], ['rating', 'trophy']];
    const active = S.page === 'lesson' || S.page === 'create' ? 'lessons' : S.page;
    $('#sidebar').innerHTML = `
      <div class="logo"><span>${esc(t('brand'))}</span></div>
      <span class="nav-ind"></span>
      ${items.map(([p, i]) => `<button class="nav-item ${active === p ? 'active' : ''}" data-act="nav" data-v="${p}">${ic(i)}<span>${esc(t('nav.' + p))}</span></button>`).join('')}
      <div class="spacer"></div>
      <button class="nav-item" data-act="settings">${ic('settings')}<span>${esc(t('nav.settings'))}</span></button>`;
    fx('nav');
  }

  // Тема оформления: тёмная (по умолчанию) или светлая
  const curTheme = () => document.documentElement.dataset.theme || 'dark';
  function setTheme(v) {
    document.documentElement.dataset.theme = v;
    store.set('theme', v);
    renderTop();
  }

  function renderTop() {
    const u = me();
    $('#topbar').innerHTML = `
      <div class="brand-top">${esc(t('brand'))}</div>
      <div class="role-switch">
        <span class="role-thumb"></span>
        <button class="role-btn ${S.role === 'student' ? 'active' : ''}" data-act="role" data-v="student">${ic('grad')}${esc(t('role.student'))}</button>
        <button class="role-btn ${S.role === 'teacher' ? 'active' : ''}" data-act="role" data-v="teacher">${ic('board')}${esc(t('role.teacher'))}</button>
      </div>
      <label class="search">${ic('search')}<input id="q" type="text" placeholder="${esc(t('search'))}" value="${esc(S.query)}"></label>
      <div class="lang-switch">
        <button class="${S.lang === 'ru' ? 'active' : ''}" data-act="lang" data-v="ru">RU</button>
        <button class="${S.lang === 'kk' ? 'active' : ''}" data-act="lang" data-v="kk">KZ</button>
      </div>
      <button class="icon-btn" data-act="theme" title="${esc(t('theme.toggle'))}" aria-label="${esc(t('theme.toggle'))}">${ic(curTheme() === 'dark' ? 'sun' : 'moon')}</button>
      <button class="icon-btn" data-act="bell" title="${esc(t('notif.title'))}" aria-label="${esc(t('notif.title'))}">${ic('bell')}</button>
      <button class="user-chip" data-act="settings" aria-label="${esc(t('nav.settings'))}">${avatar(u)}</button>`;
    fx('role');
  }

  function renderMain() {
    const tok = S.nav;
    const main = $('#main');
    main.scrollTop = 0;
    main.innerHTML = loading();
    main.setAttribute('aria-busy', 'true');
    const pages = { home: pageHome, lessons: pageLessons, courses: pageCourses, rating: pageRating, lesson: pageLesson, create: pageCreate };
    Promise.resolve(pages[S.page](tok)).then(() => {
      if (tok !== S.nav) return;
      main.removeAttribute('aria-busy');
      fx('enter');
    }).catch((e) => {
      console.error(e);
      main.removeAttribute('aria-busy');
      if (tok === S.nav) main.innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
    });
  }
  const stale = (tok) => tok !== S.nav;

  // ---------- Главная ----------
  function pageHome(tok) { return S.role === 'teacher' ? homeTeacher(tok) : homeStudent(tok); }

  async function homeStudent(tok) {
    const d = await api('/api/student/' + S.studentId + '/home');
    if (stale(tok)) return;
    const u = me();
    const dueChip = { today: 'red', tomorrow: 'orange', week: '' };
    $('#main').innerHTML = `
      <h1 class="page-title">${esc(t('hello', { name: firstName(u.name) }))}</h1>
      <p class="page-sub">${esc(t('tagline'))}</p>
      <div class="bento" style="margin-top:20px">
        <section class="hero s8">
          <h2>${esc(t('hero.s.title'))}</h2>
          <p>${esc(t('hero.s.text'))}</p>
          <button class="btn lg" data-act="continue">${ic('sparkle')}${esc(t('hero.s.btn'))}${ic('arrow')}</button>
          ${heroArt('s')}
        </section>
        <div class="card prog-card s4" data-act="nav" data-v="courses">
          <div class="ring-wrap">${ring(d.progress, true)}<div class="ring-num"><div class="stat-num">${d.progress}%</div></div></div>
          <div class="stat-label">${esc(t('stat.progress'))}</div>
        </div>
      </div>
      <div class="grid c2" style="margin-top:16px">
        <div class="card stat-card" data-act="nav" data-v="lessons"><div class="stat-ico">${ic('calendar', '')}</div><div><div class="stat-num">${d.classesToday}</div><div class="stat-label">${esc(t('stat.classes'))}</div></div></div>
        <div class="card stat-card" data-act="nav" data-v="lessons"><div class="stat-ico red">${ic('lessons')}</div><div><div class="stat-num">${d.tasksDue}</div><div class="stat-label">${esc(t('stat.tasks'))}</div></div></div>
      </div>
      <div class="section-head"><h2>${esc(t('home.courses'))}</h2><button class="link-btn" data-act="nav" data-v="courses">${esc(t('home.allCourses'))}${ic('arrow')}</button></div>
      <div class="grid c2">${d.courses.slice(0, 2).map((c) => courseCard(c, true)).join('')}</div>
      <div class="section-head"><h2>${esc(t('home.tasks'))}</h2><button class="link-btn" data-act="nav" data-v="lessons">${esc(t('home.allTasks'))}${ic('arrow')}</button></div>
      <div class="card">${d.tasks.length ? d.tasks.map((k, i) => `
        <div class="task" data-act="openLesson" data-v="${esc(k.lessonId)}">
          <span class="task-ico ${i % 2 ? 'purple' : ''}">${ic('file')}</span>
          <div class="info"><b>${esc(k.title)}</b><span>${esc(courseOf(k.courseId).title)}</span></div>
          <span class="chip ${dueChip[k.due]}">${esc(t('due.' + k.due))}</span>
          <span class="muted" style="font-size:14px">${esc(t('due.until'))}</span>${ic('chevron', 'muted')}
        </div>`).join('') : `<div class="empty">${esc(t('home.noTasks'))}</div>`}</div>`;
  }

  function courseCard(c, withBtn) {
    const prog = c.progress ?? null;
    return `<div class="card course-card">
      <div class="top"><span class="course-ico ${esc(c.color)}">${ic(c.icon, '')}</span>
        <div><h3>${esc(c.title)}</h3><div class="sub">${esc(c.subtitle)}</div></div></div>
      ${prog !== null ? `<div class="row" style="margin-bottom:14px"><div class="progress ${c.color === 'blue' ? '' : esc(c.color)}"><i style="width:${prog}%"></i></div><b>${prog}%</b></div>` : ''}
      ${withBtn ? `<button class="btn block" data-act="openCourse" data-v="${esc(c.id)}">${esc(t('continue'))}</button>` : ''}
    </div>`;
  }

  async function homeTeacher(tok) {
    const [d, lessons] = await Promise.all([api('/api/teacher/home'), api('/api/lessons')]);
    if (stale(tok)) return;
    const u = me();
    // Диаграмма: средняя оценка по урокам (подпись и число видны всем, не только цветом)
    const barRows = lessons.filter((l) => l.avgScore !== null).map((l) => `<div class="bar-row">
      <span class="bar-name" title="${esc(l.title)}">${esc(l.title)}</span>
      <div class="progress" role="img" aria-label="${esc(l.title)}: ${l.avgScore}"><i style="width:${l.avgScore}%"></i></div><b>${l.avgScore}</b></div>`).join('');
    $('#main').innerHTML = `
      <h1 class="page-title">${esc(t('hello.teacher', { name: firstName(u.name) }))}</h1>
      <p class="page-sub">${esc(t('tagline.teacher'))}</p>
      <section class="hero" style="margin-top:20px">
        <h2>${esc(t('hero.t.title'))}</h2>
        <p>${esc(t('hero.t.text'))}</p>
        <button class="btn lg" data-act="nav" data-v="create">${ic('sparkle')}${esc(t('hero.t.btn'))}${ic('arrow')}</button>
        ${heroArt('t')}
      </section>
      <div class="grid c4" style="margin-top:18px">
        ${statCol('lessons', '', d.lessonsCreated, t('stat.lessons'))}
        ${statCol('users', 'green', `${d.studentsPassed}<small class="muted" style="font-size:16px"> ${esc(t('of'))} ${d.totalStudents}</small>`, t('stat.passed'))}
        ${statCol('check', 'purple', d.avgScore, t('stat.avg'))}
        ${statCol('sparkle', 'red', d.weeklyActive, t('stat.wau'))}
      </div>
      <div class="section-head"><h2>${esc(t('chart.avg'))}</h2></div>
      <div class="card" style="padding:8px 20px">${barRows || `<div class="empty">${esc(t('lessons.empty'))}</div>`}</div>
      <div class="section-head"><h2>${esc(t('home.recent'))}</h2>
        <a class="btn ghost sm" href="/api/grades.xlsx" download>${ic('table')}${esc(t('act.excelAll'))}</a></div>
      <div class="card" style="padding:8px 12px">${lessonTable(lessons.slice().reverse().slice(0, 6))}</div>`;
  }

  const statCol = (icon, color, num, label) => `<div class="card stat-card col" style="flex-direction:column;align-items:flex-start;gap:10px">
    <div class="stat-ico ${color}">${ic(icon)}</div><div><div class="stat-num">${num}</div><div class="stat-label">${esc(label)}</div></div></div>`;

  function lessonActions(l) {
    return `<div class="actions">
      <a class="btn ghost sm" href="/api/lessons/${esc(l.id)}/report.docx?lang=${S.lang}" download title="${esc(t('act.word.full'))}">${ic('file')}Word</a>
      <a class="btn ghost sm" href="/api/lessons/${esc(l.id)}/gaps.json" download title="${esc(t('act.json.full'))}">${ic('json')}JSON</a>
      <a class="btn ghost sm" href="/api/grades.xlsx?lessonId=${esc(l.id)}" download title="${esc(t('act.excel.full'))}">${ic('table')}Excel</a></div>`;
  }

  function lessonTable(list) {
    if (!list.length) return `<div class="empty">${esc(t('lessons.empty'))}</div>`;
    return `<table class="table"><thead><tr><th>${esc(t('th.lesson'))}</th><th>${esc(t('th.passed'))}</th><th>${esc(t('th.avg'))}</th><th>${esc(t('th.gaps'))}</th><th></th></tr></thead><tbody>
      ${list.map((l) => `<tr>
        <td class="w100"><a href="#/lesson/${esc(l.id)}"><b>${esc(l.title)}</b></a><div class="muted" style="font-size:13px">${esc(courseOf(l.courseId).title)}</div></td>
        <td data-l="${esc(t('th.passed'))}">${l.passedCount}</td><td data-l="${esc(t('th.avg'))}">${l.avgScore ?? '-'}</td>
        <td data-l="${esc(t('th.gaps'))}">${l.gapsCount ? `<span class="chip red">${ic('alert')}${l.gapsCount}</span>` : '<span class="chip green">0</span>'}</td>
        <td class="w100">${lessonActions(l)}</td></tr>`).join('')}</tbody></table>`;
  }

  // ---------- Уроки ----------
  async function pageLessons(tok) {
    const url = '/api/lessons' + (S.role === 'student' ? '?studentId=' + S.studentId : '');
    const all = await api(url);
    if (stale(tok)) return;
    const q = S.query.trim().toLowerCase();
    let list = all.filter((l) => l.status === 'published');
    if (S.courseFilter) list = list.filter((l) => l.courseId === S.courseFilter);
    if (q) list = list.filter((l) => (l.title + ' ' + l.topic).toLowerCase().includes(q));
    const isT = S.role === 'teacher';
    $('#main').innerHTML = `
      <div class="row between" style="margin-top:10px"><h1 class="h1">${esc(t('nav.lessons'))}</h1>
        ${isT ? `<button class="btn" data-act="nav" data-v="create">${ic('plus')}${esc(t('hero.t.btn'))}</button>` : ''}</div>
      <div class="filters">
        <button class="filter ${!S.courseFilter ? 'active' : ''}" data-act="courseFilter" data-v="">${esc(t('all'))}</button>
        ${S.courses.map((c) => `<button class="filter ${S.courseFilter === c.id ? 'active' : ''}" data-act="courseFilter" data-v="${esc(c.id)}">${esc(c.title)}</button>`).join('')}
      </div>
      ${q ? `<p class="muted" style="margin:6px 0">${esc(t('search.result', { q: S.query }))} <button class="link-btn" data-act="clearQuery">${esc(t('search.clear'))}</button></p>` : ''}
      ${list.length ? `<div class="grid c2" style="margin-top:12px">${list.map((l) => lessonCard(l, isT)).join('')}</div>` : `<div class="empty">${esc(t('lessons.empty'))}</div>`}`;
  }

  function lessonCard(l, isT) {
    const c = courseOf(l.courseId);
    const steps = l.steps.length;
    const status = isT
      ? `<span class="chip gray">${ic('users', '')}${l.passedCount}</span><span class="chip ${l.gapsCount ? 'red' : 'green'}">${ic('alert')}${l.gapsCount}</span>`
      : (l.done ? `<span class="chip green">${ic('check')}${esc(t('done'))} · ${l.myScore}</span>` : '');
    return `<div class="card lesson-card" data-act="openLesson" data-v="${esc(l.id)}">
      <div class="meta"><span class="chip ${courseChipClass(c)}">${esc(c.title)}</span><span class="chip gray">${esc(t('steps.n', { n: steps }))}</span>${status}</div>
      <h3>${esc(l.title)}</h3>
      <div class="muted" style="font-size:14px">${esc(l.goals.slice(0, 2).join('; '))}</div>
      <div class="foot">${isT ? lessonActions(l) : `<span></span><button class="btn sm">${esc(t(l.done ? 'repeat' : 'start'))}${ic('arrow')}</button>`}</div>
    </div>`;
  }

  // ---------- Курсы ----------
  async function pageCourses(tok) {
    const home = S.role === 'student' ? await api('/api/student/' + S.studentId + '/home') : null;
    if (stale(tok)) return;
    const list = home ? home.courses : S.courses;
    $('#main').innerHTML = `
      <div style="margin-top:10px"><h1 class="h1">${esc(t('nav.courses'))}</h1><p class="muted" style="margin-top:4px">${esc(t('courses.sub'))}</p></div>
      <div class="grid c2" style="margin-top:16px">
        ${list.map((c) => `<div class="card course-card">
          <div class="top"><span class="course-ico ${esc(c.color)}">${ic(c.icon)}</span><div><h3>${esc(c.title)}</h3><div class="sub">${esc(c.subtitle)}</div></div></div>
          <div class="row" style="margin-bottom:14px">
            <span class="chip ${c.type === 'language' ? 'purple' : ''}">${esc(t('ctype.' + c.type))}</span>
            <span class="chip gray">${esc(t('lessons.n', { n: c.lessonsCount }))}</span>
            ${c.progress !== undefined ? `<span class="chip green">${c.progress}%</span>` : ''}
          </div>
          <button class="btn block ${c.lessonsCount ? '' : 'ghost'}" data-act="openCourse" data-v="${esc(c.id)}">${esc(t(c.lessonsCount ? 'course.open' : 'course.soon'))}</button>
        </div>`).join('')}
        <div class="card add-card"><div>${ic('plus')}<div style="margin-top:6px;font-weight:700">${esc(t('course.new'))}</div><div style="font-size:13px;margin-top:4px">${esc(t('course.new.sub'))}</div></div></div>
      </div>`;
  }

  // ---------- Рейтинг ----------
  async function pageRating(tok) {
    const d = await api('/api/rating' + (S.ratingMonth ? '?month=' + S.ratingMonth : ''));
    if (stale(tok)) return;
    S.ratingMonth = d.month;
    const rows = d.rows;
    const top = rows.slice(0, 3);
    const rest = rows.slice(3);
    const mine = S.role === 'student' ? rows.find((r) => r.userId === S.studentId) : null;
    const medal = (r) => `<div class="pcol" data-rank="${r.rank}">${r.rank === 1 ? `<span class="crown" aria-hidden="true">${CROWN}</span>` : ''}<div class="pod p${r.rank} ${mine && mine.userId === r.userId ? 'me-pod' : ''}">
      <div class="medal">${r.rank}</div>${avatar({ name: r.name, color: r.color }, 'lg')}
      <div class="nm">${esc(r.name)}</div><div class="muted" style="font-size:13px">${esc(r.group || '')}</div>
      <div class="pts">${r.points}</div>
      <div class="muted" style="font-size:13px">${esc(t('r.avg'))} ${r.avgGrade} · ${esc(t('r.lessons'))} ${r.lessons}</div>
      <div class="prize">${ic('gift')}${esc(t('prize.' + r.rank))}</div></div><div class="ped" aria-hidden="true">${r.rank}</div></div>`;
    const order = [top[1], top[0], top[2]].filter(Boolean);

    let hint = '';
    if (S.role === 'student') {
      if (!mine) hint = `<div class="note-box hl">${esc(t('r.notyet'))}</div>`;
      else if (mine.rank <= 3) hint = `<div class="note-box hl">${esc(t('r.intop', { rank: mine.rank }))}</div>`;
      else {
        const gap = Math.max(0.1, Math.ceil((top[2].points - mine.points) * 10) / 10);
        hint = `<div class="note-box hl">${esc(t('r.gap', { rank: mine.rank, pts: gap }))}</div>`;
      }
    }

    $('#main').innerHTML = `
      <div class="row between" style="margin-top:10px"><div><h1 class="h1">${esc(t('nav.rating'))}</h1><p class="muted" style="margin-top:4px">${esc(t('rating.sub'))}</p></div>
        <select class="select" data-change="ratingMonth">${d.months.map((m) => `<option value="${m}" ${m === d.month ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}</select></div>
      ${hint}
      ${rows.length ? `<div class="podium">${order.map(medal).join('')}</div>` : `<div class="empty">${esc(t('r.empty'))}</div>`}
      ${rest.length ? `<div class="card" style="margin-top:18px;padding:8px 12px"><table class="table"><thead><tr><th>#</th><th>${esc(t('th.student'))}</th><th>${esc(t('r.lessons'))}</th><th>${esc(t('r.avg'))}</th><th>${esc(t('r.activity'))}</th><th>${esc(t('r.points'))}</th></tr></thead><tbody>
        ${rest.map((r) => `<tr class="${mine && mine.userId === r.userId ? 'me' : ''}"><td class="k"><b>${r.rank}</b></td>
          <td><div class="row">${avatar({ name: r.name, color: r.color }, 'sm')}<div><b>${esc(r.name)}</b><div class="muted" style="font-size:13px">${esc(r.group || '')}</div></div></div></td>
          <td data-l="${esc(t('r.lessons'))}">${r.lessons}</td><td data-l="${esc(t('r.avg'))}">${r.avgGrade}</td><td data-l="${esc(t('r.activity'))}">${r.activity}%</td><td data-l="${esc(t('r.points'))}"><b>${r.points}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="note-box">${esc(t('rating.formula', { n: d.target }))}</div>
      ${S.role === 'teacher' ? `<div class="section-head"><h2>${esc(t('r.awards'))}</h2><a class="btn ghost sm" href="/api/grades.xlsx?month=${esc(d.month)}" download>${ic('table')}${esc(t('act.excelAll'))}</a></div>
        <div class="card">${top.length ? top.map((r) => `<div class="task" style="cursor:default"><span class="task-ico">${ic('trophy')}</span><div class="info"><b>${r.rank}. ${esc(r.name)}</b><span>${esc(t('prize.' + r.rank))}</span></div><span class="chip">${r.points}</span></div>`).join('') : `<div class="empty">${esc(t('r.empty'))}</div>`}</div>` : ''}`;
      fx('podium');
    if (mine && mine.rank <= 3) setTimeout(() => fx('celebrate', 'big'), 2100);
  }

  // ---------- Урок: просмотр для преподавателя и прохождение для студента ----------
  async function pageLesson(tok) {
    const lesson = await api('/api/lessons/' + S.param);
    if (stale(tok)) return;
    if (S.role === 'teacher') return lessonPreview(lesson, tok);
    P = { lesson, stage: lesson.notes ? 'notes' : 'steps', idx: 0, answers: {}, checked: null, lastAnswer: '', chat: [], busy: false, finished: null };
    P.chat.push({ role: 'bot', stream: true, text: t('chat.welcome', { name: firstName(me().name), title: lesson.title }) });
    renderPlayer(true);
    renderPanel();
  }

  async function lessonPreview(lesson, tok) {
    const gaps = await api('/api/gaps?lessonId=' + lesson.id);
    if (stale(tok)) return;
    const users = S.users;
    const l = { ...lesson };
    $('#main').innerHTML = `
      <div class="player-head"><button class="back" data-act="nav" data-v="lessons" aria-label="${esc(t('back'))}">${ic('back')}</button>
        <div><h1 class="h1">${esc(lesson.title)}</h1><div class="muted">${esc(courseOf(lesson.courseId).title)}</div></div></div>
      <div class="card">${lessonActions(l)}
        <h3 style="margin:18px 0 8px">${esc(t('goals'))}</h3><ul style="margin:0;padding-left:20px;line-height:1.7">${lesson.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
      ${lesson.notes ? `<div class="section-head"><h2>${esc(t('notes.title'))}</h2>${notesLink(lesson)}</div><div class="card">${notesHtml(lesson.notes)}</div>` : ''}
      <div class="section-head"><h2>${esc(t('gaps.title'))}</h2><span class="chip ${gaps.length ? 'red' : 'green'}">${gaps.length}</span></div>
      <div class="card">${gaps.length ? gaps.map((g) => {
        const u = users.find((x) => x.id === g.studentId) || { name: '?', color: '#999' };
        const idx = lesson.steps.findIndex((s) => s.id === g.stepId) + 1;
        return `<div class="task" style="cursor:default;align-items:flex-start">${avatar(u, 'sm')}<div class="info"><b>${esc(u.name)} · ${esc(t('step'))} ${idx}</b><span style="display:block;margin-top:2px">${esc(g.note)}</span></div><span class="chip ${g.type === 'unclear' ? 'orange' : 'red'}">${esc(t('gaptype.' + g.type))}</span></div>`;
      }).join('') : `<div class="empty">${esc(t('gaps.none'))}</div>`}</div>
      <div class="section-head"><h2>${esc(t('plan'))}</h2></div>
      <div class="grid">${lesson.steps.map((s, i) => `<div class="card"><span class="chip ${s.type === 'question' ? 'purple' : ''}">${esc(t('step'))} ${i + 1} · ${esc(t('stype.' + s.type))}</span>
        <p style="margin-top:10px;line-height:1.5">${esc(s.text)}</p>
        ${s.type === 'question' ? `<p class="muted" style="margin-top:8px;font-size:14px">${esc(t('answer'))}: <b>${esc(s.correctAnswer)}</b> · ${esc(t('hint'))}: ${esc(s.hint)}</p>` : ''}</div>`).join('')}</div>`;
  }

  // Конспект урока: разделы с тезисами, термины, пример
  function notesHtml(n) {
    if (!n) return '';
    return `<div class="notes">
      ${n.sections.map((x, i) => `<section class="notes-sec"><h3><span class="num">${i + 1}</span>${esc(x.heading)}</h3><ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}
      ${n.terms && n.terms.length ? `<h3 class="notes-h">${esc(t('notes.terms'))}</h3><div class="terms">${n.terms.map((x) => `<div class="term"><b>${esc(x.term)}</b><span>${esc(x.def)}</span></div>`).join('')}</div>` : ''}
      ${n.example ? `<h3 class="notes-h">${esc(t('notes.example'))}</h3><pre class="example">${esc(n.example)}</pre>` : ''}</div>`;
  }
  const notesLink = (l) => `<a class="btn ghost sm" href="/api/lessons/${esc(l.id)}/notes.docx?lang=${S.lang}" download>${ic('file')}${esc(t('notes.word'))}</a>`;

  function curStep() { return P.lesson.steps[P.idx]; }

  function renderPlayer(anim) {
    if (!P || S.page !== 'lesson') return;
    const l = P.lesson;
    const steps = l.steps;
    const c = courseOf(l.courseId);
    const head = `<div class="player-head"><button class="back" data-act="nav" data-v="lessons" aria-label="${esc(t('back'))}">${ic('back')}</button>
      <div style="flex:1"><h1 class="h1" style="font-size:26px">${esc(l.title)}</h1><div class="muted">${esc(c.title)}</div></div></div>`;

    if (P.finished) {
      const r = P.finished;
      const msg = r.attempt.score >= 85 ? t('res.great') : r.attempt.score >= 60 ? t('res.good') : t('res.try');
      $('#main').innerHTML = head + `<div class="card result">
        <div class="chip green">${ic('check')}${esc(t('res.done'))}</div>
        <div class="big">${r.attempt.score}<small> / 100</small></div>
        <p style="font-size:19px;margin-bottom:6px">${esc(msg)}</p>
        ${r.rank ? `<p class="muted">${esc(t('res.rank', { rank: r.rank, total: r.total, pts: r.points }))}</p>` : ''}
        <div class="row" style="justify-content:center;margin-top:22px">
          <button class="btn" data-act="nav" data-v="rating">${ic('trophy')}${esc(t('res.toRating'))}</button>
          <button class="btn ghost" data-act="nav" data-v="lessons">${esc(t('res.toLessons'))}</button></div></div>`;
      return;
    }

    if (P.stage === 'notes') {
      $('#main').innerHTML = head + `<div class="card notes-card"><div class="row between" style="margin-bottom:14px;flex-wrap:wrap">
          <span class="chip">${ic('file')}${esc(t('notes.title'))}</span>${notesLink(l)}</div>
        <p class="muted" style="margin-bottom:6px">${esc(t('notes.hint'))}</p>
        ${notesHtml(l.notes)}
        <div class="step-actions"><button class="btn lg" data-act="startSteps">${esc(t('notes.start'))}${ic('arrow')}</button></div></div>`;
      if (anim) fx('reveal', '.notes-sec, .term, .example');
      return;
    }
    const s = curStep();
    const bar = `<div class="steps-bar">${steps.map((_, i) => `<i class="${i < P.idx ? 'done' : i === P.idx ? 'now' : ''}"></i>`).join('')}</div>`;
    const last = P.idx === steps.length - 1;
    const nextLabel = last ? t('finish') : t('next');
    let body;
    if (s.type === 'theory') {
      body = `<span class="chip kind">${ic('bulb')}${esc(t('stype.theory'))}</span><p class="text">${esc(s.text)}</p>
        <div class="step-actions"><button class="btn lg" data-act="next">${esc(nextLabel)}${ic('arrow')}</button></div>`;
    } else {
      const a = P.answers[s.id];
      const ok = a && a.ok;
      const fb = P.checked ? `<div class="feedback ${P.checked.correct ? 'ok' : 'bad'}">${esc(P.checked.feedback)}</div>` : '';
      body = `<span class="chip purple kind">${esc(t('question'))} ${steps.slice(0, P.idx + 1).filter((x) => x.type === 'question').length}</span>
        <p class="q">${esc(s.text)}</p>
        <div class="answer-row"><input id="ans" class="${ok ? 'ok' : ''}" type="text" autocomplete="off" aria-label="${esc(t('ans.ph'))}" placeholder="${esc(t('ans.ph'))}" value="${esc(P.lastAnswer)}" ${ok ? 'disabled' : ''}>
          ${ok ? '' : `<button class="btn" data-act="check">${esc(t('check'))}</button>`}</div>
        ${fb}
        <div class="step-actions">
          ${!ok && a && a.tries >= 2 ? `<button class="btn ghost" data-act="skip">${esc(t('skip'))}</button>` : ''}
          ${ok ? `<button class="btn lg" data-act="next">${esc(nextLabel)}${ic('arrow')}</button>` : ''}</div>`;
    }
    $('#main').innerHTML = head + `<div class="muted" style="margin-bottom:8px;font-weight:600">${esc(t('step'))} ${P.idx + 1} ${esc(t('of'))} ${steps.length}</div>` + bar + `<div class="card step-card">${body}</div>`;
    const inp = $('#ans');
    if (inp && !inp.disabled) inp.focus();
    if (anim) fx('step');
  }

  async function doCheck() {
    if (!P) return;
    const s = curStep();
    const val = ($('#ans') || {}).value ? $('#ans').value.trim() : '';
    if (!val) { toast(t('ans.empty')); return; }
    P.lastAnswer = val;
    const btn = $('[data-act="check"]');
    if (btn) { btn.disabled = true; btn.textContent = t('checking'); }
    try {
      const res = await api('/api/answer', { lessonId: P.lesson.id, stepId: s.id, answer: val, language: S.lang });
      const a = P.answers[s.id] || { score: 0, tries: 0, ok: false };
      a.tries++; a.score = res.score; a.ok = res.correct;
      P.answers[s.id] = a;
      P.checked = res;
      if (res.mode === 'fallback') toast(t('ai.fallback'));
    } catch (e) { toast(e.message); }
    renderPlayer();
    if (P && P.checked) fx('feedback', P.checked.correct);
  }

  function doSkip() {
    const s = curStep();
    const a = P.answers[s.id] || { score: 0, tries: 1, ok: false };
    a.ok = true;
    P.answers[s.id] = a;
    doNext();
  }

  async function doNext() {
    if (!P) return;
    if (P.idx < P.lesson.steps.length - 1) {
      P.idx++; P.checked = null; P.lastAnswer = '';
      renderPlayer(true);
      return;
    }
    // Последний шаг пройден: сохраняем попытку
    try {
      const answers = Object.entries(P.answers).map(([stepId, a]) => ({ stepId, score: a.score, tries: a.tries }));
      P.finished = await api('/api/attempts', { lessonId: P.lesson.id, studentId: S.studentId, answers });
      renderPlayer();
      fx('result', P.finished.attempt.score);
    } catch (e) { toast(e.message); }
  }

  // ---------- Чат-ассистент ----------
  function renderChat() {
    const el = $('#chat');
    if (!el || !P) return;
    const seen = P.shown || 0;
    const toStream = [];
    el.innerHTML = P.chat.map((m, i) => {
      const isBot = m.role !== 'user';
      const streaming = isBot && m.stream && !m.started;
      if (streaming) { m.started = true; toStream.push(i); }
      const delay = Math.min(2, 0.5 + String(m.text).length * 0.016);
      return `<div class="msg ${isBot ? 'bot' : 'me'}${i >= seen ? ' in' : ''}"><span class="mt" data-i="${i}">${streaming ? '' : esc(m.text)}</span>${m.gap ? `<div class="note${streaming ? ' pop' : ''}" style="--d:${delay}s">${ic('alert')}${esc(t('chat.gapSent'))}</div>` : ''}</div>`;
    }).join('') + (P.busy ? '<div class="typing" aria-label="..."><i></i><i></i><i></i></div>' : '');
    P.shown = P.chat.length;
    el.scrollTop = el.scrollHeight;
    // Ответ ассистента "печатается" постепенно
    toStream.forEach((i) => {
      const span = el.querySelector('.mt[data-i="' + i + '"]');
      if (!span) return;
      fx('stream', span, P.chat[i].text);
      if (!window.FX) span.textContent = P.chat[i].text;
    });
  }

  async function sendChat(text, action) {
    if (!P || P.busy) return;
    if (!text && !action) return;
    const shown = text || t(action === 'hint' ? 'chat.askHint' : 'chat.askSimpler');
    const history = P.chat.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    P.chat.push({ role: 'user', text: shown });
    P.busy = true;
    renderChat();
    try {
      const res = await api('/api/chat', { lessonId: P.lesson.id, stepId: curStep() ? curStep().id : null, studentId: S.studentId, message: text || '', action: action || null, history, language: S.lang });
      P.chat.push({ role: 'bot', stream: true, text: res.reply, gap: res.gapSaved });
      if (res.mode === 'fallback') toast(t('ai.fallback'));
    } catch (e) {
      P.chat.push({ role: 'bot', stream: true, text: t('chat.error') });
    }
    P.busy = false;
    renderChat();
  }

  // ---------- Правая панель ----------
  // Панель помощника на телефоне и планшете выезжает снизу
  function togglePanel(force) {
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('panel-open');
    document.body.classList.toggle('panel-open', open);
    const c = $('#chat');
    if (open && c) setTimeout(() => { c.scrollTop = c.scrollHeight; }, 60);
  }

  function renderPanel() {
    const fab = $('#fab');
    if (fab) { fab.innerHTML = ic('sparkle'); fab.setAttribute('aria-label', t('panel.open')); }
    const isLesson = S.page === 'lesson' && S.role === 'student' && P;
    const head = `<div class="cop-head"><div class="cop-logo"><img class="cop-img" src="img/copilot.svg" alt="" hidden onerror="this.onerror=null;this.src='img/copilot.png'" onload="this.hidden=false;this.nextElementSibling.style.display='none';this.parentNode.classList.add('has-img')">${ic('sparkle')}</div><div style="flex:1"><b>${esc(t('cop.name'))}</b><span class="online"><i></i>${esc(t('cop.online'))}</span></div><span class="badge-mode ${S.config.mock ? '' : 'gpt'}">${esc(t(S.config.mock ? 'mode.demo' : 'mode.gpt'))}</span><button class="cop-close" data-act="panel" aria-label="${esc(t('panel.close'))}">${ic('close')}</button></div>`;
    if (isLesson) {
      $('#panel').innerHTML = `<div class="copilot">${head}<div id="chat" class="chat"></div>
        <div class="quick"><button data-act="quick" data-v="simpler">${ic('bulb')}${esc(t('chat.simpler'))}</button><button data-act="quick" data-v="hint">${ic('file')}${esc(t('chat.hint'))}</button></div>
        <div class="composer"><label class="field">${ic('clip')}<input id="chat-in" type="text" autocomplete="off" aria-label="${esc(t('chat.ph'))}" placeholder="${esc(t('chat.ph'))}"></label><button class="send" data-act="send" aria-label="${esc(t('send'))}">${ic('send')}</button></div></div>`;
      renderChat();
      return;
    }
    const isT = S.role === 'teacher';
    $('#panel').innerHTML = `<div class="copilot">${head}<div class="chat">
        <div class="msg bot">${esc(t(isT ? 'cop.hello.t' : 'cop.hello.s', { name: firstName(me().name) }))}</div>
        <div class="msg bot">${esc(t(isT ? 'cop.can.t' : 'cop.can.s'))}</div></div>
      <div class="quick">${isT
        ? `<button data-act="nav" data-v="create">${ic('sparkle')}${esc(t('cop.q.create'))}</button><button data-act="nav" data-v="rating">${ic('trophy')}${esc(t('nav.rating'))}</button>`
        : `<button data-act="continue">${ic('sparkle')}${esc(t('cop.q.continue'))}</button><button data-act="nav" data-v="rating">${ic('trophy')}${esc(t('nav.rating'))}</button>`}</div>
      <div class="cop-info">${esc(t(isT ? 'cop.info.t' : 'cop.info.s'))}</div></div>`;
    fx('panel');
  }

  // ---------- Создание урока (преподаватель) ----------
  function newCreateState() {
    return { form: { topic: '', goals: '', level: 'beginner', size: 'short', language: S.lang, courseId: (S.courses[0] || {}).id || 'c1' }, draft: null, loading: false, mode: null };
  }
  function pageCreate() {
    if (!C) C = newCreateState();
    renderCreate();
  }

  function renderCreate() {
    if (S.page !== 'create') return;
    const f = C.form;
    const head = `<div class="player-head"><button class="back" data-act="nav" data-v="lessons" aria-label="${esc(t('back'))}">${ic('back')}</button><h1 class="h1">${esc(t('hero.t.btn'))}</h1></div>`;
    if (C.loading) {
      $('#main').innerHTML = head + `<div class="card gen" role="status" aria-live="polite">
        <div class="orb"><i></i><i></i><i></i><b>${ic('sparkle')}</b></div>
        <h3>${esc(t('create.generating'))}</h3><div class="status" id="gen-status">${esc(t('gen.s1'))}</div>
        <div class="bar"><i></i></div>
        <div class="skels"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>`;
      return;
    }
    if (!C.draft) {
      $('#main').innerHTML = head + `<div class="card form">
        <label class="field-l">${esc(t('f.topic'))}<input data-form="topic" value="${esc(f.topic)}" placeholder="${esc(t('f.topic.ph'))}"></label>
        <label class="field-l">${esc(t('f.goals'))}<textarea data-form="goals" placeholder="${esc(t('f.goals.ph'))}">${esc(f.goals)}</textarea></label>
        <div class="grid c2">
          <label class="field-l">${esc(t('f.size'))}<select data-form="size">${['short', 'detailed'].map((v) => `<option value="${v}" ${f.size === v ? 'selected' : ''}>${esc(t('size.' + v))}</option>`).join('')}</select></label>
          <label class="field-l">${esc(t('f.level'))}<select data-form="level">${['beginner', 'middle', 'advanced'].map((v) => `<option value="${v}" ${f.level === v ? 'selected' : ''}>${esc(t('level.' + v))}</option>`).join('')}</select></label>
        </div>
        <div class="grid c2">
          <label class="field-l" style="display:none">${esc(t('f.level'))}<select data-form="level">${['beginner', 'middle', 'advanced'].map((v) => `<option value="${v}" ${f.level === v ? 'selected' : ''}>${esc(t('level.' + v))}</option>`).join('')}</select></label>
          <label class="field-l">${esc(t('f.lang'))}<select data-form="language"><option value="ru" ${f.language === 'ru' ? 'selected' : ''}>Русский</option><option value="kk" ${f.language === 'kk' ? 'selected' : ''}>Қазақша</option></select></label>
          <label class="field-l">${esc(t('f.course'))}<select data-form="courseId">${S.courses.map((c) => `<option value="${esc(c.id)}" ${f.courseId === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>
        </div>
        <div><button class="btn lg" data-act="generate">${ic('sparkle')}${esc(t('generate'))}</button></div></div>`;
      return;
    }
    const d = C.draft;
    $('#main').innerHTML = head + `<div class="row between" style="margin-bottom:12px"><span class="chip green">${ic('check')}${esc(t('create.ready'))}</span><span class="badge-mode ${C.mode === 'gpt' ? 'gpt' : ''}">${esc(t('mode.' + (C.mode || 'mock')))}</span></div>
      <div class="card form">
        <label class="field-l">${esc(t('f.title'))}<input data-d="title" value="${esc(d.title)}"></label>
        <label class="field-l">${esc(t('f.goals'))}<textarea data-d="goals">${esc(d.goals.join('\n'))}</textarea></label>
        ${d.notes ? `<div class="step-edit"><span class="chip">${ic('file')}${esc(t('notes.title'))}</span>
          ${d.notes.sections.map((x, i) => `<label class="field-l">${esc(t('notes.e.heading'))} ${i + 1}<input data-d="notes:${i}:heading" value="${esc(x.heading)}"></label>
            <label class="field-l">${esc(t('notes.e.points'))}<textarea data-d="notes:${i}:points">${esc(x.points.join('\n'))}</textarea></label>`).join('')}
          <label class="field-l">${esc(t('notes.e.terms'))}<textarea data-d="notes:terms">${esc((d.notes.terms || []).map((x) => x.term + ' - ' + x.def).join('\n'))}</textarea></label>
          <label class="field-l">${esc(t('notes.example'))}<textarea data-d="notes:example">${esc(d.notes.example || '')}</textarea></label></div>` : ''}
        ${d.steps.map((s, i) => `<div class="step-edit"><span class="chip ${s.type === 'question' ? 'purple' : ''}">${esc(t('step'))} ${i + 1} · ${esc(t('stype.' + s.type))}</span>
          <textarea class="ta" data-d="step:${i}:text" style="border:1.5px solid #d4def2;border-radius:12px;padding:12px;min-height:80px">${esc(s.text)}</textarea>
          ${s.type === 'question' ? `<div class="grid c2"><label class="field-l">${esc(t('answer'))}<input data-d="step:${i}:correctAnswer" value="${esc(s.correctAnswer)}"></label><label class="field-l">${esc(t('hint'))}<input data-d="step:${i}:hint" value="${esc(s.hint || '')}"></label></div>` : ''}</div>`).join('')}
        <div class="row"><button class="btn lg green" data-act="publish">${ic('check')}${esc(t('publish'))}</button>
          <button class="btn lg ghost" data-act="generate">${ic('refresh')}${esc(t('regenerate'))}</button>
          <button class="btn lg ghost" data-act="resetCreate">${esc(t('create.back'))}</button></div></div>`;
    if (C.fresh) { C.fresh = false; fx('reveal', '.step-edit'); }
  }

  function editDraft(el) {
    const key = el.dataset.d;
    const d = C && C.draft;
    if (!d) return;
    if (key === 'title') d.title = el.value;
    else if (key === 'goals') d.goals = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    else if (key.startsWith('notes:') && d.notes) {
      const [, a, b] = key.split(':');
      if (a === 'terms') d.notes.terms = el.value.split('\n').map((x) => { const [term, ...r] = x.split(' - '); return { term: term.trim(), def: r.join(' - ').trim() }; }).filter((x) => x.term && x.def);
      else if (a === 'example') d.notes.example = el.value;
      else if (b === 'heading') d.notes.sections[Number(a)].heading = el.value;
      else if (b === 'points') d.notes.sections[Number(a)].points = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    }
    else if (key.startsWith('step:')) { const [, i, field] = key.split(':'); d.steps[Number(i)][field] = el.value; }
  }

  async function doGenerate() {
    const f = C.form;
    if (!f.topic.trim()) { toast(t('create.needTopic')); return; }
    C.loading = true;
    renderCreate();
    // Статусы меняются по ходу работы. Минимум 2,6 секунды, чтобы процесс было видно
    const keys = ['gen.s1', 'gen.s2', 'gen.s3', 'gen.s4'];
    let k = 0;
    const timer = setInterval(() => { k = (k + 1) % keys.length; fx('swapText', $('#gen-status'), t(keys[k])); }, 900);
    try {
      const [res] = await Promise.all([
        api('/api/lessons/generate', { topic: f.topic, goals: f.goals, level: t('level.' + f.level), size: f.size, language: f.language }),
        new Promise((r) => setTimeout(r, 2600)),
      ]);
      C.draft = res.draft;
      C.mode = res.mode;
      C.fresh = true;
      if (res.mode === 'fallback') toast(t('ai.fallback'));
    } catch (e) { toast(e.message); }
    clearInterval(timer);
    C.loading = false;
    renderCreate();
  }

  async function doPublish() {
    const d = C.draft;
    try {
      await api('/api/lessons', { title: d.title, topic: d.topic, goals: d.goals, notes: d.notes, steps: d.steps, courseId: C.form.courseId, language: d.language, createdBy: me().id });
      toast(t('create.published'));
      fx('celebrate', 'small');
      C = null;
      await loadCourses();
      S.courseFilter = null;
      go('lessons');
    } catch (e) { toast(e.message); }
  }

  // ---------- Настройки ----------
  function openSettings() {
    const students = S.users.filter((u) => u.role === 'student');
    $('#modal-root').innerHTML = `<div class="modal-bg" data-act="closeModal"><div class="modal">
      <div class="row between"><h2>${esc(t('nav.settings'))}</h2><button class="icon-btn" data-act="closeModal">${ic('close')}</button></div>
      <div class="set-row"><div>${esc(t('set.lang'))}</div><div class="lang-switch"><button class="${S.lang === 'ru' ? 'active' : ''}" data-act="lang" data-v="ru">RU</button><button class="${S.lang === 'kk' ? 'active' : ''}" data-act="lang" data-v="kk">KZ</button></div></div>
      ${S.role === 'student' ? `<div class="set-row"><div>${esc(t('set.student'))}<small>${esc(t('set.student.sub'))}</small></div><select class="select" data-change="setStudent">${students.map((u) => `<option value="${u.id}" ${u.id === S.studentId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>` : ''}
      <div class="set-row"><div>${esc(t('set.mock'))}<small>${esc(S.config.hasKey ? t('set.mock.sub') : t('set.mock.nokey'))}</small></div><button class="toggle ${S.config.mock ? 'on' : ''}" data-act="toggleMock" aria-label="mock"></button></div>
      <div class="set-row"><div>${esc(t('set.reset'))}<small>${esc(t('set.reset.sub'))}</small></div><button class="btn ghost sm" data-act="resetDemo">${ic('refresh')}${esc(t('set.reset.btn'))}</button></div>
    </div></div>`;
  }
  const closeModal = () => { $('#modal-root').innerHTML = ''; };

  async function resetDemo() {
    if (!confirm(t('reset.confirm'))) return;
    await api('/api/reset', {});
    C = null; P = null; S.courseFilter = null; S.ratingMonth = null; S.query = '';
    await loadCourses();
    closeModal();
    toast(t('reset.done'));
    go('home');
  }

  // ---------- События ----------
  const handlers = {
    nav: (v) => { closeModal(); if (v === 'lessons') S.courseFilter = null; go(v); },
    role: (v) => { S.role = v; store.set('role', v); if (v === 'teacher') C = null; go('home'); },
    lang: async (v) => {
      await loadDict(v);
      const open = $('#modal-root').innerHTML;
      if (C) C.form.language = v;
      if (S.page === 'lesson' && P) { renderSidebar(); renderTop(); renderPlayer(); renderPanel(); } else route();
      if (open) openSettings();
    },
    settings: openSettings,
    panel: () => togglePanel(),
    theme: () => setTheme(curTheme() === 'dark' ? 'light' : 'dark'),
    closeModal,
    bell: (v, el) => { fx('bell', v, el); toast(t('notif.none')); },
    continue: async () => {
      const list = await api('/api/lessons?studentId=' + S.studentId);
      const next = list.find((l) => !l.done && l.status === 'published');
      if (next) go('lesson', next.id); else go('lessons');
    },
    openLesson: (v) => go('lesson', v),
    openCourse: (v) => { S.courseFilter = v; go('lessons'); },
    courseFilter: (v) => { S.courseFilter = v || null; route(); },
    clearQuery: () => { S.query = ''; renderTop(); route(); },
    next: doNext, check: doCheck, skip: doSkip,
    startSteps: () => { if (P) { P.stage = 'steps'; renderPlayer(true); } },
    quick: (v) => sendChat('', v),
    send: () => { const i = $('#chat-in'); const v = i ? i.value.trim() : ''; if (v) { i.value = ''; sendChat(v); } },
    generate: doGenerate, publish: doPublish,
    resetCreate: () => { C = newCreateState(); renderCreate(); },
    toggleMock: async () => {
      const r = await api('/api/config', { mock: !S.config.mock });
      S.config.mock = r.mock;
      if (!r.mock && !S.config.hasKey) toast(t('set.mock.nokey'));
      openSettings(); renderPanel();
    },
    resetDemo,
  };

  document.addEventListener('click', (e) => {
    const dl = e.target.closest('a[download]');
    if (dl) { toast(t('dl.prep'), 'dl'); setTimeout(() => toast(t('dl.done'), 'dl'), 1200); }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.classList.contains('modal-bg') && e.target !== el) return; // клик внутри модалки не закрывает её
    const fn = handlers[el.dataset.act];
    if (fn) fn(el.dataset.v, el, e);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.form && C) C.form[el.dataset.form] = el.value;
    if (el.dataset.d) editDraft(el);
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.form && C) C.form[el.dataset.form] = el.value;
    if (el.dataset.change === 'ratingMonth') { S.ratingMonth = el.value; route(); }
    if (el.dataset.change === 'setStudent') { S.studentId = el.value; store.set('studentId', el.value); closeModal(); renderTop(); route(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.target.id === 'ans') doCheck();
      else if (e.target.id === 'chat-in') handlers.send();
      else if (e.target.id === 'q') { S.query = e.target.value; go('lessons'); }
    }
    // Скрытая горячая клавиша сброса демо-данных: Ctrl + Alt + R
    if (e.ctrlKey && e.altKey && e.code === 'KeyR') { e.preventDefault(); resetDemo(); }
  });

  window.addEventListener('hashchange', route);

  // ---------- Старт ----------
  (async function init() {
    try {
      await loadDict(S.lang);
      [S.users, S.config] = await Promise.all([api('/api/users'), api('/api/config')]);
      await loadCourses();
      if (!S.users.find((u) => u.id === S.studentId)) S.studentId = 's1';
      route();
    } catch (e) {
      $('#main').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  })();
})();
