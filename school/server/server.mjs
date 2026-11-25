// Satchel server: serves the app, keeps push subscriptions with each student's bell schedule,
// sends "next class" alerts on time in the student's own time zone, and looks up school schedules.
//
//   cd school/server && npm install && npm start
//
// Environment: PORT, VAPID_SUBJECT (mailto: or https: contact for push services), ANTHROPIC_API_KEY
// (schedule lookup), SATCHEL_DATA_DIR, TRUST_PROXY=1 behind a reverse proxy. See school/README.md.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import webpush from 'web-push';
import { findSchedule, finderAvailable } from './finder.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const S = createRequire(import.meta.url)('../js/logic.js');

// ---------- Validation ----------
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;
const PUSH_HOSTS = ['push.apple.com', 'fcm.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com', 'web.push.apple.com'];
const str = (v, n) => String(v ?? '').slice(0, n);

export function validTimeZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
}

// Only send to real browser push services, so the server can't be pointed at arbitrary URLs.
export function allowedEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch (e) { return false; }
}

export function cleanSync(body) {
  const sub = body && body.subscription;
  if (!sub || !allowedEndpoint(sub.endpoint) || !sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') {
    throw new Error('Not a valid push subscription');
  }
  if (!validTimeZone(body.tz)) throw new Error('Unknown time zone');
  const sch = body.schedule || {};
  const days = (Array.isArray(sch.days) ? sch.days : []).slice(0, 10).map((d) => ({
    name: str(d.name, 20),
    periods: (Array.isArray(d.periods) ? d.periods : []).slice(0, 20)
      .filter((p) => HM.test(p.start))
      .map((p) => ({ label: str(p.label, 40), start: p.start, end: HM.test(p.end) ? p.end : '', classId: p.classId ? str(p.classId, 40) : null })),
  }));
  const anchor = sch.anchor && ISO.test(sch.anchor.date) && Number.isInteger(sch.anchor.index)
    ? { date: sch.anchor.date, index: Math.max(0, Math.min(sch.anchor.index, 9)) } : null;
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: str(sub.keys.p256dh, 200), auth: str(sub.keys.auth, 100) },
    tz: body.tz,
    lead: Math.max(0, Math.min(60, Math.round(Number(body.lead) || 0))),
    schedule: {
      mode: sch.mode === 'rotation' ? 'rotation' : 'weekly',
      days,
      anchor,
      schoolDays: (Array.isArray(sch.schoolDays) ? sch.schoolDays : [1, 2, 3, 4, 5]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      offDates: (Array.isArray(sch.offDates) ? sch.offDates : []).filter((d) => ISO.test(d)).slice(-400),
    },
    classes: (Array.isArray(body.classes) ? body.classes : []).slice(0, 60)
      .map((c) => ({ id: str(c.id, 40), name: str(c.name, 80), room: str(c.room, 30) })),
  };
}

export const subId = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 24);

// ---------- Alerts ----------
export function localNow(tz, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

const fmt12 = (hm) => {
  let [h, m] = hm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};
const dayTag = (name) => (/^(day|mon|tue|wed|thu|fri)/i.test(name) ? name : `Day ${name}`);

export function alertMessage(rec, period) {
  const c = rec.classes.find((x) => x.id === period.classId) || { name: period.label || 'Class', room: '' };
  const bits = [c.room && `Room ${c.room}`, `starts ${fmt12(period.start)}`];
  if (rec.schedule.mode === 'rotation') bits.push(dayTag(period.dayName));
  return { title: `Next: ${c.name}`, body: bits.filter(Boolean).join(' · '), tag: `class-${period.start}` };
}

// One pass over every subscriber: returns the alerts due now that haven't been sent.
export function dueNow(records, sent, date = new Date()) {
  const out = [];
  for (const [id, rec] of Object.entries(records)) {
    const { iso, min } = localNow(rec.tz, date);
    for (const a of S.dueAlerts(rec.schedule, iso, min, rec.lead)) {
      const key = `${id}|${a.key}`;
      if (sent.has(key)) continue;
      out.push({ id, key, message: alertMessage(rec, a.period) });
    }
  }
  return out;
}

// ---------- Storage ----------
function makeStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'subscriptions.json');
  let records = {};
  try { records = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* first run */ }
  let pending = null;
  const flush = () => {
    pending = null;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(records));
    fs.renameSync(tmp, file);
  };
  return {
    records,
    save() { if (!pending) pending = setTimeout(flush, 200); },
    flush,
  };
}

function vapidKeys(dir) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const file = path.join(dir, 'vapid.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* make new keys */ }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(file, JSON.stringify(keys), { mode: 0o600 });
  return keys;
}

