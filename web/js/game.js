// Livello in gioco: costruisce la scena 3D e fa girare il ciclo (taglio, camini, ospiti, cioccolata, sblocchi, obiettivi).
(function (R) {
  'use strict';

  const FEED_Z = -7.6, PILE_Z = -3.2, COCOA_PICK = [11, -5.6];
  const SPAWN = [17, 1.2];
  const COATS = [0x4f7cc4, 0x7a5bb0, 0xe08a2e, 0x2a9d8f, 0xc2485f, 0x5b8c3a];

  R.createGame = function ({ hud, level, state }) {
    const T = THREE, P = level.tuning, S = state.data, objectives = level.objectives;

    // --- motore -------------------------------------------------------------
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(0xa9c9e6);
    scene.fog = new T.Fog(0xa9c9e6, 38, 95);
    const cam = new T.PerspectiveCamera(45, 1, 0.1, 200);
    hud.setCamera(cam);
    scene.add(new T.HemisphereLight(0xe4f1ff, 0x8597ad, 0.8));
    const sun = new T.DirectionalLight(0xfff1d6, 0.8);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 70;
    scene.add(sun); scene.add(sun.target);

    const B = R.createBuilder(scene), mats = B.mats, box = B.box, cyl = B.cyl, add = B.add;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = []; // ostacoli come rettangoli [x0, x1, z0, z1]

    // --- paesaggio ----------------------------------------------------------
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), mats.snow); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    box(15, 0.02, 1.6, mats.path, 10, 0.01, 1.2); box(24, 0.02, 1.4, mats.path, 2, 0.01, -2.9); box(1.4, 0.02, 4, mats.path, 3, 0.01, -0.6);
    for (let i = 0; i < 8; i++) {
      const h = 14 + rnd() * 10, r = 9 + rnd() * 6, x = -52 + i * 15 + rnd() * 4, z = -50 - rnd() * 8;
      const m = new T.Mesh(new T.ConeGeometry(r, h, 16), mats.rock); m.position.set(x, h / 2, z); scene.add(m);
      const c = new T.Mesh(new T.ConeGeometry(r * 0.38, h * 0.38, 16), mats.snow); c.position.set(x, h - h * 0.19, z); scene.add(c);
    }
    const moundGeo = new T.SphereGeometry(1, 24, 16);
    for (let i = 0; i < 14; i++) {
      const s = new T.Mesh(moundGeo, mats.snow);
      s.scale.set(1 + rnd() * 1.5, 0.35, 1 + rnd()); s.position.set(-16 + rnd() * 32, 0, -12 + rnd() * 28);
      if (Math.abs(s.position.z + 6) < 4 && Math.abs(s.position.x) < 13) continue;
      add(s);
    }

    // --- alberi -------------------------------------------------------------
    // Tutti gli abeti visibili sono abbattibili: il boschetto vicino alla baita e il bosco intorno.
    const trees = [];
    function plantTree(x, z, sc) {
      const { g, fall, stump, mats: tm } = B.tree(x, z, sc);
      const half = 0.3 * sc;
      trees.push({
        g, fall, stump, mats: tm, x, z, sc, logs: P.logs_per_tree, regrow: 0,
        state: 'up',            // 'up' in piedi, 'falling' cade, 'down' a terra (poi sparisce)
        ang: 0, vel: 0,         // inclinazione attuale (radianti) e sua velocità
        axis: new T.Vector3(1, 0, 0), hits: [], downT: 0,
        fade: 1, opacity: 1     // trasparenza quando copre il personaggio
      });
      cols.push([x - half, x + half, z - half, z + half]);
    }
    let tries = 0, near = 0;
    while (near < P.trees && tries < 800) {
      tries++;
      const x = -12 + rnd() * 24, z = 5 + rnd() * 8;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
      plantTree(x, z, 1); near++;
    }
    for (let i = 0; i < P.forest_trees; i++) {
      const x = -30 + rnd() * 60, z = -20 + rnd() * 46, sc = 0.8 + rnd() * 0.7;
      if (x > -16 && x < 18 && z > -11 && z < 15) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.4)) continue; // lascia sempre un passaggio fra gli alberi
      plantTree(x, z, sc);
    }
    function nearTree(p, maxD) {
      let best = null, bd = maxD;
      for (const t of trees) { if (t.logs <= 0) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = t; } }
      return best;
    }
    // Colpo d'ascia da (fx, fz). Il pezzo di legna è subito nello zaino; l'albero reagisce dopo "delay" secondi,
    // quando l'ascia lo raggiunge davvero: si inclina dalla parte opposta a chi colpisce, all'ultimo colpo cade.
    function chopTree(t, fx, fz, delay) {
      t.logs--;
      let dx = t.x - fx, dz = t.z - fz; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      t.hits.push({ at: delay, dx, dz, n: P.logs_per_tree - t.logs, last: t.logs <= 0 });
      if (t.logs <= 0) t.regrow = P.tree_regrow;
    }
    // Ricrescita (logica di gioco): il nuovo abete spunta piccolo e cresce.
    function regrowTrees(dt) {
      for (const t of trees) {
        if (t.logs > 0) continue;
        t.regrow -= dt;
        if (t.regrow <= 0) {
          Object.assign(t, { logs: P.logs_per_tree, state: 'up', ang: 0, vel: 0, hits: [], downT: 0 });
          t.fall.quaternion.identity(); t.fall.visible = true; t.fall.scale.setScalar(0.2); t.stump.visible = false;
        }
      }
    }
    // Movimento dell'abete: oscillazione elastica dopo ogni colpo, caduta all'ultimo, poi dissolvenza del tronco a terra.
    function animateTree(t, dt) {
      for (let i = t.hits.length - 1; i >= 0; i--) {
        const h = t.hits[i]; h.at -= dt;
        if (h.at > 0) continue;
        t.hits.splice(i, 1);
        t.axis.set(h.dz, 0, -h.dx); // ruotando attorno a questo asse la cima va nella direzione del colpo
        if (h.last) { t.state = 'falling'; t.vel = Math.max(t.vel, 0.5); t.stump.visible = true; }
        else t.vel += 1.2 + 0.45 * h.n; // ogni colpo spinge un po' di più
      }
      if (t.state === 'up') {
        t.vel += (-90 * t.ang - 8 * t.vel) * dt; // molla smorzata: l'albero torna dritto
        t.ang += t.vel * dt;
      } else if (t.state === 'falling') {
        t.vel += 6 * dt; t.ang += t.vel * dt;
        if (t.ang >= Math.PI / 2) { t.ang = Math.PI / 2; t.state = 'down'; t.downT = 0; }
      } else if (t.state === 'down') {
        t.downT += dt;
        if (t.downT > 1.8) t.fall.visible = false;
      }
      if (t.ang !== 0 || t.state !== 'up') t.fall.quaternion.setFromAxisAngle(t.axis, t.ang);
      if (t.fall.scale.x < 1) t.fall.scale.setScalar(Math.min(1, t.fall.scale.x + dt * 1.5));
    }
    // Gli abeti vicini al personaggio o fra lui e la camera diventano semitrasparenti, così lui resta sempre visibile.
    function fadeTree(t, p, dt) {
      const dx = t.x - p.x, dz = t.z - p.z;
      const covers = dz > -0.8 && dz < 7 && Math.abs(dx) < 1.3 + 0.8 * t.sc; // la camera guarda da sud (+z)
      const target = covers || Math.hypot(dx, dz) < 2.2 ? 0.35 : 1;
      t.fade += (target - t.fade) * Math.min(1, dt * 8);
      const fallFade = t.state === 'down' ? Math.max(0, 1 - Math.max(0, t.downT - 1) / 0.8) : 1;
      const o = Math.round(Math.min(t.fade, fallFade) * 50) / 50; // arrotondato: si aggiornano i materiali solo quando cambia
      if (o === t.opacity) return;
      t.opacity = o;
      for (const m of t.mats) {
        const transparent = o < 1;
        if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
        m.opacity = o;
      }
    }

    // --- stanze -------------------------------------------------------------
    // Ogni stanza è larga RW e le stanze vicine si toccano: quando sono aperte entrambe la parete in comune sparisce
    // e diventano un unico ambiente.
    const RW = 6;
    const rooms = level.rooms.map((def, i) => {
      const cx = def.x, g = new T.Group(); scene.add(g);
      box(RW, 0.2, 5, mats.plank, cx, 0.1, -6.5, g, 0.015); box(RW, 1.2, 0.3, mats.wood, cx, 0.6, -9.1, g, 0.03);
      const wallL = box(0.3, 1.2, 5, mats.wood, cx - RW / 2 + 0.15, 0.6, -6.5, g);
      const wallR = box(0.3, 1.2, 5, mats.wood, cx + RW / 2 - 0.15, 0.6, -6.5, g);
      box(1.8, 0.03, 1.1, mats.red, cx, 0.21, -7.6, g);
      box(1.5, 1.7, 0.8, mats.stone, cx, 0.85, -8.6, g); box(0.9, 0.65, 0.1, mats.dark, cx, 0.55, -8.17, g); box(1.7, 0.15, 0.9, mats.stone, cx, 1.75, -8.6, g);
      const flame = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 16), mats.flame); flame.position.set(cx, 0.55, -8.25); g.add(flame);
      const light = new T.PointLight(0xff8a3d, 0, 8); light.position.set(cx, 1.3, -7.4); scene.add(light);
      const beds = [-1.4, 1.4].map(o => {
        const bx = cx + o;
        box(1.1, 0.4, 2.1, mats.bed, bx, 0.4, -6.7, g); box(1.12, 0.1, 1.3, mats.blanket, bx, 0.62, -6.3, g); box(0.8, 0.14, 0.45, mats.snow, bx, 0.66, -7.45, g);
        return { x: bx, guest: null };
      });
      const pile = new T.Group(); pile.position.set(cx + 1.7, 0, PILE_Z); scene.add(pile);
      const ghost = box(RW, 0.05, 5, mats.ghost, cx, 0.03, -6.5, null, 0.02); ghost.castShadow = false;
      const el = hud.label('fuel', '<i></i>');
      g.visible = false;
      return { i, cx, g, flame, light, beds, pile, pileN: 0, fuel: 0, open: false, ghost, el, bar: el.firstChild, wallL, wallR, colL: null, colR: null };
    });
    const removeCol = c => { const k = cols.indexOf(c); if (k >= 0) cols.splice(k, 1); };
    function openRoom(r) {
      if (r.open) return;
      r.open = true; r.g.visible = true; r.ghost.visible = false; const c = r.cx, h = RW / 2;
      r.colL = [c - h, c - h + 0.3, -9, -4]; r.colR = [c + h - 0.3, c + h, -9, -4];
      cols.push([c - h, c + h, -9.25, -8.95], r.colL, r.colR, [c - 0.75, c + 0.75, -9, -8.2]);
      r.beds.forEach(b => cols.push([b.x - 0.55, b.x + 0.55, -7.75, -5.65]));
      joinRooms();
    }
    // Due stanze aperte una accanto all'altra: tolgo la parete in comune (e il suo ostacolo) così diventano un solo ambiente.
    function joinRooms() {
      for (const a of rooms) for (const b of rooms) {
        if (!a.open || !b.open || Math.abs(b.cx - a.cx - RW) > 0.01) continue; // b è subito a destra di a
        a.wallR.visible = false; b.wallL.visible = false;
        removeCol(a.colR); removeCol(b.colL);
      }
    }
    function drawPile(r) {
      B.clear(r.pile);
      const n = Math.min(r.pileN, 24);
      for (let i = 0; i < n; i++) { const c = new T.Mesh(B.coinGeo, mats.gold); c.position.set((i % 3) * 0.4 - 0.4, 0.04 + Math.floor(i / 3) * 0.07, 0); add(c, r.pile); }
    }
    const busy = r => r.beds.some(b => b.guest && b.guest.state === 'bed');

    // --- banco cioccolata ---------------------------------------------------
    const cocoa = { g: new T.Group(), cups: 0, t: 0, open: false }; scene.add(cocoa.g);
    box(2.2, 1, 1.1, mats.wood, 11, 0.5, -6.8, cocoa.g); box(2.4, 0.1, 1.25, mats.plank, 11, 1.05, -6.8, cocoa.g);
    cyl(0.35, 0.3, 0.5, mats.stone, 10.2, 1.35, -6.95, cocoa.g); cyl(0.3, 0.3, 0.08, mats.cocoa, 10.2, 1.6, -6.95, cocoa.g);
    box(0.12, 2.2, 0.12, mats.wood, 12.1, 1.1, -7.3, cocoa.g); box(1.2, 0.5, 0.08, mats.red, 11.6, 2.1, -7.3, cocoa.g);
    const cupMeshes = [0, 1, 2, 3].map(i => { const c = add(new T.Mesh(B.cupGeo, mats.cup), cocoa.g); c.position.set(10.8 + i * 0.32, 1.21, -6.55); c.visible = false; return c; });
    cocoa.g.visible = false;
    function openCocoa() { if (cocoa.open) return; cocoa.open = true; cocoa.g.visible = true; cols.push([9.9, 12.1, -7.35, -6.25]); }

    // --- boscaiolo ----------------------------------------------------------
    const helper = { g: null, sg: null, logs: 0, state: 'idle', cd: 0, path: [], tree: null, room: null };
    function spawnHelper() {
      if (helper.g) return;
      helper.g = B.person(0x3d8460, 0x9a6a45, true); helper.g.position.set(-11, 0, -1);
      helper.sg = new T.Group(); helper.sg.position.set(0, 0.75, -0.42); helper.g.add(helper.sg);
    }
    function updateHelper(dt) {
      const h = helper, g = h.g; h.cd -= dt;
      if (h.state === 'idle') { B.walk(g, 0, dt); const t = nearTree(g.position, 99); if (t) { h.tree = t; h.state = 'toTree'; } }
      else if (h.state === 'toTree') { if (h.tree.logs <= 0) h.state = h.logs ? 'pick' : 'idle'; else if (B.moveTo(g, h.tree.x, h.tree.z, 3.2, dt, 1.1)) h.state = 'chop'; }
      else if (h.state === 'chop') {
        B.walk(g, 0, dt);
        if (h.tree.logs <= 0 || h.logs >= P.helper_load) h.state = h.logs ? 'pick' : 'idle';
        else if (h.cd <= 0) {
          h.cd = 0.6; g.rotation.y = Math.atan2(h.tree.x - g.position.x, h.tree.z - g.position.z); B.swing(g, 0.45);
          chopTree(h.tree, g.position.x, g.position.z, 0.45 * B.HIT_AT); h.logs++; B.drawStack(h.sg, h.logs, 0);
        }
      }
      else if (h.state === 'pick') {
        B.walk(g, 0, dt);
        const r = rooms.filter(r => r.open && r.fuel < 8).sort((a, b) => a.fuel - b.fuel)[0];
        if (r) { h.room = r; h.path = [[r.cx, -3], [r.cx, -7.5]]; h.state = 'deliver'; }
      }
      else if (h.state === 'deliver') { if (B.follow(g, h.path, 3.2, dt)) h.state = 'feed'; }
      else if (h.state === 'feed') {
        if (h.logs > 0 && h.room.fuel < P.fuel_max) {
          if (h.cd <= 0) { h.cd = 0.25; h.logs--; h.room.fuel = Math.min(P.fuel_max, h.room.fuel + 1); B.drawStack(h.sg, h.logs, 0); }
        } else { h.path = [[h.room.cx, -3]]; h.state = 'leave'; }
      }
      else if (h.state === 'leave') { if (B.follow(g, h.path, 3.2, dt)) h.state = h.logs ? 'pick' : 'idle'; }
    }

    // --- piazzole di sblocco (da level.unlocks) -----------------------------
    const padGeo = new T.BoxGeometry(1.8, 0.06, 1.8);
    const pads = level.unlocks.map(u => {
      const m = new T.Mesh(padGeo, mats.pad); m.position.set(u.pos[0], 0.05, u.pos[1]); scene.add(m);
      const el = hud.label('pad', `<b>${u.title}</b><span></span>`);
      return Object.assign({}, u, { x: u.pos[0], z: u.pos[1], m, el, sp: el.querySelector('span'), cd: 0 });
    });
    function padShown(pd) {
      const r = pd.requires || {};
      if (r.objectives != null) return S.done >= r.objectives;
      if (r.bought) return state.isBought(r.bought);
      return true;
    }
    function applyEffect(pd) {
      if (pd.effect === 'room') openRoom(rooms[pd.room]);
      else if (pd.effect === 'cocoa') openCocoa();
      else if (pd.effect === 'helper') spawnHelper();
      // "bag" e "boots" sono letti da logCap(), cupCap() e speed()
    }
    const hasEffect = e => pads.some(p => p.effect === e && state.isBought(p.id));

    // --- giocatore ----------------------------------------------------------
    const player = B.person(0xd94f3d, 0xf2b632, true); player.position.set(0, 0, 0);
    const stackG = new T.Group(); stackG.position.set(0, 0.75, -0.42); player.add(stackG);
    const carry = { logs: 0, cups: 0 };
    // Lo zaino ha due scomparti separati: legna e cioccolate.
    const logCap = () => hasEffect('bag') ? P.bag_big_logs : P.bag_logs;
    const cupCap = () => hasEffect('bag') ? P.bag_big_cups : P.bag_cups;
    const speed = () => hasEffect('boots') ? P.speed_fast : P.speed_base;
    const refreshStack = () => B.drawStack(stackG, carry.logs, carry.cups);
    const stars = () => Math.min(P.stars_max, S.happy * P.star_per_guest);

    // --- stato iniziale dal salvataggio -------------------------------------
    openRoom(rooms[0]);
    pads.forEach(pd => { if (state.isBought(pd.id)) applyEffect(pd); });
    rooms.forEach((r, i) => { r.pileN = S.piles[i] || 0; drawPile(r); });

    // --- freccia guida e neve -----------------------------------------------
    const arrow = new T.Mesh(new T.ConeGeometry(0.35, 0.7, 20), mats.arrow); arrow.rotation.x = Math.PI; scene.add(arrow);
    const NS = 500, snowPos = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) { snowPos[i * 3] = -20 + Math.random() * 40; snowPos[i * 3 + 1] = Math.random() * 14; snowPos[i * 3 + 2] = -20 + Math.random() * 40; }
    const snowGeo = new T.BufferGeometry(); snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
    scene.add(new T.Points(snowGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.13, transparent: true, opacity: 0.9 })));

    // --- ospiti -------------------------------------------------------------
    const guests = []; let spawnT = 2;
    function spawnGuest() {
      let fb = null;
      for (const r of rooms) if (r.open) for (const b of r.beds) if (!b.guest && !fb) fb = [r, b];
      if (!fb) return;
      const [r, b] = fb;
      const g = B.person(COATS[Math.floor(Math.random() * COATS.length)], 0xffffff); g.scale.setScalar(0.88); g.position.set(SPAWN[0], 0, SPAWN[1]);
      const gu = { g, r, b, state: 'in', path: [[r.cx, -2.8], [b.x, -4.6]], stay: P.guest_stay, cold: 0, want: false, served: false, el: hud.label('pill', '') };
      b.guest = gu; guests.push(gu);
    }
    function leave(gu, happy) {
      const g = gu.g; g.rotation.set(0, 0, 0); g.position.set(gu.b.x, 0, -4.6); gu.b.guest = null; gu.state = 'out';
      gu.path = [[gu.r.cx, -2.8], [SPAWN[0], SPAWN[1]]];
      if (happy) {
        const pay = P.pay + (gu.served ? P.tip : 0);
        gu.r.pileN += pay; drawPile(gu.r); S.happy++; S.guests++;
        hud.floatText('+' + pay, gu.r.cx + 1.7, 1.2, PILE_Z);
      } else {
        S.happy = Math.max(0, S.happy - P.cold_penalty);
        hud.toast("Un ospite se n'è andato: aveva freddo!");
      }
    }

    // --- obiettivi e freccia ------------------------------------------------
    const objTarget = o => o.n || 1;
    const objValue = o => o.bought ? +state.isBought(o.bought) : (o.stat === 'stars' ? stars() : (S[o.stat] || 0));
    function taskTarget() {
      if (S.done >= objectives.length) return null;
      const guide = objectives[S.done].guide || '', p = player.position;
      const treeTarget = () => { const t = nearTree(p, 99); return t ? [t.x, t.z] : null; };
      if (guide === 'tree') return carry.logs >= logCap() ? [rooms[0].cx, FEED_Z] : treeTarget();
      if (guide === 'feed') return carry.logs ? [rooms[0].cx, FEED_Z] : treeTarget();
      if (guide === 'pile') { const r = rooms.filter(r => r.pileN > 0).sort((a, b) => b.pileN - a.pileN)[0]; return r ? [r.cx + 1.7, PILE_Z] : null; }
      if (guide === 'cocoa') {
        if (!carry.cups) return [COCOA_PICK[0], COCOA_PICK[1] + 0.2];
        const g = guests.find(g => g.state === 'bed' && g.want && !g.served); return g ? [g.b.x, -6] : null;
      }
      if (guide.startsWith('pad:')) { const pd = pads.find(p => p.id === guide.slice(4)); return pd ? [pd.x, pd.z] : null; }
      return null;
    }
    function refreshHud() {
      hud.setStats(S.coins, stars(), carry.logs, logCap(), carry.cups, cupCap(), cocoa.open);
      if (S.done < objectives.length) {
        const o = objectives[S.done], n = objTarget(o), v = Math.min(n, objValue(o));
        const vt = n > 1 ? `${o.decimals ? v.toFixed(o.decimals) : Math.floor(v)}/${n}` : '';
        hud.setTask(`Obiettivo ${S.done + 1} di ${objectives.length}`, o.text, vt, v / n);
      } else hud.setTask('Livello completato', 'Continua a far crescere il rifugio!', '', 1);
    }

    // --- input --------------------------------------------------------------
    const keys = {};
    addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
    addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    let joy = null; const cv = renderer.domElement;
    cv.addEventListener('pointerdown', e => {
      if (joy) return;
      joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; hud.showStick(e.clientX, e.clientY);
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignorato */ }
    });
    cv.addEventListener('pointermove', e => {
      if (!joy || e.pointerId !== joy.id) return;
      let dx = e.clientX - joy.x, dy = e.clientY - joy.y; const d = Math.hypot(dx, dy), m = 50;
      if (d > m) { dx *= m / d; dy *= m / d; }
      joy.dx = dx / m; joy.dy = dy / m; hud.moveKnob(dx, dy);
    });
    const endJoy = e => { if (joy && (!e || e.pointerId === joy.id)) { joy = null; hud.hideStick(); } };
    cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
    cv.addEventListener('contextmenu', e => e.preventDefault());

    function collide(p) {
      for (const c of cols) {
        const qx = Math.max(c[0], Math.min(p.x, c[1])), qz = Math.max(c[2], Math.min(p.z, c[3]));
        const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
        if (d < 0.35) { if (d > 1e-4) { p.x = qx + dx / d * 0.35; p.z = qz + dz / d * 0.35; } else p.z = c[3] + 0.35; }
      }
      p.x = Math.max(P.world_min[0], Math.min(P.world_max[0], p.x)); p.z = Math.max(P.world_min[1], Math.min(P.world_max[1], p.z));
    }

    // --- salvataggio --------------------------------------------------------
    function save() { S.piles = rooms.map(r => r.pileN); state.save(); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); endJoy(); } });
    addEventListener('pagehide', save);

    // --- ciclo di gioco -----------------------------------------------------
    let running = false, tt = 0, saveT = 0, chopCd = 0, feedCd = 0, cupCd = 0;
    function update(dt) {
      const p = player.position;
      let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), mz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      if (joy) { mx = joy.dx; mz = joy.dy; }
      const len = Math.hypot(mx, mz);
      const moving = len > 0.15;
      if (moving) { const k = Math.min(1, len) / len; p.x += mx * k * speed() * dt; p.z += mz * k * speed() * dt; player.rotation.y = Math.atan2(mx, mz); }
      B.walk(player, moving, dt);
      collide(p);

      let changed = false;
      chopCd -= dt; feedCd -= dt; cupCd -= dt;
      const tr = nearTree(p, P.chop_range);
      if (tr && carry.logs < logCap() && chopCd <= 0) {
        const swingDur = P.chop_interval * 0.9;
        chopCd = P.chop_interval; chopTree(tr, p.x, p.z, swingDur * B.HIT_AT); carry.logs++; S.wood++; changed = true;
        if (!moving) player.rotation.y = Math.atan2(tr.x - p.x, tr.z - p.z); // si gira verso l'albero
        B.swing(player, swingDur);
      }
      for (const r of rooms) {
        if (!r.open) continue;
        if (carry.logs > 0 && r.fuel < P.fuel_max && feedCd <= 0 && Math.hypot(p.x - r.cx, p.z - FEED_Z) < P.feed_range) {
          feedCd = P.feed_interval; carry.logs--; r.fuel = Math.min(P.fuel_max, r.fuel + 1); S.fed++; changed = true;
        }
        if (r.pileN > 0 && Math.hypot(p.x - r.cx - 1.7, p.z - PILE_Z) < 1.5) {
          S.coins += r.pileN; S.collected += r.pileN; hud.floatText('+' + r.pileN, p.x, 2.4, p.z); r.pileN = 0; drawPile(r);
        }
      }
      if (cocoa.open) {
        cocoa.t += dt; if (cocoa.t > P.cocoa_interval && cocoa.cups < P.cocoa_max) { cocoa.cups++; cocoa.t = 0; }
        if (cocoa.cups > 0 && carry.cups < cupCap() && cupCd <= 0 && Math.hypot(p.x - COCOA_PICK[0], p.z - COCOA_PICK[1]) < 1.5) {
          cupCd = 0.25; cocoa.cups--; carry.cups++; changed = true;
        }
        cupMeshes.forEach((c, i) => { c.visible = i < cocoa.cups; });
      }
      for (const gu of guests) {
        if (gu.state === 'bed' && gu.want && !gu.served && carry.cups > 0 && Math.hypot(p.x - gu.b.x, p.z + 6.6) < 2) {
          gu.served = true; carry.cups--; S.cocoa++; gu.cold = 0; changed = true; hud.floatText('Grazie!', gu.b.x, 1.6, -6.4);
        }
      }
      // piazzole: pagamento graduale, i parziali restano salvati
      for (const pd of pads) {
        if (state.isBought(pd.id) || !padShown(pd)) continue;
        pd.cd -= dt;
        if (S.coins > 0 && pd.cd <= 0 && Math.hypot(p.x - pd.x, p.z - pd.z) < 1.1) {
          pd.cd = 0.04;
          const paid = state.paid(pd.id), step = Math.min(S.coins, Math.max(1, Math.ceil(pd.cost / 40)), pd.cost - paid);
          S.coins -= step; S.paid[pd.id] = paid + step;
          if (S.paid[pd.id] >= pd.cost) { S.bought[pd.id] = true; applyEffect(pd); hud.toast(pd.title + ' sbloccato!'); save(); }
        }
      }
      if (changed) refreshStack();

      // camini
      for (const r of rooms) if (r.open) r.fuel = Math.max(0, r.fuel - dt / (busy(r) ? P.burn_busy : P.burn_idle));
      // alberi che ricrescono
      regrowTrees(dt);
      // ospiti
      if (S.fed > 0) { spawnT -= dt; if (spawnT <= 0) { spawnT = P.guest_spawn_min + Math.random() * (P.guest_spawn_max - P.guest_spawn_min); spawnGuest(); } }
      for (let i = guests.length - 1; i >= 0; i--) {
        const gu = guests[i];
        if (gu.state === 'in') {
          if (B.follow(gu.g, gu.path, 2.6, dt)) {
            gu.state = 'bed'; gu.g.rotation.set(-Math.PI / 2, 0, 0); gu.g.position.set(gu.b.x, 0.62, -5.7);
            gu.want = cocoa.open && Math.random() < P.cocoa_chance;
          }
        } else if (gu.state === 'bed') {
          if (gu.r.fuel > 0) { gu.stay -= dt; gu.cold = Math.max(0, gu.cold - dt * 2); } else gu.cold += dt;
          if (gu.cold > P.guest_cold_limit) leave(gu, false); else if (gu.stay <= 0) leave(gu, true);
        } else if (B.follow(gu.g, gu.path, 2.8, dt)) { scene.remove(gu.g); gu.el.remove(); guests.splice(i, 1); }
      }
      if (helper.g) updateHelper(dt);

      // obiettivi
      while (S.done < objectives.length && objValue(objectives[S.done]) >= objTarget(objectives[S.done])) {
        S.done++; S.coins += P.objective_reward; hud.toast(`Obiettivo completato! +${P.objective_reward} monete`); save();
      }
      if (S.done >= objectives.length && !S.won) {
        S.won = true; save(); running = false; endJoy();
        hud.showWin(`Hai ospitato ${S.guests} escursionisti e servito ${S.cocoa} cioccolate calde.`);
      }
      saveT += dt; if (saveT > 3) { saveT = 0; save(); }
    }

    function anim(dt) {
      tt += dt; const p = player.position;
      for (const r of rooms) {
        const lit = r.fuel > 0, s = lit ? 0.45 + r.fuel / P.fuel_max * 0.75 : 0;
        r.flame.visible = lit; r.flame.scale.set(s, s * (1 + 0.18 * Math.sin(tt * 13 + r.i)), s);
        r.light.intensity = lit ? 0.6 + r.fuel / P.fuel_max + 0.15 * Math.sin(tt * 17 + r.i) : 0;
      }
      for (const t of trees) { animateTree(t, dt); fadeTree(t, p, dt); }
      mats.pad.opacity = 0.45 + 0.2 * Math.sin(tt * 4);
      pads.forEach(pd => { pd.m.visible = !state.isBought(pd.id) && padShown(pd); });
      const tg = running ? taskTarget() : null;
      arrow.visible = !!tg && Math.hypot(tg[0] - p.x, tg[1] - p.z) > 1.4;
      if (tg) { arrow.position.set(tg[0], 2.9 + Math.sin(tt * 4) * 0.25, tg[1]); arrow.rotation.y = tt * 2; }
      const a = snowGeo.attributes.position.array;
      for (let i = 0; i < NS; i++) {
        a[i * 3 + 1] -= dt * 1.3; a[i * 3] += Math.sin(tt + i) * dt * 0.2;
        if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = 14; a[i * 3] = p.x - 20 + Math.random() * 40; a[i * 3 + 2] = p.z - 20 + Math.random() * 40; }
      }
      snowGeo.attributes.position.needsUpdate = true;
      // camera isometrica che segue il giocatore; si allontana in verticale (portrait)
      const asp = innerWidth / innerHeight, k = asp < 0.8 ? 1.45 : asp < 1.2 ? 1.15 : 1;
      cam.position.lerp(new T.Vector3(p.x, 15 * k, p.z + 12 * k), Math.min(1, dt * 5));
      cam.lookAt(cam.position.x, 0, cam.position.z - 12 * k - 1);
      sun.position.set(p.x - 10, 22, p.z + 8); sun.target.position.set(p.x, 0, p.z);
    }

    function overlays(dt) {
      rooms.forEach(r => { hud.put(r.el, r.cx, 2.35, -8.6, r.open); r.bar.style.width = (r.fuel / P.fuel_max * 100) + '%'; });
      pads.forEach(pd => {
        const v = pd.m.visible;
        if (v) pd.sp.textContent = (pd.cost - state.paid(pd.id)) + ' monete';
        hud.put(pd.el, pd.x, 0.5, pd.z - 0.2, v);
      });
      guests.forEach(gu => {
        let txt = '', cls = 'pill';
        if (gu.state === 'bed') {
          if (gu.r.fuel <= 0) { txt = 'Ho freddo!'; cls += ' cold'; }
          else if (gu.want && !gu.served) { txt = 'Cioccolata?'; cls += ' want'; }
        }
        if (gu.el.textContent !== txt) gu.el.textContent = txt;
        if (gu.el.className !== cls) gu.el.className = cls;
        hud.put(gu.el, gu.b.x, 1.4, -6.6, !!txt);
      });
      hud.updateFloats(dt);
    }

    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    cam.position.set(0, 15, 12);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) update(dt);
      anim(dt); renderer.render(scene, cam); overlays(dt); refreshHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      start() { running = true; if (S.done === 0) hud.toast('Vai verso il bosco: segui la freccia gialla'); },
      resume() { running = true; },
      save
    };
  };
})(window.Rifugio);
