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
// Grades
const g = S.classGrade({ id: 'b', cats: [{ name: 'HW', weight: 40 }, { name: 'Tests', weight: 60 }] },
  [{ classId: 'b', cat: 'HW', score: 9, max: 10 }, { classId: 'b', cat: 'Tests', score: 80, max: 100 }]);
assert.strictEqual(Math.round(g.pct * 10) / 10, 84);
assert.strictEqual(Math.round(S.neededOnFinal(84, 90, 20)), 114);
console.log(fail ? `${fail} parser checks failed` : 'All checks passed');
process.exit(fail ? 1 : 0);
