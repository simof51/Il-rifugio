// Livello in gioco: costruisce la scena 3D e fa girare il ciclo (taglio, camini, ospiti, bevande, sblocchi, obiettivi).
// L'aspetto (colori, alberi, lago, fiori) e i numeri vengono dal livello (js/levels/*.js).
(function (R) {
  'use strict';

  const FEED_Z = -7.6, PILE_Z = -3.2, COCOA_PICK = [11, -5.6];
  const SPAWN = [17, 1.2];
  const COATS = [0x4f8cff, 0xa066ff, 0xff9a2a, 0x2ec4b6, 0xff5d8f, 0x6bcf3a];
  const CONFETTI = [0xff4d4d, 0xffd23a, 0x3d8bff, 0x4cd964, 0xff7ac6, 0xa066ff];

  R.createGame = function ({ hud, level, state }) {
    const T = THREE, P = level.tuning, S = state.data, objectives = level.objectives, TH = level.theme, TX = level.text;

    // --- motore -------------------------------------------------------------
    // Prestazioni: niente antialias (pesa molto sul telefono) e ombre PCF semplici (le "soft" costano di più).
    // La risoluzione resta piena (fino a 2x) e non viene mai abbassata da sola.
    const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(TH.sky);
    scene.fog = new T.Fog(TH.sky, TH.fog[0], TH.fog[1]);
    // near/far stretti: la camera sta sempre ad almeno ~10 m da tutto, e una profondità più precisa evita i lampeggi sulle superfici piatte.
    const cam = new T.PerspectiveCamera(45, 1, 4, 130);
    hud.setCamera(cam);
    scene.add(new T.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]));
    const sun = new T.DirectionalLight(TH.sun[0], TH.sun[1]);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; // niente puntini d'ombra sulle superfici piatte
    const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 70;
    scene.add(sun); scene.add(sun.target);

    const B = R.createBuilder(scene, TH), mats = B.mats, box = B.box, cyl = B.cyl, ball = B.ball, add = B.add;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = []; // ostacoli come rettangoli [x0, x1, z0, z1]
    const lake = level.lake;
    const inLake = (x, z, pad) => !!lake && Math.hypot(x - lake.x, z - lake.z) < lake.r + (pad || 0);

    // --- paesaggio ----------------------------------------------------------
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), mats.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // Tratti di sentiero sovrapposti: altezze leggermente diverse, altrimenti le facce piatte coincidono e lampeggiano (z-fighting).
    mats.path.polygonOffset = true; mats.path.polygonOffsetFactor = -1; mats.path.polygonOffsetUnits = -1;
    const pathBox = (...a) => { const m = box(...a); m.castShadow = false; return m; }; // il sentiero non proietta ombre (sono solo un velo sul terreno)
    pathBox(15, 0.02, 1.6, mats.path, 10, 0.01, 1.2); pathBox(24, 0.02, 1.4, mats.path, 2, 0.013, -2.9); pathBox(1.4, 0.02, 4, mats.path, 3, 0.016, -0.6);
    for (let i = 0; i < 8; i++) {
      const h = 14 + rnd() * 10, r = 9 + rnd() * 6, x = -52 + i * 15 + rnd() * 4, z = -50 - rnd() * 8;
      const m = new T.Mesh(new T.ConeGeometry(r, h, 16), mats.hill); m.position.set(x, h / 2, z); scene.add(m);
      const c = new T.Mesh(new T.ConeGeometry(r * 0.38, h * 0.38, 16), mats.peak); c.position.set(x, h - h * 0.19, z); scene.add(c);
    }
    const moundGeo = new T.SphereGeometry(1, 24, 16);
    for (let i = 0; i < 14; i++) {
      const s = new T.Mesh(moundGeo, mats.ground);
      s.scale.set(1 + rnd() * 1.5, 0.35, 1 + rnd()); s.position.set(-16 + rnd() * 32, 0, -12 + rnd() * 28);
      if (Math.abs(s.position.z + 6) < 4 && Math.abs(s.position.x) < 13) continue;
      if (inLake(s.position.x, s.position.z, 3)) continue;
      add(s);
    }
    // Prato fiorito: margherite e fiorellini colorati fusi in una sola mesh.
    if (TH.flowers) {
      const FL = [0xffffff, 0xffd23a, 0xff7ac6, 0xff4d4d, 0xa066ff, 0xff9a2a], petal = B.cached('petal', () => new T.CylinderGeometry(0.13, 0.13, 0.03, 8)), heart = B.cached('flc', () => new T.CylinderGeometry(0.06, 0.06, 0.05, 8));
      const parts = [];
      for (let i = 0; i < 170; i++) {
        const x = -30 + rnd() * 60, z = -20 + rnd() * 46;
        if (inLake(x, z, 2.2) || (x > -3 && x < 18 && z > -3.8 && z < 2.2) || (x > -8 && x < 8 && z < -3.6 && z > -9.4) || (x > 8 && x < 13 && z > -8 && z < -3)) continue;
        const c = FL[Math.floor(rnd() * FL.length)];
        parts.push({ geo: petal, x, y: 0.05, z, s: 0.8 + rnd() * 0.6, color: c }, { geo: heart, x, y: 0.07, z, color: c === 0xffd23a ? 0xff9a2a : 0xffd23a });
      }
      const fm = new T.Mesh(B.mergeParts(parts), mats.accent); fm.receiveShadow = true; scene.add(fm);
    }
    // Lago con spiaggia, ninfee, paperelle e una barchetta (solo se il livello lo prevede).
    const ducks = [], bobbers = [];
    function makeDuck(scale) {
      const g = new T.Group();
      ball(0.3, mats.yellow, 0, 0.3, 0, g, 14, 10).scale.set(1, 0.85, 1.25);
      ball(0.2, mats.yellow, 0, 0.62, 0.22, g, 12, 8);
      const beak = new T.Mesh(B.cached('beak', () => new T.ConeGeometry(0.07, 0.16, 8).rotateX(Math.PI / 2)), mats.orange); beak.position.set(0, 0.6, 0.42); g.add(beak);
      [-0.08, 0.08].forEach(ex => ball(0.035, mats.dark, ex, 0.68, 0.36, g, 6, 5));
      ball(0.13, mats.yellow, 0, 0.42, -0.34, g, 8, 6); // coda
      g.scale.setScalar(scale || 1); scene.add(g);
      return g;
    }
    if (lake) {
      const sand = new T.Mesh(new T.CircleGeometry(lake.r + 1.3, 40), mats.sand); sand.rotation.x = -Math.PI / 2; sand.position.set(lake.x, 0.02, lake.z); sand.receiveShadow = true; scene.add(sand);
      const water = new T.Mesh(new T.CircleGeometry(lake.r, 40), mats.water); water.rotation.x = -Math.PI / 2; water.position.set(lake.x, 0.04, lake.z); water.receiveShadow = true; scene.add(water);
      [mats.sand, mats.water].forEach(m => { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; });
      for (let i = 0; i < 6; i++) { // ninfee
        const a = rnd() * 6.28, d = rnd() * (lake.r - 1.5), lp = new T.Mesh(B.cached('lily', () => new T.CircleGeometry(0.45, 12)), mats.foliage.clone());
        lp.material.vertexColors = false; lp.material.color.set(0x3fb14f); lp.rotation.x = -Math.PI / 2; lp.position.set(lake.x + Math.cos(a) * d, 0.06, lake.z + Math.sin(a) * d); scene.add(lp);
      }
      for (let i = 0; i < 3; i++) { const d = makeDuck(1); ducks.push({ g: d, a: i * 2.1, rr: 2.2 + i * 1.5, sp: 0.25 + i * 0.07 * (i % 2 ? -1 : 1) }); }
      const boat = new T.Group(); box(1.7, 0.28, 0.75, mats.red, 0, 0.18, 0, boat, 0.1); box(1.5, 0.1, 0.55, mats.plank, 0, 0.34, 0, boat, 0.04);
      box(0.06, 1.2, 0.06, mats.wood, 0.1, 0.95, 0, boat); box(0.7, 0.55, 0.03, mats.white, 0.45, 1.0, 0, boat, 0.01);
      boat.position.set(lake.x + 2.2, 0.05, lake.z - 1.5); boat.rotation.y = 0.5; scene.add(boat); bobbers.push({ g: boat, ph: 0 });
      // Il lago è un ostacolo: lo approssimo con strisce di rettangoli.
      const N = 7;
      for (let i = 0; i < N; i++) {
        const z0 = lake.z - lake.r + (2 * lake.r) * i / N, z1 = lake.z - lake.r + (2 * lake.r) * (i + 1) / N, zm = Math.min(Math.abs(z0 - lake.z), Math.abs(z1 - lake.z));
        const w = Math.sqrt(Math.max(0, lake.r * lake.r - zm * zm)) - 0.3;
        if (w > 0.3) cols.push([lake.x - w, lake.x + w, z0, z1]);
      }
    }

    // --- alberi -------------------------------------------------------------
    // Tutti gli alberi visibili sono abbattibili: il boschetto vicino alla baita e il bosco intorno.
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
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.5) || inLake(x, z, 1.5)) continue;
      plantTree(x, z, 1); near++;
    }
    for (let i = 0; i < P.forest_trees; i++) {
      const x = -30 + rnd() * 60, z = -20 + rnd() * 46, sc = 0.8 + rnd() * 0.7;
      if (x > -16 && x < 18 && z > -11 && z < 15) continue;
      if (inLake(x, z, 2)) continue;
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
      if (t.logs <= 0) { t.regrow = P.tree_regrow; S.trees = (S.trees || 0) + 1; }
    }
    // Ricrescita (logica di gioco): il nuovo albero spunta piccolo e cresce.
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
    // Movimento dell'albero: oscillazione elastica dopo ogni colpo, caduta all'ultimo, poi dissolvenza del tronco a terra.
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
    // Gli alberi vicini al personaggio o fra lui e la camera diventano semitrasparenti, così lui resta sempre visibile.
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

    // --- effetti: oggetti volanti, particelle, tempi -------------------------
    const _v = new T.Vector3(), _w = new T.Vector3();
    const later = [];
    const after = (sec, fn) => later.push({ t: sec, fn });
    // Oggetti che volano da un punto a un altro (legna, tazze, monete): non spariscono, viaggiano ad arco e poi atterrano.
    const flyers = [], flyFree = { log: [], cup: [], coin: [] };
    const flyDef = { log: [B.logGeo, mats.wood], cup: [B.cupGeo, mats.cup], coin: [B.coinGeo, mats.gold] };
    function fly(kind, from, to, dur, arc, done, delay) {
      let m = flyFree[kind].pop();
      if (!m) { m = new T.Mesh(flyDef[kind][0], flyDef[kind][1]); scene.add(m); }
      m.visible = false;
      flyers.push({ m, kind, a: from.clone(), to, t: -(delay || 0), dur, arc, done });
    }
    function updateFlyers(dt) {
      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]; f.t += dt;
        if (f.t < 0) continue;
        const k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        if (typeof f.to === 'function') f.to(_v); else _v.copy(f.to);
        f.m.visible = true;
        f.m.position.set(f.a.x + (_v.x - f.a.x) * e, f.a.y + (_v.y - f.a.y) * e + Math.sin(Math.PI * k) * f.arc, f.a.z + (_v.z - f.a.z) * e);
        f.m.rotation.x += dt * 9; f.m.rotation.z += dt * 6;
        f.m.scale.setScalar(1 + 0.25 * Math.sin(Math.PI * k));
        if (k >= 1) { f.m.visible = false; flyFree[f.kind].push(f.m); flyers.splice(i, 1); if (f.done) f.done(); }
      }
    }
    // Particelle: scheggie di legno, scintille, coriandoli, cuoricini.
    const partGeo = new T.BoxGeometry(1, 1, 1), partMat = {}, parts = [], partFree = [];
    function burst(x, y, z, n, colors, speed, up, life, size, grav) {
      for (let i = 0; i < n; i++) {
        let m = partFree.pop();
        if (!m) { m = new T.Mesh(partGeo, null); scene.add(m); }
        const c = colors[Math.floor(Math.random() * colors.length)];
        m.material = partMat[c] || (partMat[c] = new T.MeshBasicMaterial({ color: c }));
        const a = Math.random() * 6.283, sp = speed * (0.4 + Math.random() * 0.6), sz = size * (0.7 + Math.random() * 0.6);
        m.position.set(x, y, z); m.scale.setScalar(sz); m.visible = true;
        parts.push({ m, vx: Math.cos(a) * sp, vy: up * (0.5 + Math.random() * 0.7), vz: Math.sin(a) * sp, t: 0, life: life * (0.7 + Math.random() * 0.5), sz, g: grav == null ? 9 : grav });
      }
    }
    function updateParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.rotation.x += dt * 8; p.m.rotation.y += dt * 6;
        const k = p.t / p.life; p.m.scale.setScalar(p.sz * (k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3)));
        if (p.t >= p.life || p.m.position.y < 0) { p.m.visible = false; partFree.push(p.m); parts.splice(i, 1); }
      }
    }
    function tickLater(dt) {
      for (let i = later.length - 1; i >= 0; i--) { later[i].t -= dt; if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); f(); } }
    }

    // --- stanze -------------------------------------------------------------
    // Ogni stanza è larga RW e le stanze vicine si toccano: quando sono aperte entrambe la parete in comune sparisce
    // e diventano un unico ambiente.
    const RW = 6;
    const flagGeo = B.cached('flag', () => new T.ConeGeometry(0.15, 0.3, 3).rotateX(Math.PI));
    const rooms = level.rooms.map((def, i) => {
      const cx = def.x, g = new T.Group(); scene.add(g);
      box(RW, 0.2, 5, mats.plank, cx, 0.1, -6.5, g, 0.015); box(RW, 1.2, 0.3, mats.wood, cx, 0.6, -9.1, g, 0.03);
      const wallL = box(0.3, 1.2, 5, mats.wood, cx - RW / 2 + 0.15, 0.6, -6.5, g);
      const wallR = box(0.3, 1.2, 5, mats.wood, cx + RW / 2 - 0.15, 0.6, -6.5, g);
      box(1.8, 0.03, 1.1, mats.red, cx, 0.21, -7.6, g);
      box(1.5, 1.7, 0.8, mats.stone, cx, 0.85, -8.6, g); box(0.9, 0.65, 0.1, mats.dark, cx, 0.55, -8.17, g); box(1.7, 0.15, 0.9, mats.stone, cx, 1.75, -8.6, g);
      // festone di bandierine colorate sulla parete di fondo
      const bun = B.mergeParts(Array.from({ length: 9 }, (_, k) => ({ geo: flagGeo, x: cx - 2.5 + k * 0.625, y: 1.2, z: -8.93, color: CONFETTI[(k + i) % CONFETTI.length] })));
      g.add(new T.Mesh(bun, mats.accent));
      const flame = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 16), mats.flame); flame.position.set(cx, 0.55, -8.25); g.add(flame);
      const light = new T.PointLight(0xff8a3d, 0, 8); light.position.set(cx, 1.3, -7.4); scene.add(light);
      const beds = [-1.4, 1.4].map(o => {
        const bx = cx + o;
        box(1.1, 0.4, 2.1, mats.bed, bx, 0.4, -6.7, g); box(1.12, 0.1, 1.3, mats.blanket, bx, 0.62, -6.3, g); box(0.8, 0.14, 0.45, mats.white, bx, 0.66, -7.45, g);
        return { x: bx, guest: null };
      });
      const pile = new T.Group(); pile.position.set(cx + 1.7, 0, PILE_Z); scene.add(pile);
      const ghost = box(RW, 0.05, 5, mats.ghost, cx, 0.03, -6.5, null, 0.02); ghost.castShadow = false;
      const el = hud.label('fuel', '<i></i>');
      g.visible = false;
      return { i, cx, g, flame, light, beds, pile, pileN: 0, fuel: 0, pend: 0, flare: 0, open: false, ghost, el, bar: el.firstChild, wallL, wallR, colL: null, colR: null };
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
    const firePos = (r, v) => v.set(r.cx, 0.7, -8.1);

    // --- banco bevande ------------------------------------------------------
    const cocoa = { g: new T.Group(), cups: 0, t: 0, open: false }; scene.add(cocoa.g);
    box(2.2, 1, 1.1, mats.wood, 11, 0.5, -6.8, cocoa.g); box(2.4, 0.1, 1.25, mats.plank, 11, 1.05, -6.8, cocoa.g);
    cyl(0.35, 0.3, 0.5, mats.stone, 10.2, 1.35, -6.95, cocoa.g); cyl(0.3, 0.3, 0.08, mats.cocoa, 10.2, 1.6, -6.95, cocoa.g);
    box(0.12, 2.2, 0.12, mats.wood, 12.1, 1.1, -7.3, cocoa.g); box(1.2, 0.5, 0.08, mats.red, 11.6, 2.1, -7.3, cocoa.g);
    const cupMeshes = [0, 1, 2, 3, 4, 5].map(i => { const c = add(new T.Mesh(B.cupGeo, mats.cup), cocoa.g); c.position.set(10.55 + i * 0.28, 1.21, -6.55); c.visible = false; return c; });
    cocoa.g.visible = false;
    function openCocoa() { if (cocoa.open) return; cocoa.open = true; cocoa.g.visible = true; cols.push([9.9, 12.1, -7.35, -6.25]); }

    // --- aiutanti (boscaioli) -----------------------------------------------
    const helpers = [];
    function spawnHelper(n) {
      if (helpers[n]) return;
      const g = B.person(n ? 0x2f7bd6 : 0x3fae6e, 0xb07848, true); g.position.set(-11, 0, n ? 2.8 : -1);
      const sg = new T.Group(); sg.position.set(0, 0.75, -0.32); g.add(sg);
      helpers[n] = { g, sg, logs: 0, state: 'idle', cd: 0, path: [], tree: null, room: null };
    }
    function updateHelper(h, dt) {
      const g = h.g; h.cd -= dt;
      if (h.state === 'idle') { B.walk(g, 0, dt); const t = nearTree(g.position, 99); if (t) { h.tree = t; h.state = 'toTree'; } }
      else if (h.state === 'toTree') { if (h.tree.logs <= 0) h.state = h.logs ? 'pick' : 'idle'; else if (B.moveTo(g, h.tree.x, h.tree.z, 3.2, dt, 1.1)) h.state = 'chop'; }
      else if (h.state === 'chop') {
        B.walk(g, 0, dt);
        if (h.tree.logs <= 0 || h.logs >= P.helper_load) h.state = h.logs ? 'pick' : 'idle';
        else if (h.cd <= 0) {
          const tr = h.tree, dur = 0.45, ci = chopInterval() * 1.3;
          h.cd = ci; g.rotation.y = Math.atan2(tr.x - g.position.x, tr.z - g.position.z); B.swing(g, dur);
          chopTree(tr, g.position.x, g.position.z, dur * B.HIT_AT); h.logs++; h.inb = (h.inb || 0) + 1;
          after(dur * B.HIT_AT, () => {
            burst(tr.x, 1.2, tr.z, 4, [0xb07848, 0xe6b27a], 2.2, 3, 0.5, 0.1);
            _v.set(tr.x, 1.1, tr.z);
            fly('log', _v, o => h.sg.getWorldPosition(o), 0.3, 0.5, () => { h.inb--; B.drawStack(h.sg, h.logs - (h.inb || 0), 0); });
          });
        }
      }
      else if (h.state === 'pick') {
        B.walk(g, 0, dt);
        const r = rooms.filter(r => r.open && r.fuel + r.pend < 8).sort((a, b) => a.fuel - b.fuel)[0];
        if (r) { h.room = r; h.path = [[r.cx, -3], [r.cx, -7.5]]; h.state = 'deliver'; }
      }
      else if (h.state === 'deliver') { if (B.follow(g, h.path, 3.2, dt)) h.state = 'feed'; }
      else if (h.state === 'feed') {
        const r = h.room;
        if (h.logs > 0 && r.fuel + r.pend + 1 <= P.fuel_max) {
          if (h.cd <= 0) {
            h.cd = 0.25; h.logs--; r.pend++; B.toss(g, 0.22); g.rotation.y = Math.PI; B.drawStack(h.sg, h.logs, 0);
            h.sg.getWorldPosition(_v);
            fly('log', _v, firePos(r, new T.Vector3()), 0.38, 0.9, () => landLog(r));
          }
        } else { h.path = [[r.cx, -3]]; h.state = 'leave'; }
      }
      else if (h.state === 'leave') { if (B.follow(g, h.path, 3.2, dt)) h.state = h.logs ? 'pick' : 'idle'; }
    }
    // Un pezzo di legna arriva nel camino: il fuoco sale e fa scintille.
    function landLog(r) {
      r.pend--; r.fuel = Math.min(P.fuel_max, r.fuel + 1); S.fed++; r.flare = 1;
      burst(r.cx, 0.8, -8.1, 5, [0xffa233, 0xffd23a, 0xff6a2a], 1.6, 4, 0.55, 0.09, 6);
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
    // Decorazioni acquistabili: lanterne colorate lungo i sentieri e la mascotte del livello.
    const bulbs = [];
    function buildLamps() {
      const BC = [0xff4d4d, 0xffd23a, 0x4cd964, 0x3d8bff, 0xff7ac6];
      const spots = [[5, 2.7], [9, 2.7], [13, 2.7], [17, 2.7], [-9, -1.7], [-5, -1.7], [5.5, -1.7], [9.5, -1.7]];
      spots.forEach(([x, z], i) => {
        cyl(0.05, 0.06, 1.5, mats.wood, x, 0.75, z, null, 8);
        const bm = new T.MeshBasicMaterial({ color: BC[i % BC.length] }), b = new T.Mesh(B.cached('bulb', () => new T.SphereGeometry(0.2, 12, 10)), bm); b.position.set(x, 1.65, z); scene.add(b);
        bulbs.push({ b, ph: i });
      });
    }
    function buildMascot(pd) {
      if (TH.deco === 'duck') { const d = makeDuck(2.4); d.position.set(pd.x, 0, pd.z); d.rotation.y = 1.2; bobbers.push({ g: d, ph: 1, base: 0, amp: 0.06 }); cols.push([pd.x - 0.6, pd.x + 0.6, pd.z - 0.6, pd.z + 0.6]); return; }
      // pupazzo di neve
      const g = new T.Group(); g.position.set(pd.x, 0, pd.z);
      ball(0.8, mats.snow, 0, 0.7, 0, g, 18, 14); ball(0.58, mats.snow, 0, 1.75, 0, g, 18, 14); ball(0.4, mats.snow, 0, 2.55, 0, g, 16, 12);
      const nose = new T.Mesh(B.cached('carrot', () => new T.ConeGeometry(0.08, 0.5, 8).rotateX(Math.PI / 2)), mats.orange); nose.position.set(0, 2.55, 0.5); g.add(nose);
      [-0.14, 0.14].forEach(ex => ball(0.05, mats.dark, ex, 2.7, 0.36, g, 6, 5));
      [0, 1, 2].forEach(k => ball(0.06, mats.dark, 0, 1.95 - k * 0.3, 0.57 - k * 0.04, g, 6, 5));
      cyl(0.3, 0.3, 0.06, mats.dark, 0, 2.9, 0, g, 14); cyl(0.2, 0.2, 0.35, mats.dark, 0, 3.1, 0, g, 14);
      const sc2 = new T.Mesh(B.cached('scarf2', () => new T.TorusGeometry(0.4, 0.09, 8, 16).rotateX(Math.PI / 2)), mats.red); sc2.position.y = 2.25; g.add(sc2);
      [-1, 1].forEach(s => { const arm = cyl(0.03, 0.03, 0.9, mats.trunk, s * 0.85, 1.9, 0, g, 6); arm.rotation.z = s * -0.9; });
      scene.add(g); bobbers.push({ g, ph: 2, base: 0, amp: 0.03 }); cols.push([pd.x - 0.6, pd.x + 0.6, pd.z - 0.6, pd.z + 0.6]);
    }
    function applyEffect(pd) {
      if (pd.effect === 'room') openRoom(rooms[pd.room]);
      else if (pd.effect === 'cocoa') openCocoa();
      else if (pd.effect === 'helper') spawnHelper(0);
      else if (pd.effect === 'helper2') spawnHelper(1);
      else if (pd.effect === 'lamps') buildLamps();
      else if (pd.effect === 'mascot') buildMascot(pd);
      // "bag", "bag2", "boots", "axe", "insul", "sign" e "cocoa2" sono letti da hasEffect()
    }
    const hasEffect = e => pads.some(p => p.effect === e && state.isBought(p.id));

    // --- giocatore ----------------------------------------------------------
    const player = B.person(0xf0503a, 0xffd23a, true); player.position.set(0, 0, 0);
    const stackG = new T.Group(); stackG.position.set(0, 0.75, -0.32); player.add(stackG);
    const carry = { logs: 0, cups: 0 };
    let inLogs = 0, inCups = 0; // pezzi ancora in volo verso lo zaino: compaiono sulla schiena solo quando arrivano
    // Lo zaino ha due scomparti separati: legna e bevande.
    const logCap = () => hasEffect('bag2') ? P.bag_huge_logs : hasEffect('bag') ? P.bag_big_logs : P.bag_logs;
    const cupCap = () => hasEffect('bag2') ? P.bag_huge_cups : hasEffect('bag') ? P.bag_big_cups : P.bag_cups;
    const speed = () => hasEffect('boots') ? P.speed_fast : P.speed_base;
    const chopInterval = () => P.chop_interval * (hasEffect('axe') ? P.axe_mul : 1);
    const burnMul = () => hasEffect('insul') ? P.insul_mul : 1;
    const cocoaInterval = () => hasEffect('cocoa2') ? P.cocoa2_interval : P.cocoa_interval;
    const cocoaMax = () => hasEffect('cocoa2') ? P.cocoa2_max : P.cocoa_max;
    const refreshStack = () => B.drawStack(stackG, Math.max(0, carry.logs - inLogs), Math.max(0, carry.cups - inCups));
    const stars = () => Math.min(P.stars_max, S.happy * P.star_per_guest);
    openRoom(rooms[0]); // la prima stanza è sempre aperta
    rooms.forEach((r, i) => { r.pileN = S.piles[i] || 0; drawPile(r); });
    pads.forEach(pd => { if (state.isBought(pd.id)) applyEffect(pd); });

    // --- freccia guida e caduta (neve o petali) ------------------------------
    const arrow = new T.Mesh(new T.ConeGeometry(0.35, 0.7, 20), mats.arrow); arrow.rotation.x = Math.PI; scene.add(arrow);
    const snowy = TH.fall === 'snow', NS = snowy ? 500 : 200, snowPos = new Float32Array(NS * 3), fallSpeed = snowy ? 1.3 : 0.7;
    for (let i = 0; i < NS; i++) { snowPos[i * 3] = -20 + Math.random() * 40; snowPos[i * 3 + 1] = Math.random() * 14; snowPos[i * 3 + 2] = -20 + Math.random() * 40; }
    const snowGeo = new T.BufferGeometry(); snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
    scene.add(new T.Points(snowGeo, new T.PointsMaterial(snowy ? { color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9 } : { color: 0xff9ec7, size: 0.17, transparent: true, opacity: 0.95 })));
    // Farfalle: un'ala sola che batte (scala in larghezza), sempre in giro sul prato.
    const flies = [];
    if (TH.butterflies) {
      const BCOL = [0xff7ac6, 0xffd23a, 0x4fc3f7, 0xff9a2a, 0xa066ff];
      for (let i = 0; i < 10; i++) {
        const m = new T.Mesh(B.cached('wing', () => new T.PlaneGeometry(0.42, 0.3)), new T.MeshBasicMaterial({ color: BCOL[i % BCOL.length], side: T.DoubleSide }));
        scene.add(m); flies.push({ m, cx: -22 + rnd() * 44, cz: -12 + rnd() * 30, r: 1.5 + rnd() * 3, ph: rnd() * 6.28, sp: 0.35 + rnd() * 0.3 });
      }
    }

    // --- ospiti -------------------------------------------------------------
    const guests = []; let spawnT = 2;
    function spawnGuest() {
      let fb = null;
      for (const r of rooms) if (r.open) for (const b of r.beds) if (!b.guest && !fb) fb = [r, b];
      if (!fb) return;
      const [r, b] = fb;
      const g = B.person(COATS[Math.floor(Math.random() * COATS.length)], CONFETTI[Math.floor(Math.random() * CONFETTI.length)]); g.scale.setScalar(0.88); g.position.set(SPAWN[0], 0, SPAWN[1]);
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
        burst(gu.r.cx + 1.7, 0.6, PILE_Z, 8, [0xffd23a, 0xfff2a8], 2.2, 4, 0.7, 0.1);
      } else {
        S.happy = Math.max(0, S.happy - P.cold_penalty);
        hud.toast(TX.coldLeave);
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
      } else hud.setTask('Livello completato', 'Continua a far crescere il rifugio! 🎉', '', 1);
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
    let running = false, tt = 0, saveT = 0, chopCd = 0, feedCd = 0, cupCd = 0, hopT = 0;
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
        const ci = chopInterval(), swingDur = ci * 0.95, delay = swingDur * B.HIT_AT;
        chopCd = ci; chopTree(tr, p.x, p.z, delay); carry.logs++; S.wood++; inLogs++; changed = true;
        if (!moving) player.rotation.y = Math.atan2(tr.x - p.x, tr.z - p.z); // si gira verso l'albero
        B.swing(player, swingDur);
        // All'impatto: scheggie di legno e il pezzo di legna vola dall'albero allo zaino.
        after(delay, () => {
          burst(tr.x, 1.2, tr.z, 5, [0xb07848, 0xe6b27a, 0x7a4a30], 2.4, 3.2, 0.5, 0.1);
          _v.set(tr.x, 1.1, tr.z);
          fly('log', _v, o => stackG.getWorldPosition(o), 0.32, 0.6, () => { inLogs--; refreshStack(); });
        });
      }
      for (const r of rooms) {
        if (!r.open) continue;
        if (carry.logs > 0 && r.fuel + r.pend + 1 <= P.fuel_max && feedCd <= 0 && Math.hypot(p.x - r.cx, p.z - FEED_Z) < P.feed_range) {
          feedCd = P.feed_interval; carry.logs--; r.pend++; changed = true; refreshStack();
          B.toss(player, 0.24); if (!moving) player.rotation.y = Math.PI;
          stackG.getWorldPosition(_v);
          fly('log', _v, firePos(r, new T.Vector3()), 0.38, 0.9, () => landLog(r));
        }
        if (r.pileN > 0 && Math.hypot(p.x - r.cx - 1.7, p.z - PILE_Z) < 1.5) {
          const n = r.pileN; S.coins += n; S.collected += n; hud.floatText('+' + n, p.x, 2.4, p.z); r.pileN = 0; drawPile(r);
          // le monete volano verso l'omino
          _v.set(r.cx + 1.7, 0.4, PILE_Z);
          for (let k = 0; k < Math.min(n, 8); k++) fly('coin', _v, o => o.set(player.position.x, 1.3, player.position.z), 0.4, 0.8, null, k * 0.045);
          burst(r.cx + 1.7, 0.6, PILE_Z, 6, [0xffd23a, 0xfff2a8], 2, 4, 0.6, 0.1);
        }
      }
      if (cocoa.open) {
        cocoa.t += dt; if (cocoa.t > cocoaInterval() && cocoa.cups < cocoaMax()) { cocoa.cups++; cocoa.t = 0; }
        if (cocoa.cups > 0 && carry.cups < cupCap() && cupCd <= 0 && Math.hypot(p.x - COCOA_PICK[0], p.z - COCOA_PICK[1]) < 1.5) {
          cupCd = 0.22; cocoa.cups--; carry.cups++; inCups++; changed = true;
          _v.set(10.55 + Math.min(5, cocoa.cups) * 0.28, 1.3, -6.55);
          fly('cup', _v, o => stackG.getWorldPosition(o), 0.4, 0.8, () => { inCups--; refreshStack(); });
        }
        cupMeshes.forEach((c, i) => { c.visible = i < cocoa.cups; });
      }
      for (const gu of guests) {
        if (gu.state === 'bed' && gu.want && !gu.served && carry.cups > 0 && Math.hypot(p.x - gu.b.x, p.z + 6.6) < 2) {
          gu.served = true; carry.cups--; changed = true; refreshStack();
          B.toss(player, 0.26); if (!moving) player.rotation.y = Math.atan2(gu.b.x - p.x, -6.6 - p.z);
          stackG.getWorldPosition(_v);
          fly('cup', _v, o => o.set(gu.b.x, 1.1, -6.4), 0.45, 1.0, () => {
            S.cocoa++; gu.cold = 0; hud.floatText(TX.thanks, gu.b.x, 1.6, -6.4);
            burst(gu.b.x, 1.3, -6.4, 6, [0xff7ac6, 0xff4d4d], 1.4, 3, 0.9, 0.12, 1.5);
          });
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
          if (S.paid[pd.id] >= pd.cost) {
            S.bought[pd.id] = true; applyEffect(pd); hud.toast(pd.title + ' sbloccato! ✨'); save();
            burst(pd.x, 0.8, pd.z, 26, CONFETTI, 4, 7, 1.1, 0.16); hopT = 0.5;
          }
        }
      }
      if (changed) refreshStack();

      // camini e griglie
      for (const r of rooms) if (r.open) r.fuel = Math.max(0, r.fuel - dt / ((busy(r) ? P.burn_busy : P.burn_idle) * burnMul()));
      // alberi che ricrescono
      regrowTrees(dt);
      // ospiti
      if (S.fed > 0) { spawnT -= dt; if (spawnT <= 0) { spawnT = (P.guest_spawn_min + Math.random() * (P.guest_spawn_max - P.guest_spawn_min)) * (hasEffect('sign') ? P.sign_mul : 1); spawnGuest(); } }
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
      helpers.forEach(h => h && updateHelper(h, dt));

      // obiettivi
      while (S.done < objectives.length && objValue(objectives[S.done]) >= objTarget(objectives[S.done])) {
        const rw = objectives[S.done].reward || 10;
        S.done++; S.coins += rw; hud.toast(`Obiettivo completato! +${rw} monete 🎉`); save();
        burst(p.x, 1.6, p.z, 34, CONFETTI, 4.5, 8, 1.2, 0.17); hopT = 0.5;
      }
      if (S.done >= objectives.length && !S.won) {
        S.won = true; save(); running = false; endJoy();
        hud.showWin(TX.winTitle, TX.winText(S), TX.winNext, level.next);
      }
      saveT += dt; if (saveT > 2) { saveT = 0; save(); }
    }

    const camGoal = new T.Vector3(), sunDir = new T.Vector3(), sunX = new T.Vector3(), sunY = new T.Vector3(), sunT = new T.Vector3();
    function anim(dt) {
      tt += dt; const p = player.position;
      for (const r of rooms) {
        r.flare = Math.max(0, r.flare - dt * 3);
        const lit = r.fuel > 0, s = lit ? 0.45 + r.fuel / P.fuel_max * 0.75 + r.flare * 0.35 : 0;
        r.flame.visible = lit; r.flame.scale.set(s, s * (1 + 0.18 * Math.sin(tt * 13 + r.i)), s);
        r.light.intensity = lit ? 0.6 + r.fuel / P.fuel_max + 0.15 * Math.sin(tt * 17 + r.i) + r.flare * 0.8 : 0;
        r.pile.rotation.y = tt * 0.8; r.pile.position.y = 0.05 + 0.04 * Math.sin(tt * 3 + r.i);
      }
      for (const t of trees) { animateTree(t, dt); fadeTree(t, p, dt); }
      mats.pad.opacity = 0.45 + 0.2 * Math.sin(tt * 4);
      pads.forEach(pd => { pd.m.visible = !state.isBought(pd.id) && padShown(pd); });
      const tg = running ? taskTarget() : null;
      arrow.visible = !!tg && Math.hypot(tg[0] - p.x, tg[1] - p.z) > 1.4;
      if (tg) { arrow.position.set(tg[0], 2.9 + Math.sin(tt * 4) * 0.25, tg[1]); arrow.rotation.y = tt * 2; }
      // salto di gioia quando si completa qualcosa
      if (hopT > 0) { hopT = Math.max(0, hopT - dt); p.y = Math.sin(Math.PI * (1 - hopT / 0.5)) * 0.55; } else p.y = 0;
      const a = snowGeo.attributes.position.array;
      for (let i = 0; i < NS; i++) {
        a[i * 3 + 1] -= dt * fallSpeed; a[i * 3] += Math.sin(tt + i) * dt * (snowy ? 0.2 : 0.6);
        if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = 14; a[i * 3] = p.x - 20 + Math.random() * 40; a[i * 3 + 2] = p.z - 20 + Math.random() * 40; }
      }
      snowGeo.attributes.position.needsUpdate = true;
      for (const f of flies) {
        const t2 = tt * f.sp + f.ph;
        f.m.position.set(f.cx + Math.cos(t2) * f.r, 1.1 + Math.sin(t2 * 2.3) * 0.4, f.cz + Math.sin(t2 * 1.3) * f.r);
        f.m.rotation.set(-1.2, -t2, 0); f.m.scale.x = 0.25 + 0.75 * Math.abs(Math.sin(tt * 13 + f.ph));
      }
      for (const d of ducks) {
        d.a += dt * d.sp; const x = lake.x + Math.cos(d.a) * d.rr, z = lake.z + Math.sin(d.a) * d.rr;
        d.g.position.set(x, 0.02 + Math.sin(tt * 2 + d.a * 3) * 0.03, z); d.g.rotation.y = -d.a + (d.sp > 0 ? 0 : Math.PI);
      }
      for (const b of bobbers) { const base = b.base == null ? 0.05 : b.base, amp = b.amp == null ? 0.05 : b.amp; b.g.position.y = base + Math.sin(tt * 1.6 + b.ph) * amp; if (b.amp == null) b.g.rotation.z = Math.sin(tt * 1.2 + b.ph) * 0.05; }
      for (const l of bulbs) l.b.scale.setScalar(1 + 0.12 * Math.sin(tt * 3 + l.ph));
      // camera isometrica che segue il giocatore; si allontana in verticale (portrait)
      const asp = innerWidth / innerHeight, k = asp < 0.8 ? 1.45 : asp < 1.2 ? 1.15 : 1;
      camGoal.set(p.x, 15 * k, p.z + 12 * k);
      cam.position.lerp(camGoal, Math.min(1, dt * 5));
      cam.lookAt(cam.position.x, 0, cam.position.z - 12 * k - 1);
      // La luce segue il giocatore a scatti di un pixel della mappa d'ombra (nello spazio della luce): così le ombre non "nuotano" e non lampeggiano.
      sunDir.set(-10, 22, 8).normalize(); sunX.set(0, 1, 0).cross(sunDir).normalize(); sunY.copy(sunDir).cross(sunX);
      const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
      sunT.set(p.x, 0, p.z);
      const sx = Math.round(sunT.dot(sunX) / texel) * texel - sunT.dot(sunX), sy = Math.round(sunT.dot(sunY) / texel) * texel - sunT.dot(sunY);
      sunT.addScaledVector(sunX, sx).addScaledVector(sunY, sy);
      sun.target.position.copy(sunT); sun.position.set(sunT.x - 10, 22, sunT.z + 8);
      sun.target.updateMatrixWorld();
    }

    function overlays(dt) {
      rooms.forEach(r => { hud.put(r.el, r.cx, 2.35, -8.6, r.open); const w = (r.fuel / P.fuel_max * 100).toFixed(1) + '%'; if (r.bar._w !== w) { r.bar._w = w; r.bar.style.width = w; } });
      pads.forEach(pd => {
        const v = pd.m.visible;
        if (v) { const t = (pd.cost - state.paid(pd.id)) + ' monete'; if (pd.sp._t !== t) { pd.sp._t = t; pd.sp.textContent = t; } }
        hud.put(pd.el, pd.x, 0.5, pd.z - 0.2, v);
      });
      guests.forEach(gu => {
        let txt = '', cls = 'pill';
        if (gu.state === 'bed') {
          if (gu.r.fuel <= 0) { txt = TX.cold; cls += ' cold'; }
          else if (gu.want && !gu.served) { txt = TX.want; cls += ' want'; }
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
      tickLater(dt); updateFlyers(dt); updateParts(dt);
      anim(dt); renderer.render(scene, cam); overlays(dt); refreshHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      start() { running = true; if (S.done === 0) hud.toast('Vai verso il bosco: segui la freccia gialla ➜'); },
      resume() { running = true; },
      save,
      // Solo per le prove (si attiva aprendo la pagina con ?debug): sposta l'omino e dà monete.
      debug: { player, S, carry, trees, rooms, tp(x, z) { player.position.x = x; player.position.z = z; }, coins(n) { S.coins += n; } }
    };
  };
})(window.Rifugio);
