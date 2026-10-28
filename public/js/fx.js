// fx.js - все анимации платформы (GSAP + canvas-confetti).
// Правила: анимация нужна, чтобы объяснять действие (появление, результат, награда), а не просто двигаться.
// Если библиотеки не загрузились или у человека включено "уменьшить движение", показывается итоговое состояние без анимации.
(function () {
  'use strict';

  const g = window.gsap;
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const ok = () => !!g && !RM.matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const COLORS = ['#8b6dff', '#fbbf24', '#f472b6', '#34d399', '#22d3ee', '#ffffff'];

  // Безопасные обёртки: если целей для анимации нет, GSAP не вызывается
  const T = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const from = (t, v) => { const a = T(t); return a.length ? g.from(a, v) : null; };
  const fromTo = (t, a, b) => { const l = T(t); return l.length ? g.fromTo(l, a, b) : null; };
  const to = (t, v) => { const a = T(t); return a.length ? g.to(a, v) : null; };

  const last = { nav: null, role: null }; // положение индикаторов между перерисовками
  let heroTweens = [];
  const pushT = (t) => { if (t) heroTweens.push(t); };

  // ---------- Появление страницы ----------
  function enter() {
    const main = $('#main');
    if (!main) return;
    heroTweens.forEach((t) => t.kill());
    heroTweens = [];
    if (!ok()) return;

    // Блоки верхнего уровня; у сеток берём дочерние карточки
    const blocks = [];
    Array.from(main.children).forEach((el) => {
      if (el.classList.contains('podium')) return;
      if (el.classList.contains('grid') || el.classList.contains('bento')) blocks.push(...el.children); else blocks.push(el);
    });
    const list = blocks.slice(0, 14);
    if (list.length) {
      from(list, {
        opacity: 0, y: 18, duration: 0.5, ease: 'power2.out',
        stagger: Math.min(0.05, 0.5 / list.length), clearProps: 'transform,opacity',
      });
    }
    from($$('.stat-ico, .course-ico, .task-ico', main).slice(0, 14), {
      scale: 0.5, rotation: -25, opacity: 0, duration: 0.5, ease: 'back.out(2.2)', stagger: 0.04, delay: 0.15, clearProps: 'transform,opacity',
    });
    words(main);
    countUps(main);
    rings(main);
    bars(main);
    hero(main);
  }

  // Заголовок появляется по словам
  function words(root) {
    $$('.page-title, .hero h2, .h1', root).slice(0, 3).forEach((el) => {
      if (el.dataset.w) return;
      el.dataset.w = '1';
      const wrap = (node) => {
        Array.from(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.nodeValue.split(/(\s+)/).forEach((p) => {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
              w.appendChild(i); frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) wrap(n);
        });
      };
      wrap(el);
    });
    if (!ok()) return;
    from($$('.page-title .wi, .hero h2 .wi, .h1 .wi', root), { yPercent: 110, rotation: 4, duration: 0.7, ease: 'power3.out', stagger: 0.06, clearProps: 'transform' });
  }

  // Числа "набегают" от нуля
  function countUps(root) {
    if (!ok()) return;
    $$('.stat-num, .pts, .result .big', root).forEach((el) => {
      const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue));
      if (!node) return;
      const m = node.nodeValue.match(/(\d+(?:[.,]\d+)?)/);
      if (!m) return;
      const raw = m[1];
      const dec = (raw.split(/[.,]/)[1] || '').length;
      const target = parseFloat(raw.replace(',', '.'));
      const pre = node.nodeValue.slice(0, m.index);
      const post = node.nodeValue.slice(m.index + raw.length);
      const o = { v: 0 };
      node.nodeValue = pre + (0).toFixed(dec) + post;
      to(o, {
        v: target, duration: 1.1, ease: 'power2.out', delay: 0.2,
        onUpdate: () => { node.nodeValue = pre + o.v.toFixed(dec) + post; },
        onComplete: () => { node.nodeValue = pre + raw + post; },
      });
    });
  }

  // Кольцо прогресса дорисовывается
  function rings(root) {
    if (!ok()) return;
    $$('.ring circle:last-child', root).forEach((c) => {
      const a = c.getAttribute('stroke-dasharray');
      fromTo(c, { attr: { 'stroke-dasharray': '0 100' } }, { attr: { 'stroke-dasharray': a }, duration: 1.2, ease: 'power3.out', delay: 0.25 });
    });
  }

  // Полоски прогресса и столбики диаграммы растут слева направо
  function bars(root) {
    if (!ok()) return;
    const list = $$('.progress > i', root);
    from(list, { scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'power3.out', delay: 0.25, stagger: 0.06, clearProps: 'transform' });
  }

  // Главный экран: плавающая картинка, мерцающие звёздочки, парящие плашки
  function hero(root) {
    const art = $('.hero .art', root);
    if (!art) return;
    const logo = $('.art-logo', art);
    from($$('.hero h2, .hero > p, .hero .btn', root), { opacity: 0, x: -24, duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.1, clearProps: 'transform,opacity' });
    from(logo, { scale: 0.4, rotation: -18, opacity: 0, duration: 0.9, ease: 'back.out(1.7)', delay: 0.2 });
    from($$('.float-chip', art), { opacity: 0, scale: 0.6, y: 16, duration: 0.6, ease: 'back.out(2)', stagger: 0.2, delay: 0.7 });
    pushT(to(logo, { y: -10, rotation: 2, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 }));
    $$('.float-chip', art).forEach((c, i) => {
      pushT(to(c, { y: i % 2 ? 8 : -8, duration: 2.2 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 + i * 0.3 }));
    });
    $$('.spark', art).forEach((s, i) => {
      pushT(fromTo(s, { scale: 0.3, opacity: 0.2, rotation: 0 }, { scale: 1, opacity: 1, rotation: 45, duration: 1.2 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.4 }));
    });
  }

  // ---------- Навигация: плавные индикаторы ----------
  function place(ind, pos) {
    if (g) { g.set(ind, pos); return; }
    ind.style.transform = `translate(${pos.x || 0}px, ${pos.y || 0}px)`;
    if (pos.width) ind.style.width = pos.width + 'px';
  }
  function slide(key, el, ind, pos) {
    if (!el || !ind) return;
    if (ok() && last[key]) {
      fromTo(ind, last[key], Object.assign({ duration: 0.45, ease: 'power3.out' }, pos));
    } else {
      place(ind, pos);
    }
    last[key] = pos;
  }
  function nav() {
    const side = $('#sidebar');
    if (!side) return;
    const act = $('.nav-item.active', side);
    const ind = $('.nav-ind', side);
    if (!act || !ind) return;
    ind.style.height = act.offsetHeight + 'px';
    slide('nav', act, ind, { y: act.offsetTop });
  }
  function role() {
    const box = $('.role-switch');
    if (!box) return;
    const act = $('.role-btn.active', box);
    const ind = $('.role-thumb', box);
    if (!act || !ind) return;
    slide('role', act, ind, { x: act.offsetLeft, width: act.offsetWidth });
  }

  // ---------- Правая панель ----------
  function panel() {
    if (!ok()) return;
    from($$('#panel .msg, #panel .quick button, #panel .cop-info'), { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out', stagger: 0.07, delay: 0.2, clearProps: 'transform,opacity' });
  }

  // Ответ ассистента "печатается" как в чате
  function stream(el, text, done) {
    if (!ok()) { el.textContent = text; if (done) done(); return; }
    const total = Math.min(1.8, Math.max(0.5, text.length * 0.016));
    const o = { n: 0 };
    el.textContent = '';
    to(o, {
      n: text.length, duration: total, ease: 'none',
      onUpdate: () => {
        el.textContent = text.slice(0, Math.round(o.n));
        const c = $('#chat');
        if (c) c.scrollTop = c.scrollHeight;
      },
      onComplete: () => { el.textContent = text; if (done) done(); },
    });
    return total;
  }

  // ---------- Прохождение урока ----------
  function step() {
    if (!ok()) return;
    const card = $('.step-card');
    if (card) from(card, { x: 48, opacity: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' });
    const items = $$('.step-card .text, .step-card .q, .step-card .answer-row');
    from(items, { y: 10, opacity: 0, duration: 0.4, stagger: 0.08, delay: 0.12, ease: 'power2.out', clearProps: 'transform,opacity' });
    const now = $('.steps-bar i.now');
    if (now) fromTo(now, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.6, ease: 'power2.out', clearProps: 'transform' });
    const prev = $$('.steps-bar i.done').pop();
    if (prev) fromTo(prev, { scaleY: 2.4 }, { scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' });
  }

  function feedback(correct) {
    if (!ok()) return;
    const fb = $('.feedback');
    if (fb) from(fb, { y: -10, opacity: 0, scale: 0.97, duration: 0.4, ease: 'back.out(2)', clearProps: 'transform,opacity' });
    if (correct) {
      const row = $('.answer-row');
      if (row) burstAt(row, 36);
      const card = $('.step-card');
      if (card) fromTo(card, { scale: 1 }, { scale: 1.012, yoyo: true, repeat: 1, duration: 0.14, ease: 'power1.out', clearProps: 'transform' });
    } else {
      const row = $('.answer-row');
      if (row) {
        to(row, {
          keyframes: [{ x: -10, duration: 0.07 }, { x: 10, duration: 0.07 }, { x: -6, duration: 0.07 }, { x: 6, duration: 0.07 }, { x: 0, duration: 0.07 }],
          ease: 'power1.inOut', onComplete: () => g.set(row, { clearProps: 'transform' }),
        });
      }
    }
  }

  function result(score) {
    if (!ok()) return;
    const card = $('.result');
    if (card) from(card, { scale: 0.92, opacity: 0, y: 20, duration: 0.6, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
    from($$('.result .chip, .result p, .result .row'), { y: 14, opacity: 0, stagger: 0.1, delay: 0.3, duration: 0.4, clearProps: 'transform,opacity' });
    countUps($('#main'));
    if (score >= 60) celebrate(score >= 85 ? 'big' : 'small');
  }

  // ---------- Рейтинг ----------
  function podium() {
    const cols = $$('.pcol');
    const main = $('#main');
    if (!ok() || !cols.length) return;
    const by = (r) => cols.find((c) => c.dataset.rank === String(r));
    const tl = g.timeline({ delay: 0.2 });
    [3, 2, 1].forEach((r, i) => {
      const c = by(r);
      if (!c) return;
      const t0 = i * 0.38;
      tl.fromTo($('.ped', c), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.55, ease: 'power3.out' }, t0)
        .fromTo($('.pod', c), { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'bounce.out', clearProps: 'transform,opacity' }, t0 + 0.25)
        .from($('.medal', c), { scale: 0, rotation: -360, duration: 0.6, ease: 'back.out(2)' }, t0 + 0.6)
        .from($('.pod .avatar', c), { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2.4)' }, t0 + 0.6);
      const crown = $('.crown', c);
      if (crown) {
        tl.fromTo(crown, { y: -60, scale: 0, rotation: -30, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'back.out(2.2)' }, t0 + 0.8)
          .add(() => { pushT(to(crown, { y: -4, rotation: 3, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })); }, '>');
      }
    });
    tl.add(() => confetti({ particleCount: 60, spread: 80, startVelocity: 32, origin: { x: 0.5, y: 0.45 }, scalar: 0.9 }), '-=0.2');
    const rows = $$('.table tbody tr', main);
    if (rows.length) from(rows, { opacity: 0, x: -18, duration: 0.4, stagger: Math.min(0.05, 0.5 / rows.length), delay: 1.4, ease: 'power2.out', clearProps: 'transform,opacity' });
  }

  // ---------- Создание урока ----------
  function reveal(sel) {
    if (!ok()) return;
    from($$(sel), { opacity: 0, y: 24, scale: 0.98, duration: 0.5, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' });
  }
  function swapText(el, text) {
    if (!el) return;
    if (!ok()) { el.textContent = text; return; }
    to(el, { opacity: 0, y: -8, duration: 0.18, onComplete: () => { el.textContent = text; fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }); } });
  }

  // ---------- Мелкие эффекты ----------
  function bell(_v, el) {
    if (!ok() || !el) return;
    const svg = $('svg', el);
    if (!svg) return;
    fromTo(svg, { rotation: 0, transformOrigin: '50% 0%' }, {
      keyframes: [{ rotation: 18, duration: 0.1 }, { rotation: -16, duration: 0.1 }, { rotation: 10, duration: 0.1 }, { rotation: -6, duration: 0.1 }, { rotation: 0, duration: 0.1 }],
      ease: 'power1.inOut',
    });
  }

  // ---------- Конфетти ----------
  function confetti(opts) {
    if (!window.confetti || RM.matches) return;
    window.confetti(Object.assign({ colors: COLORS, zIndex: 120, disableForReducedMotion: true }, opts));
  }
  function burstAt(el, count) {
    const r = el.getBoundingClientRect();
    confetti({
      particleCount: count || 40, spread: 70, startVelocity: 26, scalar: 0.8, ticks: 120,
      origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
    });
  }
  function celebrate(level) {
    if (!window.confetti || RM.matches) return;
    if (level === 'big') {
      confetti({ particleCount: 90, spread: 100, origin: { x: 0.5, y: 0.55 } });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 450);
      setTimeout(() => confetti({ particleCount: 70, spread: 120, startVelocity: 40, origin: { x: 0.5, y: 0.4 } }), 800);
    } else {
      confetti({ particleCount: 60, spread: 80, origin: { x: 0.5, y: 0.6 } });
    }
  }

  // ---------- Глобальные эффекты: наклон карточек, подсветка hero, волна на кнопках ----------
  const TILT = '.lesson-card, .course-card, .stat-card, .pod';
  const MAG = '.btn.lg';
  function initGlobal() {
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !e.target.closest) return;
      const card = e.target.closest('.card, .hero');
      if (card) {
        const cr = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - cr.left + 'px');
        card.style.setProperty('--my', e.clientY - cr.top + 'px');
      }
      if (ok()) {
        const au = $('.aurora');
        if (au) to(au, { x: (e.clientX / window.innerWidth - 0.5) * -34, y: (e.clientY / window.innerHeight - 0.5) * -34, duration: 1.2, ease: 'power2.out', overwrite: 'auto' });
        const mg = e.target.closest(MAG);
        if (mg) {
          const mr = mg.getBoundingClientRect();
          to(mg, { x: (e.clientX - mr.left - mr.width / 2) * 0.12, y: (e.clientY - mr.top - mr.height / 2) * 0.2, duration: 0.3, overwrite: 'auto' });
        }
      }
      const h = e.target.closest('.hero');
      if (h) {
        const r = h.getBoundingClientRect();
        h.style.setProperty('--mx', e.clientX - r.left + 'px');
        h.style.setProperty('--my', e.clientY - r.top + 'px');
      }
      if (!ok()) return;
      const el = e.target.closest(TILT);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      to(el, { rotationY: px * 6, rotationX: -py * 6, y: -3, transformPerspective: 900, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    });
    document.addEventListener('pointerout', (e) => {
      if (!ok() || !e.target.closest) return;
      const mg = e.target.closest(MAG);
      if (mg && !mg.contains(e.relatedTarget)) to(mg, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.5)', clearProps: 'transform' });
      const el = e.target.closest(TILT);
      if (el && !el.contains(e.relatedTarget)) to(el, { rotationX: 0, rotationY: 0, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
    });
    document.addEventListener('pointerdown', (e) => {
      if (RM.matches || !e.target.closest) return;
      const b = e.target.closest('.btn:not([disabled]), .quick button, .send');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const s = Math.max(r.width, r.height) * 2;
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      b.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  }
  initGlobal();

  // При повороте экрана и смене размера индикаторы встают на новое место
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { last.nav = null; last.role = null; nav(); role(); }, 150);
  });

  window.FX = { enter, nav, role, panel, stream, step, feedback, result, podium, reveal, swapText, bell, confetti, burstAt, celebrate, countUps, ok };
})();
