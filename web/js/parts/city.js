// Attività della città (parte di game.js): Valle = legnaia con slitta, Borgo dei Mulini = orto da raccogliere, Porto = battello con ospiti.
(function (R) {
  'use strict';
  // Zone da tenere libere (niente alberi o decorazioni): si aggiungono ai riquadri prima di costruire il paesaggio.
  const RESERVE = { valle: [[-14.6, -26.5], [-14.6, -24.5]], mulini: [[13.6, -14], [15.9, -14], [13.6, -11.2], [15.9, -11.2]], porto: [] };

  const create = function (G) {
    const { T, scene, B, mats, box, cyl, ball, hud, A, P, S, L, player, rooms, guests, carry, burst, fly, _v, CITYID, SEASON_ID, SEA_Z, boiler } = G;
    const winter = SEASON_ID === 'inverno';
    const near = (x, z, r) => Math.hypot(player.position.x - x, player.position.z - z) < r;
    const ready = () => S.done >= 2 && S.fed > 0;
    const CARD = { valle: 'c_sled', mulini: 'c_garden', porto: 'c_boat' };
    const done = (x, z) => { G.MT.see(CARD[CITYID]); G.EX.ev('city'); burst(x, 1, z, 10, [0xffd23a, 0x4cd964, 0xffffff], 2, 4, 0.7, 0.1); };
    let update = () => {}, overlays = () => {}, spots = () => [], now = () => {};

    if (CITYID === 'valle') {
      // --- legnaia e slitta: si deposita la legna, la slitta la porta da sola ai fuochi che si stanno spegnendo ---
      const X = -14.6, Z = -25.8, MAX = 30, LOAD = 10, cart = winter ? 'slitta' : 'carretto';
      const shed = new T.Group(); shed.position.set(X, 0, Z); scene.add(shed);
      [-1.2, 1.2].forEach(x => [-0.7, 0.7].forEach(z => cyl(0.08, 0.08, 1.7, mats.wood, x, 0.85, z, shed, 6)));
      box(2.9, 0.14, 1.9, B.tint(0x7a3b2a), 0, 1.78, 0, shed, 0.03).rotation.x = 0.12;
      const stack = new T.Group(); shed.add(stack);
      G.cols.push([X - 1.3, X + 1.3, Z - 0.8, Z + 0.8]);
      const sled = new T.Group(); scene.add(sled);
      box(1.2, 0.14, 0.7, mats.red, 0, 0.35, 0, sled, 0.03);
      if (winter) [-0.3, 0.3].forEach(z => box(1.5, 0.07, 0.08, mats.dark, 0, 0.14, z, sled));
      else [-0.45, 0.45].forEach(x => [-0.4, 0.4].forEach(z => { cyl(0.2, 0.2, 0.1, mats.dark, x, 0.2, z, sled, 10).rotation.x = Math.PI / 2; }));
      const load = new T.Group(); load.position.y = 0.5; sled.add(load);
      const HOME = [X + 0.2, Z - 2.2]; sled.position.set(HOME[0], 0, HOME[1]);
      const logsIn = (g, n, w) => { B.clear(g); for (let i = 0; i < n; i++) { const c = new T.Mesh(B.logGeo, mats.wood); c.position.set((i % w) * 0.28 - (w - 1) * 0.14, 0.12 + Math.floor(i / w) * 0.2, 0); c.rotation.y = Math.PI / 2; g.add(c); } };
      let path = null, back = false, carryN = 0, giveCd = 0;
      if (S.shed == null) S.shed = 0;
      logsIn(stack, Math.min(S.shed, 24), 6);
      const el = hud.label('pill', '');
      update = dt => {
        giveCd -= dt;
        if (ready() && carry.logs > 0 && S.shed < MAX && giveCd <= 0 && near(X, Z, 2.4)) {
          giveCd = 0.12; carry.logs--; S.shed++; G.refreshStack(); logsIn(stack, Math.min(S.shed, 24), 6);
          _v.set(player.position.x, 1.2, player.position.z); fly('log', _v, o => o.set(X, 0.8, Z), 0.3, 0.6);
          A.sfx('log');
        }
        if (!path && S.shed >= LOAD) {
          if (boiler.fuel + boiler.pend < P.fuel_max * 0.4) { back = false; carryN = LOAD; S.shed -= LOAD; logsIn(stack, Math.min(S.shed, 24), 6); logsIn(load, LOAD, 3); path = [[-9, -30.2], [0, -30.2], [0, -27.5]]; }
        }
        if (path) {
          if (path.length) {
            const [tx, tz] = path[0], p = sled.position, d = Math.hypot(tx - p.x, tz - p.z), step = 6 * dt;
            if (d <= step) { p.set(tx, 0, tz); path.shift(); } else { p.x += (tx - p.x) / d * step; p.z += (tz - p.z) / d * step; sled.rotation.y = Math.atan2(tz - p.z, p.x - tx); }
          } else if (!back) {
            const n = Math.max(0, Math.min(carryN, Math.floor(P.fuel_max - boiler.fuel - boiler.pend)));
            for (let k = 0; k < n; k++) { _v.set(sled.position.x, 0.8, sled.position.z); G.feedOne(_v, k * 0.08); }
            S.shed += carryN - n; carryN = 0; logsIn(load, 0, 3); logsIn(stack, Math.min(S.shed, 24), 6);
            back = true; path = [[0, -30.2], [-9, -30.2], HOME]; done(0, -27.5);
          } else path = null;
        }
      };
      overlays = () => { const t = ready() ? `${winter ? '🛷' : '🛒'} ${S.shed}/${MAX}` : ''; if (el.textContent !== t) el.textContent = t; hud.put(el, X, 2.4, Z, !!t); };
      spots = () => [[X, Z, '#a0713d']];
      if (R.settings.tip('city-valle')) G.later(8, () => hud.toast(`🪵 Lascia legna alla legnaia: la ${cart} la porta ai fuochi`));
    } else if (CITYID === 'mulini') {
      // --- orto: le piante crescono, quando sono mature si raccolgono passandoci sopra (monete e una scorta per il banco) ---
      const GROW = 24, col = { inverno: 0x7fc8a0, primavera: 0xff5d8f, estate: 0xffd23a, autunno: 0xff8a1f }[SEASON_ID];
      const plots = [];
      [13.4, 14.9, 16.4].forEach((x, i) => [-13.6, -11.9].forEach((z, k) => {
        box(1.2, 0.12, 1.2, B.tint(0x6b4a2f), x, 0.07, z, null, 0.02);
        const g = new T.Group(); g.position.set(x, 0.1, z); scene.add(g);
        [[-0.25, -0.25], [0.28, -0.1], [-0.05, 0.3]].forEach(([dx, dz]) => { cyl(0.04, 0.05, 0.4, B.tint(0x3f9c4e), dx, 0.2, dz, g, 5); ball(0.16, B.tint(col), dx, 0.46, dz, g, 8, 6); });
        plots.push({ x, z, g, t: (i * 2 + k) * 4 });
      }));
      update = dt => {
        for (const p of plots) {
          p.t = Math.min(GROW, p.t + dt);
          const k = p.t / GROW; p.g.scale.setScalar(0.2 + 0.8 * k); p.g.rotation.y = k >= 1 ? Math.sin(performance.now() / 300 + p.x) * 0.15 : 0;
          if (k >= 1 && ready() && near(p.x, p.z, 0.95)) {
            p.t = 0; const gain = Math.round(P.pay * 0.4); S.coins += gain; hud.floatText('+' + gain, p.x, 1.4, p.z); G.restock(); A.sfx('pickup'); done(p.x, p.z);
          }
        }
      };
      spots = () => plots.filter(p => p.t >= GROW).map(p => [p.x, p.z, '#4cd964']);
      if (R.settings.tip('city-mulini')) G.later(8, () => hud.toast('🌷 Raccogli le piante mature nell\'orto: monete e scorte per il banco'));
    } else {
      // --- battello: ogni tanto attracca al molo e sbarca un gruppo di viaggiatori che paga di più ---
      const z = SEA_Z + 4, boat = new T.Group(); boat.position.set(-34, 0.05, z); boat.visible = false; scene.add(boat);
      box(4.6, 0.8, 1.8, B.tint(0xd9433b), 0, 0.4, 0, boat, 0.2); box(4.0, 0.14, 1.5, mats.plank, 0, 0.86, 0, boat, 0.03);
      box(1.4, 0.9, 1.1, mats.white, -0.8, 1.35, 0, boat, 0.1); cyl(0.2, 0.25, 0.8, mats.dark, -0.8, 2.1, 0, boat, 10);
      let wait = 45, phase = 'away', t = 0;
      update = dt => {
        if (!ready()) return;
        if (phase === 'away') {
          wait -= dt;
          if (wait <= 0) { if (rooms.some(r => r.open && r.beds.some(b => !b.guest))) { phase = 'in'; t = 0; boat.visible = true; hud.toast('🚢 Arriva il battello!'); A.sfx('guest'); } else wait = 10; }
        } else if (phase === 'in') {
          t += dt / 7; const k = Math.min(1, t), e = 1 - (1 - k) * (1 - k); boat.position.x = -34 + 43.6 * e;
          if (k >= 1) {
            phase = 'moored'; t = 0; let n = 0;
            for (let i = 0; i < 3; i++) {
              const gu = G.spawnGuest('boat', [[7 + i * 0.3, SEA_Z + 2], [7, SEA_Z - 1], [14.5, 12 - i * 0.5], [14.5, L.roadZ], [L.recep.x + 0.6, L.roadZ + 0.3]]);
              if (gu) n++;
            }
            if (n) done(7, SEA_Z - 2);
          }
        } else if (phase === 'moored') { t += dt; if (t > 8) { phase = 'out'; t = 0; } }
        else { t += dt / 7; boat.position.x = 9.6 + 26 * t * t; if (t >= 1) { phase = 'away'; boat.visible = false; wait = 80 + Math.random() * 40; } }
        boat.position.y = 0.05 + Math.sin(performance.now() / 500) * 0.04;
      };
      spots = () => phase === 'away' ? [] : [[7, SEA_Z - 2, '#3d8bff']];
      now = () => { wait = 0; }; // per le prove
      if (R.settings.tip('city-porto')) G.later(8, () => hud.toast('🚢 Il battello porta viaggiatori che pagano di più'));
    }
    return { update, overlays, spots, now: () => now() };
  };
  (R.parts = R.parts || {}).city = Object.assign(create, { RESERVE });
})(window.Rifugio);
