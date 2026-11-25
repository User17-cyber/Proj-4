// Quick checks for the quick-add parser and planner: node school/tools/test.js
const S = require('../js/logic.js');
const assert = require('assert');
const today = '2026-11-10'; // a Tuesday
const classes = [
  { id: 'b', name: 'AP Biology', nick: 'bio' },
  { id: 'm', name: 'Algebra II', nick: 'math' },
  { id: 'e', name: 'English Literature', nick: '' },
  { id: 'h', name: 'US History', nick: 'hist' },
];
const cases = [
  ['bio lab report due thu', { classId: 'b', type: 'project', due: '2026-11-12', title: 'Lab report' }],
  ['math test 11/14', { classId: 'm', type: 'test', due: '2026-11-14', title: 'Test' }],
  ['read ch 4 english tomorrow', { classId: 'e', type: 'reading', due: '2026-11-11', title: 'Read ch 4' }],
  ['us history essay due nov 20 !', { classId: 'h', type: 'project', due: '2026-11-20', priority: true, title: 'Essay' }],
  ['biology quiz next fri', { classId: 'b', type: 'quiz', due: '2026-11-20' }],
  ['worksheet p. 52 math', { classId: 'm', type: 'homework', due: '2026-11-11', dateGuessed: true, title: 'Worksheet p. 52' }],
  ['hist notes in 3 days', { classId: 'h', due: '2026-11-13', title: 'Notes' }],
  ['algebra final 1/15', { classId: 'm', type: 'test', due: '2027-01-15' }],
  ['Spanish vocab tue', { classId: null, due: '2026-11-17' }],
];
let fail = 0;
for (const [input, want] of cases) {
  const got = S.parseQuick(input, classes, today);
  for (const k of Object.keys(want)) {
    if (got[k] !== want[k]) { fail++; console.log(`FAIL "${input}": ${k} = ${JSON.stringify(got[k])}, wanted ${JSON.stringify(want[k])}`); }
  }
}
// Planner: a test Friday, 180 min, seen on Tuesday -> spread Tue..Thu (span 4 would start Mon, clipped to today).
const p = S.planFor({ type: 'test', due: '2026-11-13', effort: 180 }, today);
assert.deepStrictEqual(p.map((x) => [x.day, x.min]), [['2026-11-10', 60], ['2026-11-11', 60], ['2026-11-12', 60]]);
// After logging 60 today, the rest goes to Wed and Thu.
const p2 = S.planFor({ type: 'test', due: '2026-11-13', effort: 180, log: { '2026-11-10': 60 } }, today);
assert.deepStrictEqual(p2.map((x) => [x.day, x.min, x.done]), [['2026-11-10', 60, true], ['2026-11-11', 60, false], ['2026-11-12', 60, false]]);
// Homework lands on the night before; overdue lands today.
assert.deepStrictEqual(S.planFor({ type: 'homework', due: '2026-11-14', effort: 30 }, today)[0].day, '2026-11-13');
assert.deepStrictEqual(S.planFor({ type: 'homework', due: '2026-11-08', effort: 30 }, today)[0].day, today);
// Rotation: A/B days, anchor Tue 2026-11-10 = A. Thanksgiving off.
const sch = {
  mode: 'rotation', schoolDays: [1, 2, 3, 4, 5], offDates: ['2026-11-26', '2026-11-27'], anchor: { date: '2026-11-10', index: 0 },
  days: [
    { name: 'A', periods: [{ label: 'P1', start: '08:00', end: '09:25', classId: 'b' }, { label: 'Lunch', start: '11:00', end: '11:30', classId: null }] },
    { name: 'B', periods: [{ label: 'P5', start: '08:00', end: '09:25', classId: 'h' }] },
  ],
};
const name = (d) => (S.cycleIndex(d, sch) < 0 ? '-' : sch.days[S.cycleIndex(d, sch)].name);
const got = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14', '2026-11-16', '2026-11-25', '2026-11-26', '2026-11-30'].map(name).join('');
assert.strictEqual(got, 'BABB-AB-A', `rotation ${got}`); // weekend and holidays skip, rotation carries on
assert.strictEqual(S.periodsOn('2026-11-10', sch)[0].dayName, 'A');
// Alerts: lead 5 -> due 07:55..07:59 for the 08:00 class; free periods never alert.
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('07:54'), 5).length, 0);
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('07:55'), 5)[0].period.classId, 'b');
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('07:59'), 5).length, 1);
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('08:00'), 5).length, 0);
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('10:57'), 5).length, 0);
assert.strictEqual(S.dueAlerts(sch, '2026-11-10', S.toMin('08:00'), 0).length, 1); // lead 0: at the start
// Weekly mode: days[0] is Monday.
const wk = { mode: 'weekly', days: [{ name: 'Mon', periods: [{ start: '09:00', classId: 'm' }] }, { name: 'Tue', periods: [] }] };
assert.strictEqual(S.periodsOn('2026-11-09', wk)[0].classId, 'm');
assert.strictEqual(S.periodsOn('2026-11-15', wk).length, 0);
console.log(fail ? `${fail} parser checks failed` : 'All checks passed');
process.exit(fail ? 1 : 0);
