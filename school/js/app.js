// Satchel: everything on screen. Rules and date math live in logic.js.
(() => {
  'use strict';
  const S = window.Satchel;
  const KEY = 'satchel.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const today = () => S.toISO(new Date());

  const COLORS = ['#3b5bdb', '#0ca678', '#e8590c', '#ae3ec9', '#d6336c', '#1098ad', '#f59f00', '#5c7cfa', '#2b8a3e', '#868e96'];
  const HEAVY = 150; // minutes in a day before it counts as a crunch day

  // ---------- State ----------
  let state = load();
  const ui = { view: 'today', weekOffset: 0, filter: 'all', showDone: false, calc: {} };

  function blank() { return { classes: [], tasks: [], grades: [] }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { classes: s.classes || [], tasks: s.tasks || [], grades: s.grades || [] };
      }
    } catch (e) { /* storage blocked or bad data: start fresh */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function commit() { save(); render(); }

  const cls = (id) => state.classes.find((c) => c.id === id);
  const colorOf = (id) => (cls(id) || {}).color || '#868e96';
  const task = (id) => state.tasks.find((t) => t.id === id);

  // ---------- Icons ----------
  const ICON = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  };

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, undo) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
    el.hidden = false;
    if (undo) el.querySelector('button').onclick = () => { undo(); el.hidden = true; };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
  }

  // ---------- Shared pieces ----------
  function classChip(id) {
    const c = cls(id);
    if (!c) return '';
    return `<span class="chip class" style="--c:${c.color}"><span class="dot"></span>${esc(c.nick ? c.nick.split(/[\s,]+/)[0] : c.name)}</span>`;
  }
  function dueChip(t) {
    const n = S.dayNum(t.due) - S.dayNum(today());
    const label = S.relDue(t.due, today());
    if (t.done) return `<span class="chip muted">${esc(label)}</span>`;
    const kind = n < 0 ? 'late' : n <= 1 ? 'soon' : '';
    return `<span class="chip ${kind}">${n === -1 ? 'Due yesterday' : `${n < 0 ? '' : 'Due '}${esc(label)}`}</span>`;
  }
  function typeChip(t) {
    if (t.type === 'homework') return '';
    return `<span class="chip">${S.TYPES[t.type].label}</span>`;
  }

  function taskRow(t, opts = {}) {
    const c = colorOf(t.classId);
    const right = opts.right ?? (t.done ? '' : `<span>${S.fmtMin(t.effort)}</span>`);
    return `<li class="task ${t.done ? 'done' : ''}" style="--c:${t.classId ? c : 'transparent'}">
      <input type="checkbox" class="check" style="--c:${c}" data-act="${opts.checkAct || 'toggle'}" data-id="${t.id}" ${opts.checked ?? t.done ? 'checked' : ''}
        aria-label="${esc(opts.checkLabel || `Mark ${t.title} done`)}">
      <div class="body" data-act="edit-task" data-id="${t.id}">
        <div class="title">${t.priority ? '<span class="flag">!</span>' : ''}${esc(t.title)}</div>
        <div class="meta">${classChip(t.classId)}${typeChip(t)}${opts.meta ?? dueChip(t)}</div>
      </div>
      <div class="right">${right}</div>
    </li>`;
  }

  function sortTasks(a, b) {
    return a.due.localeCompare(b.due) || (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || (a.created || 0) - (b.created || 0);
  }

  // ---------- Today ----------
  function nowClass() {
    const d = new Date();
    const dw = d.getDay();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const todays = state.classes.filter((c) => (c.days || []).includes(dw) && c.start && c.end).sort((a, b) => a.start.localeCompare(b.start));
    const current = todays.find((c) => c.start <= hm && hm < c.end);
    if (current) {
      const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
      const pct = ((toMin(hm) - toMin(current.start)) / (toMin(current.end) - toMin(current.start))) * 100;
      return { kind: 'now', c: current, pct, next: todays.find((c) => c.start >= current.end) };
    }
    const next = todays.find((c) => c.start > hm);
    if (next) return { kind: 'next', c: next };
    for (let i = 1; i <= 7; i++) {
      const dd = (dw + i) % 7;
      const first = state.classes.filter((c) => (c.days || []).includes(dd) && c.start).sort((a, b) => a.start.localeCompare(b.start))[0];
      if (first) return { kind: 'later', c: first, day: i === 1 ? 'Tomorrow' : S.DAY_LONG[dd] };
    }
    return null;
  }

  function fmtTime(s) {
    if (!s) return '';
    let [h, m] = s.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')}${ap}`;
  }

  function nowCard() {
    const n = nowClass();
    if (!n) return '';
    const c = n.c;
    const where = [c.room && `Room ${c.room}`, c.teacher].filter(Boolean).map(esc).join(' · ');
    if (n.kind === 'now') {
      return `<div class="now" style="--c:${c.color}">
        <div class="label">In class now · until ${fmtTime(c.end)}</div>
        <div class="name">${esc(c.name)}</div>
        ${where ? `<div class="where">${where}</div>` : ''}
        <div class="bar"><i style="width:${n.pct.toFixed(1)}%"></i></div>
        ${n.next ? `<div class="where" style="margin-top:6px">Next: ${esc(n.next.name)} at ${fmtTime(n.next.start)}${n.next.room ? `, room ${esc(n.next.room)}` : ''}</div>` : ''}
      </div>`;
    }
    const label = n.kind === 'next' ? `Up next · ${fmtTime(c.start)}` : `${n.day} · first class at ${fmtTime(c.start)}`;
    return `<div class="now ${n.kind === 'later' ? 'idle' : ''}" style="--c:${c.color}">
      <div class="label">${label}</div>
      <div class="name">${esc(c.name)}</div>
      ${where ? `<div class="where">${where}</div>` : ''}
    </div>`;
  }

  function renderToday() {
    const t0 = today();
    const now = S.dayNum(t0);
    const open = state.tasks.filter((t) => !t.done);

    // Today's plan: everything whose plan includes a slot today.
    const plan = [];
    for (const t of state.tasks) {
      const slot = S.planFor(t, t0).find((p) => p.day === t0);
      if (slot) plan.push({ t, slot });
    }
    // Also show things finished today so checking them off doesn't make them vanish.
    for (const t of state.tasks) if (t.done && t.doneAt === t0 && !plan.some((p) => p.t === t)) plan.push({ t, slot: { min: t.effort, done: true } });
    plan.sort((a, b) => (a.slot.done - b.slot.done) || sortTasks(a.t, b.t));

    const minLeft = plan.filter((p) => !p.slot.done).reduce((a, p) => a + p.slot.min, 0);
    const late = open.filter((t) => S.dayNum(t.due) < now).length;
    const dueTomorrow = open.filter((t) => S.dayNum(t.due) === now + 1).length;
    const bigSoon = open.filter((t) => (t.type === 'test' || t.type === 'quiz' || t.type === 'project') && S.dayNum(t.due) - now <= 7 && S.dayNum(t.due) >= now);

    const planRows = plan.map(({ t, slot }) => {
      const multi = S.TYPES[t.type].span > 1 && !t.done;
      const n = S.dayNum(t.due) - now;
      let meta = dueChip(t);
      if (multi) {
        const sessions = Object.keys(t.log || {}).length;
        const total = sessions + S.planFor(t, t0).filter((p) => !p.done).length;
        const dots = Array.from({ length: Math.min(total, 8) }, (_, i) => `<i class="${i < sessions ? 'on' : ''}"></i>`).join('');
        meta = `${dueChip(t)}<span class="dots" style="--c:${colorOf(t.classId)}" title="${sessions} of ${total} study sessions done">${dots}</span>`;
        if (n > 0) meta += `<span>Study session</span>`;
      }
      return taskRow(t, {
        checkAct: multi ? 'session' : 'toggle',
        checked: slot.done || t.done,
        checkLabel: multi ? `Done studying for ${t.title} today` : undefined,
        meta,
        right: `<span>${S.fmtMin(slot.min)}</span>`,
      });
    }).join('');

    // Coming up: next 14 days, after tomorrow.
    const upcoming = open.filter((t) => { const n = S.dayNum(t.due) - now; return n >= 2 && n <= 14; }).sort(sortTasks);
    const groups = {};
    for (const t of upcoming) (groups[t.due] ||= []).push(t);
    const upRows = Object.entries(groups).map(([d, ts]) => `<div class="day-group">
      <div class="day-label">${esc(S.relDue(d, t0))} <span>${S.fmtDate(d)}</span></div>
      <ul class="list">${ts.map((t) => taskRow(t, { meta: '' })).join('')}</ul></div>`).join('');

    // Workload for the next 14 days.
    const load = S.loadByDay(state.tasks, t0);
    const days = Array.from({ length: 14 }, (_, i) => S.addISO(t0, i));
    const maxMin = Math.max(HEAVY, ...days.map((d) => (load[d] || {}).min || 0));
    const spark = days.map((d, i) => {
      const m = (load[d] || {}).min || 0;
      return `<div class="col ${i === 0 ? 'today' : ''}" title="${S.relDue(d, t0)}: ${S.fmtMin(m)} planned">
        <div class="b ${m >= HEAVY ? 'heavy' : ''}" style="height:${Math.max(2, (m / maxMin) * 44)}px"></div>
        <span>${S.DAY_SHORT[S.dow(d)][0]}</span></div>`;
    }).join('');
    const crunch = days.slice(1).find((d) => (load[d] || {}).min >= HEAVY);
    let crunchMsg = '';
    if (crunch) {
      const items = [...new Set(load[crunch].items)];
      const names = items.slice(0, 3).map((t) => `${(cls(t.classId) || {}).name || ''} ${t.title}`.trim()).map(esc).join(', ');
      crunchMsg = `<div class="callout">${ICON.warn}<div><b>${esc(S.relDue(crunch, t0))} looks heavy</b>: about ${S.fmtMin(load[crunch].min)} planned (${names}). Getting ahead tonight will flatten it.</div></div>`;
    }

    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const d = new Date();

    if (!state.classes.length && !state.tasks.length) return welcome();

    return `<div class="view-head"><div>
        <h1>${hello}</h1>
        <div class="sub">${S.DAY_LONG[d.getDay()]}, ${S.MON_SHORT[d.getMonth()]} ${d.getDate()}</div>
      </div>
      <div class="summary">
        <div class="stat"><b>${minLeft ? S.fmtMin(minLeft) : '0m'}</b><span>work left today</span></div>
        <div class="stat"><b>${dueTomorrow}</b><span>due tomorrow</span></div>
        <div class="stat ${late ? 'alert' : ''}"><b>${late}</b><span>overdue</span></div>
      </div></div>
      <div class="grid-today">
        <div class="stack">
          <section class="card">
            <div class="card-pad" style="padding-bottom:6px"><h2>Tonight's plan <span class="meta">${plan.length ? `${plan.filter((p) => p.slot.done).length} of ${plan.length} done` : ''}</span></h2></div>
            ${plan.length ? `<ul class="list">${planRows}</ul>` : `<div class="empty"><strong>Nothing planned for today</strong>Add homework above and it shows up here the night before it's due. Tests and projects get spread over the days before them.</div>`}
          </section>
          ${crunchMsg}
          <section class="card upcoming">
            <div class="card-pad" style="padding-bottom:0"><h2>Coming up <span class="meta">next two weeks</span></h2></div>
            ${upRows || '<div class="empty">Nothing due in the next two weeks.</div>'}
            <div style="height:6px"></div>
          </section>
        </div>
        <div class="stack side">
          ${nowCard()}
          <section class="card card-pad">
            <h2>Workload <span class="meta">next 14 days</span></h2>
            <div class="spark">${spark}</div>
          </section>
          ${bigSoon.length ? `<section class="card card-pad desk-only"><h2>Big ones this week</h2>
            <ul class="list" style="margin:6px -16px -10px">${bigSoon.sort(sortTasks).map((t) => taskRow(t)).join('')}</ul></section>` : ''}
        </div>
      </div>`;
  }

  function welcome() {
    return `<div class="card card-pad" style="max-width:640px;margin:20px auto">
      <h1 style="font-size:24px;margin-bottom:8px">Welcome to Satchel</h1>
      <div class="howto">
        <p>Satchel turns "what's due" into "what to do tonight".</p>
        <ul>
          <li><b>Add your classes</b>, with a nickname you'd actually type (<code>bio</code>, <code>math</code>) and when they meet.</li>
          <li><b>Type assignments in one line</b> in the box at the top: <code>bio lab report due thu</code>, <code>math test 11/14</code>, <code>read ch 4 english tomorrow !</code></li>
          <li><b>Open Today</b> to see tonight's plan. Homework lands on the night before it's due, and study time for tests and projects is spread over the days before.</li>
        </ul>
        <p>Everything stays in this browser. Nothing is uploaded.</p>
      </div>
      <div class="data-tools">
        <button class="btn primary" data-act="new-class">Add your first class</button>
        <button class="btn" data-act="sample">Try it with sample data</button>
      </div>
    </div>`;
  }

  // ---------- Assignments ----------
  function renderTasks() {
    const t0 = today();
    const now = S.dayNum(t0);
    let list = state.tasks.filter((t) => ui.filter === 'all' || t.classId === ui.filter || (ui.filter === 'none' && !t.classId));
    const open = list.filter((t) => !t.done).sort(sortTasks);
    const done = list.filter((t) => t.done).sort((a, b) => b.due.localeCompare(a.due));

    const buckets = [
      ['Overdue', (n) => n < 0],
      ['Today', (n) => n === 0],
      ['Tomorrow', (n) => n === 1],
      ['This week', (n) => n >= 2 && n <= 7],
      ['Later', (n) => n > 7],
    ];
    const sections = buckets.map(([name, test]) => {
      const ts = open.filter((t) => test(S.dayNum(t.due) - now));
      if (!ts.length) return '';
      return `<div class="section-title">${name} · ${ts.length}</div>
        <section class="card"><ul class="list">${ts.map((t) => taskRow(t)).join('')}</ul></section>`;
    }).join('');

    const filterBtns = [`<button class="${ui.filter === 'all' ? 'on' : ''}" data-act="filter" data-id="all">All</button>`]
      .concat(state.classes.map((c) => `<button class="${ui.filter === c.id ? 'on' : ''}" data-act="filter" data-id="${c.id}"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}</button>`))
      .concat(state.tasks.some((t) => !t.classId) ? [`<button class="${ui.filter === 'none' ? 'on' : ''}" data-act="filter" data-id="none">No class</button>`] : [])
      .join('');

    return `<div class="view-head"><div><h1>Assignments</h1><div class="sub">${open.length} to do${done.length ? ` · ${done.length} done` : ''}</div></div>
        <button class="btn primary" data-act="new-task">New assignment</button></div>
      <div class="filters" style="margin-bottom:16px">${filterBtns}</div>
      ${sections || `<div class="card empty"><strong>All clear</strong>Nothing left to do${ui.filter !== 'all' ? ' for this class' : ''}.</div>`}
      ${done.length ? `<div class="section-title" style="display:flex;justify-content:space-between;align-items:center">Done · ${done.length}
          <button class="btn ghost small" data-act="toggle-done">${ui.showDone ? 'Hide' : 'Show'}</button></div>
        ${ui.showDone ? `<section class="card"><ul class="list">${done.map((t) => taskRow(t)).join('')}</ul></section>` : ''}` : ''}`;
  }

  // ---------- Week ----------
  function renderWeek() {
    const t0 = today();
    // On weekends "this week" means the school week ahead.
    const dw0 = S.dow(t0);
    const base = dw0 === 6 ? 2 : dw0 === 0 ? 1 : -((dw0 + 6) % 7);
    const monday = S.addISO(t0, base + ui.weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => S.addISO(monday, i));
    const load = S.loadByDay(state.tasks, t0);
    const now = S.dayNum(t0);

    const cols = days.map((d) => {
      const n = S.dayNum(d);
      const dw = S.dow(d);
      const classes = state.classes.filter((c) => (c.days || []).includes(dw)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
      const due = state.tasks.filter((t) => t.due === d).sort((a, b) => (a.done - b.done) || sortTasks(a, b));
      const m = n >= now ? ((load[d] || {}).min || 0) : 0;
      return `<div class="wday ${n === now ? 'today' : ''} ${n < now ? 'past' : ''} ${dw === 0 || dw === 6 ? 'weekend' : ''}">
        <h3>${S.DAY_SHORT[dw]} <small>${S.fmtDate(d)}</small></h3>
        ${n >= now ? `<div class="load" title="${S.fmtMin(m)} of planned work"><i class="${m >= HEAVY ? 'heavy' : ''}" style="width:${Math.min(100, (m / 240) * 100)}%"></i></div>
          <div class="load-label">${m ? `${S.fmtMin(m)} of work` : 'Free'}</div>` : ''}
        ${due.length ? `<div class="wk-sub">Due</div>` : ''}
        ${due.map((t) => `<div class="wdue ${t.done ? 'done' : ''} ${t.type === 'test' || t.type === 'project' ? 'big' : ''}" style="--c:${colorOf(t.classId)}" data-act="edit-task" data-id="${t.id}">
            ${t.priority ? '! ' : ''}${esc(t.title)}<small>${esc([(cls(t.classId) || {}).name, t.type !== 'homework' ? S.TYPES[t.type].label : ''].filter(Boolean).join(' · '))}</small></div>`).join('')}
        ${classes.length ? `<div class="wk-sub">Classes</div>` : ''}
        ${classes.map((c) => `<div class="wclass" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${fmtTime(c.start)}</span></div>`).join('')}
      </div>`;
    }).join('');

    const label = ui.weekOffset === 0 ? (base > 0 ? 'Coming week' : 'This week') : ui.weekOffset === 1 ? 'Next week' : ui.weekOffset === -1 ? 'Last week' : `Week of ${S.fmtDate(monday)}`;
    const weekMin = days.reduce((a, d) => a + (S.dayNum(d) >= now ? ((load[d] || {}).min || 0) : 0), 0);
    return `<div class="view-head"><div><h1>${label}</h1><div class="sub">${S.fmtDate(days[0])} – ${S.fmtDate(days[6])}${weekMin ? ` · about ${S.fmtMin(weekMin)} of work planned` : ''}</div></div>
      <div style="display:flex;gap:6px">
        <button class="btn" data-act="week" data-id="-1" aria-label="Previous week">${ICON.left.replace('<svg', '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"')}</button>
        <button class="btn" data-act="week" data-id="0">Today</button>
        <button class="btn" data-act="week" data-id="1" aria-label="Next week">${ICON.right.replace('<svg', '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"')}</button>
      </div></div>
      <div class="week">${cols}</div>`;
  }

  // ---------- Grades ----------
  function renderGrades() {
    if (!state.classes.length) {
      return `<div class="view-head"><div><h1>Grades</h1></div></div>
        <div class="card empty"><strong>No classes yet</strong>Add a class to start tracking grades.<br><button class="btn primary" data-act="new-class">Add a class</button></div>`;
    }
    const cards = state.classes.map((c) => {
      const g = S.classGrade(c, state.grades);
      const entries = state.grades.filter((x) => x.classId === c.id);
      const cats = c.cats && c.cats.length ? c.cats : [{ name: 'All', weight: 100 }];
      const calc = ui.calc[c.id] || { target: 90, weight: 20 };
      const need = S.neededOnFinal(g.pct, Number(calc.target), Number(calc.weight));
      let answer = 'Add a grade to see what you need.';
      let cls2 = '';
      if (need != null) {
        if (need <= 0) { answer = `You're safe: even a 0 keeps you at ${calc.target}%.`; cls2 = 'good'; }
        else if (need > 100) { answer = `You'd need ${need.toFixed(1)}%, so ${calc.target}% is out of reach. Try a lower target.`; cls2 = 'bad'; }
        else { answer = `You need ${need.toFixed(1)}% on the final.`; cls2 = need < 70 ? 'good' : ''; }
      }
      return `<section class="card gcard" style="--c:${c.color}">
        <div class="ghead">
          <div class="name"><b>${esc(c.name)}</b><span>${g.count} grade${g.count === 1 ? '' : 's'} entered</span></div>
          <div class="big"><b>${g.pct == null ? '–' : `${g.pct.toFixed(1)}%`}</b><span>${S.letter(g.pct)}</span></div>
        </div>
        <div class="cats">${g.per.map((p) => `<div class="cat">
            <span>${esc(p.name)} <span class="w">${p.weight}%</span></span><b>${p.pct == null ? '–' : `${p.pct.toFixed(1)}%`}</b>
            <div class="bar"><i style="width:${p.pct == null ? 0 : Math.min(100, p.pct)}%"></i></div></div>`).join('')}</div>
        <details ${entries.length ? '' : 'open'}>
          <summary>Scores</summary>
          ${entries.length ? `<table class="gtable">${entries.map((x) => `<tr>
              <td>${esc(x.name || 'Untitled')}<div class="catname">${esc(x.cat)}</div></td>
              <td class="n">${+x.score} / ${+x.max}</td>
              <td class="n">${x.max > 0 ? `${((x.score / x.max) * 100).toFixed(0)}%` : ''}</td>
              <td class="x"><button class="icon-btn" data-act="del-grade" data-id="${x.id}" aria-label="Delete ${esc(x.name)}">${ICON.x}</button></td></tr>`).join('')}</table>` : ''}
          <form class="gadd" data-form="grade" data-id="${c.id}">
            <select class="input" name="cat" aria-label="Category">${cats.map((k) => `<option>${esc(k.name)}</option>`).join('')}</select>
            <input class="input" name="name" placeholder="Name (Quiz 3)" aria-label="Assignment name">
            <div class="score" style="grid-column:1/-1">
              <input class="input" name="score" inputmode="decimal" placeholder="Score" aria-label="Points earned" required>
              <span>/</span>
              <input class="input" name="max" inputmode="decimal" placeholder="Out of" value="100" aria-label="Points possible" required>
            </div>
            <button class="btn small" type="submit">Add score</button>
          </form>
        </details>
        <details>
          <summary>What do I need on the final?</summary>
          <div class="calc" data-calc="${c.id}">
            <div class="inputs">I want <input class="input" name="target" inputmode="decimal" value="${esc(calc.target)}" aria-label="Target grade percent">%
              and the final is worth <input class="input" name="weight" inputmode="decimal" value="${esc(calc.weight)}" aria-label="Final exam weight percent">% of my grade</div>
            <div class="answer ${cls2}">${esc(answer)}</div>
          </div>
        </details>
      </section>`;
    }).join('');

    const withGrades = state.classes.map((c) => S.classGrade(c, state.grades).pct).filter((p) => p != null);
    const gpa = withGrades.length ? withGrades.map(gpaPoints).reduce((a, b) => a + b, 0) / withGrades.length : null;
    return `<div class="view-head"><div><h1>Grades</h1><div class="sub">${gpa != null ? `Unweighted GPA about <b>${gpa.toFixed(2)}</b> across ${withGrades.length} class${withGrades.length === 1 ? '' : 'es'}` : 'Enter scores to see your running grade in each class.'}</div></div></div>
      <div class="grades">${cards}</div>`;
  }
  function gpaPoints(p) {
    const map = { 'A': 4, 'A−': 3.7, 'B+': 3.3, 'B': 3, 'B−': 2.7, 'C+': 2.3, 'C': 2, 'C−': 1.7, 'D+': 1.3, 'D': 1, 'D−': .7, 'F': 0 };
    return map[S.letter(p)];
  }

  // ---------- Classes ----------
  function renderClasses() {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cards = state.classes.map((c) => {
      const open = state.tasks.filter((t) => t.classId === c.id && !t.done).length;
      const days = (c.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAYS[d]).join(' ');
      return `<div class="card ccard" style="--c:${c.color}" data-act="edit-class" data-id="${c.id}" tabindex="0" role="button">
        <b>${esc(c.name)}</b>
        <div class="meta">${days ? `<span>${days}${c.start ? ` · ${fmtTime(c.start)}` : ''}</span>` : ''}${c.room ? `<span>Room ${esc(c.room)}</span>` : ''}${c.teacher ? `<span>${esc(c.teacher)}</span>` : ''}</div>
        <div class="meta"><span>${open} open assignment${open === 1 ? '' : 's'}</span>${c.nick ? `<span class="nick">type: ${esc(c.nick)}</span>` : ''}</div>
      </div>`;
    }).join('');
    return `<div class="view-head"><div><h1>Classes</h1><div class="sub">Nicknames are what you type in the quick-add box.</div></div>
        <button class="btn primary" data-act="new-class">Add class</button></div>
      ${state.classes.length ? `<div class="classes">${cards}</div>` : '<div class="card empty"><strong>No classes yet</strong>Add your classes so assignments can be sorted and colored automatically.</div>'}
      <div class="section-title" style="margin-top:28px">Quick add cheat sheet</div>
      <div class="card card-pad howto">
        Type one line in the box at the top. Satchel picks out:
        <ul>
          <li><b>The class</b> by nickname or name, even a start of one: <code>bio</code>, <code>chem</code>, <code>us history</code></li>
          <li><b>The date</b>: <code>today</code>, <code>tomorrow</code>, <code>fri</code>, <code>next tue</code>, <code>11/14</code>, <code>nov 14</code>, <code>in 3 days</code>. No date means tomorrow.</li>
          <li><b>The kind</b>: words like <code>test</code>, <code>quiz</code>, <code>essay</code>, <code>project</code> or <code>read</code> set it. Bigger kinds get more study time, spread over more days.</li>
          <li><b>Priority</b>: add <code>!</code> to flag it.</li>
        </ul>
        Press <code>/</code> anywhere to jump to the box.
      </div>
      <div class="section-title" style="margin-top:28px">Your data</div>
      <div class="card card-pad howto">
        Everything is saved in this browser only. Back it up or move it to another device with a file.
        <div class="data-tools">
          <button class="btn" data-act="export">Download backup</button>
          <button class="btn" data-act="import">Restore from backup</button>
          <button class="btn" data-act="sample">Load sample data</button>
          <button class="btn danger" data-act="reset">Erase everything</button>
        </div>
      </div>`;
  }

  // ---------- Render ----------
  const VIEWS = { today: renderToday, tasks: renderTasks, week: renderWeek, grades: renderGrades, classes: renderClasses };
  function render() {
    // Keep open <details> open across re-renders on the grades page.
    const openDetails = [...document.querySelectorAll('#main details')].map((d) => d.open);
    $('#main').innerHTML = VIEWS[ui.view]();
    if (ui.view === 'grades' && openDetails.length) {
      document.querySelectorAll('#main details').forEach((d, i) => { if (openDetails[i] !== undefined) d.open = openDetails[i]; });
    }
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
    updatePreview();
  }

  function go(view) {
    ui.view = view;
    try { localStorage.setItem(KEY + '.view', view); } catch (e) { /* ignore */ }
    render();
    window.scrollTo({ top: 0 });
  }

  // ---------- Quick add ----------
  const quickInput = $('#quick-input');
  function updatePreview() {
    const el = $('#quick-preview');
    const v = quickInput.value.trim();
    if (!v) {
      el.innerHTML = document.activeElement === quickInput
        ? `<span class="hint">Try <code data-ex="bio lab report due thu">bio lab report due thu</code> <code data-ex="math test 11/14">math test 11/14</code> <code data-ex="read ch 4 english tomorrow !">read ch 4 english tomorrow !</code></span>`
        : '';
      return;
    }
    const p = S.parseQuick(v, state.classes, today());
    const c = cls(p.classId);
    el.innerHTML = [
      `<span>Adds</span><b style="color:var(--ink)">${esc(p.title)}</b>`,
      c ? `<span class="chip class" style="--c:${c.color}"><span class="dot"></span>${esc(c.name)}</span>` : '<span class="chip">No class</span>',
      `<span class="chip">${S.TYPES[p.type].label}</span>`,
      `<span class="chip ${p.dateGuessed ? '' : 'ok'}">Due ${esc(S.relDue(p.due, today()))}${p.dateGuessed ? ' (default)' : ''}</span>`,
      p.priority ? '<span class="chip late">! Priority</span>' : '',
      `<span>~${S.fmtMin(p.effort)} of work</span>`,
    ].join('');
  }

  function addTask(p) {
    const t = { id: uid(), created: Date.now(), done: false, log: {}, notes: '', ...p };
    delete t.dateGuessed;
    state.tasks.push(t);
    commit();
    return t;
  }

  $('#quick').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = quickInput.value.trim();
    if (!v) { quickInput.focus(); return; }
    const t = addTask(S.parseQuick(v, state.classes, today()));
    quickInput.value = '';
    updatePreview();
    toast(`Added "${t.title}", due ${S.relDue(t.due, today()).toLowerCase()}`, () => {
      state.tasks = state.tasks.filter((x) => x.id !== t.id);
      commit();
    });
  });
  quickInput.addEventListener('input', updatePreview);
  quickInput.addEventListener('focus', updatePreview);
  quickInput.addEventListener('blur', () => setTimeout(updatePreview, 150));
  $('#quick-preview').addEventListener('mousedown', (e) => {
    const ex = e.target.closest('[data-ex]');
    if (ex) { e.preventDefault(); quickInput.value = ex.dataset.ex; updatePreview(); quickInput.focus(); }
  });

  // ---------- Dialogs ----------
  const dlg = $('#dlg');
  const form = $('#dlg-form');
  let onSave = null;

  function openDialog(html, save) {
    form.innerHTML = html;
    onSave = save;
    dlg.showModal();
    const first = form.querySelector('input:not([type=radio]):not([type=checkbox]), textarea');
    if (first) first.focus();
  }
  form.addEventListener('submit', (e) => {
    const btn = e.submitter;
    if (!btn || btn.value === 'cancel') return;
    if (btn.value === 'delete') { onSave && onSave(null, 'delete'); return; }
    onSave && onSave(new FormData(form), 'save');
  });

  function taskDialog(t) {
    const isNew = !t;
    t = t || { title: '', classId: state.classes[0]?.id || '', type: 'homework', due: S.addISO(today(), 1), effort: 30, notes: '', priority: false };
    openDialog(`<h2>${isNew ? 'New assignment' : 'Edit assignment'}</h2>
      <label class="field"><span>Title</span><input name="title" value="${esc(t.title)}" required></label>
      <div class="row2">
        <label class="field"><span>Class</span><select name="classId"><option value="">No class</option>
          ${state.classes.map((c) => `<option value="${c.id}" ${c.id === t.classId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Kind</span><select name="type" id="f-type">
          ${Object.entries(S.TYPES).map(([k, v]) => `<option value="${k}" ${k === t.type ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label class="field"><span>Due</span><input type="date" name="due" value="${esc(t.due)}" required></label>
        <label class="field"><span>Time it'll take (minutes)</span><input type="number" name="effort" id="f-effort" min="5" step="5" value="${Number(t.effort) || 30}"></label>
      </div>
      <label class="field"><span>Notes</span><textarea name="notes" style="font-family:var(--font);font-size:14px" placeholder="Pages, links, what the teacher said…">${esc(t.notes)}</textarea></label>
      <label class="check-line"><input type="checkbox" name="priority" ${t.priority ? 'checked' : ''}> Flag as priority</label>
      <div class="dlg-actions">
        ${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Delete</button>'}
        <span class="spacer"></span>
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
        <button class="btn primary" value="save">${isNew ? 'Add' : 'Save'}</button>
      </div>`, (fd, action) => {
      if (action === 'delete') {
        const idx = state.tasks.indexOf(t);
        state.tasks.splice(idx, 1);
        commit();
        toast(`Deleted "${t.title}"`, () => { state.tasks.splice(idx, 0, t); commit(); });
        return;
      }
      const data = {
        title: fd.get('title').trim() || 'Untitled', classId: fd.get('classId') || null, type: fd.get('type'),
        due: fd.get('due'), effort: Math.max(5, Number(fd.get('effort')) || 30), notes: fd.get('notes'), priority: fd.has('priority'),
      };
      if (isNew) addTask(data);
      else { Object.assign(t, data); commit(); }
    });
    // Changing the kind suggests a matching time, until the user types their own.
    let touched = false;
    $('#f-effort').addEventListener('input', () => { touched = true; });
    $('#f-type').addEventListener('change', (e) => { if (!touched) $('#f-effort').value = S.TYPES[e.target.value].effort; });
  }

  function classDialog(c) {
    const isNew = !c;
    const used = new Set(state.classes.map((x) => x.color));
    c = c || { name: '', nick: '', color: COLORS.find((x) => !used.has(x)) || COLORS[0], teacher: '', room: '', days: [1, 2, 3, 4, 5], start: '', end: '',
      cats: [{ name: 'Homework', weight: 20 }, { name: 'Quizzes', weight: 30 }, { name: 'Tests', weight: 50 }] };
    const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
    openDialog(`<h2>${isNew ? 'Add a class' : 'Edit class'}</h2>
      <div class="row2">
        <label class="field"><span>Class name</span><input name="name" value="${esc(c.name)}" placeholder="AP Biology" required></label>
        <label class="field"><span>Nickname for quick add</span><input name="nick" value="${esc(c.nick)}" placeholder="bio"><small>What you'd type. Several are fine: "chem, chemistry"</small></label>
      </div>
      <div class="field"><span>Color</span><div class="swatches">
        ${COLORS.map((x) => `<label style="--c:${x}"><input type="radio" name="color" value="${x}" ${x === c.color ? 'checked' : ''} aria-label="Color ${x}"><span></span></label>`).join('')}
      </div></div>
      <div class="row2">
        <label class="field"><span>Teacher</span><input name="teacher" value="${esc(c.teacher)}"></label>
        <label class="field"><span>Room</span><input name="room" value="${esc(c.room)}"></label>
      </div>
      <div class="field"><span>Meets on</span><div class="daypick">
        ${DAYS.map(([d, l]) => `<label><input type="checkbox" name="days" value="${d}" ${(c.days || []).includes(d) ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div></div>
      <div class="row2">
        <label class="field"><span>Starts</span><input type="time" name="start" value="${esc(c.start)}"></label>
        <label class="field"><span>Ends</span><input type="time" name="end" value="${esc(c.end)}"></label>
      </div>
      <label class="field"><span>Grade categories and weights</span>
        <textarea name="cats">${esc((c.cats || []).map((k) => `${k.name} ${k.weight}`).join('\n'))}</textarea>
        <small>One per line, from your syllabus. Leave empty if all points count equally.</small></label>
      <div class="dlg-actions">
        ${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Delete class</button>'}
        <span class="spacer"></span>
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
        <button class="btn primary" value="save">${isNew ? 'Add class' : 'Save'}</button>
      </div>`, (fd, action) => {
      if (action === 'delete') {
        const n = state.tasks.filter((t) => t.classId === c.id).length;
        if (!confirm(`Delete ${c.name}? Its ${n} assignment${n === 1 ? '' : 's'} and grades will be deleted too.`)) return;
        state.classes = state.classes.filter((x) => x !== c);
        state.tasks = state.tasks.filter((t) => t.classId !== c.id);
        state.grades = state.grades.filter((g) => g.classId !== c.id);
        commit();
        return;
      }
      const data = {
        name: fd.get('name').trim() || 'Class', nick: fd.get('nick').trim(), color: fd.get('color') || COLORS[0],
        teacher: fd.get('teacher').trim(), room: fd.get('room').trim(), days: fd.getAll('days').map(Number),
        start: fd.get('start'), end: fd.get('end'), cats: S.parseCats(fd.get('cats')),
      };
      if (isNew) state.classes.push({ id: uid(), ...data });
      else Object.assign(c, data);
      commit();
    });
  }

  // ---------- Actions ----------
  function toggleTask(t, el) {
    const was = t.done;
    t.done = !was;
    t.doneAt = t.done ? today() : null;
    save();
    if (t.done) {
      const li = el && el.closest('.task');
      if (li && ui.view === 'tasks') { li.classList.add('leaving'); setTimeout(render, 250); } else render();
      toast(`Done: ${t.title}`, () => { t.done = was; t.doneAt = null; commit(); });
    } else render();
  }

  function logSession(t) {
    const t0 = today();
    t.log = t.log || {};
    if (t.log[t0]) { delete t.log[t0]; commit(); return; }
    const slot = S.planFor(t, t0).find((p) => p.day === t0);
    t.log[t0] = slot ? slot.min : 30;
    const left = Math.max(0, t.effort - Object.values(t.log).reduce((a, b) => a + b, 0));
    commit();
    toast(left ? `Nice. ${S.fmtMin(left)} of studying left for ${t.title}` : `All study time done for ${t.title}`, () => { delete t.log[t0]; commit(); });
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.tabs button');
    if (tab) { go(tab.dataset.view); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'toggle': toggleTask(task(id), el); break;
      case 'session': logSession(task(id)); break;
      case 'edit-task': taskDialog(task(id)); break;
      case 'new-task': taskDialog(null); break;
      case 'edit-class': classDialog(cls(id)); break;
      case 'new-class': classDialog(null); break;
      case 'filter': ui.filter = id; render(); break;
      case 'toggle-done': ui.showDone = !ui.showDone; render(); break;
      case 'week': ui.weekOffset = id === '0' ? 0 : ui.weekOffset + Number(id); render(); break;
      case 'del-grade': {
        const idx = state.grades.findIndex((g) => g.id === id);
        const g = state.grades[idx];
        state.grades.splice(idx, 1);
        commit();
        toast('Score deleted', () => { state.grades.splice(idx, 0, g); commit(); });
        break;
      }
      case 'sample': loadSample(); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'reset':
        if (confirm('Erase all classes, assignments and grades from this browser? Download a backup first if you might want them back.')) {
          state = blank(); commit(); go('today');
        }
        break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.ccard')) e.target.click();
    if (e.key === '/' && !e.target.closest('input, textarea, select') && !dlg.open) { e.preventDefault(); quickInput.focus(); }
    if (e.key === 'Escape' && document.activeElement === quickInput) { quickInput.value = ''; quickInput.blur(); updatePreview(); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="grade"]');
    if (!f) return;
    e.preventDefault();
    const fd = new FormData(f);
    const score = Number(fd.get('score')), max = Number(fd.get('max'));
    if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) { toast('Enter a score and what it was out of'); return; }
    state.grades.push({ id: uid(), classId: f.dataset.id, cat: fd.get('cat'), name: fd.get('name').trim(), score, max });
    commit();
    const again = document.querySelector(`[data-form="grade"][data-id="${f.dataset.id}"] [name=name]`);
    if (again) again.focus();
  });

  document.addEventListener('input', (e) => {
    const box = e.target.closest('[data-calc]');
    if (!box) return;
    const id = box.dataset.calc;
    ui.calc[id] = { target: box.querySelector('[name=target]').value, weight: box.querySelector('[name=weight]').value };
    const c = cls(id);
    const g = S.classGrade(c, state.grades);
    const { target, weight } = ui.calc[id];
    const need = S.neededOnFinal(g.pct, Number(target), Number(weight));
    const ans = box.querySelector('.answer');
    ans.className = 'answer';
    if (need == null || !Number.isFinite(need)) ans.textContent = g.pct == null ? 'Add a grade to see what you need.' : 'Enter a final weight between 1 and 99.';
    else if (need <= 0) { ans.textContent = `You're safe: even a 0 keeps you at ${target}%.`; ans.classList.add('good'); }
    else if (need > 100) { ans.textContent = `You'd need ${need.toFixed(1)}%, so ${target}% is out of reach. Try a lower target.`; ans.classList.add('bad'); }
    else { ans.textContent = `You need ${need.toFixed(1)}% on the final.`; if (need < 70) ans.classList.add('good'); }
  });

  // ---------- Backup ----------
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'satchel', version: 1, ...state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `satchel-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      try {
        const s = JSON.parse(await inp.files[0].text());
        if (!Array.isArray(s.classes) || !Array.isArray(s.tasks)) throw new Error('bad');
        if (!confirm('Replace everything here with this backup?')) return;
        state = { classes: s.classes, tasks: s.tasks, grades: s.grades || [] };
        commit();
        toast('Backup restored');
      } catch (err) { toast("That file isn't a Satchel backup"); }
    };
    inp.click();
  }

  // ---------- Sample data ----------
  function loadSample() {
    if ((state.classes.length || state.tasks.length) && !confirm('Replace what you have with sample data?')) return;
    const t0 = today();
    const d = (n) => S.addISO(t0, n);
    const C = (id, name, nick, color, teacher, room, start, end, days, cats) => ({ id, name, nick, color, teacher, room, start, end, days, cats });
    const std = [{ name: 'Homework', weight: 20 }, { name: 'Quizzes', weight: 30 }, { name: 'Tests', weight: 50 }];
    state = {
      classes: [
        C('bio', 'AP Biology', 'bio', '#0ca678', 'Ms. Okafor', '214', '08:00', '08:50', [1, 2, 3, 4, 5], [{ name: 'Labs', weight: 25 }, { name: 'Quizzes', weight: 25 }, { name: 'Tests', weight: 50 }]),
        C('alg', 'Algebra II', 'math, alg', '#3b5bdb', 'Mr. Reyes', '108', '09:00', '09:50', [1, 2, 3, 4, 5], std),
        C('eng', 'English Literature', 'eng', '#ae3ec9', 'Dr. Lindqvist', '301', '10:05', '10:55', [1, 3, 5], [{ name: 'Essays', weight: 50 }, { name: 'Reading checks', weight: 20 }, { name: 'Participation', weight: 30 }]),
        C('his', 'US History', 'hist, history', '#e8590c', 'Mrs. Patel', '122', '11:00', '11:50', [2, 4], std),
        C('spa', 'Spanish III', 'span, spanish', '#d6336c', 'Sr. Molina', '017', '13:00', '13:50', [1, 2, 3, 4, 5], [{ name: 'Homework', weight: 30 }, { name: 'Speaking', weight: 30 }, { name: 'Tests', weight: 40 }]),
      ],
      tasks: [
        ['alg', 'Worksheet 5.3, odd problems', 'homework', d(1), 30],
        ['spa', 'Vocab list 7', 'homework', d(1), 20],
        ['bio', 'Unit 4 test: cell respiration', 'test', d(3), 180, true],
        ['eng', 'Read Gatsby ch. 5–6', 'reading', d(2), 45],
        ['his', 'DBQ essay: Reconstruction', 'project', d(6), 240],
        ['alg', 'Quiz on logarithms', 'quiz', d(4), 60],
        ['bio', 'Enzyme lab write-up', 'project', d(9), 150],
        ['spa', 'Oral presentation', 'project', d(11), 120],
        ['eng', 'Annotate poem for discussion', 'homework', d(-1), 20],
        ['his', 'Chapter 12 notes', 'reading', d(5), 40],
      ].map(([classId, title, type, due, effort, priority]) => ({ id: uid(), created: Date.now(), classId, title, type, due, effort, priority: !!priority, done: false, log: {}, notes: '' })),
      grades: [
        ['bio', 'Labs', 'Lab 1', 18, 20], ['bio', 'Quizzes', 'Quiz 1', 8, 10], ['bio', 'Tests', 'Unit 1 test', 84, 100], ['bio', 'Tests', 'Unit 2 test', 91, 100],
        ['alg', 'Homework', 'HW avg', 95, 100], ['alg', 'Quizzes', 'Quiz 4', 17, 20], ['alg', 'Tests', 'Ch 3 test', 78, 100],
        ['eng', 'Essays', 'Personal essay', 46, 50], ['eng', 'Reading checks', 'Checks 1–4', 36, 40],
        ['his', 'Tests', 'Unit 1', 88, 100], ['his', 'Quizzes', 'Map quiz', 23, 25],
        ['spa', 'Speaking', 'Interview', 27, 30], ['spa', 'Tests', 'Unidad 2', 81, 100],
      ].map(([classId, cat, name, score, max]) => ({ id: uid(), classId, cat, name, score, max })),
    };
    // One completed homework so the plan shows progress.
    state.tasks.push({ id: uid(), created: Date.now(), classId: 'bio', title: 'Textbook p. 112 questions', type: 'homework', due: d(1), effort: 25, priority: false, done: true, doneAt: t0, log: {}, notes: '' });
    commit();
    go('today');
    toast('Sample data loaded. Erase it any time from Classes.');
  }

  // ---------- Start ----------
  try { const v = localStorage.getItem(KEY + '.view'); if (v && VIEWS[v]) ui.view = v; } catch (e) { /* ignore */ }
  render();
  // Keep "in class now" and the date fresh if the tab stays open.
  setInterval(() => { if (!dlg.open && document.activeElement?.tagName !== 'INPUT') render(); }, 60_000);
})();
