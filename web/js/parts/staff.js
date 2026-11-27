// Personale (parte di game.js): raccoglitori (portano la roba dal campo al locale caldaia/cucina), camerieri della mensa
// e addetto ai bagni (prende le scorte nello sgabuzzino e le porta dove mancano).
(function (R) {
  'use strict';
  const HCOL = [0x3fae6e, 0x2f7bd6, 0xd0883a];

  (R.parts = R.parts || {}).staff = function (G) {
    const { T, B, A, P, L, cols, rooms, boiler, guests, res, findPath, collide, fly, burst, after, _v, outfit, RES } = G;
    const helpers = [], waiters = [];

    function nav(h, tx, tz, sp, dt, stop) {
      const g = h.g, p = g.position;
      if (Math.hypot(p.x - tx, p.z - tz) <= stop) { h.route = null; B.walk(g, 0, dt); return true; }
      if (!h.route || Math.abs(h.gx - tx) > 0.4 || Math.abs(h.gz - tz) > 0.4 || h.sig !== cols.length) {
        h.route = findPath(p.x, p.z, tx, tz); h.gx = tx; h.gz = tz; h.sig = cols.length; h.stuck = 0;
        if (!h.route.length) { h.route = null; h.wait = (h.wait || 0) + dt; B.walk(g, 0, dt); return h.wait > 3 ? (h.wait = 0, true) : false; }
      }
      const wp = h.route[0], bx = p.x, bz = p.z;
      if (B.moveTo(g, wp.x, wp.z, sp, dt, 0.2)) { h.route.shift(); if (!h.route.length) { h.route = null; return true; } }
      collide(p);
      if (Math.hypot(p.x - bx, p.z - bz) < sp * dt * 0.3) { h.stuck = (h.stuck || 0) + dt; if (h.stuck > 1) { h.route = null; h.stuck = 0; } } else h.stuck = 0;
      return false;
    }
    const stack = g => { const sg = new T.Group(); sg.position.set(0, 0.75, -0.32); g.add(sg); return sg; };

    function spawnHelper(i) {
      if (helpers[i]) return;
      const g = B.person(HCOL[i % 3], 0xb07848, true, outfit, { shorts: 0x2d6cdf }); g.position.set((i - 1) * 2.4, 0, -30.4);
      B.setTool(g, G.hasEffect('saw') ? 'saw' : 'axe');
      helpers[i] = { g, sg: stack(g), logs: 0, inb: 0, state: 'idle', cd: 0, tree: null };
    }
    function nearestFree(p, taken) {
      let best = null, bd = 99;
      for (const t of res.nodes) { if (t.logs <= 0 || taken.includes(t)) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = t; } }
      return best;
    }
    function updateHelper(h, dt) {
      const g = h.g, F = L.boiler.feed; h.cd -= dt;
      if (h.state === 'idle') {
        B.walk(g, 0, dt);
        if (h.logs >= P.helper_load) h.state = 'deliver';
        else { const t = nearestFree(g.position, helpers.map(x => x && x.tree)); if (t) { h.tree = t; h.state = 'toTree'; } else if (h.logs) h.state = 'deliver'; }
      } else if (h.state === 'toTree') { if (h.tree.logs <= 0) h.state = 'idle'; else if (nav(h, h.tree.x, h.tree.z, 3.4, dt, 1.2)) h.state = 'chop'; }
      else if (h.state === 'chop') {
        B.walk(g, 0, dt);
        if (h.tree.logs <= 0 || h.logs >= P.helper_load) { h.tree = null; h.state = 'idle'; }
        else if (h.cd <= 0) {
          const tr = h.tree, dur = 0.45;
          h.cd = G.chopInterval() * 1.3; g.rotation.y = Math.atan2(tr.x - g.position.x, tr.z - g.position.z); B.swing(g, dur);
          res.chop(tr, g.position.x, g.position.z, dur * B.HIT_AT); h.logs++; h.inb++;
          after(dur * B.HIT_AT, () => {
            burst(tr.x, 1.0, tr.z, 4, RES.cols, 2.2, 3, 0.5, 0.1); A.sfx(G.hasEffect('saw') ? 'saw' : 'chop');
            _v.set(tr.x, 1.1, tr.z); fly('log', _v, o => h.sg.getWorldPosition(o), 0.3, 0.5, () => { h.inb--; B.drawStack(h.sg, h.logs - h.inb, 0); });
          });
        }
      } else if (h.state === 'deliver') { if (nav(h, F[0] + (helpers.indexOf(h) - 1) * 0.5, F[1] + 0.2, 3.4, dt, 0.5)) h.state = 'feed'; }
      else if (h.state === 'feed') {
        B.walk(g, 0, dt);
        if (h.logs > 0 && boiler.fuel + boiler.pend + 1 <= P.fuel_max) {
          if (h.cd <= 0) { h.cd = 0.18; h.logs--; B.toss(g, 0.2); B.drawStack(h.sg, h.logs, 0); h.sg.getWorldPosition(_v); G.feedOne(_v); }
        } else if (!h.logs) h.state = 'idle';
      }
    }

    function spawnWaiter(i) {
      if (waiters[i]) return;
      const home = [L.mensa.cx + (i - 1) * 1.6, 4.4], g = B.person(0x17171d, 0x17171d, false, 'waiter'); g.position.set(home[0], 0, home[1]);
      waiters[i] = { g, cup: 0, item: false, state: 'idle', cd: 0, target: null, home };
    }
    const waiting = gu => gu.state === 'table' && !gu.served;
    function updateWaiter(h, dt) {
      const g = h.g; h.cd -= dt;
      const drop = () => { if (h.target) h.target.taken = false; h.target = null; h.state = 'idle'; };
      if (h.state === 'idle') {
        const gu = guests.find(x => waiting(x) && !x.taken);
        if (gu && h.cup > 0 && h.item === (gu.want === 'snack')) { h.target = gu; gu.taken = true; h.state = 'toGuest'; }
        else if (gu && G.stock(gu.want) > 0) { h.target = gu; gu.taken = true; h.state = 'toStand'; }
        else if (nav(h, h.home[0], h.home[1], 3.2, dt, 0.3)) { B.walk(g, 0, dt); g.rotation.y = 0; }
      } else if (h.state === 'toStand') {
        if (!h.target || !waiting(h.target)) return drop();
        const sweet = h.target.want === 'snack', s = sweet ? L.stands.snack : L.stands.cocoa;
        if (nav(h, s[0], s[1] + 1.2, 3.4, dt, 0.8)) {
          if (h.item !== sweet) { h.cup = 0; h.item = sweet; }
          const take = Math.min(G.stock(h.target.want), 2 - h.cup);
          if (take > 0) { G.takeStock(h.target.want, take); h.cup += take; B.toss(g, 0.2); A.sfx('pickup'); B.setTray(g, h.cup); h.state = 'toGuest'; }
          else drop();
        }
      } else if (h.state === 'toGuest') {
        const gu = h.target;
        if (!gu || !waiting(gu)) return drop();
        const s = gu.seat;
        if (nav(h, s.x, s.z + 0.9, 3.4, dt, 0.7) || Math.hypot(g.position.x - s.x, g.position.z - s.z) < 1.2) {
          if (h.cd <= 0) { h.cd = 0.3; h.cup--; B.toss(g, 0.22); B.setTray(g, h.cup); G.serve(gu, g.userData.tray); gu.taken = false; h.target = null; h.state = 'idle'; }
        }
      }
    }
    // --- addetto ai bagni ------------------------------------------------------
    const CAP = 8; // saponi e rotoli che porta per volta
    let cleaner = null;
    function spawnCleaner() {
      if (cleaner) return;
      const g = B.person(0x1fb5a8, 0xffffff, false, 'spring', { acc: 'none' }); g.position.set(L.closet.pick[0], 0, L.closet.pick[1]);
      const sg = stack(g);
      cleaner = { g, sg, soap: 0, paper: 0, state: 'idle', cd: 0, room: null };
    }
    const need = r => r.open && (r.soap < 4 || r.paper < 4);
    const canServe = (r, h) => (r.soap < 4 && h.soap > 0) || (r.paper < 4 && h.paper > 0);
    const emptiest = list => list.sort((a, b) => (a.soap + a.paper) - (b.soap + b.paper))[0];
    const load = h => B.drawStack(h.sg, 0, Math.ceil((h.soap + h.paper) / 3));
    function updateCleaner(h, dt) {
      const g = h.g; h.cd -= dt;
      if (h.state === 'idle') {
        const r = emptiest(rooms.filter(x => need(x) && canServe(x, h)));
        if (r) { h.room = r; h.state = 'toBath'; }
        else if (rooms.some(need)) h.state = 'toCloset';
        else if (nav(h, L.closet.pick[0], L.closet.pick[1], 3, dt, 0.4)) B.walk(g, 0, dt);
      } else if (h.state === 'toCloset') {
        if (nav(h, L.closet.pick[0], L.closet.pick[1], 3.4, dt, 0.8)) { h.state = 'take'; h.cd = 0.6; }
      } else if (h.state === 'take') {
        B.walk(g, 0, dt);
        if (h.cd <= 0) { h.soap = h.paper = CAP; load(h); B.toss(g, 0.2); h.state = 'idle'; }
      } else if (h.state === 'toBath') {
        const r = h.room;
        if (!need(r) || !canServe(r, h)) h.state = 'idle';
        else if (nav(h, r.def.restock[0], r.def.restock[1], 3.4, dt, 0.8)) h.state = 'fill';
      } else {
        const r = h.room; B.walk(g, 0, dt);
        if (!canServe(r, h)) { h.state = 'idle'; return; }
        if (h.cd <= 0) {
          h.cd = 0.25; const kind = r.soap < 4 && h.soap > 0 ? 'soap' : 'paper';
          h[kind]--; r[kind]++; load(h); B.toss(g, 0.2);
          _v.set(g.position.x, 1.2, g.position.z); fly('cup', _v, o => o.set(r.def.bath.x, 0.9, r.def.bath.z), 0.3, 0.6);
        }
      }
    }
    return {
      helpers, waiters, spawnHelper, spawnWaiter, spawnCleaner, cleaner: () => cleaner,
      update(dt) { helpers.forEach(h => h && updateHelper(h, dt)); waiters.forEach(h => h && updateWaiter(h, dt)); if (cleaner) updateCleaner(cleaner, dt); },
      tools(t) { helpers.forEach(h => h && B.setTool(h.g, t)); }
    };
  };
})(window.Rifugio);
