# Satchel

A school planner that tells you **what to work on tonight**, not just what's due.

Open `school/index.html` in a browser. There is no build step, nothing to install, and nothing is uploaded: everything is saved in the browser (with a backup file you can download and restore).

## The idea

Most planners are a list of due dates, and you still have to work out what to do tonight. Satchel does that part:

- **One-line capture.** Type `bio lab report due thu`, `math test 11/14` or `read ch 4 english tomorrow !` into the box at the top. Satchel picks out the class (by nickname or the start of its name), the kind of work, the due date and a priority flag, and shows what it understood before you press Enter.
- **Tonight's plan.** Homework and reading land on the night before they're due. Quizzes, tests and projects are spread over the days before (2, 4 and 6 days), and each day you tick off a study session. Skip one and the time left is re-spread over the days remaining.
- **Crunch warnings.** A 14-day workload chart, and a heads-up when a day ahead has more than about 2½ hours planned, so you can start early.
- **Week view.** Classes, what's due and how much work is planned on each day. On weekends it shows the school week ahead.
- **Grades.** Weighted categories from your syllabus, a running percentage and letter for each class, an unweighted GPA, and a "what do I need on the final?" calculator.
- **In class now / up next**, with the room, from each class's schedule.

Press `/` anywhere to jump to the quick-add box. Try **Load sample data** on the first screen to see it filled in.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page shell: header with quick add, tabs, dialog |
| `css/style.css` | All styling, light and dark |
| `js/logic.js` | Quick-add parser, study planner, grade math. No page code, so it runs in Node |
| `js/app.js` | Views, dialogs, saving, backup, sample data |
| `tools/test.js` | Checks for the parser and planner: `node school/tools/test.js` |
