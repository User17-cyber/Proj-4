// Satchel: the rules behind the planner. No page code here, so it also runs in Node.
(function (root) {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  // ---------- Dates ----------
  // Dates are stored as "YYYY-MM-DD" strings. dayNum turns one into a whole day count
  // (UTC based, so daylight-saving changes never shift a day).
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayNum = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 864e5;
  };
  const numISO = (n) => {
    const d = new Date(n * 864e5);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  const addISO = (s, n) => numISO(dayNum(s) + n);
  const dow = (s) => new Date(dayNum(s) * 864e5).getUTCDay();

  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(s) {
    const [, m, d] = s.split('-').map(Number);
    return `${MON_SHORT[m - 1]} ${d}`;
  }

  function relDue(s, today) {
    const n = dayNum(s) - dayNum(today);
    if (n < -1) return `${-n} days late`;
    if (n === -1) return 'Yesterday';
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n < 7) return DAY_LONG[dow(s)];
    return `${DAY_SHORT[dow(s)]} ${fmtDate(s)}`;
  }

  function fmtMin(min) {
    min = Math.round(min);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  // ---------- Assignment types ----------
  // effort: default minutes of work. span: how many days before the due date the work is spread over.
  const TYPES = {
    homework: { label: 'Homework', effort: 30, span: 1 },
    reading: { label: 'Reading', effort: 30, span: 1 },
    quiz: { label: 'Quiz', effort: 60, span: 2 },
    test: { label: 'Test', effort: 180, span: 4 },
    project: { label: 'Project', effort: 240, span: 6 },
  };

  const TYPE_WORDS = [
    [/\b(tests?|exams?|midterms?|finals?)\b/i, 'test'],
    [/\b(quiz|quizzes)\b/i, 'quiz'],
    [/\b(projects?|essays?|papers?|presentations?|reports?|posters?|labs? reports?)\b/i, 'project'],
    [/\b(read|reading|chapters?|ch\.?)\b/i, 'reading'],
  ];

  // ---------- Quick add parser ----------
  const WEEKDAYS = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, weds: 3, wed: 3,
    thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
  const WD_RE = 'sunday|sun|monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat';
  const MONTH_RE = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const LEAD = '(?:(?:due|on|by|for)\\s+)?';
  const STOP = new Set(['the', 'and', 'for', 'class', 'period', 'honors', 'intro', 'introduction', 'to', 'of', 'ap', 'ib']);

  function monthDay(today, month, day, year) {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const ty = Number(today.slice(0, 4));
    let y = year ? (year < 100 ? 2000 + year : year) : ty;
    let s = `${y}-${pad(month)}-${pad(day)}`;
    // With no year given, a date long past means next year (typing "1/15" in November).
    if (!year && dayNum(s) < dayNum(today) - 60) s = `${y + 1}-${pad(month)}-${pad(day)}`;
    return s;
  }

  function findDate(text, today) {
    const rules = [
      [new RegExp(`\\b${LEAD}(today|tonight)\\b`, 'i'), () => today],
      [new RegExp(`\\b${LEAD}(tomorrow|tmrw|tmr|tmw)\\b`, 'i'), () => addISO(today, 1)],
      [/\b(?:due\s+)?in\s+(\d+)\s+(days?|weeks?)\b/i, (m) => addISO(today, Number(m[1]) * (/^w/i.test(m[2]) ? 7 : 1))],
      [new RegExp(`\\b${LEAD}next\\s+week\\b`, 'i'), () => addISO(today, 7)],
      [new RegExp(`\\b${LEAD}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b`, 'i'),
        (m) => monthDay(today, Number(m[1]), Number(m[2]), m[3] && Number(m[3]))],
      [new RegExp(`\\b${LEAD}(${MONTH_RE})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'),
        (m) => monthDay(today, MONTH_RE.split('|').indexOf(m[1].toLowerCase()) + 1, Number(m[2]))],
      [new RegExp(`\\b${LEAD}(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})[a-z]*\\b`, 'i'),
        (m) => monthDay(today, MONTH_RE.split('|').indexOf(m[2].toLowerCase()) + 1, Number(m[1]))],
      [new RegExp(`\\b${LEAD}(next\\s+|this\\s+)?(${WD_RE})\\b`, 'i'), (m) => {
        const target = WEEKDAYS[m[2].toLowerCase()];
        const cur = dow(today);
        if (m[1] && /next/i.test(m[1])) {
          // "next fri" = the Friday of next week (weeks start Monday).
          const toMonday = ((8 - cur) % 7) || 7;
          return addISO(today, toMonday + ((target + 6) % 7));
        }
        return addISO(today, ((target - cur + 7) % 7) || 7);
      }],
    ];
    for (const [re, fn] of rules) {
      const m = text.match(re);
      if (m) {
        const due = fn(m);
        if (due) return { due, rest: text.replace(m[0], ' ') };
      }
    }
    return { due: null, rest: text };
  }

  function classKeys(c) {
    const keys = [];
    if (c.nick) for (const n of c.nick.toLowerCase().split(/[\s,]+/).filter(Boolean)) keys.push({ key: n, exact: 3 });
    for (const w of c.name.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3 && !STOP.has(w)) keys.push({ key: w, exact: 2 });
    return keys;
  }

  function findClass(text, classes) {
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let best = null;
    for (const c of classes) {
      // Whole class name typed out ("us history") wins outright.
      const full = c.name.toLowerCase();
      if (full.length >= 3 && text.toLowerCase().includes(full)) {
        const score = 4;
        if (!best || score > best.score) best = { c, score, remove: new RegExp(escapeRe(c.name), 'i') };
        continue;
      }
      for (const { key, exact } of classKeys(c)) {
        for (const tok of tokens) {
          let score = 0;
          if (tok === key) score = exact;
          else if (tok.length >= 3 && key.startsWith(tok)) score = 1 + tok.length / 100; // "bio" -> biology
          if (score && (!best || score > best.score)) best = { c, score, remove: new RegExp(`\\b${escapeRe(tok)}\\b`, 'i') };
        }
      }
    }
    if (!best) return { cls: null, rest: text };
    return { cls: best.c, rest: text.replace(best.remove, ' ') };
  }

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function parseQuick(input, classes, today) {
    let text = ` ${input.trim()} `;
    let priority = false;
    if (/(^|\s)(!+|important|urgent)(?=\s)/i.test(text)) {
      priority = true;
      text = text.replace(/(^|\s)(!+|important|urgent)(?=\s)/gi, ' ');
    }
    const d = findDate(text, today);
    text = d.rest;
    const k = findClass(text, classes);
    text = k.rest;
    let type = 'homework';
    for (const [re, t] of TYPE_WORDS) if (re.test(input)) { type = t; break; }

    let title = text.replace(/\s+/g, ' ').trim()
      .replace(/^(?:due|for|on|by|-|:|–)\s*/i, '')
      .replace(/\s*(?:due|for|on|by|-|:|–)$/i, '')
      .trim();
    if (!title) title = TYPES[type].label;
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      title,
      classId: k.cls ? k.cls.id : null,
      type,
      due: d.due || addISO(today, 1),
      dateGuessed: !d.due,
      priority,
      effort: TYPES[type].effort,
    };
  }

  // ---------- Planning ----------
  // Turns an assignment into the days you should work on it: [{day: "YYYY-MM-DD", min, done}].
  // One-night work (homework, reading) lands on the night before it's due. Tests, quizzes and
  // projects are spread across the days before, and the work left is re-spread every day,
  // so a skipped session never silently disappears.
  function planFor(t, today) {
    if (t.done) return [];
    const now = dayNum(today), due = dayNum(t.due);
    const span = (TYPES[t.type] || TYPES.homework).span;
    const effort = Number(t.effort) || 0;
    if (span <= 1) return [{ day: numISO(Math.max(now, due - 1)), min: effort, done: false }];

    const log = t.log || {};
    const logged = Object.values(log).reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, effort - logged);
    const out = [];
    if (log[today]) out.push({ day: today, min: log[today], done: true });
    if (remaining <= 0) return out;

    const start = Math.max(now + (log[today] ? 1 : 0), due - span);
    const end = due - 1;
    if (end < start) {
      if (due <= now && !log[today]) out.push({ day: today, min: remaining, done: false });
      return out;
    }
    const days = end - start + 1;
    const per = Math.max(10, Math.ceil(remaining / days / 5) * 5);
    for (let d = start; d <= end; d++) out.push({ day: numISO(d), min: per, done: false });
    return out;
  }

  // Minutes of planned work per day for every unfinished assignment.
  function loadByDay(tasks, today) {
    const load = {};
    for (const t of tasks) for (const p of planFor(t, today)) {
      if (!load[p.day]) load[p.day] = { min: 0, items: [] };
      load[p.day].min += p.min;
      load[p.day].items.push(t);
    }
    return load;
  }

  // ---------- Grades ----------
  function classGrade(c, grades) {
    const mine = grades.filter((g) => g.classId === c.id);
    const cats = c.cats && c.cats.length ? c.cats : [{ name: 'All', weight: 100 }];
    const named = new Set(cats.map((x) => x.name));
    let wsum = 0, total = 0;
    const per = cats.map((cat, i) => {
      // Entries whose category no longer exists count toward the first category.
      const items = c.cats && c.cats.length
        ? mine.filter((g) => g.cat === cat.name || (i === 0 && !named.has(g.cat)))
        : mine;
      const s = items.reduce((a, g) => a + Number(g.score), 0);
      const m = items.reduce((a, g) => a + Number(g.max), 0);
      const pct = m > 0 ? (s / m) * 100 : null;
      if (pct !== null) { wsum += Number(cat.weight); total += pct * Number(cat.weight); }
      return { name: cat.name, weight: Number(cat.weight), pct, n: items.length };
    });
    return { pct: wsum ? total / wsum : null, per, count: mine.length };
  }

  function letter(p) {
    if (p == null) return '–';
    const scale = [[93, 'A'], [90, 'A−'], [87, 'B+'], [83, 'B'], [80, 'B−'], [77, 'C+'], [73, 'C'], [70, 'C−'], [67, 'D+'], [63, 'D'], [60, 'D−']];
    for (const [min, l] of scale) if (p >= min) return l;
    return 'F';
  }

  // Score needed on a final worth `weight` % of the course to finish at `target` %.
  function neededOnFinal(current, target, weight) {
    const w = weight / 100;
    if (w <= 0 || w >= 1 || current == null) return null;
    return (target - current * (1 - w)) / w;
  }

  function parseCats(text) {
    return text.split('\n').map((line) => {
      const m = line.trim().match(/^(.*?)[\s:,-]+(\d+(?:\.\d+)?)\s*%?$/);
      return m ? { name: m[1].trim(), weight: Number(m[2]) } : null;
    }).filter((c) => c && c.name);
  }

  const api = { toISO, dayNum, numISO, addISO, dow, fmtDate, relDue, fmtMin, DAY_SHORT, DAY_LONG, MON_SHORT,
    TYPES, parseQuick, planFor, loadByDay, classGrade, letter, neededOnFinal, parseCats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Satchel = api;
})(this);
