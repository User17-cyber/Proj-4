/*
 * Sprinkle Town Tycoon — the little street scene at the top of each shop card.
 *
 * Customers walk up and wait in line. Each finished batch serves the person at
 * the front, who hops, grabs their treat and walks off while coins pop out.
 * The line gets longer as you own more, a branch building appears behind the
 * shop at every speed milestone, and delivery vans start driving by once the
 * shop is busy. A hired manager stands out front and waves.
 *
 * Factories (kind 'factory') work differently: hard-hat workers stand along a
 * conveyor belt, products ride out of the door into a waiting truck, and each
 * finished batch sends the loaded truck driving off while the next pulls in.
 *
 * Now and then a VIP visitor in gold with a crown stops by any open shop or
 * factory and waits with a "Tip!" bubble; the page collects the tip on a tap.
 *
 * Drawn on a <canvas> in CSS pixels; knows nothing about the game rules. The
 * page feeds it { owned, managed, running, time, milestones } every frame.
 */
(function (root) {
  'use strict';

  const INK = '#2B2147';
  const SKIN = ['#FFE0C7', '#F6C9A0', '#E0A877', '#B87A4B', '#8A5634'];
  const SHIRTS = ['#FF5FA2', '#4CC9F0', '#3DDC97', '#FF9F43', '#8C6CFF', '#FFD23F', '#FF6B6B', '#5B8CFF'];
  const HATS = ['none', 'none', 'cap', 'bow', 'beanie', 'cap', 'none'];
  // The Customer Hats customization: 'mixed' picks from HATS, anything else dresses everyone alike.
  let hatStyle = 'mixed';
  function setHats(style) { hatStyle = style || 'mixed'; }
  const GAP = 25;          // space between people in line
  const BRANCH = 40;       // spacing of the branch buildings behind the shop
  const reducedMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutBack(x) { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  // Mix a #RRGGBB color toward white (amount > 0) or toward ink (amount < 0).
  function mix(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const from = [n >> 16, (n >> 8) & 255, n & 255];
    const to = amount < 0 ? [43, 33, 71] : [255, 255, 255];
    const a = Math.abs(amount);
    return 'rgb(' + from.map(function (v, k) { return Math.round(v + (to[k] - v) * a); }).join(',') + ')';
  }

  // The cartoon SVGs, turned into images the canvas can draw.
  const images = {};
  function image(key, svg) {
    if (!images[key]) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" '));
      images[key] = img;
    }
    return images[key];
  }
  function ready(img) { return !!img && img.complete && img.naturalWidth > 0; }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // opts: { key, kind, shopSvg, productSvg, faceSvg, assistantSvg, tile, bar, night, locked, signText, build, onServe(x, y) }
  // info (each frame): { owned, managed, assistant, running, time, milestones }
  function createLane(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const factory = opts.kind === 'factory' && !opts.locked;
    const shopImg = image('shop:' + opts.key, opts.shopSvg);
    const productImg = opts.productSvg ? image('product:' + opts.key, opts.productSvg) : null;
    const faceImg = opts.faceSvg ? image('face:' + opts.key, opts.faceSvg) : null;
    const helperImg = opts.assistantSvg ? image('helper:' + opts.key, opts.assistantSvg) : null;

    let w = 0, h = 0, dpr = 1, lay = null;
    let bg = null, bgKey = '';
    let t = rand(0, 10);
    let people = [], particles = [], vans = [];
    let items = [], trucks = [], beltShift = 0, itemTimer = 0, loadTimer = 0;
    let vip = null;
    const VIP_WAIT = 22; // seconds a VIP waits before giving up
    let pending = 0, cooldown = 0, spawnTimer = 0.2, vanTimer = rand(1, 4), puffTimer = 0, passTimer = rand(0.5, 2);
    let bump = 0, build = opts.build ? 0 : 1, wave = 0, bubble = null;
    let info = { owned: 1, managed: false, running: false, time: 1, milestones: 0 };
    let seeded = false, lastManaged = null, lastAssistant = null, lastMilestones = null;
    const clouds = [{ x: rand(0, 1), y: rand(0.1, 0.22), s: rand(0.8, 1) }, { x: rand(0, 1), y: rand(0.16, 0.34), s: rand(0.55, 0.75) }];

    if (opts.build) dust();

    // ------------------------------------------------------------- layout
    function layout() {
      const feet = h - 20;
      const S = Math.min(h - 10, 104);            // main building size
      const bx = 4;
      const managerX = bx + S + 10;
      const helperX = managerX + 24; // an assistant stands beside the manager
      const staffEnd = info.managed ? (info.assistant ? helperX : managerX) : 0;
      const front = info.managed ? staffEnd + 28 : bx + S + 14;
      lay = {
        feet: feet, S: S, bx: bx, managerX: managerX, helperX: helperX, front: front,
        walkTop: feet - 12, roadTop: feet + 5,
        maxLine: Math.max(1, Math.floor((w - front - 14) / GAP) + 1),
      };
      if (factory) {
        lay.truckX = w - 54;
        lay.beltStart = info.managed ? staffEnd + 16 : bx + S - 6;
        lay.beltEnd = lay.truckX + 16;
        lay.beltTop = feet - 18;
        lay.workers = Math.max(1, Math.floor((lay.beltEnd - lay.beltStart - 16) / 34));
        trucks.forEach(function (tr) { if (tr.state === 'park') tr.x = lay.truckX; });
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(root.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgKey = '';
      layout();
    }

    function slotX(k) { return lay.front + k * GAP; }
    function lineTarget() { return clamp(1 + Math.floor(Math.log2(Math.max(1, info.owned))), 1, lay.maxLine); }
    // Busier (faster) shops have customers who hurry.
    function hurry() { return clamp(1 + Math.log2(1 / Math.max(info.time, 0.01)) * 0.15, 0.85, 2.2); }

    function person(x, dir) {
      return {
        x: x, dir: dir, state: 'line', slot: 0, walking: false, carry: false, timer: 0,
        skin: pick(SKIN), shirt: pick(SHIRTS), hat: hatStyle === 'mixed' ? pick(HATS) : hatStyle, hatColor: pick(SHIRTS),
        phase: rand(0, 6), speed: rand(36, 50),
      };
    }

    // ------------------------------------------------------------- events
    function payout() {
      if (opts.locked) return;
      pending = Math.min(4, pending + Math.min(3, 1 + Math.floor(info.milestones / 2)));
    }

    function poke() { bump = 1; }

    function say(text) {
      bubble = { text: text, t: 1.8 };
      wave = 1;
    }

    function dust() {
      for (let k = 0; k < 14; k++) {
        particles.push({ kind: 'dust', x: 50 + rand(-40, 40), y: (h || 110) - 22 + rand(-4, 2), vx: rand(-50, 50), vy: rand(-30, -5), life: rand(0.5, 0.9), max: 0.9, size: rand(4, 8) });
      }
    }

    function sparkles(x, y, spread, n) {
      if (reducedMotion) return;
      for (let k = 0; k < n; k++) {
        particles.push({ kind: 'spark', x: x + rand(-spread, spread), y: y + rand(-spread * 0.7, spread * 0.5), vx: rand(-20, 20), vy: rand(-50, -15), life: rand(0.6, 1.1), max: 1.1, size: rand(3, 6) });
      }
    }

    function serve(c, speed) {
      c.state = 'served';
      c.timer = 0.3;
      c.carry = true;
      pending--;
      cooldown = clamp(0.45 / speed, 0.12, 0.5);
      wave = Math.max(wave, 0.5);
      const cx = c.x - 6, cy = lay.feet - 38;
      if (!reducedMotion) {
        for (let k = 0; k < 3; k++) particles.push({ kind: 'coin', x: cx, y: cy, vx: rand(-45, 45), vy: rand(-170, -120), life: 0.75, max: 0.75, size: 4.5 });
      }
      if (opts.onServe) opts.onServe(cx, cy);
    }

    // ------------------------------------------------------------- update
    function update(dt, next) {
      info = next;
      t += dt;
      if (!w) return;
      if (lastAssistant !== info.assistant && lastManaged === info.managed) {
        layout();
        if (lastAssistant === false && info.assistant) say('Happy to help!');
        lastAssistant = info.assistant;
      }
      if (lastManaged !== info.managed) {
        lastAssistant = info.assistant;
        layout();
        if (lastManaged === false && info.managed) say('Hi boss!');
        lastManaged = info.managed;
      }
      if (lastMilestones !== null && info.milestones > lastMilestones) {
        sparkles(lay.bx + lay.S / 2, lay.feet - lay.S / 2, 40, 16);
        const n = branchCount();
        if (n > 0) sparkles(w - 8 - n * BRANCH + 20, lay.walkTop - 24, 18, 10);
      }
      lastMilestones = info.milestones;
      if (bump > 0) bump = Math.max(0, bump - dt * 4);
      if (build < 1) build = Math.min(1, build + dt * 1.5);
      if (wave > 0) wave -= dt;
      if (bubble && (bubble.t -= dt) <= 0) bubble = null;

      if (opts.locked) updatePassersby(dt);
      else if (factory) updateFactory(dt);
      else updateShop(dt);
      updateVip(dt);

      particles.forEach(function (p) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'coin') p.vy += 420 * dt;
        if (p.kind === 'dust') { p.vx *= 0.92; p.size += dt * 10; }
        if (p.kind === 'puff') p.size += dt * 5;
      });
      particles = particles.filter(function (p) { return p.life > 0; });
      if (particles.length > 70) particles.splice(0, particles.length - 70);

      if (!opts.locked && !factory && info.owned >= 10) {
        vanTimer -= dt;
        if (vanTimer <= 0) {
          vans.push({ x: -54, speed: rand(70, 95) });
          vanTimer = rand(7, 13) / (1 + info.milestones * 0.35);
        }
      }
      vans.forEach(function (v) { v.x += v.speed * dt; });
      vans = vans.filter(function (v) { return v.x < w + 10; });

      clouds.forEach(function (c) {
        c.x += dt * 0.006 * c.s;
        if (c.x > 1.25) c.x = -0.25;
      });
    }

    function updateShop(dt) {
      const speed = hurry();
      if (!seeded) {
        seeded = true;
        for (let k = 0; k < lineTarget(); k++) people.push(person(slotX(k), -1));
      }
      const line = people.filter(function (c) { return c.state === 'line'; });
      line.forEach(function (c, k) { c.slot = k; });

      spawnTimer -= dt;
      if (line.length < lineTarget() && spawnTimer <= 0) {
        people.push(person(w + 14, -1));
        spawnTimer = rand(0.35, 0.9) / speed;
      }

      people.forEach(function (c) {
        c.walking = false;
        if (c.state === 'line') {
          const tx = slotX(c.slot);
          const step = c.speed * speed * dt;
          if (c.x > tx + 0.5) { c.x = Math.max(tx, c.x - step); c.walking = true; c.dir = -1; }
          else if (c.x < tx - 0.5) { c.x = Math.min(tx, c.x + step); c.walking = true; c.dir = 1; }
          else c.dir = -1;
        } else if (c.state === 'served') {
          c.timer -= dt;
          if (c.timer <= 0) { c.state = 'leave'; c.dir = 1; }
        } else if (c.state === 'leave') {
          c.x += c.speed * speed * 1.3 * dt;
          c.walking = true;
        }
        if (c.walking) c.phase += dt * 12 * Math.min(speed, 1.6);
      });
      people = people.filter(function (c) { return c.x < w + 24; });

      cooldown -= dt;
      const front = line[0];
      if (pending > 0 && front && Math.abs(front.x - slotX(0)) < 1 && cooldown <= 0) serve(front, speed);

      if (info.running && !reducedMotion) {
        puffTimer -= dt;
        if (puffTimer <= 0) {
          puffTimer = rand(0.3, 0.5);
          particles.push({ kind: 'puff', x: lay.bx + lay.S * rand(0.35, 0.65), y: lay.feet - lay.S * 0.8, vx: rand(-6, 6), vy: rand(-26, -18), life: 1.1, max: 1.1, size: rand(3, 5) });
        }
      }
    }

    function updateFactory(dt) {
      const speed = hurry();
      const moving = info.running || info.managed;
      if (!seeded) {
        seeded = true;
        trucks.push({ x: lay.truckX, state: 'park', cargo: 3, speed: 0 });
        if (moving) for (let x = lay.beltStart + 12; x < lay.beltEnd - 8; x += 26) items.push({ x: x, y: 0, vy: 0, falling: false });
      }

      // The belt carries products out of the factory and drops them into the truck.
      const v = 30 * speed;
      if (moving) {
        beltShift = (beltShift + v * dt) % 12;
        itemTimer -= dt;
        if (itemTimer <= 0) {
          items.push({ x: lay.beltStart + 8, y: 0, vy: 0, falling: false });
          itemTimer = 26 / v;
        }
        if (!reducedMotion) {
          puffTimer -= dt;
          if (puffTimer <= 0) {
            puffTimer = rand(0.25, 0.45);
            particles.push({ kind: 'puff', x: lay.bx + lay.S * rand(0.25, 0.75), y: lay.feet - lay.S * 0.82, vx: rand(-6, 6), vy: rand(-28, -18), life: 1.2, max: 1.2, size: rand(3, 5.5) });
          }
        }
      }
      const parked = trucks.find(function (tr) { return tr.state === 'park'; });
      items.forEach(function (it) {
        if (it.falling) {
          it.vy += 600 * dt;
          it.y += it.vy * dt;
          if (it.y >= 14) { it.done = true; if (parked) parked.cargo++; }
        } else if (moving) {
          it.x += v * dt;
          if (it.x >= lay.beltEnd - 6) it.falling = true;
        }
      });
      items = items.filter(function (it) { return !it.done; });

      // Each finished batch sends the loaded truck off; the next one pulls in.
      loadTimer -= dt;
      if (parked && pending > 0 && loadTimer <= 0) {
        parked.state = 'leave';
        parked.speed = 30;
        pending--;
        loadTimer = clamp(0.8 / speed, 0.3, 0.8);
        wave = Math.max(wave, 0.5);
        const cx = parked.x + 20, cy = lay.feet - 30;
        if (!reducedMotion) {
          for (let k = 0; k < 4; k++) particles.push({ kind: 'coin', x: cx, y: cy, vx: rand(-50, 50), vy: rand(-180, -120), life: 0.75, max: 0.75, size: 4.5 });
        }
        if (opts.onServe) opts.onServe(cx, cy);
      }
      if (!trucks.some(function (tr) { return tr.state !== 'leave'; })) trucks.push({ x: -60, state: 'arrive', cargo: 0, speed: 0 });
      trucks.forEach(function (tr) {
        if (tr.state === 'arrive') {
          tr.x = Math.min(lay.truckX, tr.x + 260 * speed * dt);
          if (tr.x >= lay.truckX) tr.state = 'park';
        } else if (tr.state === 'leave') {
          tr.speed += 300 * dt;
          tr.x += tr.speed * dt;
        }
      });
      trucks = trucks.filter(function (tr) { return tr.x < w + 60; });
    }

    // ---- VIP visitors
    function addVip() {
      if (opts.locked || vip || !lay) return false;
      vip = person(w + 16, -1);
      vip.state = 'vipIn';
      vip.shirt = '#FFC93C';
      vip.hat = 'crown';
      vip.skin = pick(SKIN);
      vip.t = 0;
      vip.hopT = 0;
      return true;
    }

    function hasVip() { return !!vip && vip.state === 'vipWait'; }

    // The page calls this when the street is tapped while a VIP is waiting.
    function collectVip() {
      if (!hasVip()) return null;
      vip.state = 'vipOut';
      vip.dir = 1;
      vip.carry = true;
      vip.hopT = 0.35;
      const x = vip.x, y = lay.feet - 40;
      if (!reducedMotion) {
        for (let k = 0; k < 8; k++) particles.push({ kind: 'coin', x: x, y: y, vx: rand(-70, 70), vy: rand(-220, -130), life: 0.9, max: 0.9, size: 5 });
      }
      sparkles(x, y, 22, 12);
      return { x: x, y: y };
    }

    function updateVip(dt) {
      if (!vip) return;
      const stop = Math.min(w - 30, Math.max(lay.front + 30, w * 0.62));
      vip.walking = false;
      if (vip.state === 'vipIn') {
        vip.x = Math.max(stop, vip.x - 48 * dt);
        vip.walking = vip.x > stop;
        if (!vip.walking) { vip.state = 'vipWait'; vip.t = 0; }
      } else if (vip.state === 'vipWait') {
        vip.t += dt;
        vip.dir = -1;
        if (vip.t > VIP_WAIT) { vip.state = 'vipOut'; vip.dir = 1; }
        if (!reducedMotion && Math.random() < dt * 3) sparkles(vip.x, lay.feet - 30, 14, 1);
      } else if (vip.hopT > 0) {
        vip.hopT -= dt;
      } else {
        vip.x += 70 * dt;
        vip.walking = true;
        if (vip.x > w + 24) vip = null;
      }
      if (vip && vip.walking) vip.phase += dt * 12;
    }

    // Empty lots still get the odd passer-by.
    function updatePassersby(dt) {
      passTimer -= dt;
      if (passTimer <= 0) {
        const c = person(w + 14, -1);
        c.state = 'pass';
        people.push(c);
        passTimer = rand(3, 7);
      }
      people.forEach(function (c) {
        c.x -= c.speed * dt;
        c.walking = true;
        c.phase += dt * 12;
      });
      people = people.filter(function (c) { return c.x > -20; });
    }

    // ------------------------------------------------------------- background
    function branchCount() {
      if (opts.locked || !lay) return 0;
      const fit = Math.max(0, Math.floor((w - lay.S - 30) / BRANCH));
      return Math.min(info.milestones, fit);
    }

    function paintBackground() {
      if (!bg) bg = document.createElement('canvas');
      bg.width = canvas.width;
      bg.height = canvas.height;
      const b = bg.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sky = b.createLinearGradient(0, 0, 0, lay.walkTop);
      if (opts.night) { sky.addColorStop(0, '#1F1B4A'); sky.addColorStop(1, '#4A3F8F'); }
      else { sky.addColorStop(0, mix(opts.tile, 0.7)); sky.addColorStop(1, opts.tile); }
      b.fillStyle = sky;
      b.fillRect(0, 0, w, lay.walkTop);

      if (opts.night) {
        b.fillStyle = '#FFF7C2';
        for (let k = 0; k < 18; k++) dot(b, (k * 97 % 100) / 100 * w, 6 + (k * 53 % 100) / 100 * (lay.walkTop - 30), k % 3 ? 1 : 1.6);
      }

      // Rolling hills on the horizon.
      b.beginPath();
      b.moveTo(0, lay.walkTop);
      b.lineTo(0, lay.walkTop - 16);
      for (let x = 0; x <= w; x += 80) b.quadraticCurveTo(x + 40, lay.walkTop - 34, x + 80, lay.walkTop - 16);
      b.lineTo(w, lay.walkTop);
      b.closePath();
      b.fillStyle = opts.night ? '#3A3274' : mix(opts.tile, -0.12);
      b.fill();
      b.strokeStyle = INK;
      b.lineWidth = 2;
      b.stroke();

      // One branch building per speed milestone, lined up behind the main shop.
      const n = branchCount();
      if (ready(shopImg)) {
        for (let k = 0; k < n; k++) {
          const size = 46;
          b.drawImage(shopImg, w - 8 - (k + 1) * BRANCH - 3, lay.walkTop + 3 - size * 0.91, size, size);
        }
      }
      // A little haze pushes the back row into the distance.
      b.fillStyle = opts.night ? 'rgba(31,27,74,.22)' : 'rgba(255,255,255,.2)';
      b.fillRect(0, 0, w, lay.walkTop);

      // Sidewalk (or a grassy lot), curb, road.
      b.fillStyle = opts.locked ? '#9BE36D' : '#FFF3D6';
      b.fillRect(0, lay.walkTop, w, lay.roadTop - lay.walkTop);
      if (!opts.locked) {
        b.strokeStyle = 'rgba(43,33,71,.16)';
        b.lineWidth = 1.5;
        b.beginPath();
        for (let x = 14; x < w; x += 24) { b.moveTo(x, lay.walkTop + 2); b.lineTo(x - 4, lay.roadTop - 2); }
        b.stroke();
      }
      b.fillStyle = opts.night ? '#5B5394' : '#A79FCF';
      b.fillRect(0, lay.roadTop, w, h - lay.roadTop);
      b.strokeStyle = INK;
      b.lineWidth = 2.5;
      b.beginPath();
      b.moveTo(0, lay.walkTop); b.lineTo(w, lay.walkTop);
      b.moveTo(0, lay.roadTop); b.lineTo(w, lay.roadTop);
      b.stroke();
      b.strokeStyle = '#FFFFFF';
      b.lineWidth = 2;
      b.setLineDash([10, 10]);
      b.beginPath();
      b.moveTo(0, (lay.roadTop + h) / 2 + 1); b.lineTo(w, (lay.roadTop + h) / 2 + 1);
      b.stroke();
      b.setLineDash([]);

      if (opts.locked) paintLot(b);
    }

    // The empty lot: a faint outline of the future shop and a For Sale sign.
    function paintLot(b) {
      if (ready(shopImg)) {
        b.globalAlpha = 0.22;
        b.drawImage(shopImg, lay.bx, lay.feet + 1 - lay.S * 0.91, lay.S, lay.S);
        b.globalAlpha = 1;
      }
      const label = opts.signText || 'FOR SALE';
      b.font = "16px 'Lilita One', 'Arial Rounded MT Bold', sans-serif";
      const bw = Math.max(68, b.measureText(label).width + 20);
      const sx = lay.bx + lay.S + 12 + bw / 2, top = lay.feet - 50;
      b.strokeStyle = INK;
      b.lineWidth = 3;
      b.fillStyle = '#C98B4F';
      b.fillRect(sx - 2, top + 20, 5, lay.feet - top - 20);
      b.strokeRect(sx - 2, top + 20, 5, lay.feet - top - 20);
      b.fillStyle = '#FFFFFF';
      roundRect(b, sx - bw / 2, top, bw, 26, 6);
      b.fill();
      b.stroke();
      b.fillStyle = opts.signText ? '#8C6CFF' : '#FF5A5F';
      b.textAlign = 'center';
      b.textBaseline = 'middle';
      b.fillText(label, sx, top + 14);
    }

    // ------------------------------------------------------------- drawing
    function draw() {
      if (!w || !lay) return;
      const fontsReady = !document.fonts || document.fonts.status === 'loaded';
      const key = [w, h, branchCount(), ready(shopImg), fontsReady].join(':');
      if (key !== bgKey) { paintBackground(); bgKey = key; }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bg, 0, 0, w, h);
      drawClouds();

      if (!opts.locked) {
        drawShop();
        particles.forEach(function (p) { if (p.kind === 'puff') drawParticle(p); });
        if (info.managed) drawManager();
        if (info.managed && info.assistant) drawHelper();
      }
      if (factory) drawFactoryFloor();
      people.forEach(function (c) { if (c.state !== 'leave') drawPerson(c); });
      people.forEach(function (c) { if (c.state === 'leave') drawPerson(c); });
      if (vip) {
        ctx.fillStyle = 'rgba(255,210,63,.35)';
        ctx.beginPath();
        ctx.ellipse(vip.x, lay.feet + 4, 15, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        drawPerson(vip);
        if (vip.state === 'vipWait') drawTip(vip.x, lay.feet - 50);
      }
      if (!opts.locked && !info.managed && !info.running) {
        if (factory) {
          drawWaiting(lay.beltStart + 36, lay.feet - 46);
        } else {
          const front = people.find(function (c) { return c.state === 'line' && Math.abs(c.x - slotX(0)) < 1; });
          if (front) drawWaiting(front.x + 12, lay.feet - 42);
        }
      }
      particles.forEach(function (p) { if (p.kind !== 'puff') drawParticle(p); });
      vans.forEach(drawVan);
      if (bubble) drawBubble();
    }

    function drawClouds() {
      if (opts.night) return;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      clouds.forEach(function (c) {
        const x = c.x * w, y = c.y * h, s = c.s;
        ctx.beginPath();
        ctx.ellipse(x, y, 18 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 6 * s, y - 4 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 6 * s, y - 5 * s, 9 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawShop() {
      if (!ready(shopImg)) return;
      const S = lay.S;
      let sx = 1, sy = 1;
      if (build < 1) sx = sy = Math.max(0.01, easeOutBack(build));
      if (bump > 0) { sy += bump * 0.1; sx -= bump * 0.05; }
      if (info.running && !reducedMotion) {
        const k = Math.sin(t * 9) * 0.018;
        sy += k;
        sx -= k;
      }
      ctx.save();
      ctx.translate(lay.bx + S / 2, lay.feet + 1);
      ctx.scale(sx, sy);
      ctx.drawImage(shopImg, -S / 2, -S * 0.91, S, S);
      ctx.restore();
    }

    function strokeStyle(width) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }

    function drawManager() {
      const x = lay.managerX, feet = lay.feet;
      strokeStyle(2);
      ctx.fillStyle = 'rgba(43,33,71,.15)';
      ctx.beginPath();
      ctx.ellipse(x, feet + 1, 9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 3, feet - 9); ctx.lineTo(x - 3, feet);
      ctx.moveTo(x + 3, feet - 9); ctx.lineTo(x + 3, feet);
      ctx.stroke();
      // Uniform in the shop's color, with an apron.
      ctx.fillStyle = opts.bar;
      roundRect(ctx, x - 8, feet - 25, 16, 17, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, x - 4, feet - 21, 8, 11, 2);
      ctx.fill();
      // Waves while serving, and every few seconds anyway.
      const waving = (wave > 0 || t % 5 < 0.8) && !reducedMotion;
      const ang = waving ? -1.1 + Math.sin(t * 14) * 0.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 7, feet - 20);
      ctx.lineTo(x + 7 + Math.cos(ang) * 10, feet - 20 + Math.sin(ang) * 10);
      ctx.stroke();
      if (ready(faceImg)) ctx.drawImage(faceImg, x - 16, feet - 52, 32, 32);
    }

    // The assistant: a little smaller, in a lighter uniform, waving in turn with the manager.
    function drawHelper() {
      const x = lay.helperX, feet = lay.feet;
      strokeStyle(2);
      ctx.fillStyle = 'rgba(43,33,71,.15)';
      ctx.beginPath();
      ctx.ellipse(x, feet + 1, 8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 3, feet - 8); ctx.lineTo(x - 3, feet);
      ctx.moveTo(x + 3, feet - 8); ctx.lineTo(x + 3, feet);
      ctx.stroke();
      ctx.fillStyle = mix(opts.bar, 0.45);
      roundRect(ctx, x - 7, feet - 22, 14, 15, 5);
      ctx.fill();
      ctx.stroke();
      const waving = ((t + 2.5) % 5 < 0.8 || wave > 0) && !reducedMotion;
      const ang = waving ? -2.0 - Math.sin(t * 14) * 0.5 : 1.9;
      ctx.beginPath();
      ctx.moveTo(x - 6, feet - 18);
      ctx.lineTo(x - 6 + Math.cos(ang) * 9, feet - 18 + Math.sin(ang) * 9);
      ctx.stroke();
      if (ready(helperImg)) ctx.drawImage(helperImg, x - 14, feet - 46, 28, 28);
    }

    // ---- factory floor: workers behind the belt, products on it, trucks in front
    function drawFactoryFloor() {
      const n = clamp(1 + Math.floor(info.milestones / 2), 1, lay.workers);
      for (let k = 0; k < n; k++) drawWorker(lay.beltStart + 24 + k * 34, k);
      drawBelt();
      if (ready(productImg)) {
        items.forEach(function (it) { ctx.drawImage(productImg, it.x - 8, lay.beltTop - 15 + it.y, 16, 16); });
      }
      trucks.forEach(drawTruck);
    }

    function drawWorker(x, k) {
      const base = lay.beltTop + 4;
      const busy = (info.running || info.managed) && !reducedMotion;
      const arm = busy ? Math.sin(t * 8 + k * 1.7) * 4 : 0;
      strokeStyle(2);
      ctx.fillStyle = '#FF9F43';
      roundRect(ctx, x - 7, base - 16, 14, 16, 5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 5, base - 8);
      ctx.lineTo(x + 5, base - 8);
      ctx.stroke();
      strokeStyle(2);
      ctx.beginPath();
      ctx.moveTo(x - 5, base - 12); ctx.lineTo(x - 9, lay.beltTop + 1 - Math.max(0, arm));
      ctx.moveTo(x + 5, base - 12); ctx.lineTo(x + 9, lay.beltTop + 1 - Math.max(0, -arm));
      ctx.stroke();
      ctx.fillStyle = SKIN[(k * 2 + opts.key.length) % SKIN.length];
      ctx.beginPath();
      ctx.arc(x, base - 24, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      dot(ctx, x - 2.6, base - 24, 1.2);
      dot(ctx, x + 2.6, base - 24, 1.2);
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath();
      ctx.arc(x, base - 27, 8.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 11, base - 27);
      ctx.lineTo(x + 11, base - 27);
      ctx.stroke();
    }

    function drawBelt() {
      const y = lay.beltTop, x0 = lay.beltStart, x1 = lay.beltEnd;
      strokeStyle(2);
      ctx.beginPath();
      for (let x = x0 + 10; x < x1 - 4; x += 36) { ctx.moveTo(x, y + 8); ctx.lineTo(x, lay.feet); }
      ctx.stroke();
      ctx.fillStyle = '#6B6390';
      roundRect(ctx, x0, y, x1 - x0, 9, 4.5);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.beginPath();
      for (let x = x0 - 12 + beltShift; x < x1 + 12; x += 12) { ctx.moveTo(x, y + 1); ctx.lineTo(x - 4, y + 8); }
      ctx.stroke();
      ctx.restore();
      strokeStyle(2);
      roundRect(ctx, x0, y, x1 - x0, 9, 4.5);
      ctx.stroke();
      ctx.fillStyle = '#C9C3E6';
      dot(ctx, x0 + 4.5, y + 4.5, 2.5);
      dot(ctx, x1 - 4.5, y + 4.5, 2.5);
    }

    // An open-backed truck in the factory's color, with the load peeking out.
    function drawTruck(tr) {
      const y = h - 3, x = tr.x;
      const shown = Math.min(3, Math.ceil(tr.cargo / 2));
      if (ready(productImg)) {
        for (let k = 0; k < shown; k++) ctx.drawImage(productImg, x + 3 + k * 10, y - 31 - (k % 2) * 3, 14, 14);
      }
      strokeStyle(2);
      ctx.fillStyle = opts.bar;
      roundRect(ctx, x, y - 20, 36, 15, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, x + 35, y - 23, 15, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9BE7FF';
      roundRect(ctx, x + 40, y - 20, 7, 6, 1.5);
      ctx.fill();
      ctx.fillStyle = INK;
      dot(ctx, x + 9, y - 4, 4);
      dot(ctx, x + 41, y - 4, 4);
      ctx.fillStyle = '#FFFFFF';
      dot(ctx, x + 9, y - 4, 1.3);
      dot(ctx, x + 41, y - 4, 1.3);
    }

    // A pulsing "Tip!" bubble with a coin: tap the street to collect.
    function drawTip(x, y) {
      const left = vip ? clamp(1 - vip.t / VIP_WAIT, 0, 1) : 1;
      const s = reducedMotion ? 1 : 1 + Math.sin(t * 6) * 0.06;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      strokeStyle(2);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(0, 6); ctx.lineTo(4, 0);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -24, -20, 48, 20, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.arc(-12, -10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = "800 12px 'Baloo 2', 'Trebuchet MS', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tip!', 7, -9);
      // How long the VIP will keep waiting.
      ctx.strokeStyle = '#FF5FA2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, -3);
      ctx.lineTo(-16 + 32 * left, -3);
      ctx.stroke();
      ctx.restore();
    }

    function drawPerson(c) {
      const leaving = c.state === 'leave' || c.hat === 'crown';
      const feet = lay ? lay.feet + (leaving ? 4 : 0) : h - 20;
      const step = c.walking && !reducedMotion ? Math.sin(c.phase) : 0;
      const bob = c.walking && !reducedMotion ? Math.abs(Math.cos(c.phase)) * 1.6 : 0;
      let hop = c.state === 'served' && !reducedMotion ? Math.sin(clamp(1 - c.timer / 0.3, 0, 1) * Math.PI) * 6 : 0;
      if (c.hopT > 0 && !reducedMotion) hop = Math.sin(clamp(1 - c.hopT / 0.35, 0, 1) * Math.PI) * 10;
      const x = c.x, y = feet - bob - hop, d = c.dir;

      ctx.fillStyle = 'rgba(43,33,71,.15)';
      ctx.beginPath();
      ctx.ellipse(x, feet + 1, 8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      strokeStyle(2);
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 9); ctx.lineTo(x - 3 + step * 4, feet - hop);
      ctx.moveTo(x + 3, y - 9); ctx.lineTo(x + 3 - step * 4, feet - hop);
      ctx.stroke();

      ctx.fillStyle = c.shirt;
      roundRect(ctx, x - 7, y - 23, 14, 15, 5);
      ctx.fill();
      ctx.stroke();

      if (c.carry) {
        ctx.beginPath();
        ctx.moveTo(x + d * 5, y - 19);
        ctx.lineTo(x + d * 9, y - 31);
        ctx.stroke();
      }

      ctx.fillStyle = c.skin;
      ctx.beginPath();
      ctx.arc(x, y - 31, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const ex = x + d * 2.2;
      ctx.fillStyle = INK;
      dot(ctx, ex - 2.6, y - 32, 1.2);
      dot(ctx, ex + 2.6, y - 32, 1.2);
      if (c.carry) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, y - 30, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 2;
      }

      drawHat(c, x, y - 31, d);
      if (c.carry && ready(productImg)) ctx.drawImage(productImg, x + d * 9 - 9, y - 50, 18, 18);
    }

    function drawHat(c, x, hy, d) {
      ctx.fillStyle = c.hatColor;
      if (c.hat === 'cap') {
        ctx.beginPath();
        ctx.arc(x, hy - 2, 8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, hy - 2);
        ctx.lineTo(x + d * 12, hy - 2);
        ctx.stroke();
      } else if (c.hat === 'beanie') {
        ctx.beginPath();
        ctx.arc(x, hy - 1, 8.5, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        dot(ctx, x, hy - 10, 3);
        ctx.stroke();
      } else if (c.hat === 'party') {
        ctx.beginPath();
        ctx.moveTo(x - 6, hy - 6);
        ctx.lineTo(x, hy - 21);
        ctx.lineTo(x + 6, hy - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFE14D';
        dot(ctx, x, hy - 21, 2.4);
      } else if (c.hat === 'ears') {
        ctx.fillStyle = '#FFFFFF';
        [-4, 4].forEach(function (dx) {
          ctx.beginPath();
          ctx.ellipse(x + dx, hy - 15, 2.8, 8, dx * 0.04, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (c.hat === 'tophat') {
        ctx.fillStyle = '#3E3A55';
        ctx.fillRect(x - 6, hy - 20, 12, 13);
        ctx.strokeRect(x - 6, hy - 20, 12, 13);
        ctx.strokeStyle = c.hatColor;
        ctx.beginPath();
        ctx.moveTo(x - 5, hy - 10); ctx.lineTo(x + 5, hy - 10);
        ctx.stroke();
        strokeStyle(2);
        ctx.beginPath();
        ctx.moveTo(x - 10, hy - 7); ctx.lineTo(x + 10, hy - 7);
        ctx.stroke();
      } else if (c.hat === 'halo') {
        ctx.strokeStyle = '#FFD23F';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(x, hy - 13, 7, 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        strokeStyle(2);
      } else if (c.hat === 'crown') {
        ctx.fillStyle = '#FFD23F';
        ctx.beginPath();
        ctx.moveTo(x - 7, hy - 5);
        ctx.lineTo(x - 8, hy - 14);
        ctx.lineTo(x - 3.5, hy - 9);
        ctx.lineTo(x, hy - 15);
        ctx.lineTo(x + 3.5, hy - 9);
        ctx.lineTo(x + 8, hy - 14);
        ctx.lineTo(x + 7, hy - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FF5FA2';
        dot(ctx, x, hy - 8, 1.6);
      } else if (c.hat === 'bow') {
        ctx.beginPath();
        ctx.moveTo(x + 3, hy - 7);
        ctx.lineTo(x - 2, hy - 11);
        ctx.lineTo(x - 2, hy - 3);
        ctx.closePath();
        ctx.moveTo(x + 3, hy - 7);
        ctx.lineTo(x + 8, hy - 11);
        ctx.lineTo(x + 8, hy - 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // A "..." thought bubble: this customer is waiting for you to tap the shop.
    function drawWaiting(x, y) {
      const bob = reducedMotion ? 0 : Math.sin(t * 4) * 1.5;
      strokeStyle(2);
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, x - 13, y - 14 + bob, 26, 14, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      for (let k = -1; k <= 1; k++) dot(ctx, x + k * 6, y - 7 + bob, 1.6);
    }

    function drawParticle(p) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = p.kind === 'coin' ? Math.min(1, a * 2) : a;
      if (p.kind === 'coin') {
        strokeStyle(1.5);
        ctx.fillStyle = '#FFC93C';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFF3B0';
        dot(ctx, p.x - 1.4, p.y - 1.4, 1.3);
      } else if (p.kind === 'puff') {
        ctx.fillStyle = '#FFFFFF';
        dot(ctx, p.x, p.y, p.size);
      } else if (p.kind === 'dust') {
        ctx.fillStyle = '#E8D6B0';
        dot(ctx, p.x, p.y, p.size);
      } else if (p.kind === 'spark') {
        const r = p.size;
        ctx.fillStyle = '#FFE14D';
        strokeStyle(1.2);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // A delivery van in the shop's color with its treat painted on the side.
    function drawVan(v) {
      const y = h - 4, x = v.x;
      strokeStyle(2);
      ctx.fillStyle = opts.bar;
      roundRect(ctx, x, y - 19, 34, 15, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, x + 33, y - 15, 13, 11, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9BE7FF';
      roundRect(ctx, x + 37, y - 13, 6, 5, 1.5);
      ctx.fill();
      ctx.fillStyle = INK;
      dot(ctx, x + 9, y - 3, 3.6);
      dot(ctx, x + 36, y - 3, 3.6);
      if (ready(productImg)) ctx.drawImage(productImg, x + 10, y - 18, 13, 13);
    }

    function drawBubble() {
      const x = info.managed ? lay.managerX : lay.bx + lay.S * 0.6;
      const y = info.managed ? lay.feet - 56 : lay.feet - lay.S * 0.92;
      ctx.font = "800 12px 'Baloo 2', 'Trebuchet MS', sans-serif";
      const bw = ctx.measureText(bubble.text).width + 16, bh = 20;
      const bx = clamp(x - bw / 2, 3, w - bw - 3), by = Math.max(3, y - bh - 6);
      ctx.globalAlpha = clamp(bubble.t / 0.3, 0, 1);
      strokeStyle(2);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 4, by + bh - 1);
      ctx.lineTo(x, by + bh + 6);
      ctx.lineTo(x + 4, by + bh - 1);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, bx, by, bw, bh, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, bx + bw / 2, by + bh / 2 + 1);
      ctx.globalAlpha = 1;
    }

    resize();

    return {
      resize: resize,
      update: update,
      draw: draw,
      payout: payout,
      poke: poke,
      say: say,
      addVip: addVip,
      hasVip: hasVip,
      collectVip: collectVip,
      celebrate: function () { if (lay) sparkles(lay.bx + lay.S / 2, lay.feet - lay.S / 2, 40, 16); },
    };
  }

  root.Scene = { createLane: createLane, setHats: setHats };
})(this);
