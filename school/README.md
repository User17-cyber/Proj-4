# Satchel

A school planner that tells you **what to work on tonight**, not just what's due, and taps you on the shoulder before every class.

## The idea

- **One-line capture.** Type `bio lab report due thu`, `math test 11/14` or `read ch 4 english tomorrow !` into the box at the top. Satchel picks out the class (by nickname or the start of its name), the kind of work, the due date and a priority flag, and shows what it understood before you press Enter.
- **Tonight's plan.** Homework and reading land on the night before they're due. Quizzes, tests and projects are spread over the days before (2, 4 and 6 days), and each day you tick off a study session. Skip one and the time left is re-spread over the days remaining.
- **Crunch warnings.** A 14-day workload chart, and a heads-up when a day ahead has more than about 2½ hours planned.
- **Bell schedule, including block rotations.** The Schedule tab holds your periods: the same every week, or a rotating cycle (A/B days, Day 1–6, any length up to 10). Each cycle day has its own periods with start and end times and the class in each. Tell it which day today is; days off (holidays, snow days) don't move the rotation forward. Today and Week show "In class now / Up next" and which cycle day each date is.
- **Find my school's schedule.** Type a high school's name and town; the server searches the web with Claude, finds the published bell schedule, and fills in the periods. You then pick your class for each period.
- **Class alerts on your iPhone.** "Next: AP Biology · Room 214 · starts 9:20 AM · Day B", 0–15 minutes before each class, following your rotation, even with the app closed.

Press `/` anywhere to jump to the quick-add box. Try **Load sample data** on the first screen (it includes an A/B block schedule).

## Running it

Two ways:

1. **Just the page.** Open `school/index.html` or host the folder anywhere static (GitHub Pages works). Planning, the schedule and everything else work, saved in the browser. Without the server there are no push alerts or school lookup, but **Add classes to Calendar** downloads an `.ics` file: open it on the iPhone and Calendar shows an alert before each class for the next 10 weeks.
2. **With the Satchel server** (needed for push alerts and the school lookup):

   ```sh
   cd school/server
   npm install
   VAPID_SUBJECT=mailto:you@yourdomain.com ANTHROPIC_API_KEY=sk-ant-... npm start
   ```

   It serves the app on http://localhost:8787 and sends the alerts. It needs Node 20 or later.

| Variable | What it does |
| --- | --- |
| `PORT` | Port to listen on (default 8787) |
| `VAPID_SUBJECT` | A `mailto:` address or `https:` URL you control. Apple's push service requires a real one |
| `ANTHROPIC_API_KEY` | Turns on "Find my school's bell schedule". Each lookup is a Claude request with web search (a few cents); results are cached for a day and each visitor gets 6 lookups an hour |
| `SATCHEL_DATA_DIR` | Where subscriptions and the push keys are stored (default `school/server/data`) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional fixed push keys. Otherwise they're generated on first run and kept in the data folder. Keep that folder: new keys mean everyone has to turn alerts on again |
| `TRUST_PROXY=1` | Behind a reverse proxy, rate-limit by `X-Forwarded-For` |

### Getting alerts on an iPhone

Apple only delivers web notifications to sites that are **on the Home Screen** (iOS 16.4 or later) and **served over HTTPS**. So:

1. Run the server somewhere reachable over HTTPS: a small cloud host (Render, Railway, Fly.io, a VPS) or a computer at home behind a tunnel such as Cloudflare Tunnel. It has to stay running, because it is what sends the alerts.
2. On the iPhone, open the site in Safari, tap **Share → Add to Home Screen**.
3. Open Satchel from the Home Screen, go to **Schedule → Class alerts**, tap **Turn on class alerts** and allow notifications. **Send a test** checks that it works.

The server keeps only what it needs for alerts: the push address for the device, its time zone, the bell schedule, and class names and rooms. Assignments never leave the phone.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page shell: header with quick add, tabs, dialog |
| `css/style.css` | All styling, light and dark |
| `js/logic.js` | Quick-add parser, study planner, bell-schedule rotation and alert timing. No page code; the server uses it too |
| `js/app.js` | Views, schedule editor, push sign-up, calendar export, saving, sample data |
| `sw.js`, `manifest.webmanifest`, `icons/` | What makes it installable on the Home Screen and able to show notifications |
| `server/server.mjs` | Static files, push subscriptions, the alert clock, the API |
| `server/finder.mjs` | School bell-schedule lookup with Claude and web search |
| `tools/test.js` | Checks for the parser, planner and rotation: `node school/tools/test.js` |
| `server/test.mjs` | Server checks, including decrypting a real push payload: `cd school/server && npm test` |
