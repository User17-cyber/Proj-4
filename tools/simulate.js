#!/usr/bin/env node
/*
 * Plays Sprinkle Town Tycoon with a simple greedy bot and prints when things
 * happen, to check the pacing after changing numbers in js/core.js.
 *
 *   node tools/simulate.js [minutes] [startingSprinkles]
 */
'use strict';
const G = require('../js/core.js');

const minutes = Number(process.argv[2]) || 60;
const sprinkles = Number(process.argv[3]) || 0;
const TAP_DELAY = 0.4; // seconds a player takes to re-tap a shop that finished

const s = G.newState(0);
s.sprinkles = sprinkles;
const idleSince = s.biz.map(() => 0);
const log = [];
const seen = {};
let t = 0;
const now = () => t * 1000;

function note(key, text) {
  if (seen[key]) return;
  seen[key] = true;
  log.push(G.fmtTime(t).padStart(8) + '  ' + text);
}

// Extra coins per second a purchase would bring in.
function shopIncome(i, owned) {
  if (owned < 1) return 0;
  const saved = s.biz[i].owned;
  s.biz[i].owned = owned;
  const v = G.revenue(s, i, now()) / G.cycleTime(s, i);
  s.biz[i].owned = saved;
  return v;
}

function options() {
  const opts = [];
  G.BUSINESSES.forEach((b, i) => {
    const owned = s.biz[i].owned;
    if (owned < 1 && !G.canOpen(s, i)) return;
    const gain = shopIncome(i, owned + 1) - shopIncome(i, owned);
    opts.push({ cost: G.costFor(i, owned, 1, s), gain: gain, act: () => G.buy(s, i, 1) });
    if (owned > 0 && !s.managers[i]) {
      opts.push({ cost: G.managerCost(s, i), gain: shopIncome(i, owned) * 0.6, act: () => G.hireManager(s, i) });
    }
    if (s.managers[i] && !s.assistants[i] && G.hasPerk(s, 'assistants')) {
      opts.push({ cost: G.assistantCost(s, i), gain: shopIncome(i, owned), act: () => G.hireAssistant(s, i) });
    }
  });
  G.UPGRADES.forEach((u) => {
    if (!G.upgradeAvailable(s, u)) return;
    const base = u.target < 0 ? G.incomePerSec(s, now(), true) : shopIncome(u.target, s.biz[u.target].owned);
    opts.push({ cost: u.cost, gain: base * (u.mult - 1), act: () => G.buyUpgrade(s, u.id) });
  });
  return opts;
}

const end = minutes * 60;
const dt = 0.05;
let nextShop = 0;
while (t < end) {
  // Tap anything idle.
  s.biz.forEach((b, i) => {
    if (b.owned > 0 && !s.managers[i] && !b.running) {
      if (t - idleSince[i] >= TAP_DELAY) G.tap(s, i);
    }
  });
  const payouts = G.tick(s, dt, now());
  t += dt;
  payouts.forEach((p) => { if (p.manual) idleSince[p.i] = t; });

  // Buy the option that pays for itself fastest, saving up for it if needed.
  if (Math.round(t / dt) % 5 === 0) {
    for (let guard = 0; guard < 200; guard++) {
      const best = options().sort((a, b) => a.cost / a.gain - b.cost / b.gain)[0];
      if (!best || best.cost > s.coins) break;
      best.act();
    }
  }

  G.BUSINESSES.forEach((b, i) => {
    if (s.biz[i].owned > 0) note('open' + i, 'opened ' + b.name);
    if (s.managers[i]) note('mgr' + i, 'hired ' + G.MANAGERS[i].name);
  });
  [1e3, 1e6, 1e9, 1e12, 1e15].forEach((c) => { if (s.runEarned >= c) note('c' + c, 'earned ' + G.fmt(c)); });
  G.checkTrophies(s).forEach((tr) => note('t' + tr.id, 'trophy: ' + tr.name));
  if (t >= nextShop) {
    nextShop += 300;
    log.push(G.fmtTime(t).padStart(8) + '  -- ' + G.fmt(s.coins) + ' coins, ' + G.fmt(G.incomePerSec(s, now(), true)) +
      '/s, upgrades ' + Object.keys(s.upgrades).length + ', sprinkles on reopening: ' + G.sprinkleGain(s));
  }
}
console.log(log.join('\n'));
console.log('\nOwned:', s.biz.map((b) => b.owned).join(' '));
