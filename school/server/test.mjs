// Server checks: node test.mjs   (no network or API key needed)
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import webpush from 'web-push';
import { cleanSync, dueNow, localNow, allowedEndpoint, start } from './server.mjs';
import { findSchedule, cleanReport } from './finder.mjs';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

// A fake browser subscription with real keys, so we can decrypt what the server would send.
const ua = crypto.createECDH('prime256v1');
ua.generateKeys();
const auth = crypto.randomBytes(16);
const subscription = { endpoint: 'https://web.push.apple.com/QGuVxyz123', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) } };

const schedule = {
  mode: 'rotation', schoolDays: [1, 2, 3, 4, 5], offDates: ['2026-11-26'], anchor: { date: '2026-11-24', index: 0 },
  days: [
    { name: 'A', periods: [{ label: 'Block 1', start: '07:45', end: '09:10', classId: 'bio' }, { label: 'Lunch', start: '10:45', end: '11:20', classId: null }] },
    { name: 'B', periods: [{ label: 'Block 5', start: '07:45', end: '09:10', classId: 'his' }] },
  ],
};
const body = { subscription, tz: 'America/New_York', lead: 5, schedule, classes: [{ id: 'bio', name: 'AP Biology', room: '214' }, { id: 'his', name: 'US History', room: '' }] };

// ---- validation ----
assert.ok(allowedEndpoint('https://web.push.apple.com/abc'));
assert.ok(allowedEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
assert.ok(!allowedEndpoint('https://evil.example.com/abc'));
assert.ok(!allowedEndpoint('http://web.push.apple.com/abc'));
assert.ok(!allowedEndpoint('https://web.push.apple.com.evil.com/abc'));
assert.throws(() => cleanSync({ ...body, subscription: { ...subscription, endpoint: 'http://169.254.169.254/' } }), /valid push/);
assert.throws(() => cleanSync({ ...body, tz: 'Mars/Olympus' }), /time zone/);
const rec = cleanSync(body);

// ---- timing: Wed 2026-11-25 is Day B (Tue 24 = A); 07:40 New York = 12:40 UTC ----
assert.deepStrictEqual(localNow('America/New_York', new Date('2026-11-25T12:40:00Z')), { iso: '2026-11-25', min: 7 * 60 + 40 });
const records = { x: rec };
const sent = new Set();
assert.strictEqual(dueNow(records, sent, new Date('2026-11-25T12:39:00Z')).length, 0); // 07:39, too early
const due = dueNow(records, sent, new Date('2026-11-25T12:40:00Z')); // 07:40 = 5 min before
assert.strictEqual(due.length, 1);
assert.deepStrictEqual(due[0].message, { title: 'Next: US History', body: 'starts 7:45 AM · Day B', tag: 'class-07:45' });
sent.add(due[0].key);
assert.strictEqual(dueNow(records, sent, new Date('2026-11-25T12:42:00Z')).length, 0); // not twice
// Thanksgiving (off) sends nothing; Friday continues the rotation with Day A and the room.
assert.strictEqual(dueNow(records, new Set(), new Date('2026-11-26T12:40:00Z')).length, 0);
const fri = dueNow(records, new Set(), new Date('2026-11-27T12:41:00Z'));
assert.deepStrictEqual(fri[0].message, { title: 'Next: AP Biology', body: 'Room 214 · starts 7:45 AM · Day A', tag: 'class-07:45' });
// Same schedule, Los Angeles: alert follows local time, not server time.
const la = { y: { ...rec, tz: 'America/Los_Angeles' } };
assert.strictEqual(dueNow(la, new Set(), new Date('2026-11-25T12:40:00Z')).length, 0);
assert.strictEqual(dueNow(la, new Set(), new Date('2026-11-25T15:40:00Z')).length, 1);

// ---- push encryption: decrypt the request web-push would send (RFC 8291, aes128gcm) ----
const keys = webpush.generateVAPIDKeys();
const payload = JSON.stringify(due[0].message);
const req = webpush.generateRequestDetails(subscription, payload, {
  vapidDetails: { subject: 'mailto:test@example.com', publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 600,
});
assert.strictEqual(req.headers['Content-Encoding'], 'aes128gcm');
assert.match(req.headers.Authorization, /^vapid t=.+, k=/);
const bodyBuf = req.body;
const salt = bodyBuf.subarray(0, 16);
const idlen = bodyBuf[20];
const asPublic = bodyBuf.subarray(21, 21 + idlen);
const cipher = bodyBuf.subarray(21 + idlen);
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const ecdhSecret = ua.computeSecret(asPublic);
const ikm = hmac(hmac(auth, ecdhSecret), Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic, Buffer.from([1])]));
const prk = hmac(salt, ikm);
const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
const dec = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
dec.setAuthTag(cipher.subarray(cipher.length - 16));
const plain = Buffer.concat([dec.update(cipher.subarray(0, cipher.length - 16)), dec.final()]);
assert.strictEqual(plain.subarray(0, plain.lastIndexOf(2)).toString(), payload);

