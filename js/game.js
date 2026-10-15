/*
 * Sprinkle Town Tycoon — the page: drawing the menus, handling taps,
 * running the clock, sounds, and saving.
 */
(function () {
  'use strict';

  const G = window.Game;
  const A = window.Art;
  const SAVE_KEY = 'sprinkle-town-save-v1';
  const TABS = ['town', 'managers', 'upgrades', 'sprinkles', 'more'];
  const BALLOON_COLORS = ['#FF5FA2', '#4CC9F0', '#3DDC97', '#FF9F43', '#8C6CFF'];

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const fmt = G.fmt;

  let state;
  let tab = 'town';
  let lastPerf = performance.now();
  let lastText = 0;
  let lastSlow = 0;
  let unseenTrophies = 0;
  let balloonEl = null;
  let hiddenAt = null;
  let nextBalloonAt = performance.now() + rand(35, 70) * 1000;
  let nextVipAt = performance.now() + rand(30, 50) * 1000;
  let refs = { shops: [], goals: [], managers: [], upgrades: [], sprinkles: null, more: null };
  const floaters = G.BUSINESSES.map(function () { return { amount: 0, last: 0 }; });
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Which street the Town tab shows: 'main', 'boardwalk' or 'sprinkle'.
  let district = 'main';
  const DISTRICTS = ['main', 'boardwalk', 'sprinkle'];
  function streetOf(i) { return G.BUSINESSES[i].street; }
  function isStreet(i) { return streetOf(i) === 'sprinkle'; }
  function needText(i) { return G.BUSINESSES[i].need.toLocaleString('en-US'); }

  // The Manager Hats customization dresses every manager and assistant alike.
  function hatOn() {
    const hat = G.activeStyle(state, 'mgrHat');
    return hat === 'own' ? undefined : hat;
  }

  function mgrFace(i) {
    const m = G.MANAGERS[i];
    return A.face(m.animal, m.color, m.acc, hatOn());
  }

  function astFace(i) {
    const a = G.ASSISTANTS[i];
    return A.face(a.animal, a.color, a.acc, hatOn());
  }

  function trnFace(i) {
    const a = G.TRAINEES[i];
    return A.face(a.animal, a.color, a.acc, hatOn());
  }

  function bossFace(k) {
    const b = G.BOSSES[k];
    return A.face(b.animal, b.color, b.acc, hatOn());
  }

  // A street's name inside a sentence: "runs the Boardwalk", "runs Main Street".
  function streetIn(id) { return (id === 'boardwalk' ? 'the ' : '') + G.STREET_NAMES[id]; }

  // A Street Boss multiplier, like x2.25.
  function multText(v) { return '×' + String(Math.round(v * 100) / 100); }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function coinCost(amount) {
    return '<span class="btn-coin">' + A.coin() + '</span><span class="cost">' + fmt(amount) + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Saving
  // ---------------------------------------------------------------------------
  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save() {
    advance();
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: play on without saving */ }
  }

  function encodeSave() {
    state.lastSeen = Date.now();
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }

  function decodeSave(code) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      return data && Array.isArray(data.biz) ? data : null;
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Sound: tiny synthesized blips, no audio files
  // ---------------------------------------------------------------------------
  const Sound = {
    ctx: null,
    lastCoin: 0,
    unlocked: false, // browsers only allow audio after the player's first tap or key press
    ready: function () {
      if (!this.unlocked) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone: function (freq, at, dur, type, vol, slideTo) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(vol, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    },
    play: function (name) {
      if (!state.settings.sound) return;
      const ctx = this.ready();
      if (!ctx) return;
      const t = ctx.currentTime;
      const self = this;
      switch (name) {
        case 'tap': this.tone(520, t, 0.09, 'triangle', 0.12, 780); break;
        case 'coin':
          if (performance.now() - this.lastCoin < 90) return;
          this.lastCoin = performance.now();
          this.tone(988, t, 0.06, 'square', 0.035);
          this.tone(1319, t + 0.05, 0.12, 'square', 0.035);
          break;
        case 'buy': this.tone(440, t, 0.07, 'triangle', 0.12, 660); this.tone(660, t + 0.06, 0.1, 'triangle', 0.1, 990); break;
        case 'fanfare': [523, 659, 784, 1047].forEach(function (f, k) { self.tone(f, t + k * 0.09, 0.18, 'triangle', 0.12); }); break;
        case 'pop': {
          const len = Math.floor(ctx.sampleRate * 0.12);
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3);
          const src = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = 0.35;
          src.buffer = buf;
          src.connect(gain).connect(ctx.destination);
          src.start(t);
          this.tone(880, t + 0.05, 0.25, 'triangle', 0.1, 1760);
          break;
        }
        case 'nope': this.tone(220, t, 0.14, 'sine', 0.12, 150); break;
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Little effects
  // ---------------------------------------------------------------------------
  // Up to two messages show at once. Replies to something the player just did
  // show right away; background news (trophies, tips, perks) waits its turn.
  const toastQueue = [];
  const toastsShown = [];

  function toast(art, title, text, background) {
    const msg = { art: art, title: title, text: text };
    if (background) {
      toastQueue.push(msg);
      if (toastQueue.length > 5) toastQueue.shift();
      showNextToast();
    } else {
      if (toastsShown.length >= 2) dismissToast(toastsShown[0]);
      displayToast(msg);
    }
  }

  function showNextToast() {
    if (toastsShown.length < 2 && toastQueue.length) displayToast(toastQueue.shift());
  }

  function displayToast(msg) {
    const t = el('div', 'toast', '<span class="toast-art">' + msg.art + '</span><span><strong></strong><span class="toast-text"></span></span>');
    $('strong', t).textContent = msg.title;
    $('.toast-text', t).textContent = msg.text;
    $('#toasts').appendChild(t);
    const entry = { el: t, timer: 0 };
    toastsShown.push(entry);
    entry.timer = setTimeout(function () { dismissToast(entry); }, toastQueue.length ? 2400 : 3000);
  }

  function dismissToast(entry) {
    const k = toastsShown.indexOf(entry);
    if (k < 0) return;
    toastsShown.splice(k, 1);
    clearTimeout(entry.timer);
    entry.el.classList.add('out');
    setTimeout(function () {
      entry.el.remove();
      showNextToast();
    }, 320);
  }

  function confetti(x, y, count) {
    if (reducedMotion) return;
    const fx = $('#fx');
    const colors = ['#FF5FA2', '#FFD23F', '#4CC9F0', '#3DDC97', '#8C6CFF', '#FF9F43'];
    for (let k = 0; k < count; k++) {
      const shape = G.activeStyle(state, 'confetti');
      const c = el('span', 'confetti' + (shape === 'classic' ? '' : ' ' + shape));
      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, 170);
      c.style.left = x + 'px';
      c.style.top = y + 'px';
      c.style.background = colors[k % colors.length];
      c.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      c.style.setProperty('--dy', Math.sin(angle) * dist + 60 + 'px');
      c.style.setProperty('--rot', rand(-540, 540) + 'deg');
      c.addEventListener('animationend', function () { c.remove(); });
      fx.appendChild(c);
    }
  }

  function confettiAt(node, count) {
    if (!node) return confetti(window.innerWidth / 2, window.innerHeight / 3, count);
    const r = node.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, count);
  }

  function floaterAt(x, y, text) {
    if (y < 0 || y > window.innerHeight) return;
    const f = el('span', 'floater');
    f.textContent = text;
    f.style.left = x + rand(-10, 10) + 'px';
    f.style.top = y + 'px';
    f.addEventListener('animationend', function () { f.remove(); });
    $('#fx').appendChild(f);
  }

  // A coin arcs from (x, y) on screen into the coin counter in the header.
  let lastFly = 0;
  function flyCoin(x, y) {
    const now = performance.now();
    if (reducedMotion || now - lastFly < 140 || document.hidden) return;
    lastFly = now;
    const purse = $('#purseCoin').getBoundingClientRect();
    const tx = purse.left + purse.width / 2, ty = purse.top + purse.height / 2;
    const coin = el('span', 'fly-coin', A.coin());
    if (!coin.animate) return;
    $('#flyLayer').appendChild(coin);
    const mx = x + (tx - x) * 0.3 + rand(-30, 30), my = Math.min(y, ty) - rand(20, 60);
    const anim = coin.animate([
      { transform: 'translate(' + x + 'px,' + y + 'px) scale(.6)' },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1)', offset: 0.35 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.5)', opacity: 0.85 },
    ], { duration: 750, easing: 'cubic-bezier(.4, 0, .6, 1)' });
    anim.onfinish = function () { coin.remove(); bumpPurse(); };
  }

  function bumpPurse() {
    const p = $('#purseCoin');
    p.classList.remove('bump');
    void p.offsetWidth;
    p.classList.add('bump');
  }

  // ---------------------------------------------------------------------------
  // Pop-up windows
  // ---------------------------------------------------------------------------
  let modalCleanup = null;

  function closeModal() {
    const root = $('#modalRoot');
    root.hidden = true;
    root.textContent = '';
    if (modalCleanup) modalCleanup();
    modalCleanup = null;
  }

  // opts: { art, title, html, buttons: [{ label, cls, action }], dismissable }
  function openModal(opts) {
    closeModal();
    const root = $('#modalRoot');
    const box = el('div', 'modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'modalTitle');
    if (opts.art) box.appendChild(el('div', 'modal-art', opts.art));
    const h = el('h2');
    h.id = 'modalTitle';
    h.textContent = opts.title;
    box.appendChild(h);
    if (opts.html) box.appendChild(el('div', 'modal-body', opts.html));
    const row = el('div', 'modal-buttons');
    (opts.buttons || []).forEach(function (b) {
      const btn = el('button', 'btn ' + (b.cls || ''));
      btn.type = 'button';
      btn.textContent = b.label;
      btn.addEventListener('click', function () {
        closeModal();
        if (b.action) b.action();
      });
      row.appendChild(btn);
    });
    box.appendChild(row);
    root.appendChild(box);
    root.hidden = false;

    const onKey = function (e) { if (e.key === 'Escape' && opts.dismissable !== false) closeModal(); };
    const onBackdrop = function (e) { if (e.target === root && opts.dismissable !== false) closeModal(); };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', onBackdrop);
    const lastFocus = document.activeElement;
    modalCleanup = function () {
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onBackdrop);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    const first = $('.btn', row);
    if (first) first.focus();
  }

  // ---------------------------------------------------------------------------
  // Town tab
  // ---------------------------------------------------------------------------
  const MANAGER_LINES = ['On it, boss!', 'Busy busy!', 'Hi boss!', 'Coming right up!', 'Next customer!', 'Business is booming!'];

  // Scenes only animate while on screen, and redraw at their new size when cards resize.
  const sceneWatch = {
    visible: typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.target.sceneRef) e.target.sceneRef.visible = e.isIntersecting; });
    }, { rootMargin: '40px' }) : null,
    size: typeof ResizeObserver === 'function' ? new ResizeObserver(function (entries) {
      entries.forEach(function (e) { if (e.target.sceneRef && e.target.sceneRef.lane) e.target.sceneRef.lane.resize(); });
    }) : null,
  };

  function watchScene(r, node) {
    node.sceneRef = r;
    r.visible = true;
    if (sceneWatch.visible) sceneWatch.visible.observe(node);
    if (sceneWatch.size) sceneWatch.size.observe(node);
  }

  function makeLane(r, i, locked, build) {
    const b = G.BUSINESSES[i];
    const m = G.MANAGERS[i];
    r.lane = Scene.createLane($('canvas', r.scene), {
      key: b.id,
      kind: b.kind,
      shopSvg: A.shop(b.id),
      productSvg: A.product(b.id),
      faceSvg: mgrFace(i),
      assistantSvg: astFace(i),
      traineeSvg: trnFace(i),
      tile: b.tile,
      bar: b.bar,
      night: !!b.night,
      locked: locked,
      signText: r.sprinkleLocked ? 'NEEDS ' + needText(i) : '',
      build: build,
      onServe: function (x, y) { onServe(r, x, y); },
    });
  }

  // justOpened: index of a shop that was just bought, so its building pops up.
  function renderTown(justOpened) {
    renderGoals();
    const list = $('#shopList');
    list.textContent = '';
    refs.shops = [];
    if (sceneWatch.visible) sceneWatch.visible.disconnect();
    if (sceneWatch.size) sceneWatch.size.disconnect();
    syncDistrict();
    const bk = G.BOSSES.findIndex(function (b) { return b.id === district; });
    if (bk >= 0 && G.bossLevel(state, bk) > 0) list.appendChild(bossBanner(bk));
    const street = G.BUSINESSES.map(function (b, i) { return i; }).filter(function (i) { return streetOf(i) === district; });
    if (district !== 'sprinkle') {
      // Main Street and the Boardwalk open in order: show the next empty lot and tease the rest.
      let lockedShown = 0;
      street.forEach(function (i, k) {
        if (state.biz[i].owned > 0) {
          list.appendChild(shopCard(i));
        } else if (lockedShown === 0) {
          list.appendChild(lockedCard(i));
          lockedShown++;
        } else if (lockedShown === 1) {
          list.appendChild(mysteryCard(street.length - k, district));
          lockedShown++;
        }
      });
    } else {
      // Sprinkle Street: every unlocked shop, then the next one you're saving sprinkles for.
      let teased = false, hidden = 0;
      street.forEach(function (i) {
        if (state.biz[i].owned > 0) list.appendChild(shopCard(i));
        else if (G.isUnlocked(state, i)) list.appendChild(lockedCard(i));
        else if (!teased) { list.appendChild(sprinkleLockedCard(i)); teased = true; }
        else hidden++;
      });
      if (hidden) list.appendChild(mysteryCard(hidden, 'sprinkle'));
    }
    // Scenes measure themselves, so they're made once the cards are on the page.
    refs.shops.forEach(function (r) {
      makeLane(r, r.i, !!r.locked, r.i === justOpened);
      watchScene(r, r.scene);
    });
    updateTown(true);
  }

  // The street's boss, once hired, greets you at the top of the street.
  function bossBanner(k) {
    const b = G.BOSSES[k];
    return el('div', 'card boss-banner', '<span class="boss-face">' + bossFace(k) + '</span>' +
      '<p><strong>' + b.name + '</strong> is the boss here. Every shop on ' + streetIn(b.id) + ' earns ' +
      multText(Math.pow(G.BOSS_BOOST, G.bossLevel(state, k))) + '.</p>');
  }

  function shopCard(i) {
    const b = G.BUSINESSES[i];
    const card = el('article', 'card shop');
    card.style.setProperty('--tile', b.tile);
    card.style.setProperty('--barc', b.bar);
    card.innerHTML =
      '<div class="shop-head"><h2 class="shop-name">' + b.name + '</h2><span class="shop-stars"></span><span class="shop-speed"></span></div>' +
      '<button class="shop-scene" type="button" aria-label="Run ' + b.name + '">' +
        '<canvas aria-hidden="true"></canvas><span class="owned-badge"></span><span class="tap-hint">TAP!</span>' +
      '</button>' +
      '<div class="bar"><div class="bar-fill"></div><div class="bar-text">' +
        '<span class="bar-amount"></span><span class="bar-time" title="Time left">' + A.icon('clock') + '<span></span></span>' +
      '</div></div>' +
      '<button class="btn buy-btn" type="button"><span class="buy-n"></span><span class="buy-cost">' + coinCost(0) + '</span></button>' +
      '<div class="milestone"><div class="mini-bar"><span></span></div><span class="ms-text"></span></div>';

    const r = {
      i: i,
      card: card,
      scene: $('.shop-scene', card),
      owned: $('.owned-badge', card),
      hint: $('.tap-hint', card),
      stars: $('.shop-stars', card),
      starCount: -1,
      speed: $('.shop-speed', card),
      bar: $('.bar', card),
      fill: $('.bar-fill', card),
      amount: $('.bar-amount', card),
      timeBox: $('.bar-time', card),
      timer: $('.bar-time > span', card),
      buy: $('.buy-btn', card),
      buyN: $('.buy-n', card),
      cost: $('.buy-btn .cost', card),
      msBar: $('.mini-bar > span', card),
      msText: $('.ms-text', card),
    };

    // Tapping the street collects a waiting VIP's tip, or starts a batch;
    // a manager's shop gets a cheerful reply instead.
    r.scene.addEventListener('click', function () {
      const vip = r.lane.collectVip();
      if (vip) {
        collectTip(r, vip);
      } else if (G.tap(state, i)) {
        Sound.play('tap');
        r.lane.poke();
        updateTown(true);
      } else if (state.managers[i]) {
        r.lane.say(MANAGER_LINES[Math.floor(Math.random() * MANAGER_LINES.length)]);
      } else {
        r.lane.poke();
      }
    });

    r.buy.addEventListener('click', function () {
      const n = G.buyAmount(state, i);
      const before = G.milestonesReached(state.biz[i].owned);
      if (!G.buy(state, i, n)) { Sound.play('nope'); return; }
      Sound.play('buy');
      r.lane.poke();
      const after = G.milestonesReached(state.biz[i].owned);
      if (after > before) {
        const next = G.nextMilestone(state.biz[i].owned);
        Sound.play('fanfare');
        confettiAt(r.scene, 24);
        toast(A.shop(b.id), b.name + ' is ' + Math.pow(2, after - before) + '× faster!',
          (next ? 'A new branch opened behind it. Own ' + next + ' to double its speed again.' : 'It has reached top speed.'));
      }
      afterChange();
    });

    refs.shops.push(r);
    return card;
  }

  function lockedCard(i) {
    const b = G.BUSINESSES[i];
    const factory = b.kind === 'factory';
    const card = el('article', 'card shop locked');
    card.style.setProperty('--tile', b.tile);
    card.innerHTML =
      '<div class="shop-head"><h2 class="shop-name">' + b.name + '</h2><span class="shop-speed">Empty lot</span></div>' +
      '<div class="shop-scene"><canvas aria-hidden="true"></canvas></div>' +
      '<p class="shop-note">Earns ' + fmt(b.rev) + ' coins every ' + G.fmtTime(b.time) + ' per ' + (factory ? 'factory' : 'shop') + '.</p>' +
      '<button class="btn btn-pink open-btn" type="button"><span>' + (factory ? 'Build factory' : 'Open shop') + '</span><span class="buy-cost">' + coinCost(G.costFor(i, 0, 1, state)) + '</span></button>';
    const btn = $('.open-btn', card);
    btn.addEventListener('click', function () {
      if (!G.buy(state, i, 1)) { Sound.play('nope'); return; }
      Sound.play('fanfare');
      confettiAt(btn, 36);
      toast(A.shop(b.id), (factory ? 'New factory: ' : 'New shop: ') + b.name + '!',
        factory ? 'Tap it to start the conveyor belt.' : 'Tap it to start serving customers.');
      renderTown(i);
      afterChange();
    });
    refs.shops.push({ i: i, locked: true, buy: btn, scene: $('.shop-scene', card) });
    return card;
  }

  function mysteryCard(remaining, where) {
    const card = el('article', 'card shop mystery');
    const sprinkleStreet = where === 'sprinkle';
    const what = remaining + ' more ' + (sprinkleStreet ? 'Sprinkle Street ' : where === 'boardwalk' ? 'Boardwalk ' : '') +
      (where === 'boardwalk' ? 'store' : 'shop') + (remaining === 1 ? '' : 's');
    card.innerHTML =
      '<div class="shop-icon">' + A.mystery() + '</div>' +
      '<div class="shop-body">' +
        '<div class="shop-name-row"><h2 class="shop-name">Coming soon</h2></div>' +
        '<p class="shop-note">' + what + (sprinkleStreet ? ' unlock as you collect golden sprinkles.' : ' to discover. Keep growing your town!') + '</p>' +
      '</div>';
    return card;
  }

  // A Sprinkle Street shop you don't have enough sprinkles for yet.
  function sprinkleLockedCard(i) {
    const b = G.BUSINESSES[i];
    const card = el('article', 'card shop locked');
    card.style.setProperty('--tile', b.tile);
    card.innerHTML =
      '<div class="shop-head"><h2 class="shop-name">' + b.name + '</h2>' +
        '<span class="need-chip"><span class="chip-icon">' + A.sprinkle() + '</span>' + needText(i) + '</span></div>' +
      '<div class="shop-scene"><canvas aria-hidden="true"></canvas></div>' +
      '<p class="shop-note">Unlocks for good when you hold ' + needText(i) + ' golden sprinkles. You have ' + fmt(state.sprinkles) + '.</p>' +
      '<div class="milestone"><div class="mini-bar"><span style="transform:scaleX(' + Math.min(1, state.sprinkles / b.need) + ')"></span></div>' +
        '<span>' + fmt(Math.max(0, b.need - state.sprinkles)) + ' to go</span></div>';
    refs.shops.push({ i: i, locked: true, sprinkleLocked: true, scene: $('.shop-scene', card) });
    return card;
  }

  function syncDistrict() {
    document.querySelectorAll('.district-toggle button').forEach(function (b) {
      const on = b.getAttribute('data-district') === district;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    const note = $('#districtNote');
    note.hidden = district === 'main';
    setText(note, district === 'sprinkle'
      ? 'Sprinkle Street shops unlock for good once you hold enough golden sprinkles. Open them with coins in every run.'
      : 'Boardwalk stores open one after another, like Main Street. Open one to find the next.');
  }

  function upgradesOwned(i) {
    const id = G.BUSINESSES[i].id;
    let n = 0;
    for (let t = 0; t < 7; t++) if (state.upgrades[id + '-' + t]) n++;
    return n;
  }

  function updateTown(text) {
    const now = Date.now();
    refs.shops.forEach(function (r) {
      const i = r.i;
      const b = state.biz[i];
      if (r.locked) {
        if (r.buy) r.buy.disabled = state.coins < G.costFor(i, 0, 1, state);
        return;
      }
      const managed = state.managers[i];
      const time = G.cycleTime(state, i);
      const fast = time < 0.2 && b.running;
      r.bar.classList.toggle('blur', fast);
      if (!fast) r.fill.style.transform = 'scaleX(' + Math.min(1, b.progress) + ')';
      if (!text) return;

      const rev = G.revenue(state, i, now);
      setText(r.owned, '×' + b.owned);
      setText(r.amount, fast ? fmt(rev / time) + ' / sec' : '+' + fmt(rev));
      r.timeBox.hidden = fast;
      if (!fast) setText(r.timer, b.running ? G.fmtTime((1 - b.progress) * time) : G.fmtTime(time));
      setText(r.speed, fmt(rev / time) + '/s');
      r.hint.hidden = managed || b.running;
      r.scene.setAttribute('aria-label', r.lane && r.lane.hasVip() ? 'Collect the VIP tip at your ' + G.BUSINESSES[i].name
        : managed ? G.BUSINESSES[i].name + ', run by ' + G.MANAGERS[i].name : 'Run ' + G.BUSINESSES[i].name);

      // One star per upgrade tier: gold for the first four, then Golden, Rainbow and
      // Diamond once unlocked, and a lightning bolt once its Turbo upgrade is bought.
      const slots = 4 + (G.hasPerk(state, 'goldUpgrades') ? 1 : 0) + (G.hasPerk(state, 'rainbowUpgrades') ? 1 : 0) +
        (G.hasPerk(state, 'diamondUpgrades') ? 1 : 0);
      const stars = upgradesOwned(i);
      const id = G.BUSINESSES[i].id;
      const turbo = !!state.upgrades[id + '-turbo'];
      const starKey = stars + '/' + slots + (turbo ? 't' : '');
      if (starKey !== r.starCount) {
        r.starCount = starKey;
        let html = '';
        for (let k = 0; k < slots; k++) {
          const cls = (state.upgrades[id + '-' + k] ? 'on' : '') + (k === 4 ? ' gold' : k === 5 ? ' rainbow' : k === 6 ? ' diamond' : '');
          html += '<span class="' + cls.trim() + '">★</span>';
        }
        if (turbo) html += '<span class="turbo">' + A.bolt() + '</span>';
        r.stars.innerHTML = html;
        const label = stars + ' of ' + slots + ' upgrades' + (turbo ? ', Turbo' : '');
        r.stars.setAttribute('aria-label', label);
        r.stars.title = label;
      }

      const n = G.buyAmount(state, i);
      const cost = G.costFor(i, b.owned, n, state);
      setText(r.buyN, 'Buy ×' + n);
      setText(r.cost, fmt(cost));
      r.buy.disabled = cost > state.coins;

      const next = G.nextMilestone(b.owned);
      if (next) {
        const prev = G.prevMilestone(b.owned);
        r.msBar.style.transform = 'scaleX(' + (b.owned - prev) / (next - prev) + ')';
        setText(r.msText, '2× speed + new branch at ' + next);
      } else {
        r.msBar.style.transform = 'scaleX(1)';
        setText(r.msText, 'Top speed!');
      }
    });
  }

  // Move every on-screen street scene forward and redraw it.
  function animateTown(dt) {
    refs.shops.forEach(function (r) {
      if (!r.lane || !r.visible) return;
      const b = state.biz[r.i];
      r.lane.update(dt, {
        owned: b.owned,
        managed: state.managers[r.i],
        assistant: state.assistants[r.i],
        trainee: state.trainees[r.i],
        running: b.running,
        time: G.cycleTime(state, r.i),
        milestones: G.milestonesReached(b.owned),
      });
      r.lane.draw();
    });
  }

  // A customer was just served: float the earnings and fly a coin to the counter.
  function onServe(r, x, y) {
    const box = r.scene.getBoundingClientRect();
    const sx = box.left + 3 + x, sy = box.top + 3 + y;
    const f = floaters[r.i];
    if (state.settings.floaters && f.amount > 0 && performance.now() - f.last >= 500) {
      floaterAt(sx, sy - 10, '+' + fmt(f.amount));
      f.amount = 0;
      f.last = performance.now();
    }
    flyCoin(sx, sy);
  }

  // ---------------------------------------------------------------------------
  // Town Goals (top of the Town tab)
  // ---------------------------------------------------------------------------
  function goalArt(g) {
    switch (g.type) {
      case 'own': case 'open': return A.shop(G.BUSINESSES[g.i].id);
      case 'manager': return mgrFace(g.i);
      case 'assistant': return astFace(g.i);
      case 'trainee': return trnFace(g.i);
      case 'balloon': return A.balloon('#FF5FA2');
      case 'upgrade': return A.icon('upgrades');
      case 'vip': return A.crown();
    }
    return A.coin();
  }

  function rewardLabel(g) {
    const v = G.goalRewardValue(state, g);
    if (g.reward === 'sprinkles') return '<span class="btn-coin">' + A.sprinkle() + '</span>+' + fmt(v);
    if (g.reward === 'rush') return '3× for ' + v + 's';
    return '<span class="btn-coin">' + A.coin() + '</span>' + fmt(v);
  }

  function renderGoals() {
    const box = $('#goalBox');
    const open = state.settings.goalsOpen;
    box.innerHTML =
      '<button class="goals-head" type="button" aria-expanded="' + open + '" aria-controls="goalList">' +
        '<span class="goals-title">Town Goals</span><span class="goals-ready" hidden></span>' +
        '<span class="goals-chevron">' + A.icon('chevron') + '</span>' +
      '</button>' +
      '<div class="goal-list" id="goalList"' + (open ? '' : ' hidden') + '></div>';
    $('.goals-head', box).addEventListener('click', function () {
      state.settings.goalsOpen = !state.settings.goalsOpen;
      renderGoals();
    });
    const list = $('#goalList', box);
    refs.goals = state.goals.map(function (g, idx) {
      const row = el('div', 'goal');
      row.innerHTML =
        '<span class="goal-icon">' + goalArt(g) + '</span>' +
        '<div class="goal-text"><span class="goal-name"></span>' +
          '<div class="goal-progress"><div class="mini-bar"><span></span></div><span class="goal-count"></span></div>' +
        '</div>' +
        '<button class="btn btn-small goal-claim" type="button"></button>';
      $('.goal-name', row).textContent = G.goalText(g);
      const r = { g: g, bar: $('.mini-bar > span', row), count: $('.goal-count', row), btn: $('.goal-claim', row), label: '' };
      r.btn.addEventListener('click', function () { claimGoal(idx, r.btn); });
      list.appendChild(row);
      return r;
    });
    updateGoals();
  }

  function updateGoals() {
    let ready = 0;
    refs.goals.forEach(function (r) {
      const p = G.goalProgress(state, r.g);
      const done = p.have >= p.need;
      if (done) ready++;
      const have = Math.max(0, Math.min(p.have, p.need));
      r.bar.style.transform = 'scaleX(' + have / p.need + ')';
      setText(r.count, r.g.type === 'earn' ? fmt(have) + ' / ' + fmt(p.need) : Math.floor(have) + ' / ' + p.need);
      const label = (done ? '<span>Claim</span>' : '') + '<span class="goal-reward">' + rewardLabel(r.g) + '</span>';
      if (label !== r.label) { r.label = label; r.btn.innerHTML = label; }
      r.btn.disabled = !done;
      r.btn.classList.toggle('ready', done);
    });
    const tag = $('#goalBox .goals-ready');
    if (tag) {
      tag.hidden = !ready;
      setText(tag, ready + ' ready!');
    }
  }

  function claimGoal(idx, btn) {
    const res = G.claimGoal(state, idx, Date.now());
    if (!res) return;
    Sound.play('fanfare');
    confettiAt(btn, 30);
    const text = res.reward === 'sprinkles' ? '+' + fmt(res.value) + ' golden sprinkles!'
      : res.reward === 'rush' ? 'Sugar Rush! Every shop earns triple for ' + res.value + ' seconds.'
        : '+' + fmt(res.value) + ' coins.';
    toast(goalArt(res.goal), 'Goal complete!', G.goalText(res.goal) + ': ' + text);
    if (res.reward === 'coins') bumpPurse();
    renderGoals();
    afterChange();
  }

  // ---------------------------------------------------------------------------
  // VIP visitors: one turns up on a street you can see every minute or so.
  // ---------------------------------------------------------------------------
  function maybeVip(nowPerf) {
    if (nowPerf < nextVipAt || tab !== 'town' || document.hidden || state.lifetimeEarned < 100) return;
    const open = refs.shops.filter(function (r) { return !r.locked && r.lane && r.visible; });
    const r = open[Math.floor(Math.random() * open.length)];
    if (!r || !r.lane.addVip()) { nextVipAt = nowPerf + 5000; return; }
    nextVipAt = nowPerf + rand(45, 90) * 1000;
    if (!state.hints.vip) {
      state.hints.vip = true;
      toast(A.crown(), 'A VIP is visiting!', 'Tap the ' + G.BUSINESSES[r.i].name + ' street before they leave to collect a big tip.', true);
    }
  }

  function collectTip(r, at) {
    const amount = G.vipTip(state, r.i);
    Sound.play('fanfare');
    const box = r.scene.getBoundingClientRect();
    const x = box.left + 3 + at.x, y = box.top + 3 + at.y;
    floaterAt(x, y - 12, '+' + fmt(amount));
    for (let k = 0; k < 3; k++) setTimeout(function () { flyCoin(x, y); }, k * 160);
    toast(A.crown(), 'VIP tip!', 'A VIP at your ' + G.BUSINESSES[r.i].name + ' tipped ' + fmt(amount) + ' coins.');
    afterChange();
  }

  // ---------------------------------------------------------------------------
  // Managers tab
  // ---------------------------------------------------------------------------
  function renderManagers() {
    const list = $('#managerList');
    list.textContent = '';
    refs.managers = [];
    const notes = [];
    if (!G.hasPerk(state, 'assistants')) notes.push('<strong>Assistant managers</strong> unlock at 10 golden sprinkles. Each one doubles their shop\'s speed.');
    if (!G.hasPerk(state, 'trainees')) notes.push('<strong>Trainees</strong> unlock at 75 golden sprinkles. Each one doubles what their shop earns.');
    notes.forEach(function (n) {
      list.appendChild(el('div', 'card mgr-note', '<span class="chip-icon">' + A.sprinkle() + '</span><p>' + n + '</p>'));
    });
    list.appendChild(el('h2', 'section-title grid-title', 'Street Bosses'));
    G.BOSSES.forEach(function (b, k) { list.appendChild(bossCard(k)); });
    const groups = [
      ['Main Street', function (i) { return streetOf(i) === 'main'; }],
      ['Boardwalk', function (i) { return streetOf(i) === 'boardwalk' && G.isUnlocked(state, i); }],
      ['Sprinkle Street', function (i) { return isStreet(i) && (G.isUnlocked(state, i) || state.biz[i].owned > 0); }],
    ];
    groups.forEach(function (gr) {
      const ids = G.MANAGERS.map(function (m, i) { return i; }).filter(gr[1]);
      if (!ids.length) return;
      list.appendChild(el('h2', 'section-title grid-title', gr[0]));
      ids.forEach(function (i) { list.appendChild(managerCard(i)); });
    });
  }

  const BOSS_TILES = { main: '#FFF0A6', boardwalk: '#DDF6FF', sprinkle: '#FFE3F1' };

  // A Street Boss: hire, then promote twice. Each level boosts their whole street.
  function bossCard(k) {
    const b = G.BOSSES[k];
    const street = G.STREET_NAMES[b.id];
    const lv = G.bossLevel(state, k);
    const open = G.bossOpen(state, k);
    const top = lv >= G.BOSS_LEVELS;
    const next = multText(Math.pow(G.BOSS_BOOST, lv + 1));
    const card = el('article', 'card mgr boss' + (open || lv ? '' : ' unavailable'));
    card.style.setProperty('--tile', BOSS_TILES[b.id]);
    let pips = '';
    for (let n = 0; n < G.BOSS_LEVELS; n++) pips += '<span class="' + (n < lv ? 'on' : '') + '">★</span>';
    const job = lv ? 'Boss of ' + streetIn(b.id) + '. Every shop there earns ' + multText(Math.pow(G.BOSS_BOOST, lv)) +
        (top ? '.' : ', or ' + next + ' after a promotion.')
      : open ? 'Wants to run ' + streetIn(b.id) + '. Every shop there would earn ' + next + '.'
        : 'Open ' + b.open + ' ' + street + (b.id === 'boardwalk' ? ' stores' : ' shops') + ' to meet them.';
    card.innerHTML =
      '<div class="mgr-face">' + bossFace(k) + '</div>' +
      '<div class="mgr-info">' +
        '<h2 class="mgr-name">' + b.name + '</h2>' +
        '<span class="boss-pips" role="img" aria-label="Level ' + lv + ' of ' + G.BOSS_LEVELS + '">' + pips + '</span>' +
        '<p class="mgr-job">' + job + '</p>' +
        (top ? '<span class="stamp">TOP BOSS!</span>'
          : open ? '<button class="btn btn-small boss-btn" type="button"><span>' + (lv ? 'Promote' : 'Hire') + '</span>' +
              '<span class="buy-cost">' + coinCost(G.bossCost(state, k)) + '</span></button>'
            : '<button class="btn btn-small boss-btn" type="button" disabled>' + G.openOn(state, b.id) + ' of ' + b.open + ' open</button>') +
      '</div>';
    const btn = $('.boss-btn', card);
    if (btn && open && !top) {
      btn.addEventListener('click', function () {
        if (!G.hireBoss(state, k)) { Sound.play('nope'); return; }
        Sound.play('fanfare');
        confettiAt(btn, 36);
        toast(bossFace(k), lv ? b.name + ' was promoted!' : b.name + ' is hired!',
          'Every ' + street + ' shop now earns ' + multText(Math.pow(G.BOSS_BOOST, lv + 1)) + '.');
        renderManagers();
        afterChange();
      });
      refs.managers.push({ btn: btn, cost: function () { return G.bossCost(state, k); } });
    }
    return card;
  }

  function managerCard(i) {
    const m = G.MANAGERS[i];
    const b = G.BUSINESSES[i];
    const open = state.biz[i].owned > 0;
    const hired = state.managers[i];
    const card = el('article', 'card mgr' + (open ? '' : ' unavailable'));
    card.style.setProperty('--tile', b.tile);
    card.innerHTML =
      '<div class="mgr-face">' + mgrFace(i) + '</div>' +
      '<div class="mgr-info">' +
        '<h2 class="mgr-name">' + m.name + '</h2>' +
        '<p class="mgr-job">' + (open ? 'Runs your ' + b.name + ' for you.' : 'Wants to run a ' + b.name + '.') + '</p>' +
        (hired ? '<span class="stamp">ON THE JOB!</span>'
          : open ? '<button class="btn btn-mint btn-small mgr-btn" type="button"><span>Hire</span><span class="buy-cost">' + coinCost(G.managerCost(state, i)) + '</span></button>'
            : '<button class="btn btn-small mgr-btn" type="button" disabled>Open the shop first</button>') +
      '</div>' +
      (open && G.hasPerk(state, 'assistants') ? assistantRow(i) : '') +
      (open && G.hasPerk(state, 'trainees') ? traineeRow(i) : '');
    const btn = $('.mgr-btn', card);
    const helpBtn = $('.assist-btn', card);
    const trainBtn = $('.trainee-btn', card);
    if (trainBtn && state.assistants[i] && !state.trainees[i]) {
      trainBtn.addEventListener('click', function () {
        if (!G.hireTrainee(state, i)) { Sound.play('nope'); return; }
        Sound.play('fanfare');
        confettiAt(trainBtn, 30);
        toast(trnFace(i), G.TRAINEES[i].name + ' is hired!', 'Your ' + b.name + ' now earns twice as much.');
        renderManagers();
        afterChange();
      });
      refs.managers.push({ btn: trainBtn, cost: function () { return G.traineeCost(state, i); } });
    }
    if (helpBtn && hired && !state.assistants[i]) {
      helpBtn.addEventListener('click', function () {
        if (!G.hireAssistant(state, i)) { Sound.play('nope'); return; }
        Sound.play('fanfare');
        confettiAt(helpBtn, 30);
        toast(astFace(i), G.ASSISTANTS[i].name + ' is hired!', 'Your ' + b.name + ' now works twice as fast.');
        renderManagers();
        afterChange();
      });
      refs.managers.push({ btn: helpBtn, cost: function () { return G.assistantCost(state, i); } });
    }
    if (btn && open && !hired) {
      btn.addEventListener('click', function () {
        if (!G.hireManager(state, i)) { Sound.play('nope'); return; }
        Sound.play('fanfare');
        confettiAt(btn, 30);
        toast(mgrFace(i), m.name + ' is hired!', 'Your ' + b.name + ' now runs by itself.');
        renderManagers();
        afterChange();
      });
      refs.managers.push({ btn: btn, cost: function () { return G.managerCost(state, i); } });
    }
    return card;
  }

  function assistantRow(i) {
    const a = G.ASSISTANTS[i];
    const hired = state.assistants[i];
    return '<div class="assist">' +
      '<div class="assist-face">' + astFace(i) + '</div>' +
      '<div class="assist-info"><strong>' + a.name + '</strong><span>Assistant · 2× speed</span></div>' +
      (hired ? '<span class="stamp">HELPING!</span>'
        : state.managers[i] ? '<button class="btn btn-small assist-btn" type="button"><span>Hire</span><span class="buy-cost">' + coinCost(G.assistantCost(state, i)) + '</span></button>'
          : '<button class="btn btn-small assist-btn" type="button" disabled>Manager first</button>') +
    '</div>';
  }

  function traineeRow(i) {
    const a = G.TRAINEES[i];
    const hired = state.trainees[i];
    return '<div class="assist trainee">' +
      '<div class="assist-face">' + trnFace(i) + '</div>' +
      '<div class="assist-info"><strong>' + a.name + '</strong><span>Trainee · 2× profit</span></div>' +
      (hired ? '<span class="stamp">LEARNING!</span>'
        : state.assistants[i] ? '<button class="btn btn-small trainee-btn" type="button"><span>Hire</span><span class="buy-cost">' + coinCost(G.traineeCost(state, i)) + '</span></button>'
          : '<button class="btn btn-small trainee-btn" type="button" disabled>Assistant first</button>') +
    '</div>';
  }

  function updateManagers() {
    refs.managers.forEach(function (r) { r.btn.disabled = state.coins < r.cost(); });
  }

  // ---------------------------------------------------------------------------
  // Upgrades tab
  // ---------------------------------------------------------------------------
  const UPGRADES_SHOWN = 12;

  const HELPER_ART = {
    vipTips: function () { return A.crown(); },
    balloons: function () { return A.balloon('#4CC9F0'); },
    rush: function () { return A.product('candy'); },
    goals: function () { return A.trophy(true); },
    offline: function () { return A.product('dreampalace'); },
    lounge: function () { return mgrFace(0); },
  };

  function upgradeArt(u) {
    if (u.effect) return HELPER_ART[u.effect]();
    if (u.target < 0) return A.sprinkleJar();
    return A.shop(G.BUSINESSES[u.target].id) + (u.speed ? '<span class="upg-bolt">' + A.bolt() + '</span>' : '');
  }

  function upgradeEffect(u) {
    if (u.effect) return u.text;
    if (u.target < 0) return 'Every shop earns ×' + u.mult;
    return G.BUSINESSES[u.target].name + (u.speed ? ' works twice as fast' : ' earns ×' + u.mult);
  }

  function upgradeClass(u) {
    return u.effect ? ' upg-helper' : u.speed ? ' upg-turbo' : u.perk === 'goldUpgrades' ? ' upg-gold'
      : u.perk === 'rainbowUpgrades' ? ' upg-rainbow' : u.perk === 'diamondUpgrades' ? ' upg-diamond' : '';
  }

  function renderUpgrades() {
    const list = $('#upgradeList');
    list.textContent = '';
    refs.upgrades = [];
    const available = G.UPGRADES.filter(function (u) { return G.upgradeAvailable(state, u); });
    const locked = [];
    if (!G.hasPerk(state, 'goldUpgrades')) locked.push('Golden upgrades unlock at 25 golden sprinkles');
    if (!G.hasPerk(state, 'rainbowUpgrades')) locked.push((locked.length ? 'Rainbow' : 'Rainbow upgrades') + ' at 250');
    if (!G.hasPerk(state, 'diamondUpgrades')) locked.push((locked.length ? 'Diamond' : 'Diamond upgrades') + ' at 1,200');
    if (locked.length) list.appendChild(el('p', 'panel-sub', locked.join(', ') + '. Each adds another ×3 for every shop.'));
    available.slice(0, UPGRADES_SHOWN).forEach(function (u) {
      const row = el('article', 'card upg' + upgradeClass(u));
      row.style.setProperty('--tile', u.target < 0 ? '#E8FAFF' : G.BUSINESSES[u.target].tile);
      row.innerHTML =
        '<div class="upg-icon">' + upgradeArt(u) + '</div>' +
        '<div class="upg-text"><h2 class="upg-name">' + u.name + '</h2><p class="upg-effect">' + upgradeEffect(u) + '</p></div>' +
        '<button class="btn" type="button"><span>Buy</span><span class="buy-cost">' + coinCost(u.cost) + '</span></button>';
      const btn = $('.btn', row);
      btn.addEventListener('click', function () {
        if (!G.buyUpgrade(state, u.id)) { Sound.play('nope'); return; }
        Sound.play('fanfare');
        confettiAt(btn, 24);
        toast(upgradeArt(u), u.name, upgradeEffect(u) + ' from now on.');
        renderUpgrades();
        afterChange();
      });
      refs.upgrades.push({ u: u, btn: btn });
      list.appendChild(row);
    });

    if (!available.length) {
      list.appendChild(el('div', 'card empty', '<p>No upgrades right now. Open more shops to find new ones!</p>'));
    } else if (available.length > UPGRADES_SHOWN) {
      list.appendChild(el('p', 'panel-sub', (available.length - UPGRADES_SHOWN) + ' more upgrades after these.'));
    }

    const bought = G.UPGRADES.filter(function (u) { return state.upgrades[u.id]; });
    if (bought.length) {
      list.appendChild(el('h2', 'section-title', 'Bought (' + bought.length + ')'));
      const chips = el('div', 'card bought-list');
      bought.forEach(function (u) {
        const c = el('span');
        c.textContent = u.name;
        chips.appendChild(c);
      });
      list.appendChild(chips);
    }
  }

  function updateUpgrades() {
    refs.upgrades.forEach(function (r) { r.btn.disabled = state.coins < r.u.cost; });
  }

  // ---------------------------------------------------------------------------
  // Sprinkles tab
  // ---------------------------------------------------------------------------
  const STYLE_GROUPS = [['sky', 'Sky'], ['ui', 'Colors'], ['border', 'Store borders'], ['front', 'Storefronts'], ['coin', 'Coins'],
    ['mgrHat', 'Manager hats'], ['hats', 'Customer hats'], ['vehicle', 'Trucks & vans'], ['confetti', 'Confetti']];
  // A small preview of each look.
  const STYLE_ART = {
    sky: function (id) { return '<span class="sky-swatch" data-sky="' + id + '"></span>'; },
    ui: function (id) { return '<span class="ui-swatch" data-ui="' + id + '"><i></i><b></b></span>'; },
    border: function (id) { return '<span class="border-swatch" data-border="' + id + '"><i></i></span>'; },
    front: function (id) { return A.shop('donut', id); },
    coin: function (id) { return A.coin(id); },
    mgrHat: function (id) { return A.face('cat', '#C9B6FF', 'tiara', id === 'own' ? undefined : id); },
    hats: function (id) { return A.customer(id); },
    vehicle: function (id) { return A.van(id); },
    confetti: function (id) { return A.confettiSample(id); },
  };

  function renderSprinkles() {
    const view = $('#sprinkleView');
    const jumps = [['sp-reopen', 'Reopening'], ['sp-perks', 'Perks'], ['sp-style', 'Customize'], ['sp-street', 'Sprinkle Street']];
    view.innerHTML =
      '<div class="panel" style="gap:16px">' +
        '<nav class="jump-chips" aria-label="Sections">' + jumps.map(function (j) {
          return '<button type="button" class="jump" data-jump="' + j[0] + '">' + j[1] + '</button>';
        }).join('') + '</nav>' +
        '<section class="card sprinkle-hero">' +
          '<div class="sprinkle-jar">' + A.sprinkleJar() + '</div>' +
          '<div>' +
            '<div class="big-number" data-r="count"></div>' +
            '<p>golden sprinkles</p>' +
            '<p>Each one adds +' + Math.round(G.SPRINKLE_BONUS * 100) + '% profit to every shop, forever. Right now that\'s <strong data-r="bonus"></strong>.</p>' +
          '</div>' +
        '</section>' +
        '<section class="card reopen jump-target" id="sp-reopen">' +
          '<h2>Grand Reopening</h2>' +
          '<p>Start your town over from one lemonade stand and collect golden sprinkles for the coins you\'ve earned this run. Sprinkles add up with every reopening.</p>' +
          '<div class="gain-line"><span class="chip-icon">' + A.sprinkle() + '</span><span data-r="gain"></span></div>' +
          '<div class="milestone"><div class="mini-bar"><span data-r="nextBar"></span></div><span data-r="next"></span></div>' +
          '<div class="keep-lose">' +
            '<div class="keep"><strong>YOU KEEP</strong>Golden sprinkles, perks, Sprinkle Street unlocks, trophies</div>' +
            '<div class="lose"><strong>STARTS OVER</strong>Coins, shops, managers, upgrades</div>' +
          '</div>' +
          '<button class="btn btn-pink" type="button" data-r="btn">Hold a Grand Reopening</button>' +
        '</section>' +
        '<h2 class="section-title jump-target" id="sp-perks">Sprinkle Perks</h2>' +
        '<p class="panel-sub">Perks unlock for good once you hold enough golden sprinkles. You never spend sprinkles on them.</p>' +
        '<div class="perk-grid">' + G.PERKS.map(perkCard).join('') + '</div>' +
        '<h2 class="section-title jump-target" id="sp-style">Customize</h2>' +
        '<p class="panel-sub">New looks unlock at sprinkle counts. Tap one to use it.</p>' +
        '<div class="card customize" id="customize"></div>' +
        '<h2 class="section-title jump-target" id="sp-street">Sprinkle Street</h2>' +
        '<p class="panel-sub">Special shops that unlock for good when you hold enough golden sprinkles. Open them with coins from the Town tab.</p>' +
        '<div class="street-grid">' + G.BUSINESSES.map(function (b, i) { return isStreet(i) ? streetCard(i) : ''; }).join('') + '</div>' +
      '</div>';
    const r = {};
    view.querySelectorAll('[data-r]').forEach(function (n) { r[n.getAttribute('data-r')] = n; });
    r.btn.addEventListener('click', confirmReopen);
    refs.sprinkles = r;
    view.querySelectorAll('.jump').forEach(function (b) {
      b.addEventListener('click', function () {
        const target = document.getElementById(b.getAttribute('data-jump'));
        if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    renderCustomize();
    updateSprinkles();
  }

  function styleTile(group, item) {
    const got = state.sprinkles >= item.need;
    const on = G.activeStyle(state, group) === item.id;
    const art = STYLE_ART[group](item.id);
    return '<button type="button" class="style-tile' + (on ? ' on' : '') + '" data-group="' + group + '" data-style="' + item.id + '"' +
        (got ? '' : ' disabled') + ' aria-pressed="' + on + '">' +
      '<span class="style-art">' + art + '</span><span class="style-name">' + item.name + '</span>' +
      (got ? '<span class="style-tag">' + (on ? 'Using' : 'Unlocked') + '</span>'
        : '<span class="style-need"><span class="chip-icon">' + A.sprinkle() + '</span>' + item.need.toLocaleString('en-US') + '</span>') +
    '</button>';
  }

  function renderCustomize() {
    const box = $('#customize');
    if (!box) return;
    box.innerHTML =
      '<label class="style-group-title" for="townName">Town name</label>' +
      '<input id="townName" class="name-input" type="text" maxlength="24" placeholder="Sprinkle Town" autocomplete="off" spellcheck="false">' +
      STYLE_GROUPS.map(function (g) {
        return '<h3 class="style-group-title">' + g[1] + '</h3>' +
          '<div class="style-row">' + G.STYLES[g[0]].map(function (it) { return styleTile(g[0], it); }).join('') + '</div>';
      }).join('');
    const name = $('#townName', box);
    name.value = state.townName;
    name.addEventListener('input', function () {
      state.townName = name.value.trim().slice(0, 24);
      applyStyle();
    });
    name.addEventListener('change', save);
    box.querySelectorAll('.style-tile').forEach(function (b) {
      b.addEventListener('click', function () {
        const group = b.getAttribute('data-group'), id = b.getAttribute('data-style');
        if (!G.setStyle(state, group, id)) return;
        Sound.play('tap');
        applyStyle();
        // Storefronts also repaint the Sprinkle Street pictures below.
        if (group === 'front') renderSprinkles(); else renderCustomize();
        const again = $('.style-tile[data-group="' + group + '"][data-style="' + id + '"]');
        if (again) again.focus({ preventScroll: true });
        afterChange();
        save();
      });
    });
  }

  // Put the chosen customizations on screen.
  function applyStyle() {
    const root = document.documentElement;
    root.setAttribute('data-sky', G.activeStyle(state, 'sky'));
    root.setAttribute('data-ui', G.activeStyle(state, 'ui'));
    root.setAttribute('data-border', G.activeStyle(state, 'border'));
    A.setCoinStyle(G.activeStyle(state, 'coin'));
    A.setFrontStyle(G.activeStyle(state, 'front'));
    Scene.setHats(G.activeStyle(state, 'hats'));
    Scene.setVehicles(G.activeStyle(state, 'vehicle'));
    $('#purseCoin').innerHTML = A.coin();
    setText($('.brand'), state.townName || 'Sprinkle Town');
  }

  function perkCard(p) {
    const got = state.sprinkles >= p.need;
    return '<div class="card perk' + (got ? ' got' : '') + '">' +
      '<div class="perk-top"><span class="perk-need"><span class="chip-icon">' + A.sprinkle() + '</span>' + p.need.toLocaleString('en-US') + '</span>' +
        (got ? '<span class="stamp">UNLOCKED</span>' : '') + '</div>' +
      '<h3 class="perk-name">' + p.name + '</h3><p class="perk-desc">' + p.desc + '</p>' +
      (got ? '' : '<div class="mini-bar"><span style="transform:scaleX(' + Math.min(1, state.sprinkles / p.need) + ')"></span></div>') +
    '</div>';
  }

  function streetCard(i) {
    const b = G.BUSINESSES[i];
    const got = G.isUnlocked(state, i);
    return '<div class="card street-card' + (got ? ' got' : '') + '" style="--tile:' + b.tile + '">' +
      '<div class="street-art">' + A.shop(b.id) + '</div>' +
      '<div class="street-info"><h3 class="perk-name">' + b.name + '</h3>' +
        '<span class="perk-need"><span class="chip-icon">' + A.sprinkle() + '</span>' + needText(i) + '</span></div>' +
      (got ? '<span class="stamp">OPEN</span>' : '') +
    '</div>';
  }

  function updateSprinkles() {
    const r = refs.sprinkles;
    if (!r) return;
    const gain = G.sprinkleGain(state);
    setText(r.count, fmt(state.sprinkles));
    setText(r.bonus, '+' + fmt(state.sprinkles * G.SPRINKLE_BONUS * 100) + '%');
    setText(r.gain, gain > 0 ? 'Reopening now gives you +' + fmt(gain) + ' sprinkles' : 'Earn more coins to get your next sprinkle');
    const next = G.nextSprinkle(state);
    setText(r.next, fmt(next.need) + ' more coins for +1');
    r.nextBar.style.transform = 'scaleX(' + next.progress + ')';
    r.btn.disabled = gain < 1;
  }

  function confirmReopen() {
    const gain = G.sprinkleGain(state);
    if (gain < 1) return;
    openModal({
      art: A.sprinkleJar(),
      title: 'Hold a Grand Reopening?',
      html: '<p>You\'ll get <strong>+' + fmt(gain) + ' golden sprinkles</strong>, for a total profit bonus of +' +
        fmt((state.sprinkles + gain) * G.SPRINKLE_BONUS * 100) + '%. Your coins, shops, managers and upgrades start over.</p>',
      buttons: [
        { label: 'Reopen!', cls: 'btn-pink', action: doReopen },
        { label: 'Not yet', cls: 'btn-plain' },
      ],
    });
  }

  function doReopen() {
    const gain = G.reopen(state, Date.now());
    if (!gain) return;
    Sound.play('fanfare');
    confetti(window.innerWidth / 2, window.innerHeight / 3, 60);
    toast(A.sprinkle(), 'Grand Reopening!', '+' + fmt(gain) + ' golden sprinkles. Every shop earns more now.');
    afterChange();
    showTab('town');
    save();
  }

  // ---------------------------------------------------------------------------
  // Trophies & settings tab
  // ---------------------------------------------------------------------------
  function renderMore() {
    const view = $('#moreView');
    const got = G.trophyCount(state);
    let trophies = '';
    G.TROPHIES.forEach(function (t) {
      const lit = !!state.trophies[t.id];
      trophies += '<div class="card trophy' + (lit ? '' : ' locked') + '">' +
        '<div class="trophy-art">' + A.trophy(lit) + '</div>' +
        '<div class="trophy-name">' + t.name + '</div><div class="trophy-desc">' + t.desc + '</div></div>';
    });
    view.innerHTML =
      '<div class="panel" style="gap:16px">' +
        '<p class="panel-sub">' + got + ' of ' + G.TROPHIES.length + ' trophies. Each one adds +' + Math.round(G.TROPHY_BONUS * 100) + '% profit.</p>' +
        '<div class="trophy-grid">' + trophies + '</div>' +
        '<h2 class="section-title">Stats</h2>' +
        '<dl class="card stats">' +
          stat('Coins this run', 'run') + stat('Coins all time', 'life') + stat('Best run', 'best') +
          stat('Time played', 'time') + stat('Shop taps', 'taps') + stat('Balloons popped', 'balloons') +
          stat('Grand Reopenings', 'reopens') + stat('Town Goals done', 'goals') + stat('VIP tips', 'vips') +
          stat('Sprinkle Perks', 'perks') + stat('Customizations', 'styles') + stat('Profit bonus', 'bonus') +
        '</dl>' +
        '<h2 class="section-title">Settings</h2>' +
        '<div class="card settings">' +
          '<div class="setting-row"><span id="soundLabel">Sound effects</span><button class="switch" id="soundSwitch" type="button" role="switch" aria-labelledby="soundLabel"></button></div>' +
          '<div class="setting-row"><span id="floatLabel">Floating coin numbers</span><button class="switch" id="floatSwitch" type="button" role="switch" aria-labelledby="floatLabel"></button></div>' +
          '<div class="setting-row"><span>Your game saves by itself in this browser.</span></div>' +
          '<div class="settings-buttons">' +
            '<button class="btn btn-small btn-plain" id="exportBtn" type="button">Copy save code</button>' +
            '<button class="btn btn-small btn-plain" id="importBtn" type="button">Load save code</button>' +
            '<button class="btn btn-small btn-pink" id="resetBtn" type="button">Start over</button>' +
          '</div>' +
          '<div id="codeArea" hidden>' +
            '<label for="saveCode" class="setting-row" id="codeLabel"></label>' +
            '<textarea class="save-code" id="saveCode" spellcheck="false"></textarea>' +
            '<div class="settings-buttons" style="margin-top:8px"><button class="btn btn-small btn-mint" id="codeAction" type="button"></button></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const r = {};
    view.querySelectorAll('[data-s]').forEach(function (n) { r[n.getAttribute('data-s')] = n; });
    refs.more = r;

    const soundSwitch = $('#soundSwitch');
    const floatSwitch = $('#floatSwitch');
    const syncSwitches = function () {
      soundSwitch.setAttribute('aria-checked', String(state.settings.sound));
      floatSwitch.setAttribute('aria-checked', String(state.settings.floaters));
    };
    syncSwitches();
    soundSwitch.addEventListener('click', function () { setSound(!state.settings.sound); syncSwitches(); });
    floatSwitch.addEventListener('click', function () { state.settings.floaters = !state.settings.floaters; syncSwitches(); save(); });

    const area = $('#codeArea');
    const code = $('#saveCode');
    const action = $('#codeAction');
    let mode = '';
    $('#exportBtn').addEventListener('click', function () {
      mode = 'export';
      area.hidden = false;
      $('#codeLabel').textContent = 'Your save code. Keep it somewhere safe to move your town to another browser.';
      code.value = encodeSave();
      code.readOnly = true;
      action.textContent = 'Copy';
      code.select();
    });
    $('#importBtn').addEventListener('click', function () {
      mode = 'import';
      area.hidden = false;
      $('#codeLabel').textContent = 'Paste a save code, then press Load. This replaces your current town.';
      code.value = '';
      code.readOnly = false;
      action.textContent = 'Load';
      code.focus();
    });
    action.addEventListener('click', function () {
      if (mode === 'export') {
        const done = function () { action.textContent = 'Copied!'; };
        code.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code.value).then(done, function () { action.textContent = 'Select the text and copy it'; });
        } else {
          action.textContent = 'Select the text and copy it';
        }
      } else {
        const data = decodeSave(code.value);
        if (!data) {
          toast(A.mystery(), 'That code didn\'t work', 'Check that you copied the whole save code and try again.');
          return;
        }
        state = G.restore(data, Date.now());
        state.lastSeen = Date.now();
        afterLoad();
        toast(A.coin(), 'Town loaded!', 'Welcome back to your Sprinkle Town.');
        save();
      }
    });
    $('#resetBtn').addEventListener('click', function () {
      openModal({
        art: A.mystery(),
        title: 'Start over from scratch?',
        html: '<p>This erases everything, including golden sprinkles and trophies. It can\'t be undone.</p>',
        buttons: [
          { label: 'Erase my town', cls: 'btn-pink', action: function () {
            state = G.newState(Date.now());
            try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing saved */ }
            afterLoad();
            showIntro();
          } },
          { label: 'Keep playing', cls: 'btn-plain' },
        ],
      });
    });
    updateMore();
  }

  function stat(label, key) {
    return '<div class="stat"><dt>' + label + '</dt><dd data-s="' + key + '"></dd></div>';
  }

  function updateMore() {
    const r = refs.more;
    if (!r) return;
    const bonus = ((1 + G.SPRINKLE_BONUS * state.sprinkles) * (1 + G.TROPHY_BONUS * G.trophyCount(state)) - 1) * 100;
    setText(r.run, fmt(state.runEarned));
    setText(r.life, fmt(state.lifetimeEarned));
    setText(r.best, fmt(state.stats.bestRun));
    setText(r.time, G.fmtTime(state.stats.playTime));
    setText(r.taps, fmt(state.stats.taps));
    setText(r.balloons, fmt(state.stats.balloons));
    setText(r.reopens, fmt(state.stats.reopenings));
    setText(r.goals, fmt(state.stats.goalsDone));
    setText(r.vips, fmt(state.stats.vips));
    setText(r.perks, G.perkCount(state) + ' of ' + G.PERKS.length);
    setText(r.styles, G.stylesUnlocked(state) + ' of ' + G.stylesTotal());
    setText(r.bonus, '+' + fmt(bonus) + '%');
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  const RENDER = { town: renderTown, managers: renderManagers, upgrades: renderUpgrades, sprinkles: renderSprinkles, more: renderMore };

  function showTab(name, focus) {
    tab = name;
    TABS.forEach(function (t) {
      const button = $('#tab-' + t);
      const on = t === name;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      $('#panel-' + t).hidden = !on;
    });
    refs.sprinkles = null;
    refs.more = null;
    document.querySelectorAll('.floater').forEach(function (f) { f.remove(); });
    if (name === 'more') unseenTrophies = 0;
    RENDER[name]();
    updateBadges();
    window.scrollTo(0, 0);
    if (focus) $('#tab-' + name).focus();
  }

  function setBadge(name, value) {
    const b = $('#tab-' + name + ' .badge');
    const show = !!value && tab !== name;
    b.hidden = !show;
    if (show) setText(b, String(value));
  }

  function updateBadges() {
    const helpers = G.hasPerk(state, 'assistants'), trainees = G.hasPerk(state, 'trainees');
    const hireable = G.MANAGERS.filter(function (m, i) {
      return (!state.managers[i] && state.biz[i].owned > 0 && state.coins >= G.managerCost(state, i)) ||
        (helpers && state.managers[i] && !state.assistants[i] && state.coins >= G.assistantCost(state, i)) ||
        (trainees && state.assistants[i] && !state.trainees[i] && state.coins >= G.traineeCost(state, i));
    }).length + G.BOSSES.filter(function (b, k) {
      return G.bossOpen(state, k) && G.bossLevel(state, k) < G.BOSS_LEVELS && state.coins >= G.bossCost(state, k);
    }).length;
    const goalsReady = state.goals.filter(function (g) { return G.goalDone(state, g); }).length;
    const buyable = G.UPGRADES.filter(function (u) { return G.upgradeAvailable(state, u) && state.coins >= u.cost; }).length;
    const gain = G.sprinkleGain(state);
    setBadge('managers', hireable);
    setBadge('upgrades', buyable);
    setBadge('sprinkles', gain >= Math.max(10, state.sprinkles) ? '!' : 0);
    setBadge('more', unseenTrophies);
    setBadge('town', goalsReady);
    // Each street's button counts what you could open there right now: unlocked
    // Sprinkle Street shops, or the next Main Street or Boardwalk lot once you can afford it.
    DISTRICTS.forEach(function (d) {
      const openable = G.BUSINESSES.filter(function (b, i) {
        return b.street === d && G.canOpen(state, i) && (d === 'sprinkle' || state.coins >= G.costFor(i, 0, 1, state));
      }).length;
      const badge = $('#street-' + d + ' .badge');
      badge.hidden = !openable || district === d;
      setText(badge, String(openable));
    });
  }

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  function setSound(on) {
    state.settings.sound = on;
    syncMuteButton();
    if (on) Sound.play('tap');
    save();
  }

  function syncMuteButton() {
    const on = state.settings.sound;
    const btn = $('#muteBtn');
    btn.innerHTML = A.icon(on ? 'soundOn' : 'soundOff');
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  }

  function updateHud() {
    const now = Date.now();
    setText($('#coins'), fmt(state.coins));
    setText($('#perSec'), fmt(G.incomePerSec(state, now, false)));
    setText($('#sprinkleCount'), fmt(state.sprinkles));
    const boost = $('#boostChip');
    const left = (state.boost.until - now) / 1000;
    boost.hidden = left <= 0;
    if (left > 0) setText(boost, 'Sugar Rush ×' + state.boost.mult + ' · ' + Math.ceil(left) + 's');
  }

  // ---------------------------------------------------------------------------
  // Lucky balloons
  // ---------------------------------------------------------------------------
  function spawnBalloon() {
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const b = el('button', 'balloon', A.balloon(color));
    b.type = 'button';
    b.setAttribute('aria-label', 'Pop the lucky balloon for a prize');
    const w = window.innerWidth;
    const x0 = rand(0.1, 0.8) * w;
    const x1 = Math.min(Math.max(16, x0 + rand(-0.3, 0.3) * w), w - 100);
    b.style.setProperty('--x0', x0 + 'px');
    b.style.setProperty('--x1', x1 + 'px');
    b.addEventListener('animationend', function (e) {
      if (e.target === b) removeBalloon(rand(50, 100));
    });
    b.addEventListener('click', function () { popBalloon(b); });
    document.body.appendChild(b);
    balloonEl = b;
  }

  function removeBalloon(nextInSeconds) {
    if (balloonEl) balloonEl.remove();
    balloonEl = null;
    nextBalloonAt = performance.now() + nextInSeconds * 1000 * (G.hasPerk(state, 'luckySkies') ? 0.5 : 1) * (G.helping(state, 'balloons') ? 0.5 : 1);
  }

  function popBalloon(b) {
    const r = b.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 3, 40);
    Sound.play('pop');
    removeBalloon(rand(60, 120));
    state.stats.balloons++;
    const now = Date.now();
    const perSec = G.incomePerSec(state, now, true);
    if (Math.random() < 0.45 && perSec > 0) {
      G.startRush(state, now);
      toast(A.balloon('#FF5FA2'), 'Sugar Rush!', 'Every shop earns triple for ' + G.rushSeconds(state) + ' seconds.');
    } else {
      const amount = Math.max(20, perSec * 60);
      G.earn(state, amount);
      bumpPurse();
      toast(A.coin(), 'Coin Shower!', '+' + fmt(amount) + ' coins rained down on your town.');
    }
    afterChange();
  }

  // ---------------------------------------------------------------------------
  // Tips for new players (each shown once)
  // ---------------------------------------------------------------------------
  function checkHints() {
    const h = state.hints;
    if (!h.manager && !state.managers[0] && state.coins >= G.managerCost(state, 0)) {
      h.manager = true;
      toast(mgrFace(0), 'You can hire a manager!', 'Open Managers so your Lemonade Stand runs by itself.', true);
    } else if (!h.upgrade && G.UPGRADES.some(function (u) { return G.upgradeAvailable(state, u) && state.coins >= u.cost; })) {
      h.upgrade = true;
      toast(A.shop('lemon'), 'Upgrade ready!', 'Check the Upgrades menu to triple a shop\'s profit.', true);
    } else if (!h.sprinkles && G.sprinkleGain(state) >= 10) {
      h.sprinkles = true;
      toast(A.sprinkle(), 'Golden sprinkles!', 'A Grand Reopening would boost your profits. See the Sprinkles menu.', true);
    }
  }

  function showIntro() {
    openModal({
      art: A.shop('lemon'),
      title: 'Welcome to Sprinkle Town!',
      html: '<p>Tap your Lemonade Stand to sell lemonade. Buy more stands, open new shops, and hire managers to keep the coins rolling in, even while you\'re away.</p>',
      buttons: [{ label: 'Open for business!', cls: 'btn-pink' }],
    });
  }

  // ---------------------------------------------------------------------------
  // Game clock
  // ---------------------------------------------------------------------------
  function advance() {
    const nowPerf = performance.now();
    const dt = (nowPerf - lastPerf) / 1000;
    lastPerf = nowPerf;
    if (dt <= 0) return { dt: 0, payouts: [] };
    return { dt: dt, payouts: G.tick(state, dt, Date.now()) };
  }

  // After any purchase or prize: trophies, badges and numbers.
  function afterChange() {
    const won = G.checkTrophies(state);
    if (won.length) {
      unseenTrophies += won.length;
      Sound.play('fanfare');
      if (won.length === 1) {
        toast(A.trophy(true), 'Trophy: ' + won[0].name, won[0].desc + '. +' + Math.round(G.TROPHY_BONUS * 100) + '% profit!', true);
      } else {
        toast(A.trophy(true), won.length + ' new trophies!', won.map(function (t) { return t.name; }).join(', ') + '.', true);
      }
      if (tab === 'more') renderMore();
    }
    const unlocked = G.BUSINESSES.filter(function (b) { return b.need && state.sprinkles >= b.need && !state.hints['street-' + b.id]; });
    if (unlocked.length) {
      unlocked.forEach(function (b) { state.hints['street-' + b.id] = true; });
      toast(A.shop(unlocked[0].id), unlocked.length === 1 ? 'New on Sprinkle Street: ' + unlocked[0].name + '!' : unlocked.length + ' new Sprinkle Street shops!',
        (unlocked.length === 1 ? '' : unlocked.map(function (b) { return b.name; }).join(', ') + '. ') + 'Open them from the Town tab on Sprinkle Street.', true);
      if (tab === 'town' && district === 'sprinkle') renderTown();
    }
    const looks = [];
    Object.keys(G.STYLES).forEach(function (g) {
      G.STYLES[g].forEach(function (it) {
        if (it.need > 0 && state.sprinkles >= it.need && !state.hints['style-' + g + '-' + it.id]) {
          state.hints['style-' + g + '-' + it.id] = true;
          looks.push(it.name);
        }
      });
    });
    if (looks.length) {
      toast(A.sprinkle(), looks.length === 1 ? 'New look: ' + looks[0] : looks.length + ' new looks unlocked!',
        (looks.length === 1 ? '' : looks.join(', ') + '. ') + 'Try them in Sprinkles → Customize.', true);
      if (tab === 'sprinkles') renderCustomize();
    }
    const perks = G.PERKS.filter(function (p) { return state.sprinkles >= p.need && !state.hints['perk-' + p.id]; });
    if (perks.length) {
      perks.forEach(function (p) { state.hints['perk-' + p.id] = true; });
      toast(A.sprinkle(), perks.length === 1 ? 'New perk: ' + perks[0].name : perks.length + ' new Sprinkle Perks!',
        perks.length === 1 ? perks[0].desc : perks.map(function (p) { return p.name; }).join(', ') + '. See the Sprinkles menu.', true);
    }
    updateHud();
    if (tab === 'town') { updateTown(true); updateGoals(); }
    if (tab === 'managers') updateManagers();
    if (tab === 'upgrades') updateUpgrades();
    if (tab === 'sprinkles') updateSprinkles();
    updateBadges();
  }

  function frame() {
    const nowPerf = performance.now();
    const step = advance();

    if (hiddenAt && !document.hidden) {
      const away = (Date.now() - hiddenAt.time) / 1000;
      const gained = state.coins - hiddenAt.coins;
      if (away > 30 && gained > 0) toast(A.coin(), 'Welcome back!', 'Your managers earned ' + fmt(gained) + ' coins while you were gone.', true);
      hiddenAt = null;
    }

    let manual = false;
    step.payouts.forEach(function (p) {
      if (p.manual) manual = true;
      floaters[p.i].amount += p.amount;
      if (tab === 'town') {
        const r = refs.shops.find(function (s) { return s.i === p.i && s.lane; });
        if (r) r.lane.payout();
      }
    });
    if (manual) { Sound.play('coin'); bumpPurse(); }

    if (tab === 'town') {
      animateTown(Math.min(step.dt, 0.1));
      updateTown(nowPerf - lastText > 100);
    }
    // Earnings only float up from shops you can see.
    floaters.forEach(function (f, i) {
      const r = tab === 'town' && refs.shops.find(function (s) { return s.i === i && !s.locked; });
      if (!r || !r.visible || !state.settings.floaters) f.amount = 0;
    });

    if (nowPerf - lastText > 100) {
      lastText = nowPerf;
      updateHud();
    }

    if (nowPerf - lastSlow > 400) {
      lastSlow = nowPerf;
      afterChange();
      checkHints();
      if (tab === 'more') updateMore();
      maybeVip(nowPerf);
      if (!balloonEl && nowPerf >= nextBalloonAt && state.lifetimeEarned >= 30 && !document.hidden && $('#modalRoot').hidden) spawnBalloon();
    }

    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Start up
  // ---------------------------------------------------------------------------
  function afterLoad() {
    applyStyle();
    closeModal();
    removeBalloon(rand(35, 70));
    unseenTrophies = 0;
    syncMuteButton();
    syncBuyToggle();
    showTab('town');
  }

  function syncBuyToggle() {
    document.querySelectorAll('.buy-toggle button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-mode') === state.buyMode));
    });
  }

  function wireUi() {
    $('#purseCoin').innerHTML = A.coin();
    $('#sprinkleChipIcon').innerHTML = A.sprinkle();
    document.querySelectorAll('.tab-icon').forEach(function (n) { n.innerHTML = A.icon(n.getAttribute('data-icon')); });

    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    $('.tabbar').addEventListener('keydown', function (e) {
      const k = TABS.indexOf(tab);
      if (e.key === 'ArrowRight') showTab(TABS[(k + 1) % TABS.length], true);
      else if (e.key === 'ArrowLeft') showTab(TABS[(k + TABS.length - 1) % TABS.length], true);
      else return;
      e.preventDefault();
    });

    document.querySelectorAll('.buy-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.buyMode = b.getAttribute('data-mode');
        syncBuyToggle();
        updateTown(true);
      });
    });

    document.querySelectorAll('.district-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        district = b.getAttribute('data-district');
        renderTown();
        updateBadges();
      });
    });
    $('#districtIcon').innerHTML = A.sprinkle();
    $('#walkIcon').innerHTML = A.product('surf');
    $('#muteBtn').addEventListener('click', function () { setSound(!state.settings.sound); });
    $('#sprinkleChip').addEventListener('click', function () { showTab('sprinkles'); });

    const unlockAudio = function () {
      Sound.unlocked = true;
      if (state.settings.sound) Sound.ready();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      save();
      hiddenAt = { time: Date.now(), coins: state.coins };
    });
    window.addEventListener('pagehide', save);
    setInterval(save, 10000);
  }

  function start() {
    const saved = readSave();
    const now = Date.now();
    state = saved ? G.restore(saved, now) : G.newState(now);
    wireUi();
    afterLoad();

    if (!saved) {
      showIntro();
    } else {
      const away = (now - state.lastSeen) / 1000;
      const earned = G.offlineEarnings(state, away);
      if (away > 30 && earned > 0) {
        G.earn(state, earned);
        openModal({
          art: mgrFace(0),
          title: 'Welcome back!',
          html: '<p>You were away for ' + G.fmtTime(away) + '. Your managers kept the shops busy and earned</p>' +
            '<div class="big-number">' + fmt(earned) + '</div><p>coins' +
            (away > G.offlineCap(state) ? ' (managers get paid for up to ' + G.fmtTime(G.offlineCap(state)) + ' away)' : '') + '.</p>',
          buttons: [{ label: 'Collect!', cls: 'btn-mint', action: function () { Sound.play('coin'); bumpPurse(); } }],
        });
      }
    }
    state.lastSeen = now;
    lastPerf = performance.now();
    requestAnimationFrame(frame);
  }

  start();
})();
