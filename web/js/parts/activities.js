// Attività in più (parte di game.js): banco dei dolci, richieste degli ospiti, eventi a sorpresa, arredo delle stanze.
(function (R) {
  'use strict';
  // Dolci di stagione (nome del banco e simbolo).
  const SNACK = {
    inverno: { title: 'Torte calde', e: '🥧' }, primavera: { title: 'Pasticcini', e: '🧁' },
    estate: { title: 'Gelati', e: '🍦' }, autunno: { title: 'Caldarroste', e: '🌰' }
  };
  // Cose che un ospite può chiedere: si prendono dalla reception.
  const REQUESTS = [{ e: '🧣', name: 'coperta' }, { e: '🛏️', name: 'cuscino' }, { e: '📰', name: 'giornale' }, { e: '🔦', name: 'torcia' }];
  // Arredo: si compra con le monete, stanza per stanza. Ogni mobile fa pagare di più gli ospiti di quella stanza.
  const FURN = [
    { id: 'plant', e: '🪴', name: 'Pianta', cost: 60 }, { id: 'rug', e: '🟪', name: 'Tappetino', cost: 90 }, { id: 'paint', e: '🖼️', name: 'Quadro', cost: 120 },
    { id: 'lamp', e: '💡', name: 'Lampada', cost: 160 }, { id: 'books', e: '📚', name: 'Libreria', cost: 220 }, { id: 'teddy', e: '🧸', name: 'Orsetto', cost: 300 }
  ];
  const FURN_BONUS = 0.04, STAR_BONUS = 0.04;

  const create = function (G) {
    const { T, scene, B, mats, box, cyl, ball, hud, A, P, S, L, player, rooms, guests, carry, burst, fly, _v, CONFETTI, RECEP, level, boiler } = G;
    const season = level.season, SN = SNACK[season] || SNACK.inverno;
    const near = (x, z, r) => Math.hypot(player.position.x - x, player.position.z - z) < r;

    // --- banco dei dolci ----------------------------------------------------
    const SX = L.stands.snack[0], SZ = L.stands.snack[1], PICK = [SX, SZ + 1.3];
    const snack = { open: false, n: 0, t: 0, g: new T.Group() };
    snack.g.position.set(SX, 0, SZ); snack.g.visible = false; scene.add(snack.g);
    box(1.9, 0.95, 1.0, B.tint(0xff8fb3), 0, 0.48, 0, snack.g, 0.05); box(2.1, 0.1, 1.15, mats.white, 0, 1.0, 0, snack.g, 0.02);
    [-0.9, 0.9].forEach(x => cyl(0.045, 0.045, 1.3, mats.white, x, 1.65, -0.4, snack.g, 6));
    for (let k = 0; k < 5; k++) box(0.42, 0.09, 0.8, k % 2 ? mats.white : B.tint(0xff4d6d), -0.84 + k * 0.42, 2.3, -0.15, snack.g, 0.02).rotation.x = 0.25; // tenda a righe
    const items = [0, 1, 2, 3, 4, 5].map(i => { const g = new T.Group(); g.position.set(-0.7 + i * 0.28, 1.1, 0.2); cyl(0.09, 0.11, 0.08, B.tint(0xd9a45b), 0, 0, 0, g, 8); ball(0.085, B.tint([0xff7ac6, 0xfff2c0, 0x8b5a2b][i % 3]), 0, 0.09, 0, g, 8, 6); g.visible = false; snack.g.add(g); return g; });
    function openSnack() { if (snack.open) return; snack.open = true; snack.g.visible = true; G.cols.push([SX - 1.05, SX + 1.05, SZ - 0.55, SZ + 0.55]); }
    const snackMax = () => G.cocoaMax();

    // --- richieste degli ospiti ---------------------------------------------
    const held = { gu: null, el: hud.label('pill', '') };
    function dropHeld() { held.gu = null; }
    function updateRequests(dt) {
      for (const gu of guests) {
        if (gu.state !== 'bed') { if (gu.req) { gu.req = null; if (held.gu === gu) dropHeld(); } continue; }
        gu.inBed = (gu.inBed || 0) + dt;
        if (!gu.asked && gu.inBed > 3) {
          gu.asked = true;
          if (S.done >= 6 && !gu.want && Math.random() < 0.22) { gu.req = Object.assign({ t: 30 }, REQUESTS[Math.floor(Math.random() * REQUESTS.length)]); gu.stay += 6; if (R.settings.tip('req')) hud.toast('🙋 Un ospite chiede una cosa: prendila alla reception'); }
        }
        if (!gu.req) continue;
        gu.req.t -= dt;
        if (gu.req.t <= 0) { gu.req = null; if (held.gu === gu) dropHeld(); continue; }
        if (held.gu === gu && near(gu.b.x, gu.b.z + 1.2, 1.9)) {
          const tip = Math.round(P.pay * 1.5); S.coins += tip; hud.floatText('+' + tip, gu.b.x, 1.9, gu.b.z); hud.toast(`${gu.req.e} Grazie! Mancia +${tip}`);
          burst(gu.b.x, 1.4, gu.b.z, 8, [0xff7ac6, 0xffd23a], 1.5, 3, 0.8, 0.12, 1.5); A.sfx('buy'); G.EX.ev('req'); gu.req = null; dropHeld();
        }
      }
      if (held.gu && (!held.gu.req || guests.indexOf(held.gu) < 0)) dropHeld();
      if (!held.gu && near(RECEP.x, RECEP.z + 1.5, 2)) {
        const gu = guests.filter(g => g.req).sort((a, b) => a.req.t - b.req.t)[0];
        if (gu) { held.gu = gu; A.sfx('pickup'); }
      }
    }

    // --- eventi a sorpresa: bufera, festa, tubo rotto ------------------------
    const evt = { kind: null, t: 0, wait: 120, bad: false, room: null, fix: 0 };
    const chip = document.createElement('div'); chip.id = 'evtChip'; chip.hidden = true; document.body.appendChild(chip);
    const puddle = new T.Group(); puddle.visible = false; scene.add(puddle);
    const water = new T.Mesh(new T.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x59b9ff, transparent: true, opacity: 0.75, depthWrite: false })); water.position.y = 0.08; puddle.add(water);
    cyl(0.12, 0.12, 0.6, mats.steel, 0, 0.3, 0, puddle, 8); box(0.4, 0.14, 0.14, mats.steel, 0.12, 0.6, 0, puddle, 0.03);
    const reward = mul => { const c = Math.round(P.pay * mul); S.coins += c; hud.floatText('+' + c, player.position.x, 2.4, player.position.z); A.sfx('goal'); burst(player.position.x, 1.6, player.position.z, 24, CONFETTI, 4, 7, 1.1, 0.15); return c; };
    function startEvent(kind) {
      if (evt.kind) return;
      const open = rooms.filter(r => r.open);
      kind = kind || ['storm', 'party', 'pipe'][Math.floor(Math.random() * 3)];
      evt.kind = kind; evt.bad = false; evt.fix = 0;
      if (kind === 'storm') { evt.t = 25; if (G.env()) G.env().setWeather(season === 'inverno' ? 'snow' : 'storm'); hud.toast('🌨️ Bufera! Tieni tutti i fuochi accesi'); A.sfx('thunder'); }
      else if (kind === 'party') { evt.t = 30; hud.toast('🎉 Festa al rifugio: gli ospiti pagano il doppio!'); A.sfx('goal'); }
      else { evt.t = 35; evt.room = open[Math.floor(Math.random() * open.length)]; puddle.position.set(Math.sign(evt.room.cx) * 0.8, 0, evt.room.def.doorZ); puddle.visible = true; hud.toast('🔧 Tubo rotto! Corri a ripararlo'); A.sfx('cold'); }
    }
    function endEvent(ok) {
      const k = evt.kind; evt.kind = null; evt.wait = 150 + Math.random() * 90; puddle.visible = false;
      if (k === 'storm') { if (G.env()) { G.env().release(); G.env().setWeather('auto'); } if (ok) { const c = reward(6); hud.toast(`💪 Bufera superata! +${c} monete`); G.EX.ev('fix'); } }
      else if (k === 'pipe') { if (ok) { const c = reward(5); hud.toast(`🔧 Riparato! +${c} monete`); G.EX.ev('fix'); } else { boiler.fuel *= 0.5; hud.toast('💧 L\'acqua ha spento il fuoco!'); } }
    }
    function updateEvents(dt) {
      if (!evt.kind) { if (S.done >= 8 && S.fed > 0) { evt.wait -= dt; if (evt.wait <= 0) startEvent(); } return; }
      evt.t -= dt;
      if (evt.kind === 'storm') {
        boiler.fuel = Math.max(0, boiler.fuel - dt * 0.4); if (boiler.fuel <= 0) evt.bad = true;
        if (evt.t <= 0) endEvent(!evt.bad);
      } else if (evt.kind === 'party') {
        if (Math.random() < dt * 5) burst(player.position.x + (Math.random() - 0.5) * 10, 3.5, player.position.z + (Math.random() - 0.5) * 8, 5, CONFETTI, 1.5, 2, 1.4, 0.14, 4);
        if (evt.t <= 0) endEvent(true);
      } else {
        water.scale.setScalar(0.7 + 0.5 * (1 - evt.t / 35) + 0.04 * Math.sin(evt.t * 9));
        if (Math.random() < dt * 8) burst(puddle.position.x + 0.3, 0.6, puddle.position.z, 2, [0x59b9ff, 0xcfeaff], 1, 2.5, 0.5, 0.08);
        if (near(puddle.position.x, puddle.position.z, 1.4)) { evt.fix += dt; if (evt.fix >= 2.5) { endEvent(true); return; } } else evt.fix = Math.max(0, evt.fix - dt);
        if (evt.t <= 0) endEvent(false);
      }
    }

    // --- arredo -------------------------------------------------------------
    if (!S.furn) S.furn = {};
    const has = (i, id) => !!S.furn[i + ':' + id];
    const comfort = i => FURN.filter(f => has(i, f.id)).length;
    function place(i, id) {
      const r = rooms[i], d = r.def, g = r.g, s = d.side, ax = x => s * x, z = d.z0;
      if (id === 'plant') { cyl(0.2, 0.15, 0.3, B.tint(0xc1663a), ax(2.3), 0.3, z + 0.5, g, 10); ball(0.32, B.tint(0x3fae5a), ax(2.3), 0.72, z + 0.5, g, 10, 8); }
      else if (id === 'rug') { box(1.5, 0.03, 0.8, B.tint(0x9b6bd9), ax(4.4), 0.13, z + 3.3, g, 0.01); }
      else if (id === 'paint') { box(0.85, 0.6, 0.08, B.tint(0xc98a00), ax(4.65), 1.0, z + 0.14, g, 0.02); box(0.7, 0.46, 0.09, B.tint(0x9bd8ff), ax(4.65), 1.0, z + 0.15, g, 0.01); }
      else if (id === 'lamp') { cyl(0.04, 0.04, 1.0, mats.dark, ax(4.65), 0.6, z + 0.5, g, 6); const m = new T.Mesh(B.cached('shade', () => new T.CylinderGeometry(0.18, 0.3, 0.28, 12)), new T.MeshBasicMaterial({ color: 0xffe9a8 })); m.position.set(ax(4.65), 1.2, z + 0.5); g.add(m); }
      else if (id === 'books') { box(0.9, 0.9, 0.4, B.tint(0x8a5a35), ax(2.6), 0.55, z + 4.65, g, 0.03); for (let k = 0; k < 6; k++) box(0.1, 0.24, 0.16, B.tint(CONFETTI[k % CONFETTI.length]), ax(2.25 + k * 0.14), 1.12, z + 4.65, g, 0.01); }
      else { const br = B.tint(0xb98a56); ball(0.22, br, ax(3.8), 0.36, z + 4.5, g, 10, 8); ball(0.17, br, ax(3.8), 0.68, z + 4.5, g, 10, 8); [-0.12, 0.12].forEach(dx => ball(0.07, br, ax(3.8) + dx, 0.82, z + 4.5, g, 8, 6)); }
    }    rooms.forEach((r, i) => FURN.forEach(f => { if (has(i, f.id)) place(i, f.id); }));
    // Compra un mobile per la stanza i: 'ok', 'coins' (monete insufficienti) o 'no'.
    function furnish(i, id) {
      const f = FURN.find(x => x.id === id); if (!f || !rooms[i] || !rooms[i].open || has(i, id)) return 'no';
      if (S.coins < f.cost) return 'coins';
      S.coins -= f.cost; S.furn[i + ':' + id] = 1; place(i, id); burst(rooms[i].cx, 1.5, -6, 20, CONFETTI, 3, 6, 1, 0.14); return 'ok';
    }
    function furnHtml() {
      return `<div class="small">🪙 ${S.coins} · ogni mobile: +${Math.round(FURN_BONUS * 100)}% dagli ospiti di quella stanza</div>` +
        rooms.filter(r => r.open).map(r => `<b class="small">Stanza ${r.i + 1} · +${Math.round(comfort(r.i) * FURN_BONUS * 100)}%</b><div class="look">` +
          FURN.map(f => `<button class="opt${has(r.i, f.id) ? ' on' : ' lock'}" data-furn="${r.i}:${f.id}"${has(r.i, f.id) ? ' disabled' : ''}>${f.e} ${f.name}${has(r.i, f.id) ? '' : `<i>🪙${f.cost}</i>`}</button>`).join('') + '</div>').join('');
    }
    // Quanto paga in più un ospite: stelle del rifugio, arredo della sua stanza, festa, arrivo col battello.
    const payBonus = gu => (1 + STAR_BONUS * Math.floor(G.stars())) * (1 + FURN_BONUS * comfort(gu.r.i)) * (evt.kind === 'party' ? 2 : 1) * (gu.boat ? 1.25 : 1);

    function update(dt) {
      if (snack.open) {
        snack.t += dt; if (snack.t > G.cocoaInterval() * 1.4 && snack.n < snackMax()) { snack.n++; snack.t = 0; }
        if (snack.n > 0 && carry.snacks < G.cupCap() && near(PICK[0], PICK[1], 1.4)) {
          snack.cd = (snack.cd || 0) - dt;
          if (snack.cd <= 0) { snack.cd = 0.22; snack.n--; carry.snacks++; A.sfx('pickup'); _v.set(SX, 1.2, SZ + 0.2); fly('cup', _v, o => o.set(player.position.x, 1.2, player.position.z), 0.35, 0.8); }
        }
        items.forEach((m, i) => { m.visible = i < snack.n; });
      }
      updateRequests(dt); updateEvents(dt);
    }
    function overlays() {
      const t = held.gu && held.gu.req ? held.gu.req.e : '';
      if (held.el.textContent !== t) held.el.textContent = t;
      hud.put(held.el, player.position.x, 2.35, player.position.z, !!t);
      const c = !evt.kind ? '' : evt.kind === 'storm' ? `🌨️ Bufera ${Math.ceil(evt.t)}s` : evt.kind === 'party' ? `🎉 Festa ${Math.ceil(evt.t)}s` : `🔧 Tubo rotto ${Math.ceil(evt.t)}s`;
      if (chip._t !== c) { chip._t = c; chip.textContent = c; chip.hidden = !c; }
      hud.setSnack(snack.open, carry.snacks, G.cupCap(), SN.e);
    }
    const spots = () => (evt.kind === 'pipe' ? [[puddle.position.x, puddle.position.z, '#ff3b30']] : []);
    return { snack, SNACK_PICK: PICK, SN, openSnack, update, overlays, spots, payBonus, furnish, furnHtml, startEvent, comfort, event: () => evt.kind };
  };
  (R.parts = R.parts || {}).activities = Object.assign(create, { SNACK, FURN, REQUESTS });
})(window.Rifugio);