// ---------- HTTP ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readJSON(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('Bad JSON')); } });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, `.${rel}`);
  const inside = file.startsWith(ROOT + path.sep);
  const hidden = path.relative(ROOT, file).split(path.sep).some((part) => part.startsWith('.') || part === 'server' || part === 'tools' || part === 'node_modules');
  if (!inside || hidden || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    // Always revalidate so an update reaches Home Screen installs.
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(file).pipe(res);
}

export function start({ port = Number(process.env.PORT) || 8787, dataDir = process.env.SATCHEL_DATA_DIR || path.join(here, 'data') } = {}) {
  const store = makeStore(dataDir);
  const keys = vapidKeys(dataDir);
  const subject = process.env.VAPID_SUBJECT || 'mailto:satchel-admin@example.com';
  if (!process.env.VAPID_SUBJECT) console.warn('Set VAPID_SUBJECT to a mailto: address or https: URL you control; push services may reject the placeholder.');
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);

  const sent = new Map(); // alert key -> time sent, so each class alerts once
  async function push(id, message) {
    const rec = store.records[id];
    if (!rec) return false;
    try {
      await webpush.sendNotification({ endpoint: rec.endpoint, keys: rec.keys }, JSON.stringify(message), { TTL: 600, urgency: 'high' });
      return true;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) { delete store.records[id]; store.save(); } // unsubscribed
      else console.error(`push to ${id} failed:`, err.statusCode || '', err.body || err.message);
      return false;
    }
  }
  async function tick() {
    const due = dueNow(store.records, sent);
    for (const a of due) { sent.set(a.key, Date.now()); push(a.id, a.message); }
    const old = Date.now() - 2 * 864e5;
    for (const [k, t] of sent) if (t < old) sent.delete(k);
  }
  const timer = setInterval(tick, 20_000);
  tick();

  // Schedule lookups cost money: a few per visitor per hour, and repeat searches come from cache.
  const lookups = new Map();
  const cache = new Map();
  const ipOf = (req) => (process.env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
      serveStatic(req, res);
      return;
    }
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') {
        sendJSON(res, 200, { app: 'satchel', vapidPublicKey: keys.publicKey, finder: finderAvailable() });
        return;
      }
      if (req.method !== 'POST') { sendJSON(res, 405, { error: 'Method not allowed' }); return; }
      const body = await readJSON(req);
      switch (url.pathname) {
        case '/api/sync': {
          const rec = cleanSync(body);
          const id = subId(rec.endpoint);
          store.records[id] = { ...rec, updated: new Date().toISOString() };
          store.save();
          sendJSON(res, 200, { ok: true });
          return;
        }
        case '/api/unsubscribe': {
          delete store.records[subId(String(body.endpoint || ''))];
          store.save();
          sendJSON(res, 200, { ok: true });
          return;
        }
        case '/api/test': {
          const id = subId(String(body.endpoint || ''));
          if (!store.records[id]) { sendJSON(res, 404, { error: 'This device isn’t signed up for alerts' }); return; }
          const rec = store.records[id];
          const { iso, min } = localNow(rec.tz);
          const next = S.periodsOn(iso, rec.schedule).find((p) => p.classId && S.toMin(p.start) >= min);
          const message = next ? alertMessage(rec, next) : { title: 'Satchel alerts work', body: 'You’ll get a note like this before each class.', tag: 'test' };
          const ok = await push(id, { ...message, tag: 'test' });
          sendJSON(res, ok ? 200 : 502, ok ? { ok } : { error: 'The push service didn’t accept it' });
          return;
        }
        case '/api/find-schedule': {
          if (!finderAvailable()) { sendJSON(res, 503, { error: 'Schedule lookup is not set up on this server' }); return; }
          const school = String(body.school || '').trim().slice(0, 150);
          if (school.length < 3) { sendJSON(res, 400, { error: 'Type the school’s name' }); return; }
          const key = school.toLowerCase().replace(/\s+/g, ' ');
          const hit = cache.get(key);
          if (hit && Date.now() - hit.at < 864e5) { sendJSON(res, 200, { result: hit.result }); return; }
          const ip = ipOf(req);
          const recent = (lookups.get(ip) || []).filter((t) => Date.now() - t < 3600e3);
          if (recent.length >= 6) { sendJSON(res, 429, { error: 'Too many lookups. Try again in an hour.' }); return; }
          lookups.set(ip, [...recent, Date.now()]);
          const result = await findSchedule(school);
          cache.set(key, { at: Date.now(), result });
          sendJSON(res, 200, { result });
          return;
        }
        default:
          sendJSON(res, 404, { error: 'Not found' });
      }
    } catch (err) {
      const status = /valid|Unknown time zone|Bad JSON|too large/.test(err.message) ? 400 : 500;
      if (status === 500) console.error(err);
      sendJSON(res, status, { error: status === 400 ? err.message : 'Something went wrong on the server' });
    }
  });
  server.listen(port, () => console.log(`Satchel running on http://localhost:${server.address().port}`));
  return { server, store, close() { clearInterval(timer); server.close(); store.flush(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
