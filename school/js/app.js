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
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let state = load();
  const ui = { view: 'today', weekOffset: 0, filter: 'all', showDone: false, schedDay: 0, finder: { status: 'idle' } };

  function blankSchedule() {
    return { mode: 'weekly', days: WEEKDAYS.map((name) => ({ name, periods: [] })), anchor: null, schoolDays: [1, 2, 3, 4, 5], offDates: [], school: null };
  }
  function blank() { return { classes: [], tasks: [], schedule: blankSchedule() }; }
  // Older saves kept one time on each class (days + start/end). Turn those into a weekly schedule.
  function scheduleFromClasses(classes) {
    const sch = blankSchedule();
    sch.days.forEach((day, i) => {
      day.periods = classes.filter((c) => (c.days || []).includes(i + 1) && c.start)
        .map((c) => ({ label: '', start: c.start, end: c.end || '', classId: c.id }));
    });
    return sch;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const classes = s.classes || [];
        return { classes, tasks: s.tasks || [], schedule: s.schedule || scheduleFromClasses(classes) };
      }
    } catch (e) { /* storage blocked or bad data: start fresh */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function commit() { save(); render(); Notify.sync(); }

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
  const pad2 = (n) => String(n).padStart(2, '0');
  const dayTag = (name) => (/^(day|mon|tue|wed|thu|fri|sat|sun)/i.test(name) ? name : `Day ${name}`);
  const rotation = () => state.schedule.mode === 'rotation';

  // Periods with a class in them on a date.
  function classPeriods(iso) {
    return S.periodsOn(iso, state.schedule).filter((p) => cls(p.classId));
  }

  function nowClass() {
    const d = new Date();
    const t0 = today();
    const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const todays = classPeriods(t0);
    const current = todays.find((p) => p.end && p.start <= hm && hm < p.end);
    if (current) {
      const pct = ((S.toMin(hm) - S.toMin(current.start)) / (S.toMin(current.end) - S.toMin(current.start))) * 100;
      return { kind: 'now', p: current, pct, next: todays.find((p) => p !== current && p.start >= current.end) };
    }
    const next = todays.find((p) => p.start > hm);
    if (next) return { kind: 'next', p: next };
    for (let i = 1; i <= 14; i++) {
      const dd = S.addISO(t0, i);
      const first = classPeriods(dd)[0];
      if (first) return { kind: 'later', p: first, day: i === 1 ? 'Tomorrow' : S.DAY_LONG[S.dow(dd)] };
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
    const c = cls(n.p.classId);
    const tag = rotation() ? `${dayTag(n.p.dayName)} · ` : '';
    const where = [c.room && `Room ${c.room}`, c.teacher].filter(Boolean).map(esc).join(' · ');
    if (n.kind === 'now') {
      const nx = n.next && cls(n.next.classId);
      return `<div class="now" style="--c:${c.color}">
        <div class="label">${esc(tag)}In class now · until ${fmtTime(n.p.end)}</div>
        <div class="name">${esc(c.name)}</div>
        ${where ? `<div class="where">${where}</div>` : ''}
        <div class="bar"><i style="width:${n.pct.toFixed(1)}%"></i></div>
        ${nx ? `<div class="where" style="margin-top:6px">Next: ${esc(nx.name)} at ${fmtTime(n.next.start)}${nx.room ? `, room ${esc(nx.room)}` : ''}</div>` : ''}
      </div>`;
    }
    const label = n.kind === 'next' ? `${tag}Up next · ${fmtTime(n.p.start)}` : `${n.day} · ${tag}first class at ${fmtTime(n.p.start)}`;
    return `<div class="now ${n.kind === 'later' ? 'idle' : ''}" style="--c:${c.color}">
      <div class="label">${esc(label)}</div>
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
          <li><b>Add your classes</b>, with a nickname you'd actually type (<code>bio</code>, <code>math</code>).</li>
          <li><b>Set up your bell schedule</b> in the Schedule tab, including A/B or Day 1–6 rotations. Satchel can look up your school's schedule for you and alert your phone before each class.</li>
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
      const periods = classPeriods(d);
      const off = (state.schedule.offDates || []).includes(d);
      const ci = S.cycleIndex(d, state.schedule);
      const due = state.tasks.filter((t) => t.due === d).sort((a, b) => (a.done - b.done) || sortTasks(a, b));
      const m = n >= now ? ((load[d] || {}).min || 0) : 0;
      return `<div class="wday ${n === now ? 'today' : ''} ${n < now ? 'past' : ''} ${dw === 0 || dw === 6 ? 'weekend' : ''}">
        <h3>${S.DAY_SHORT[dw]}${rotation() && ci >= 0 ? ` <span class="rot">${esc(dayTag(state.schedule.days[ci].name))}</span>` : ''} <small>${S.fmtDate(d)}</small></h3>
        ${off ? '<div class="load-label">No school</div>' : ''}
        ${n >= now ? `<div class="load" title="${S.fmtMin(m)} of planned work"><i class="${m >= HEAVY ? 'heavy' : ''}" style="width:${Math.min(100, (m / 240) * 100)}%"></i></div>
          <div class="load-label">${m ? `${S.fmtMin(m)} of work` : 'Free'}</div>` : ''}
        ${due.length ? `<div class="wk-sub">Due</div>` : ''}
        ${due.map((t) => `<div class="wdue ${t.done ? 'done' : ''} ${t.type === 'test' || t.type === 'project' ? 'big' : ''}" style="--c:${colorOf(t.classId)}" data-act="edit-task" data-id="${t.id}">
            ${t.priority ? '! ' : ''}${esc(t.title)}<small>${esc([(cls(t.classId) || {}).name, t.type !== 'homework' ? S.TYPES[t.type].label : ''].filter(Boolean).join(' · '))}</small></div>`).join('')}
        ${periods.length ? `<div class="wk-sub">Classes</div>` : ''}
        ${periods.map((p) => { const c = cls(p.classId); return `<div class="wclass" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${fmtTime(p.start)}</span></div>`; }).join('')}
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

  // ---------- Schedule ----------
  // The first school day from today on: what "today is Day A" refers to.
  function refSchoolDay() {
    let d = today();
    for (let i = 0; i < 21 && !S.isSchoolDay(d, state.schedule); i++) d = S.addISO(d, 1);
    return d;
  }

  function renderSchedule() {
    const sch = state.schedule;
    const rot = sch.mode === 'rotation';
    ui.schedDay = Math.max(0, Math.min(ui.schedDay, sch.days.length - 1));
    const day = sch.days[ui.schedDay];
    // Keep periods in time order; empty times go last.
    day.periods.sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));

    const ref = refSchoolDay();
    const refIdx = S.cycleIndex(ref, sch);
    const refLabel = ref === today() ? 'Today is' : `${S.DAY_LONG[S.dow(ref)]} (${S.fmtDate(ref)}) is`;
    const todayIdx = S.cycleIndex(today(), sch);
    const status = todayIdx < 0
      ? 'No school today.'
      : `Today is ${esc(rot ? dayTag(sch.days[todayIdx].name) : sch.days[todayIdx].name)}: ${classPeriods(today()).length} class${classPeriods(today()).length === 1 ? '' : 'es'}.`;

    const classOpts = (sel) => `<option value="">Free / no class</option>${state.classes.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;
    const rows = day.periods.map((p, i) => `<div class="prow" data-i="${i}" style="--c:${colorOf(p.classId)}">
        <input class="input" data-f="label" value="${esc(p.label)}" placeholder="Period ${i + 1}" aria-label="Period name">
        <input class="input" type="time" data-f="start" value="${esc(p.start)}" aria-label="Starts">
        <input class="input" type="time" data-f="end" value="${esc(p.end)}" aria-label="Ends">
        <select class="input" data-f="classId" aria-label="Class">${classOpts(p.classId)}</select>
        <button class="icon-btn" data-act="del-period" data-id="${i}" aria-label="Remove this period">${ICON.x}</button>
      </div>`).join('');

    const tabs = sch.days.map((d, i) => `<button class="${i === ui.schedDay ? 'on' : ''}" data-act="sched-day" data-id="${i}">
        ${esc(rot ? dayTag(d.name) : d.name.slice(0, 3))}${i === todayIdx ? ' <span class="today-dot" title="Today"></span>' : ''}</button>`).join('');
    const others = sch.days.map((d, i) => (i === ui.schedDay ? '' : `<option value="${i}">${esc(rot ? dayTag(d.name) : d.name)}</option>`)).join('');

    const rotCard = rot ? `<section class="card card-pad stack-sm">
        <h2>Rotation</h2>
        <div class="row2">
          <label class="field"><span>Days in the cycle</span>
            <select data-sched="count">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${n === sch.days.length ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field"><span>${esc(refLabel)}</span>
            <select data-sched="anchor">${sch.days.map((d, i) => `<option value="${i}" ${i === refIdx ? 'selected' : ''}>${esc(dayTag(d.name))}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>Days off</span>
          <small>Holidays and snow days. The rotation picks up where it left off.</small>
          <div class="offs">${(sch.offDates || []).filter((x) => S.dayNum(x) >= S.dayNum(today()) - 7).sort().map((x) => `<span class="chip">${S.DAY_SHORT[S.dow(x)]} ${S.fmtDate(x)}
              <button class="chip-x" data-act="del-off" data-id="${x}" aria-label="Remove ${S.fmtDate(x)}">×</button></span>`).join('') || '<span class="muted-text">None yet</span>'}</div>
          <div class="inline"><input class="input" type="date" data-off-input aria-label="Day off"><button class="btn small" type="button" data-sched-add-off>Add day off</button></div>
        </div>
      </section>` : '';

    return `<div class="view-head"><div><h1>Schedule</h1><div class="sub">${status}</div></div>
        <div class="seg" role="group" aria-label="Schedule type">
          <button class="${rot ? '' : 'on'}" data-act="sched-mode" data-id="weekly">Same every week</button>
          <button class="${rot ? 'on' : ''}" data-act="sched-mode" data-id="rotation">Rotating days</button>
        </div></div>
      <div class="grid-today">
        <div class="stack">
          ${finderCard()}
          <section class="card">
            <div class="daytabs">${tabs}</div>
            <div class="card-pad stack-sm">
              ${rot ? `<label class="field inline-field"><span>Name of this day</span><input class="input" data-sched="dayname" value="${esc(day.name)}" style="max-width:140px"></label>` : ''}
              ${day.periods.length ? `<div class="prow head"><span>Period</span><span>Starts</span><span>Ends</span><span>Class</span><span></span></div>${rows}` : `<div class="empty" style="padding:14px 0">No periods on ${esc(rot ? dayTag(day.name) : day.name)} yet.</div>`}
              <div class="inline">
                <button class="btn small" data-act="add-period">Add period</button>
                ${others ? `<span class="muted-text">or</span><select class="input small-select" data-copy-from aria-label="Copy from">${others}</select><button class="btn small" data-act="copy-day">Copy periods here</button>` : ''}
              </div>
              ${state.classes.length ? '' : '<p class="howto" style="margin:0">Add your classes in the Classes tab, then pick one for each period here.</p>'}
            </div>
          </section>
        </div>
        <div class="stack">
          ${notifyCard()}
          ${rotCard}
        </div>
      </div>`;
  }

  function finderCard() {
    const f = ui.finder;
    let body = '';
    if (Notify.server === false || (Notify.server && !Notify.finder)) {
      body = `<p class="howto">${Notify.server === false
        ? 'Looking up schedules needs the Satchel server, and this copy of the page isn\'t running on one (see <code>school/README.md</code>). You can still type your times in below.'
        : 'The Satchel server is running without an Anthropic API key, so it can\'t search the web. Set <code>ANTHROPIC_API_KEY</code> and restart it.'}</p>`;
    } else if (f.status === 'loading') {
      body = `<div class="finder-wait"><span class="spinner"></span>Searching the web for ${esc(f.query)}'s bell schedule. This can take a minute.</div>`;
    } else if (f.status === 'done') {
      const r = f.result;
      body = `<div class="found">
        <div><b>${esc(r.school_name)}</b>${r.source_url ? ` · <a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</div>
        <div class="muted-text">${r.rotation ? `Rotating schedule, ${r.days.length} days` : 'Same schedule each week'}${r.notes ? ` · ${esc(r.notes)}` : ''}</div>
        <div class="found-days">${r.days.map((d) => `<div><b>${esc(r.rotation ? dayTag(d.name) : d.name)}</b>
          ${d.periods.map((p) => `<span>${esc(p.label)} ${fmtTime(p.start)}–${fmtTime(p.end)}</span>`).join('')}</div>`).join('')}</div>
        <div class="inline"><button class="btn primary small" data-act="finder-use">Use this schedule</button><button class="btn small ghost" data-act="finder-clear">Dismiss</button></div>
        <small class="muted-text">Found by searching the web, so check it against your school's site.</small>
      </div>`;
    } else if (f.status === 'error' || f.status === 'notfound') {
      body = `<p class="${f.status === 'error' ? 'err-text' : 'howto'}">${esc(f.message)}</p>`;
    }
    const disabled = Notify.server === false || (Notify.server && !Notify.finder) || f.status === 'loading';
    return `<section class="card card-pad stack-sm">
      <h2>Find my school's bell schedule</h2>
      <form class="inline" data-form="finder">
        <input class="input" name="school" value="${esc(f.query || '')}" placeholder="School and town, e.g. Lincoln High School, Portland OR" aria-label="High school name and town" ${disabled ? 'disabled' : ''} required>
        <button class="btn" ${disabled ? 'disabled' : ''}>Find</button>
      </form>
      ${body}
    </section>`;
  }

  function notifyCard() {
    const n = Notify;
    const lead = n.cfg.lead;
    const leadSel = `<label class="inline">Alert me <select class="input small-select" data-lead aria-label="Minutes before class">
        ${[0, 2, 5, 10, 15].map((m) => `<option value="${m}" ${m === lead ? 'selected' : ''}>${m ? `${m} min before` : 'when it starts'}</option>`).join('')}</select></label>`;
    const calBtn = '<button class="btn small" data-act="calendar">Add classes to Calendar</button>';
    let body;
    if (n.server === null) body = '<p class="howto">Checking…</p>';
    else if (n.server === false) {
      body = `<p class="howto">Push alerts come from the Satchel server, and this copy isn't running on one. Until it is, you can put your classes in your iPhone's Calendar with an alert before each one.</p>${leadSel}<div class="inline">${calBtn}</div>`;
    } else if (n.isIOS && !n.standalone()) {
      body = `<ol class="steps">
          <li>Tap the <b>Share</b> button in Safari.</li>
          <li>Choose <b>Add to Home Screen</b>.</li>
          <li>Open Satchel from your Home Screen and come back to this tab to turn alerts on.</li>
        </ol><p class="muted-text">iPhones only allow notifications from websites that are on the Home Screen (iOS 16.4 or later).</p>`;
    } else if (!n.supported()) {
      body = `<p class="howto">This browser can't receive notifications. Use the Calendar option instead.</p>${leadSel}<div class="inline">${calBtn}</div>`;
    } else if (Notification.permission === 'denied') {
      body = '<p class="err-text">Notifications are blocked for Satchel. Turn them on in Settings → Notifications → Satchel, then reopen the app.</p>';
    } else if (!n.cfg.enabled) {
      body = `<p class="howto">Get a notification like <b>“Next: AP Biology · Room 214”</b> before each class, following your rotation.</p>${leadSel}
        <div class="inline"><button class="btn primary" data-act="notify-on">Turn on class alerts</button></div>`;
    } else {
      body = `<p class="ok-text">Alerts are on for this device.</p>${leadSel}
        <div class="inline"><button class="btn small" data-act="notify-test">Send a test</button><button class="btn small ghost" data-act="notify-off">Turn off</button></div>`;
    }
    return `<section class="card card-pad stack-sm">
      <h2>Class alerts</h2>
      ${body}
      ${body.includes('data-act="calendar"') || n.server === null ? '' : `<details class="more"><summary>Or use Calendar instead</summary><p class="muted-text">Adds the next 10 weeks of classes to your Calendar, each with an alert. Re-download after changing your schedule.</p>${calBtn}</details>`}
    </section>`;
  }

  // ---------- Push notifications ----------
  // The page registers a service worker and a push subscription; the Satchel server keeps a copy of the
  // schedule (class names and rooms only) and sends the alerts, so they arrive even with the app closed.
  const Notify = (() => {
    const NKEY = KEY + '.notify';
    let cfg = { enabled: false, lead: 5 };
    try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(NKEY) || '{}') }; } catch (e) { /* ignore */ }
    const saveCfg = () => { try { localStorage.setItem(NKEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
    let server = null, finder = false, vapidKey = null, reg = null, timer = null;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const rerender = () => { if (ui.view === 'schedule') render(); };

    function b64ToBytes(b64) {
      const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
      return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
    }
    async function post(path, body) {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let j = {};
      try { j = await r.json(); } catch (e) { /* not JSON */ }
      if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
      return j;
    }

    async function init() {
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        try { reg = await navigator.serviceWorker.register('sw.js'); } catch (e) { /* not served over https */ }
      }
      try {
        const r = await fetch('api/health', { cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        server = !!(j && j.app === 'satchel');
        if (server) { finder = !!j.finder; vapidKey = j.vapidPublicKey; }
      } catch (e) { server = false; }
      rerender();
      if (cfg.enabled && server) sync(true);
    }

    function payload(sub) {
      const { mode, days, anchor, schoolDays, offDates } = state.schedule;
      return {
        subscription: sub,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lead: cfg.lead,
        schedule: { mode, days: days.map((d) => ({ name: d.name, periods: d.periods.map(({ label, start, end, classId }) => ({ label, start, end, classId })) })), anchor, schoolDays, offDates },
        classes: state.classes.map((c) => ({ id: c.id, name: c.name, room: c.room || '' })),
      };
    }
    async function currentSub() { return reg ? reg.pushManager.getSubscription() : null; }
    async function send() {
      try {
        const sub = await currentSub();
        if (!sub) { cfg.enabled = false; saveCfg(); rerender(); return; }
        await post('api/sync', payload(sub.toJSON()));
      } catch (e) { /* offline: the next change retries */ }
    }
    function sync(now) {
      if (!cfg.enabled || !server) return;
      clearTimeout(timer);
      timer = setTimeout(send, now ? 0 : 1000);
    }

    async function enable() {
      try {
        // Ask straight from the tap: iOS only shows the permission prompt for a user gesture.
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { rerender(); toast('Notifications were not allowed'); return; }
        reg = reg || await navigator.serviceWorker.register('sw.js');
        await navigator.serviceWorker.ready;
        let sub = await currentSub();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey) });
        await post('api/sync', payload(sub.toJSON()));
        cfg.enabled = true;
        saveCfg();
        rerender();
        toast('Class alerts are on');
      } catch (e) {
        toast(`Couldn't turn on alerts: ${e.message}`);
      }
    }
    async function disable() {
      cfg.enabled = false;
      saveCfg();
      try {
        const sub = await currentSub();
        if (sub) { await post('api/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); }
      } catch (e) { /* already gone */ }
      rerender();
      toast('Class alerts are off');
    }
    async function test() {
      try {
        const sub = await currentSub();
        if (!sub) throw new Error('not subscribed');
        await post('api/test', { endpoint: sub.endpoint });
        toast('Test sent. It should arrive in a few seconds.');
      } catch (e) { toast(`Couldn't send a test: ${e.message}`); }
    }
    function setLead(m) { cfg.lead = m; saveCfg(); sync(true); }

    return {
      init, sync, enable, disable, test, setLead, supported, standalone, isIOS,
      get cfg() { return cfg; }, get server() { return server; }, get finder() { return finder; },
    };
  })();

  // ---------- Calendar export ----------
  // Works without the server: iPhone Calendar shows its own alert before each class.
  function downloadCalendar() {
    const lead = Notify.cfg.lead;
    const icsEsc = (x) => String(x).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Satchel//School planner//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Classes'];
    let n = 0;
    for (let i = 0; i < 70; i++) {
      const d = S.addISO(today(), i);
      const ymd = d.replace(/-/g, '');
      for (const p of classPeriods(d)) {
        const c = cls(p.classId);
        const end = p.end && p.end > p.start ? p.end : S.fromMin(S.toMin(p.start) + 50);
        const hm = (x) => x.replace(':', '');
        lines.push('BEGIN:VEVENT', `UID:${ymd}-${hm(p.start)}-${c.id}@satchel`, `DTSTAMP:${stamp}`,
          `DTSTART:${ymd}T${hm(p.start)}00`, `DTEND:${ymd}T${hm(end)}00`, `SUMMARY:${icsEsc(c.name)}`);
        if (c.room) lines.push(`LOCATION:${icsEsc(`Room ${c.room}`)}`);
        if (rotation()) lines.push(`DESCRIPTION:${icsEsc([dayTag(p.dayName), p.label].filter(Boolean).join(', '))}`);
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`Next: ${c.name}${c.room ? ` · Room ${c.room}` : ''}`)}`,
          `TRIGGER:-PT${lead}M`, 'END:VALARM', 'END:VEVENT');
        n++;
      }
    }
    lines.push('END:VCALENDAR');
    if (!n) { toast('Put some classes on your schedule first'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
    a.download = 'satchel-classes.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`${n} classes ready to add to your Calendar`);
  }

  // ---------- Classes ----------
  function renderClasses() {
    const cards = state.classes.map((c) => {
      const open = state.tasks.filter((t) => t.classId === c.id && !t.done).length;
      const meets = state.schedule.days.filter((day) => day.periods.some((p) => p.classId === c.id))
        .map((day) => (rotation() ? dayTag(day.name) : day.name.slice(0, 3))).join(', ');
      return `<div class="card ccard" style="--c:${c.color}" data-act="edit-class" data-id="${c.id}" tabindex="0" role="button">
        <b>${esc(c.name)}</b>
        <div class="meta">${meets ? `<span>${esc(meets)}</span>` : '<span>Not on your schedule yet</span>'}${c.room ? `<span>Room ${esc(c.room)}</span>` : ''}${c.teacher ? `<span>${esc(c.teacher)}</span>` : ''}</div>
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
  const VIEWS = { today: renderToday, tasks: renderTasks, week: renderWeek, schedule: renderSchedule, classes: renderClasses };
  let lastView = null;
  function render() {
    // Keep open <details> open across re-renders of the same view.
    const openDetails = [...document.querySelectorAll('#main details')].map((d) => d.open);
    $('#main').innerHTML = VIEWS[ui.view]();
    if (lastView === ui.view && openDetails.length) {
      document.querySelectorAll('#main details').forEach((d, i) => { if (openDetails[i] !== undefined) d.open = openDetails[i]; });
    }
    lastView = ui.view;
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
    c = c || { name: '', nick: '', color: COLORS.find((x) => !used.has(x)) || COLORS[0], teacher: '', room: '' };
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
        <label class="field"><span>Room</span><input name="room" value="${esc(c.room)}"><small>Shown in class alerts</small></label>
      </div>
      <p class="howto" style="margin:0">When the class meets is set in the <b>Schedule</b> tab.</p>
      <div class="dlg-actions">
        ${isNew ? '' : '<button class="btn danger" value="delete" formnovalidate>Delete class</button>'}
        <span class="spacer"></span>
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
        <button class="btn primary" value="save">${isNew ? 'Add class' : 'Save'}</button>
      </div>`, (fd, action) => {
      if (action === 'delete') {
        const n = state.tasks.filter((t) => t.classId === c.id).length;
        if (!confirm(`Delete ${c.name}? Its ${n} assignment${n === 1 ? '' : 's'} will be deleted too, and its periods on your schedule will be left free.`)) return;
        state.classes = state.classes.filter((x) => x !== c);
        state.tasks = state.tasks.filter((t) => t.classId !== c.id);
        for (const day of state.schedule.days) for (const p of day.periods) if (p.classId === c.id) p.classId = null;
        commit();
        return;
      }
      const data = {
        name: fd.get('name').trim() || 'Class', nick: fd.get('nick').trim(), color: fd.get('color') || COLORS[0],
        teacher: fd.get('teacher').trim(), room: fd.get('room').trim(),
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
      case 'sched-day': ui.schedDay = Number(id); render(); break;
      case 'sched-mode': setMode(id); break;
      case 'add-period': addPeriod(); break;
      case 'del-period': state.schedule.days[ui.schedDay].periods.splice(Number(id), 1); commit(); break;
      case 'copy-day': copyDay(); break;
      case 'del-off': state.schedule.offDates = state.schedule.offDates.filter((x) => x !== id); commit(); break;
      case 'finder-use': applyFound(); break;
      case 'finder-clear': ui.finder = { status: 'idle' }; render(); break;
      case 'notify-on': Notify.enable(); break;
      case 'notify-off': Notify.disable(); break;
      case 'notify-test': Notify.test(); break;
      case 'calendar': downloadCalendar(); break;
      case 'sample': loadSample(); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'reset':
        if (confirm('Erase all classes, assignments and your schedule from this browser? Download a backup first if you might want them back.')) {
          state = blank(); commit(); go('today');
        }
        break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.ccard')) e.target.click();
    if (e.key === 'Enter' && e.target.matches('[data-off-input]')) { e.preventDefault(); addOffDate(); }
    if (e.key === '/' && !e.target.closest('input, textarea, select') && !dlg.open) { e.preventDefault(); quickInput.focus(); }
    if (e.key === 'Escape' && document.activeElement === quickInput) { quickInput.value = ''; quickInput.blur(); updatePreview(); }
  });

  // ---------- Schedule editing ----------
  const LETTERS = 'ABCDEFGHIJ';
  const nextDayName = (days) => (days.every((d) => /^\d+$/.test(d.name)) ? String(days.length + 1) : LETTERS[days.length] || String(days.length + 1));
  const timesOnly = (periods) => periods.map(({ label, start, end }) => ({ label, start, end, classId: null }));

  function setMode(mode) {
    const sch = state.schedule;
    if (sch.mode === mode) return;
    if (mode === 'rotation') {
      // Start from an A/B cycle using Monday's and Tuesday's periods.
      sch.days = [{ name: 'A', periods: sch.days[0].periods }, { name: 'B', periods: (sch.days[1] || sch.days[0]).periods }];
      sch.anchor = { date: refSchoolDay(), index: 0 };
    } else {
      const src = sch.days;
      sch.days = WEEKDAYS.map((name, i) => ({ name, periods: i < src.length ? src[i].periods : timesOnly(src[0].periods) }));
      sch.anchor = null;
    }
    sch.mode = mode;
    ui.schedDay = 0;
    commit();
  }

  function setDayCount(n) {
    const sch = state.schedule;
    if (n < sch.days.length) {
      const lost = sch.days.slice(n).filter((d) => d.periods.length).map((d) => dayTag(d.name));
      if (lost.length && !confirm(`Remove ${lost.join(', ')} and their periods?`)) { render(); return; }
      sch.days = sch.days.slice(0, n);
    }
    while (sch.days.length < n) sch.days.push({ name: nextDayName(sch.days), periods: timesOnly(sch.days[0].periods) });
    if (sch.anchor) sch.anchor.index = Math.min(sch.anchor.index, n - 1);
    commit();
  }

  function addPeriod() {
    const periods = state.schedule.days[ui.schedDay].periods;
    const last = periods.filter((p) => p.end || p.start).slice(-1)[0];
    // Guess the next slot: 5 minutes after the last one ends, as long as the last one.
    let start = '', end = '';
    if (last && last.start && last.end) {
      const len = S.toMin(last.end) - S.toMin(last.start);
      start = S.fromMin(Math.min(S.toMin(last.end) + 5, 23 * 60));
      end = S.fromMin(Math.min(S.toMin(start) + len, 23 * 60 + 59));
    }
    periods.push({ label: '', start, end, classId: null });
    commit();
    const rows = document.querySelectorAll('.prow:not(.head)');
    const row = [...rows].find((r) => !r.querySelector('[data-f=start]').value) || rows[rows.length - 1];
    if (row) row.querySelector('[data-f=label]').focus();
  }

  function copyDay() {
    const from = Number(document.querySelector('[data-copy-from]').value);
    const sch = state.schedule;
    const to = sch.days[ui.schedDay];
    if (to.periods.length && !confirm(`Replace the periods on ${dayTag(to.name)}?`)) return;
    // Times always; classes too in a weekly schedule, where most days look alike.
    to.periods = rotation() ? timesOnly(sch.days[from].periods) : sch.days[from].periods.map((p) => ({ ...p }));
    commit();
  }

  function addOffDate() {
    const inp = document.querySelector('[data-off-input]');
    if (!inp || !inp.value) return;
    const sch = state.schedule;
    if (!sch.offDates.includes(inp.value)) sch.offDates.push(inp.value);
    commit();
  }

  // Edits to period rows and schedule settings save as you go, without re-rendering mid-typing.
  document.addEventListener('change', (e) => {
    const el = e.target;
    const row = el.closest('.prow');
    if (row && el.dataset.f) {
      const p = state.schedule.days[ui.schedDay].periods[Number(row.dataset.i)];
      p[el.dataset.f] = el.dataset.f === 'classId' ? (el.value || null) : el.value;
      save();
      Notify.sync();
      if (el.dataset.f === 'classId') row.style.setProperty('--c', colorOf(p.classId));
      if (el.dataset.f === 'start') render(); // re-sort by time
      return;
    }
    const sch = state.schedule;
    switch (el.dataset.sched) {
      case 'count': setDayCount(Number(el.value)); return;
      case 'anchor': sch.anchor = { date: refSchoolDay(), index: Number(el.value) }; commit(); return;
      case 'dayname': sch.days[ui.schedDay].name = el.value.trim() || nextDayName(sch.days.slice(0, ui.schedDay)); commit(); return;
      default: break;
    }
    if (el.matches('[data-lead]')) { Notify.setLead(Number(el.value)); toast(`Alerts will come ${Number(el.value) ? `${el.value} minutes before` : 'as'} each class${Number(el.value) ? '' : ' starts'}`); }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-sched-add-off]')) addOffDate();
  });

  // ---------- School schedule finder ----------
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-form="finder"]');
    if (!f) return;
    e.preventDefault();
    const query = new FormData(f).get('school').trim();
    if (!query) return;
    ui.finder = { status: 'loading', query };
    render();
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 180_000);
      const r = await fetch('api/find-schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ school: query }), signal: ctl.signal,
      });
      clearTimeout(timer);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
      ui.finder = j.result.found && j.result.days.length
        ? { status: 'done', query, result: j.result }
        : { status: 'notfound', query, message: j.result.notes || `Couldn't find a published bell schedule for ${query}. Try adding the town and state, or type the times in below.` };
    } catch (err) {
      ui.finder = { status: 'error', query, message: err.name === 'AbortError' ? 'That took too long. Try again in a moment.' : `Search failed: ${err.message}` };
    }
    if (ui.view === 'schedule') render();
  });

  function applyFound() {
    const r = ui.finder.result;
    const sch = state.schedule;
    const hasAny = sch.days.some((d) => d.periods.length);
    if (hasAny && !confirm('Replace your current period times with this schedule? Classes stay matched to periods with the same name.')) return;
    let days = r.days.map((d) => ({ name: d.name, periods: d.periods.map((p) => ({ label: p.label, start: p.start, end: p.end, classId: null })) }));
    const rot = r.rotation && days.length > 1;
    if (!rot) {
      // One "every day" schedule, or one per weekday.
      days = WEEKDAYS.map((name, i) => {
        const match = days.find((d) => d.name.toLowerCase().startsWith(name.slice(0, 3).toLowerCase())) || days[Math.min(i, days.length - 1)];
        return { name, periods: match.periods.map((p) => ({ ...p })) };
      });
    }
    // Keep class choices where a period with the same name existed before.
    days.forEach((d, i) => {
      const old = sch.days[i];
      if (!old) return;
      for (const p of d.periods) {
        const same = old.periods.find((o) => o.classId && o.label && o.label.toLowerCase() === p.label.toLowerCase());
        if (same) p.classId = same.classId;
      }
    });
    sch.mode = rot ? 'rotation' : 'weekly';
    sch.days = days;
    sch.anchor = rot ? { date: refSchoolDay(), index: 0 } : null;
    sch.school = { name: r.school_name, source: r.source_url };
    ui.finder = { status: 'idle', query: ui.finder.query };
    ui.schedDay = 0;
    commit();
    toast(rot ? 'Schedule added. Set which day today is, then pick your class for each period.' : 'Schedule added. Now pick your class for each period.');
  }

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
        state = { classes: s.classes, tasks: s.tasks, schedule: s.schedule || scheduleFromClasses(s.classes) };
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
    const C = (id, name, nick, color, teacher, room) => ({ id, name, nick, color, teacher, room });
    const P = (label, start, end, classId) => ({ label, start, end, classId });
    // An A/B block schedule with today's school day as Day A.
    let ref = t0;
    while (!S.isSchoolDay(ref, { schoolDays: [1, 2, 3, 4, 5] })) ref = S.addISO(ref, 1);
    state = {
      classes: [
        C('bio', 'AP Biology', 'bio', '#0ca678', 'Ms. Okafor', '214'),
        C('alg', 'Algebra II', 'math, alg', '#3b5bdb', 'Mr. Reyes', '108'),
        C('eng', 'English Literature', 'eng', '#ae3ec9', 'Dr. Lindqvist', '301'),
        C('his', 'US History', 'hist, history', '#e8590c', 'Mrs. Patel', '122'),
        C('spa', 'Spanish III', 'span, spanish', '#d6336c', 'Sr. Molina', '017'),
      ],
      schedule: {
        mode: 'rotation', schoolDays: [1, 2, 3, 4, 5], offDates: [], anchor: { date: ref, index: 0 }, school: null,
        days: [
          { name: 'A', periods: [P('Block 1', '07:45', '09:10', 'bio'), P('Block 2', '09:20', '10:45', 'alg'), P('Lunch', '10:45', '11:20', null), P('Block 3', '11:25', '12:50', 'eng'), P('Block 4', '13:00', '14:25', 'spa')] },
          { name: 'B', periods: [P('Block 5', '07:45', '09:10', 'his'), P('Block 6', '09:20', '10:45', 'spa'), P('Lunch', '10:45', '11:20', null), P('Block 7', '11:25', '12:50', 'bio'), P('Block 8', '13:00', '14:25', null)] },
        ],
      },
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
  Notify.init();
  // Keep "in class now" and the date fresh if the tab stays open.
  setInterval(() => { if (!dlg.open && ui.view !== 'schedule' && !document.activeElement?.closest('input, select, textarea')) render(); }, 60_000);
})();