// ---- finder: resumes pause_turn without adding a message, then cleans the report ----
const calls = [];
const fake = {
  beta: { messages: { create: async (params) => {
    calls.push(JSON.parse(JSON.stringify(params.messages)));
    if (calls.length === 1) return { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } }] };
    return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'report_bell_schedule', input: {
      found: true, school_name: 'Lincoln High School, Portland, OR', source_url: 'https://www.pps.net/lincoln/bell', rotation: true, notes: 'Regular day.',
      days: [
        { name: 'A', periods: [{ label: 'Period 1', start: '8:30', end: '10:00' }, { label: 'Bad', start: '25:00', end: '26:00' }, { label: 'Advisory', start: '08:00', end: '08:25' }] },
        { name: 'B', periods: [{ label: 'Period 5', start: '08:30', end: '10:00' }] },
      ],
    } }] };
  } } },
};
const found = await findSchedule('Lincoln High Portland', fake);
assert.strictEqual(calls.length, 2);
assert.strictEqual(calls[1].length, 2); // user + paused assistant turn, no extra "continue" message
assert.deepStrictEqual(found.days[0].periods.map((p) => `${p.label} ${p.start}`), ['Advisory 08:00', 'Period 1 08:30']);
assert.strictEqual(found.rotation, true);
assert.strictEqual(cleanReport({ found: true, days: [], source_url: 'javascript:alert(1)' }).found, false);
assert.strictEqual(cleanReport({ found: true, days: [], source_url: 'javascript:alert(1)' }).source_url, '');

// ---- HTTP ----
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'satchel-'));
const savedKey = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const app = start({ port: 0, dataDir: dir });
await new Promise((r) => app.server.once('listening', r));
const base = `http://127.0.0.1:${app.server.address().port}`;
const health = await (await fetch(`${base}/api/health`)).json();
assert.strictEqual(health.app, 'satchel');
assert.ok(health.vapidPublicKey.length > 80);
assert.strictEqual(health.finder, false);
assert.match(await (await fetch(`${base}/`)).text(), /<title>Satchel<\/title>/);
assert.strictEqual((await fetch(`${base}/sw.js`)).status, 200);
// Raw requests, since fetch would normalize the dot segments before sending.
const rawStatus = (p) => new Promise((resolve) => http.get({ host: '127.0.0.1', port: app.server.address().port, path: p }, (r) => { r.resume(); resolve(r.statusCode); }));
for (const bad of ['/server/server.mjs', '/server/data/vapid.json', '/..%2f..%2fREADME.md', '/tools/test.js', '/server/node_modules/web-push/package.json']) {
  assert.strictEqual(await rawStatus(bad), 404, bad);
}
// Dot segments are folded by the URL parser and stay inside the app folder.
assert.match(await (await fetch(`${base}/%2e%2e/%2e%2e/README.md`)).text(), /^# Satchel/);
const post = (p, b) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
assert.strictEqual((await post('/api/sync', body)).status, 200);
assert.strictEqual(Object.keys(app.store.records).length, 1);
assert.strictEqual((await post('/api/sync', { ...body, subscription: { ...subscription, endpoint: 'https://example.com/x' } })).status, 400);
assert.strictEqual((await post('/api/find-schedule', { school: 'Lincoln High' })).status, 503);
assert.strictEqual((await post('/api/unsubscribe', { endpoint: subscription.endpoint })).status, 200);
assert.strictEqual(Object.keys(app.store.records).length, 0);
app.close();
if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
fs.rmSync(dir, { recursive: true, force: true });
console.log('All server checks passed');
process.exit(0);
