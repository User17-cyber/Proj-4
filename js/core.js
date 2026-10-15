/*
 * Sprinkle Town Tycoon — game rules, numbers and save data.
 * Nothing in here touches the page, so the economy can be simulated
 * or tested outside the browser (see tools/simulate.js).
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Shops and factories, in the order they open.
  // cost: price of the first one, rate: price growth per purchase,
  // time: seconds per batch, rev: coins per batch for each one owned.
  // kind 'factory' ships its goods by truck instead of serving customers;
  // night puts the scene under a starry sky.
  // New businesses go at the end: saves store owned counts by position.
  // ---------------------------------------------------------------------------
  const BUSINESSES = [
    { id: 'lemon',    name: 'Lemonade Stand', cost: 4,      rate: 1.07, time: 1,   rev: 1,      tile: '#FFF0A6', bar: '#FFD23F' },
    { id: 'icecream', name: 'Ice Cream Cart', cost: 50,     rate: 1.15, time: 3,   rev: 45,     tile: '#FFD6EC', bar: '#FF8FC7' },
    { id: 'donut',    name: 'Donut Shop',     cost: 600,    rate: 1.14, time: 6,   rev: 420,    tile: '#FFE3C7', bar: '#FF9F43' },
    { id: 'pizza',    name: 'Pizza Parlor',   cost: 7200,   rate: 1.13, time: 12,  rev: 3600,   tile: '#FFDAD3', bar: '#FF6B6B' },
    { id: 'toys',     name: 'Toy Store',      cost: 9e4,    rate: 1.12, time: 24,  rev: 4.2e4,  tile: '#E4DBFF', bar: '#8C6CFF' },
    { id: 'candy',    name: 'Candy Factory',  cost: 1.1e6,  rate: 1.11, time: 48,  rev: 5.2e5,  tile: '#FFDDF1', bar: '#FF5FA2', kind: 'factory' },
    { id: 'park',     name: 'Bouncy Park',    cost: 1.35e7, rate: 1.10, time: 96,  rev: 6.4e6,  tile: '#CFF3FF', bar: '#36B9F0' },
    { id: 'studio',   name: 'Cartoon Studio', cost: 1.65e8, rate: 1.09, time: 192, rev: 7.8e7,  tile: '#F6E0FF', bar: '#C77DFF' },
    { id: 'rocket',   name: 'Rocket Diner',   cost: 2e9,    rate: 1.08, time: 384, rev: 9.5e8,  tile: '#DCE8FF', bar: '#5B8CFF' },
    { id: 'moon',     name: 'Moon Mall',      cost: 2.5e10, rate: 1.07, time: 768, rev: 1.2e10, tile: '#3B3570', bar: '#FFC93C', night: true },
    { id: 'crayon',   name: 'Crayon Factory',    cost: 3e11,   rate: 1.07, time: 1152, rev: 1.1e11, tile: '#FFF2CC', bar: '#FF8A3D', kind: 'factory' },
    { id: 'sneaker',  name: 'Sneaker Factory',   cost: 3.6e12, rate: 1.07, time: 1728, rev: 1e12,   tile: '#DDF7E8', bar: '#2ED3A0', kind: 'factory' },
    { id: 'choco',    name: 'Chocolate Factory', cost: 4.3e13, rate: 1.07, time: 2592, rev: 9e12,   tile: '#F5E3D5', bar: '#A0643C', kind: 'factory' },
    { id: 'robot',    name: 'Robot Factory',     cost: 5.2e14, rate: 1.07, time: 3888, rev: 8.1e13, tile: '#DDE8F4', bar: '#5B8CFF', kind: 'factory' },
    { id: 'rainbow',  name: 'Rainbow Factory',   cost: 6.2e15, rate: 1.07, time: 5832, rev: 7.3e14, tile: '#FFEAF4', bar: '#FF5FA2', kind: 'factory' },
    { id: 'star',     name: 'Star Factory',      cost: 7.5e16, rate: 1.07, time: 8748, rev: 6.6e15, tile: '#2E2A5A', bar: '#FFC93C', kind: 'factory', night: true },
  ];

  // Owning this many of a shop makes it twice as fast, each time.
  const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];

  // One manager per shop. A manager keeps the shop running without taps.
  const MANAGERS = [
    { name: 'Lemony Lou',     animal: 'cat',     color: '#FFB347', cost: 1000 },
    { name: 'Penny Penguin',  animal: 'penguin', color: '#3C4A78', cost: 1.5e4 },
    { name: 'Bernie Bear',    animal: 'bear',    color: '#C68A5B', cost: 1e5 },
    { name: 'Pepperoni Pip',  animal: 'pig',     color: '#FFB3C8', cost: 5e5 },
    { name: 'Bea Bunny',      animal: 'bunny',   color: '#F4F0FF', cost: 1.2e6 },
    { name: 'Fizz the Fox',   animal: 'fox',     color: '#FF8A3D', cost: 1e7 },
    { name: 'Freddie Frog',   animal: 'frog',    color: '#6BD86B', cost: 1.1e8 },
    { name: 'Paz the Panda',  animal: 'panda',   color: '#FFFFFF', cost: 5.5e8 },
    { name: 'Major Mouse',    animal: 'mouse',   color: '#BFC4D6', cost: 1e10 },
    { name: 'Cosmo Pup',      animal: 'dog',     color: '#E8B97A', cost: 1e11 },
    { name: 'Ollie Owl',      animal: 'owl',      color: '#B07A4F', cost: 1.2e12 },
    { name: 'Leo the Lion',   animal: 'lion',     color: '#FFC857', cost: 1.4e13 },
    { name: 'Kiki Koala',     animal: 'koala',    color: '#A9B1C2', cost: 1.7e14 },
    { name: 'Ellie Elephant', animal: 'elephant', color: '#9DB4D9', cost: 2.1e15 },
    { name: 'Rocco Raccoon',  animal: 'raccoon',  color: '#A3A3B5', cost: 2.5e16 },
    { name: 'Shelly Sheep',   animal: 'sheep',    color: '#F3DCC2', cost: 3e17 },
  ];

  // ---------------------------------------------------------------------------
  // Upgrades: each one triples a shop's profit (or every shop's, for town-wide).
  // ---------------------------------------------------------------------------
  const UPGRADE_NAMES = {
    lemon:    ['Extra Ice Cubes', 'Pink Lemonade', 'Bendy Straws', 'Lemon Tree Orchard'],
    icecream: ['Rainbow Sprinkles', 'Waffle Cones', 'Triple Scoops', 'Jingle Bell Truck'],
    donut:    ['Glaze Waterfall', 'Jelly Filling', 'Donut Holes', 'Giant Donut Sign'],
    pizza:    ['Extra Cheese', 'Stuffed Crust', 'Wood-Fired Oven', 'Pizza Drones'],
    toys:     ['Wind-Up Robots', 'Bouncy Balls', 'Teddy Bear Parade', 'Toy Train Delivery'],
    candy:    ['Gumball Machines', 'Cotton Candy Clouds', 'Chocolate River', 'Lollipop Forest'],
    park:     ['Bigger Bounces', 'Water Slides', 'Loop-de-Loop Coaster', 'Fireworks Show'],
    studio:   ['Squeaky Sound Effects', 'Talking Animals', 'Laugh Track', 'Blockbuster Sequel'],
    rocket:   ['Zero-G Milkshakes', 'Asteroid Fries', 'Booster Burgers', 'Warp Drive-Thru'],
    moon:     ['Moon Bounce Floors', 'Cheese Food Court', 'Crater Fountains', 'Galaxy Escalators'],
    crayon:   ['Sharper Points', 'Glitter Crayons', 'Jumbo Boxes', 'Rainbow Swirl Wax'],
    sneaker:  ['Light-Up Soles', 'Velcro Straps', 'Bouncy Springs', 'Rocket Boots'],
    choco:    ['Caramel Centers', 'Extra Nutty', 'Golden Wrappers', 'Fudge Fountain'],
    robot:    ['Shiny Bolts', 'Dancing Robots', 'Robot Helpers', 'Mega Mech Line'],
    rainbow:  ['Brighter Colors', 'Double Rainbows', 'Pot of Gold', 'Rainbow Pipeline'],
    star:     ['Twinkle Polish', 'Wishing Stars', 'Shooting Star Cannon', 'Galaxy Assembly'],
  };
  const UPGRADE_TIER_COST = [400, 4e5, 4e9, 4e14]; // times the shop's first price

  const TOWN_UPGRADES = [
    { name: 'Town Parade',          cost: 2.5e7 },
    { name: 'Sprinkle Festival',    cost: 2.5e10 },
    { name: 'Hot Air Balloon Ads',  cost: 2.5e13 },
    { name: 'Rainbow Bridge',       cost: 2.5e16 },
    { name: "Mayor's Golden Key",   cost: 2.5e19 },
    { name: 'Fireworks Every Night', cost: 2.5e22 },
    { name: 'Robot Marching Band',  cost: 2.5e25 },
    { name: 'Galaxy Carnival',      cost: 2.5e28 },
  ];

  const UPGRADES = [];
  BUSINESSES.forEach(function (b, i) {
    UPGRADE_NAMES[b.id].forEach(function (name, t) {
      UPGRADES.push({ id: b.id + '-' + t, name: name, target: i, mult: 3, cost: b.cost * UPGRADE_TIER_COST[t] });
    });
  });
  TOWN_UPGRADES.forEach(function (u, t) {
    UPGRADES.push({ id: 'town-' + t, name: u.name, target: -1, mult: 3, cost: u.cost });
  });
  UPGRADES.sort(function (a, b) { return a.cost - b.cost; });
  const UPGRADE_BY_ID = {};
  UPGRADES.forEach(function (u) { UPGRADE_BY_ID[u.id] = u; });

  // ---------------------------------------------------------------------------
  // Golden sprinkles (the reset currency) and other bonuses
  // ---------------------------------------------------------------------------
  const SPRINKLE_BONUS = 0.02;   // +2% profit per sprinkle
  const TROPHY_BONUS = 0.01;     // +1% profit per trophy
  const SPRINKLE_SCALE = 10;     // sprinkles = SCALE * sqrt(lifetime coins / BASE)
  const SPRINKLE_BASE = 1e11;
  const OFFLINE_CAP = 8 * 3600;  // seconds of away-time that managers get paid for

  const TROPHIES = [
    { id: 'firstSale',   name: 'First Sale',     desc: 'Earn your very first coin',            test: function (s) { return s.lifetimeEarned > 0; } },
    { id: 'lemon25',     name: 'Lemon Lord',     desc: 'Own 25 Lemonade Stands',               test: function (s) { return s.biz[0].owned >= 25; } },
    { id: 'boss',        name: 'The Boss',       desc: 'Hire your first manager',              test: function (s) { return s.managers.some(Boolean); } },
    { id: 'tapper',      name: 'Busy Fingers',   desc: 'Tap your shops 100 times',             test: function (s) { return s.stats.taps >= 100; } },
    { id: 'shops5',      name: 'Main Street',    desc: 'Open 5 different shops',               test: function (s) { return openCount(s) >= 5; } },
    { id: 'balloon1',    name: 'Pop!',           desc: 'Pop a lucky balloon',                  test: function (s) { return s.stats.balloons >= 1; } },
    { id: 'hundred',     name: 'Hundred Club',   desc: 'Own 100 of any shop',                  test: function (s) { return maxOwned(s) >= 100; } },
    { id: 'million',     name: 'Millionaire',    desc: 'Earn 1M coins in one run',             test: function (s) { return s.runEarned >= 1e6; } },
    { id: 'upgrades10',  name: 'Upgrade Fan',    desc: 'Buy 10 upgrades',                      test: function (s) { return Object.keys(s.upgrades).length >= 10; } },
    { id: 'billion',     name: 'Billionaire',    desc: 'Earn 1B coins in one run',             test: function (s) { return s.runEarned >= 1e9; } },
    { id: 'staff',       name: 'Full Staff',     desc: 'Hire every manager',                   test: function (s) { return s.managers.every(Boolean); } },
    { id: 'shops10',     name: 'Town Complete',  desc: 'Open every shop and factory',          test: function (s) { return openCount(s) >= BUSINESSES.length; } },
    { id: 'reopen',      name: 'Fresh Start',    desc: 'Hold a Grand Reopening',               test: function (s) { return s.stats.reopenings >= 1; } },
    { id: 'balloon25',   name: 'Balloon Pro',    desc: 'Pop 25 lucky balloons',                test: function (s) { return s.stats.balloons >= 25; } },
    { id: 'mega',        name: 'Mega Chain',     desc: 'Own 500 of any shop',                  test: function (s) { return maxOwned(s) >= 500; } },
    { id: 'trillion',    name: 'Trillionaire',   desc: 'Earn 1T coins in one run',             test: function (s) { return s.runEarned >= 1e12; } },
    { id: 'sprinkles100', name: 'Sprinkle Hoard', desc: 'Collect 100 golden sprinkles',        test: function (s) { return s.sprinkles >= 100; } },
    { id: 'galaxy',      name: 'Coin Galaxy',    desc: 'Earn 1Qa coins in one run',            test: function (s) { return s.runEarned >= 1e15; } },
    { id: 'factories4',  name: 'Smokestack City', desc: 'Open 4 factories',                    test: function (s) { return factoryCount(s) >= 4; } },
    { id: 'starmaker',   name: 'Star Maker',     desc: 'Open the Star Factory',                test: function (s) { return s.biz[BUSINESSES.length - 1].owned > 0; } },
  ];

  function openCount(s) { return s.biz.filter(function (b) { return b.owned > 0; }).length; }
  function factoryCount(s) { return s.biz.filter(function (b, i) { return b.owned > 0 && BUSINESSES[i].kind === 'factory'; }).length; }
  function maxOwned(s) { return s.biz.reduce(function (m, b) { return Math.max(m, b.owned); }, 0); }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  function newState(now) {
    return {
      v: 1,
      coins: 0,
      runEarned: 0,
      lifetimeEarned: 0,
      sprinkles: 0,
      biz: BUSINESSES.map(function (b, i) { return { owned: i === 0 ? 1 : 0, progress: 0, running: false }; }),
      managers: BUSINESSES.map(function () { return false; }),
      upgrades: {},
      trophies: {},
      hints: {},
      boost: { mult: 1, until: 0 },
      stats: { taps: 0, balloons: 0, reopenings: 0, playTime: 0, bestRun: 0 },
      settings: { sound: true, floaters: true },
      buyMode: '1',
      lastSeen: now || Date.now(),
    };
  }

  function earn(s, amount) {
    s.coins += amount;
    s.runEarned += amount;
    s.lifetimeEarned += amount;
  }

  // ---------------------------------------------------------------------------
  // Prices
  // ---------------------------------------------------------------------------
  function costFor(i, owned, n) {
    const b = BUSINESSES[i];
    return b.cost * Math.pow(b.rate, owned) * (Math.pow(b.rate, n) - 1) / (b.rate - 1);
  }

  function maxAffordable(s, i) {
    const b = BUSINESSES[i];
    const owned = s.biz[i].owned;
    const first = b.cost * Math.pow(b.rate, owned);
    if (s.coins < first) return 0;
    let n = Math.floor(Math.log(s.coins * (b.rate - 1) / first + 1) / Math.log(b.rate));
    while (n > 0 && costFor(i, owned, n) > s.coins) n--;
    return n;
  }

  // How many the buy button is offering right now, given the x1/x10/x100/Max switch.
  function buyAmount(s, i) {
    if (s.buyMode === 'max') return Math.max(1, maxAffordable(s, i));
    return Number(s.buyMode) || 1;
  }

  function buy(s, i, n) {
    const cost = costFor(i, s.biz[i].owned, n);
    if (n < 1 || cost > s.coins) return false;
    s.coins -= cost;
    s.biz[i].owned += n;
    return true;
  }

  function hireManager(s, i) {
    const m = MANAGERS[i];
    if (s.managers[i] || s.biz[i].owned < 1 || s.coins < m.cost) return false;
    s.coins -= m.cost;
    s.managers[i] = true;
    s.biz[i].running = true;
    return true;
  }

  function upgradeAvailable(s, u) {
    return !s.upgrades[u.id] && (u.target < 0 || s.biz[u.target].owned > 0);
  }

  function buyUpgrade(s, id) {
    const u = UPGRADE_BY_ID[id];
    if (!u || !upgradeAvailable(s, u) || s.coins < u.cost) return false;
    s.coins -= u.cost;
    s.upgrades[id] = true;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Speed and profit
  // ---------------------------------------------------------------------------
  function milestonesReached(owned) {
    let n = 0;
    while (n < MILESTONES.length && owned >= MILESTONES[n]) n++;
    return n;
  }

  function nextMilestone(owned) {
    for (let k = 0; k < MILESTONES.length; k++) if (owned < MILESTONES[k]) return MILESTONES[k];
    return null;
  }

  function prevMilestone(owned) {
    let prev = 0;
    for (let k = 0; k < MILESTONES.length; k++) if (owned >= MILESTONES[k]) prev = MILESTONES[k];
    return prev;
  }

  function cycleTime(s, i) {
    return BUSINESSES[i].time / Math.pow(2, milestonesReached(s.biz[i].owned));
  }

  function trophyCount(s) { return Object.keys(s.trophies).length; }

  function boostMult(s, now) {
    return now < s.boost.until ? s.boost.mult : 1;
  }

  // Everything except the shop's own upgrades.
  function globalMult(s, now) {
    let m = (1 + SPRINKLE_BONUS * s.sprinkles) * (1 + TROPHY_BONUS * trophyCount(s));
    for (let t = 0; t < TOWN_UPGRADES.length; t++) if (s.upgrades['town-' + t]) m *= 3;
    return m * boostMult(s, now);
  }

  function shopMult(s, i) {
    let m = 1;
    const id = BUSINESSES[i].id;
    for (let t = 0; t < UPGRADE_TIER_COST.length; t++) if (s.upgrades[id + '-' + t]) m *= 3;
    return m;
  }

  function revenue(s, i, now) {
    return BUSINESSES[i].rev * s.biz[i].owned * shopMult(s, i) * globalMult(s, now);
  }

  // Coins per second. By default only counts shops that run on their own.
  function incomePerSec(s, now, includeUnmanaged) {
    let total = 0;
    for (let i = 0; i < BUSINESSES.length; i++) {
      if (s.biz[i].owned < 1) continue;
      if (!s.managers[i] && !includeUnmanaged) continue;
      total += revenue(s, i, now) / cycleTime(s, i);
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Time passing
  // ---------------------------------------------------------------------------
  // Start a shop's batch by hand. Returns true if it started.
  function tap(s, i) {
    const b = s.biz[i];
    if (b.owned < 1 || b.running) return false;
    b.running = true;
    b.progress = 0;
    s.stats.taps++;
    return true;
  }

  // Advance the game by dt seconds. Returns a list of { i, amount, manual } payouts.
  function tick(s, dt, now) {
    const payouts = [];
    s.stats.playTime += dt;
    for (let i = 0; i < BUSINESSES.length; i++) {
      const b = s.biz[i];
      if (b.owned < 1) continue;
      if (s.managers[i]) b.running = true;
      if (!b.running) continue;
      b.progress += dt / cycleTime(s, i);
      if (b.progress < 1) continue;
      let batches = 1;
      if (s.managers[i]) {
        batches = Math.floor(b.progress);
        b.progress -= batches;
      } else {
        b.progress = 0;
        b.running = false;
      }
      const amount = revenue(s, i, now) * batches;
      earn(s, amount);
      payouts.push({ i: i, amount: amount, manual: !s.managers[i] });
    }
    s.stats.bestRun = Math.max(s.stats.bestRun, s.runEarned);
    return payouts;
  }

  // Coins managers earned while the game was closed (boosts don't count).
  function offlineEarnings(s, seconds) {
    const t = Math.min(Math.max(0, seconds), OFFLINE_CAP);
    return incomePerSec(s, 0, false) * t;
  }

  // ---------------------------------------------------------------------------
  // Grand Reopening
  // ---------------------------------------------------------------------------
  function sprinklesForLifetime(coins) {
    return Math.floor(SPRINKLE_SCALE * Math.sqrt(Math.max(0, coins) / SPRINKLE_BASE));
  }

  function sprinkleGain(s) {
    return Math.max(0, sprinklesForLifetime(s.lifetimeEarned) - s.sprinkles);
  }

  // Lifetime coins still needed for the next sprinkle, and how far along it is (0..1).
  function nextSprinkle(s) {
    const have = Math.max(sprinklesForLifetime(s.lifetimeEarned), s.sprinkles);
    const lo = SPRINKLE_BASE * Math.pow(have / SPRINKLE_SCALE, 2);
    const hi = SPRINKLE_BASE * Math.pow((have + 1) / SPRINKLE_SCALE, 2);
    return {
      need: Math.max(0, hi - s.lifetimeEarned),
      progress: Math.min(1, Math.max(0, (s.lifetimeEarned - lo) / (hi - lo))),
    };
  }

  function reopen(s, now) {
    const gain = sprinkleGain(s);
    if (gain < 1) return 0;
    const fresh = newState(now);
    s.sprinkles += gain;
    s.coins = 0;
    s.runEarned = 0;
    s.biz = fresh.biz;
    s.managers = fresh.managers;
    s.upgrades = {};
    s.boost = fresh.boost;
    s.stats.reopenings++;
    return gain;
  }

  // ---------------------------------------------------------------------------
  // Trophies
  // ---------------------------------------------------------------------------
  function checkTrophies(s) {
    const earned = [];
    TROPHIES.forEach(function (t) {
      if (!s.trophies[t.id] && t.test(s)) {
        s.trophies[t.id] = true;
        earned.push(t);
      }
    });
    return earned;
  }

  // ---------------------------------------------------------------------------
  // Saving and loading
  // ---------------------------------------------------------------------------
  function num(v, fallback) { return typeof v === 'number' && isFinite(v) && v >= 0 ? v : fallback; }
  function flags(obj, validIds) {
    const out = {};
    if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { if (obj[k] === true && validIds(k)) out[k] = true; });
    return out;
  }

  // Build a clean state from saved data, ignoring anything malformed.
  function restore(data, now) {
    const s = newState(now);
    if (!data || typeof data !== 'object') return s;
    s.coins = num(data.coins, 0);
    s.runEarned = num(data.runEarned, 0);
    s.lifetimeEarned = Math.max(num(data.lifetimeEarned, 0), s.runEarned);
    s.sprinkles = Math.floor(num(data.sprinkles, 0));
    if (Array.isArray(data.biz)) {
      s.biz.forEach(function (b, i) {
        const d = data.biz[i];
        if (!d || typeof d !== 'object') return;
        b.owned = Math.floor(num(d.owned, b.owned));
        b.progress = Math.min(num(d.progress, 0), 0.999);
        b.running = d.running === true && b.owned > 0;
      });
    }
    if (Array.isArray(data.managers)) s.managers = s.managers.map(function (_, i) { return data.managers[i] === true; });
    s.upgrades = flags(data.upgrades, function (k) { return !!UPGRADE_BY_ID[k]; });
    s.trophies = flags(data.trophies, function (k) { return TROPHIES.some(function (t) { return t.id === k; }); });
    s.hints = flags(data.hints, function () { return true; });
    if (data.boost) s.boost = { mult: num(data.boost.mult, 1) || 1, until: num(data.boost.until, 0) };
    if (data.stats) Object.keys(s.stats).forEach(function (k) { s.stats[k] = num(data.stats[k], 0); });
    if (data.settings) {
      if (typeof data.settings.sound === 'boolean') s.settings.sound = data.settings.sound;
      if (typeof data.settings.floaters === 'boolean') s.settings.floaters = data.settings.floaters;
    }
    if (['1', '10', '100', 'max'].indexOf(data.buyMode) >= 0) s.buyMode = data.buyMode;
    s.lastSeen = num(data.lastSeen, now || Date.now());
    return s;
  }

  // ---------------------------------------------------------------------------
  // Number formatting
  // ---------------------------------------------------------------------------
  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];

  // 3 significant digits with a short suffix: 4.28, 512, 1.20K, 34.5M ...
  // Rounds down, so a price never looks cheaper than it is next to your coins.
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 100) return String(Math.floor(n * 100) / 100);
    if (n < 1000) return String(Math.floor(n));
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIXES.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(1000, tier);
    const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    const p = Math.pow(10, digits);
    return (Math.floor(v * p) / p).toFixed(digits) + SUFFIXES[tier];
  }

  function fmtTime(sec) {
    if (!isFinite(sec)) return '∞';
    if (sec < 10) return (Math.ceil(sec * 10) / 10).toFixed(1) + 's';
    sec = Math.ceil(sec);
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60), r = sec % 60;
    if (m < 60) return m + 'm ' + (r < 10 ? '0' : '') + r + 's';
    const h = Math.floor(m / 60), mm = m % 60;
    if (h < 24) return h + 'h ' + mm + 'm';
    return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  }

  const api = {
    BUSINESSES: BUSINESSES, MILESTONES: MILESTONES, MANAGERS: MANAGERS, UPGRADES: UPGRADES,
    UPGRADE_BY_ID: UPGRADE_BY_ID, TROPHIES: TROPHIES, SPRINKLE_BONUS: SPRINKLE_BONUS,
    TROPHY_BONUS: TROPHY_BONUS, OFFLINE_CAP: OFFLINE_CAP,
    newState: newState, restore: restore, earn: earn,
    costFor: costFor, maxAffordable: maxAffordable, buyAmount: buyAmount, buy: buy,
    hireManager: hireManager, upgradeAvailable: upgradeAvailable, buyUpgrade: buyUpgrade,
    milestonesReached: milestonesReached, nextMilestone: nextMilestone, prevMilestone: prevMilestone,
    cycleTime: cycleTime, revenue: revenue, shopMult: shopMult, globalMult: globalMult,
    boostMult: boostMult, trophyCount: trophyCount, incomePerSec: incomePerSec,
    tap: tap, tick: tick, offlineEarnings: offlineEarnings,
    sprinkleGain: sprinkleGain, nextSprinkle: nextSprinkle, reopen: reopen,
    checkTrophies: checkTrophies, openCount: openCount,
    fmt: fmt, fmtTime: fmtTime,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Game = api;
})(this);
