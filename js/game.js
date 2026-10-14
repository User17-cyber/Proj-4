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
  let refs = { shops: [], managers: [], upgrades: [], sprinkles: null, more: null, layout: '' };
  const floaters = G.BUSINESSES.map(function () { return { amount: 0, last: 0 }; });
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(a, b) { return a + Math.random() * (b - a); }

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
  function toast(art, title, text) {
    const box = $('#toasts');
    const t = el('div', 'toast', '<span class="toast-art">' + art + '</span><span><strong></strong><span class="toast-text"></span></span>');
    $('strong', t).textContent = title;
    $('.toast-text', t).textContent = text;
    box.appendChild(t);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 320);
    }, 3000);
  }

  function confetti(x, y, count) {
    if (reducedMotion) return;
    const fx = $('#fx');
    const colors = ['#FF5FA2', '#FFD23F', '#4CC9F0', '#3DDC97', '#8C6CFF', '#FF9F43'];
    for (let k = 0; k < count; k++) {
      const c = el('span', 'confetti');
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

  function floater(node, text) {
    const r = node.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const f = el('span', 'floater');
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + rand(-14, 14) + 'px';
    f.style.top = r.top + 4 + 'px';
    f.addEventListener('animationend', function () { f.remove(); });
    $('#fx').appendChild(f);
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
  function renderTown() {
    const list = $('#shopList');
    list.textContent = '';
    refs.shops = [];
    let lockedShown = 0;
    G.BUSINESSES.forEach(function (b, i) {
      if (state.biz[i].owned > 0) {
        list.appendChild(shopCard(i));
      } else if (lockedShown === 0) {
        list.appendChild(lockedCard(i));
        lockedShown++;
      } else if (lockedShown === 1) {
        list.appendChild(mysteryCard(G.BUSINESSES.length - i));
        lockedShown++;
      }
    });
    updateTown(true);
  }

  function shopCard(i) {
    const b = G.BUSINESSES[i];
    const card = el('article', 'card shop');
    card.style.setProperty('--tile', b.tile);
    card.style.setProperty('--barc', b.bar);
    card.innerHTML =
      '<button class="shop-icon" type="button" aria-label="Run ' + b.name + '">' + A.shop(b.id) +
        '<span class="owned-badge"></span><span class="tap-hint">TAP!</span>' +
        '<span class="manager-pin" hidden>' + A.face(G.MANAGERS[i].animal, G.MANAGERS[i].color) + '</span>' +
      '</button>' +
      '<div class="shop-body">' +
        '<div class="shop-name-row"><h2 class="shop-name">' + b.name + '</h2><span class="shop-speed"></span></div>' +
        '<div class="bar"><div class="bar-fill"></div><div class="bar-text"></div></div>' +
        '<div class="shop-actions">' +
          '<button class="btn buy-btn" type="button"><span class="buy-n"></span><span class="buy-cost">' + coinCost(0) + '</span></button>' +
          '<div class="timer" title="Time left"></div>' +
        '</div>' +
        '<div class="milestone"><div class="mini-bar"><span></span></div><span class="ms-text"></span></div>' +
      '</div>';

    const r = {
      i: i,
      card: card,
      icon: $('.shop-icon', card),
      owned: $('.owned-badge', card),
      hint: $('.tap-hint', card),
      pin: $('.manager-pin', card),
      speed: $('.shop-speed', card),
      bar: $('.bar', card),
      fill: $('.bar-fill', card),
      barText: $('.bar-text', card),
      buy: $('.buy-btn', card),
      buyN: $('.buy-n', card),
      cost: $('.buy-btn .cost', card),
      timer: $('.timer', card),
      msBar: $('.mini-bar > span', card),
      msText: $('.ms-text', card),
    };

    r.icon.addEventListener('click', function () {
      if (G.tap(state, i)) {
        Sound.play('tap');
        r.icon.classList.remove('squish');
        void r.icon.offsetWidth;
        r.icon.classList.add('squish');
        updateTown(true);
      }
    });

    r.buy.addEventListener('click', function () {
      const n = G.buyAmount(state, i);
      const before = G.milestonesReached(state.biz[i].owned);
      if (!G.buy(state, i, n)) { Sound.play('nope'); return; }
      Sound.play('buy');
      const after = G.milestonesReached(state.biz[i].owned);
      if (after > before) {
        const next = G.nextMilestone(state.biz[i].owned);
        Sound.play('fanfare');
        confettiAt(r.icon, 24);
        toast(A.shop(b.id), b.name + ' is ' + Math.pow(2, after - before) + '× faster!',
          next ? 'Own ' + next + ' to double its speed again.' : 'It has reached top speed.');
      }
      afterChange();
    });

    refs.shops.push(r);
    return card;
  }

  function lockedCard(i) {
    const b = G.BUSINESSES[i];
    const card = el('article', 'card shop locked');
    card.innerHTML =
      '<div class="shop-icon">' + A.shop(b.id) + '</div>' +
      '<div class="shop-body">' +
        '<div class="shop-name-row"><h2 class="shop-name">' + b.name + '</h2></div>' +
        '<p class="shop-note">Earns ' + fmt(b.rev) + ' coins every ' + G.fmtTime(b.time) + ' per shop.</p>' +
        '<button class="btn btn-pink open-btn" type="button"><span>Open shop</span><span class="buy-cost">' + coinCost(b.cost) + '</span></button>' +
      '</div>';
    const btn = $('.open-btn', card);
    btn.addEventListener('click', function () {
      if (!G.buy(state, i, 1)) { Sound.play('nope'); return; }
      Sound.play('fanfare');
      confettiAt(btn, 36);
      toast(A.shop(b.id), 'New shop: ' + b.name + '!', 'Tap it to start earning.');
      renderTown();
      afterChange();
    });
    refs.shops.push({ i: i, locked: true, buy: btn });
    return card;
  }

  function mysteryCard(remaining) {
    const card = el('article', 'card shop mystery');
    card.innerHTML =
      '<div class="shop-icon">' + A.mystery() + '</div>' +
      '<div class="shop-body">' +
        '<div class="shop-name-row"><h2 class="shop-name">Coming soon</h2></div>' +
        '<p class="shop-note">' + remaining + ' more ' + (remaining === 1 ? 'shop' : 'shops') + ' to discover. Keep growing your town!</p>' +
      '</div>';
    return card;
  }

  function updateTown(text) {
    const now = Date.now();
    refs.shops.forEach(function (r) {
      const i = r.i;
      const b = state.biz[i];
      if (r.locked) {
        r.buy.disabled = state.coins < G.BUSINESSES[i].cost;
        return;
      }
      const managed = state.managers[i];
      const time = G.cycleTime(state, i);
      const fast = time < 0.2 && b.running;
      r.bar.classList.toggle('blur', fast);
      if (!fast) r.fill.style.transform = 'scaleX(' + Math.min(1, b.progress) + ')';
      if (!text) return;

      const rev = G.revenue(state, i, now);
      setText(r.owned, String(b.owned));
      setText(r.barText, fast ? fmt(rev / time) + ' / sec' : '+' + fmt(rev));
      setText(r.timer, b.running ? G.fmtTime((1 - b.progress) * time) : G.fmtTime(time));
      setText(r.speed, fmt(rev / time) + '/s');
      r.hint.hidden = managed || b.running;
      r.pin.hidden = !managed;
      r.icon.classList.toggle('working', managed);
      r.icon.disabled = managed;
      r.icon.setAttribute('aria-label', managed ? G.BUSINESSES[i].name + ' (run by ' + G.MANAGERS[i].name + ')' : 'Run ' + G.BUSINESSES[i].name);

      const n = G.buyAmount(state, i);
      const cost = G.costFor(i, b.owned, n);
      setText(r.buyN, 'Buy ×' + n);
      setText(r.cost, fmt(cost));
      r.buy.disabled = cost > state.coins;

      const next = G.nextMilestone(b.owned);
      if (next) {
        const prev = G.prevMilestone(b.owned);
        r.msBar.style.transform = 'scaleX(' + (b.owned - prev) / (next - prev) + ')';
        setText(r.msText, '2× speed at ' + next);
      } else {
        r.msBar.style.transform = 'scaleX(1)';
        setText(r.msText, 'Top speed!');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Managers tab
  // ---------------------------------------------------------------------------
  function renderManagers() {
    const list = $('#managerList');
    list.textContent = '';
    refs.managers = [];
    G.MANAGERS.forEach(function (m, i) {
      const b = G.BUSINESSES[i];
      const open = state.biz[i].owned > 0;
      const hired = state.managers[i];
      const card = el('article', 'card mgr' + (open ? '' : ' unavailable'));
      card.style.setProperty('--tile', b.tile);
      card.innerHTML =
        '<div class="mgr-face">' + A.face(m.animal, m.color) + '</div>' +
        '<div class="mgr-info">' +
          '<h2 class="mgr-name">' + m.name + '</h2>' +
          '<p class="mgr-job">' + (open ? 'Runs your ' + b.name + ' for you.' : 'Wants to run a ' + b.name + '.') + '</p>' +
          (hired ? '<span class="stamp">ON THE JOB!</span>'
            : open ? '<button class="btn btn-mint btn-small" type="button"><span>Hire</span><span class="buy-cost">' + coinCost(m.cost) + '</span></button>'
              : '<button class="btn btn-small" type="button" disabled>Open the shop first</button>') +
        '</div>';
      const btn = $('.btn', card);
      if (btn && open && !hired) {
        btn.addEventListener('click', function () {
          if (!G.hireManager(state, i)) { Sound.play('nope'); return; }
          Sound.play('fanfare');
          confettiAt(btn, 30);
          toast(A.face(m.animal, m.color), m.name + ' is hired!', 'Your ' + b.name + ' now runs by itself.');
          renderManagers();
          afterChange();
        });
        refs.managers.push({ i: i, btn: btn });
      }
      list.appendChild(card);
    });
  }

  function updateManagers() {
    refs.managers.forEach(function (r) { r.btn.disabled = state.coins < G.MANAGERS[r.i].cost; });
  }

  // ---------------------------------------------------------------------------
  // Upgrades tab
  // ---------------------------------------------------------------------------
  const UPGRADES_SHOWN = 12;

  function upgradeArt(u) {
    return u.target < 0 ? A.sprinkleJar() : A.shop(G.BUSINESSES[u.target].id);
  }

  function upgradeEffect(u) {
    return u.target < 0 ? 'Every shop earns ×' + u.mult : G.BUSINESSES[u.target].name + ' earns ×' + u.mult;
  }

  function renderUpgrades() {
    const list = $('#upgradeList');
    list.textContent = '';
    refs.upgrades = [];
    const available = G.UPGRADES.filter(function (u) { return G.upgradeAvailable(state, u); });
    available.slice(0, UPGRADES_SHOWN).forEach(function (u) {
      const row = el('article', 'card upg');
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
  function renderSprinkles() {
    const view = $('#sprinkleView');
    view.innerHTML =
      '<div class="panel" style="gap:16px">' +
        '<section class="card sprinkle-hero">' +
          '<div class="sprinkle-jar">' + A.sprinkleJar() + '</div>' +
          '<div>' +
            '<div class="big-number" data-r="count"></div>' +
            '<p>golden sprinkles</p>' +
            '<p>Each one adds +' + Math.round(G.SPRINKLE_BONUS * 100) + '% profit to every shop, forever. Right now that\'s <strong data-r="bonus"></strong>.</p>' +
          '</div>' +
        '</section>' +
        '<section class="card reopen">' +
          '<h2>Grand Reopening</h2>' +
          '<p>Start your town over from one lemonade stand and collect golden sprinkles for all the coins you\'ve earned.</p>' +
          '<div class="gain-line"><span class="chip-icon">' + A.sprinkle() + '</span><span data-r="gain"></span></div>' +
          '<div class="milestone"><div class="mini-bar"><span data-r="nextBar"></span></div><span data-r="next"></span></div>' +
          '<div class="keep-lose">' +
            '<div class="keep"><strong>YOU KEEP</strong>Golden sprinkles, trophies</div>' +
            '<div class="lose"><strong>STARTS OVER</strong>Coins, shops, managers, upgrades</div>' +
          '</div>' +
          '<button class="btn btn-pink" type="button" data-r="btn">Hold a Grand Reopening</button>' +
        '</section>' +
      '</div>';
    const r = {};
    view.querySelectorAll('[data-r]').forEach(function (n) { r[n.getAttribute('data-r')] = n; });
    r.btn.addEventListener('click', confirmReopen);
    refs.sprinkles = r;
    updateSprinkles();
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
          stat('Grand Reopenings', 'reopens') + stat('Profit bonus', 'bonus') +
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
    const hireable = G.MANAGERS.filter(function (m, i) { return !state.managers[i] && state.biz[i].owned > 0 && state.coins >= m.cost; }).length;
    const buyable = G.UPGRADES.filter(function (u) { return G.upgradeAvailable(state, u) && state.coins >= u.cost; }).length;
    const gain = G.sprinkleGain(state);
    setBadge('managers', hireable);
    setBadge('upgrades', buyable);
    setBadge('sprinkles', gain >= Math.max(10, state.sprinkles) ? '!' : 0);
    setBadge('more', unseenTrophies);
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
    nextBalloonAt = performance.now() + nextInSeconds * 1000;
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
      state.boost = { mult: 3, until: Math.max(now, state.boost.until) + 30000 };
      toast(A.balloon('#FF5FA2'), 'Sugar Rush!', 'Every shop earns triple for 30 seconds.');
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
    if (!h.manager && !state.managers[0] && state.coins >= G.MANAGERS[0].cost) {
      h.manager = true;
      toast(A.face(G.MANAGERS[0].animal, G.MANAGERS[0].color), 'You can hire a manager!', 'Open Managers so your Lemonade Stand runs by itself.');
    } else if (!h.upgrade && G.UPGRADES.some(function (u) { return G.upgradeAvailable(state, u) && state.coins >= u.cost; })) {
      h.upgrade = true;
      toast(A.shop('lemon'), 'Upgrade ready!', 'Check the Upgrades menu to triple a shop\'s profit.');
    } else if (!h.sprinkles && G.sprinkleGain(state) >= 10) {
      h.sprinkles = true;
      toast(A.sprinkle(), 'Golden sprinkles!', 'A Grand Reopening would boost your profits. See the Sprinkles menu.');
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
        toast(A.trophy(true), 'Trophy: ' + won[0].name, won[0].desc + '. +' + Math.round(G.TROPHY_BONUS * 100) + '% profit!');
      } else {
        toast(A.trophy(true), won.length + ' new trophies!', won.map(function (t) { return t.name; }).join(', ') + '.');
      }
      if (tab === 'more') renderMore();
    }
    updateHud();
    if (tab === 'town') updateTown(true);
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
      if (away > 30 && gained > 0) toast(A.coin(), 'Welcome back!', 'Your managers earned ' + fmt(gained) + ' coins while you were gone.');
      hiddenAt = null;
    }

    let manual = false;
    step.payouts.forEach(function (p) {
      if (p.manual) manual = true;
      const f = floaters[p.i];
      f.amount += p.amount;
    });
    if (manual) { Sound.play('coin'); bumpPurse(); }

    if (tab === 'town') {
      if (state.settings.floaters && !document.hidden) {
        refs.shops.forEach(function (r) {
          const f = floaters[r.i];
          if (r.locked || f.amount <= 0 || nowPerf - f.last < 600) return;
          floater(r.icon, '+' + fmt(f.amount));
          f.amount = 0;
          f.last = nowPerf;
        });
      }
      updateTown(nowPerf - lastText > 100);
    }
    floaters.forEach(function (f) { if (tab !== 'town' || !state.settings.floaters) f.amount = 0; });

    if (nowPerf - lastText > 100) {
      lastText = nowPerf;
      updateHud();
    }

    if (nowPerf - lastSlow > 400) {
      lastSlow = nowPerf;
      afterChange();
      checkHints();
      if (tab === 'more') updateMore();
      if (!balloonEl && nowPerf >= nextBalloonAt && state.lifetimeEarned >= 30 && !document.hidden && $('#modalRoot').hidden) spawnBalloon();
    }

    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Start up
  // ---------------------------------------------------------------------------
  function afterLoad() {
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
          art: A.face(G.MANAGERS[0].animal, G.MANAGERS[0].color),
          title: 'Welcome back!',
          html: '<p>You were away for ' + G.fmtTime(away) + '. Your managers kept the shops busy and earned</p>' +
            '<div class="big-number">' + fmt(earned) + '</div><p>coins' +
            (away > G.OFFLINE_CAP ? ' (managers get paid for up to ' + G.fmtTime(G.OFFLINE_CAP) + ' away)' : '') + '.</p>',
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
