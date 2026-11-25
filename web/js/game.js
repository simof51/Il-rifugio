// Livello in gioco: costruisce la scena 3D e fa girare il ciclo (taglio, camini, ospiti, bevande, sblocchi, obiettivi).
// L'aspetto (colori, alberi, lago, fiori) e i numeri vengono dal livello (js/levels/*.js).
(function (R) {
  'use strict';

  const FEED_Z = -7.6, PILE_Z = -3.2, COCOA_PICK = [11, -5.6];
  const SPAWN = [17, 1.2];
  const COATS = [0x4f8cff, 0xa066ff, 0xff9a2a, 0x2ec4b6, 0xff5d8f, 0x6bcf3a];
  const CONFETTI = [0xff4d4d, 0xffd23a, 0x3d8bff, 0x4cd964, 0xff7ac6, 0xa066ff];
  const SHORTS = [0x3b6fd4, 0xe8c66a, 0xf2f2f2, 0x2ec4b6, 0xff8a65];

  R.createGame = function ({ hud, level, state, audio }) {
    const T = THREE, P = level.tuning, S = state.data, objectives = level.objectives, TH = level.theme, TX = level.text;
    const A = audio || { sfx() {} }; // suoni (se manca l'audio il gioco funziona lo stesso)
    const OUTFIT = TH.outfit || 'winter'; // guardaroba degli omini: 'winter', 'spring' o 'summer'
    const V = level.voc || {}; // parole della tappa (albero, camino o barbecue, ospite, area, bevanda…): i testi si adattano a stagione e luogo
    const upFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

    // --- motore -------------------------------------------------------------
    // Prestazioni: niente antialias (pesa molto sul telefono) e ombre PCF semplici (le "soft" costano di più).
    // La risoluzione resta piena (fino a 2x) e non viene mai abbassata da sola.
    const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // Qualità grafica scelta nel menu (Alta, Media, Bassa): risoluzione, ombre e quantità di decorazioni.
    const Q = R.settings ? R.settings.quality() : { ratio: 2, shadows: 'pcf', map: 1024, density: 1 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, Q.ratio);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = Q.shadows !== 'off'; renderer.shadowMap.type = T.PCFShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(TH.sky);
    scene.fog = new T.Fog(TH.sky, TH.fog[0], TH.fog[1]);
    // near/far stretti: la camera sta sempre ad almeno ~10 m da tutto, e una profondità più precisa evita i lampeggi sulle superfici piatte.
    const cam = new T.PerspectiveCamera(45, 1, 4, 130);
    hud.setCamera(cam);
    const hemi = new T.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]); scene.add(hemi);
    let env = null, fauna = null; // ambiente (giorno/notte, meteo) e animali: si creano dopo l'omino
    const sun = new T.DirectionalLight(TH.sun[0], TH.sun[1]);
    sun.castShadow = Q.shadows !== 'off'; sun.shadow.mapSize.set(Q.map || 512, Q.map || 512);
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; // niente puntini d'ombra sulle superfici piatte
    const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 70;
    scene.add(sun); scene.add(sun.target);

    const B = R.createBuilder(scene, TH), mats = B.mats, box = B.box, cyl = B.cyl, ball = B.ball, add = B.add;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = []; // ostacoli come rettangoli [x0, x1, z0, z1]
    const lake = level.lake;
    const inLake = (x, z, pad) => !!lake && Math.hypot(x - lake.x, z - lake.z) < lake.r + (pad || 0);
    // Monumento della città (mulino o faro): occupa un angolo della mappa, senza alberi né decorazioni intorno.
    const LM = level.landmark === 'windmill' ? { x: 23.5, z: -11.5, r: 4.4 } : level.landmark === 'lighthouse' ? { x: -25, z: -12.5, r: 3.8 } : null;
    const inLM = (x, z, pad) => !!LM && Math.hypot(x - LM.x, z - LM.z) < LM.r + (pad || 0);
    const snowy = TH.fall === 'snow'; // d'inverno: neve che cade, sassi e cespugli innevati

    // --- paesaggio ----------------------------------------------------------
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), mats.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // Sentieri: piani con la texture della ghiaia (inverno) o della sabbia (estate), a quote leggermente diverse
    // (altrimenti le facce piatte coincidono e lampeggiano, z-fighting) e senza ombre proprie.
    mats.path.polygonOffset = true; mats.path.polygonOffsetFactor = -1; mats.path.polygonOffsetUnits = -1;
    function pathPlane(w, d, x, z, y) {
      const geo = new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2.4, uv.getY(i) * d / 2.4); // la texture non si deforma
      const m = new T.Mesh(geo, mats.path); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    }
    pathPlane(15, 1.6, 10, 1.2, 0.02); pathPlane(24, 1.4, 2, -2.9, 0.026); pathPlane(1.4, 4, 3, -0.6, 0.032);

    // Bordi della mappa ben definiti: d'inverno una catena di montagne alte con la cima innevata, d'estate una foresta fitta.
    // Sono pochi pezzi fusi (uno per lato): le montagne e gli alberi di bordo non si tagliano e non proiettano ombre.
    const bx0 = P.world_min[0], bx1 = P.world_max[0], bz0 = P.world_min[1], bz1 = P.world_max[1];
    function ringPoints(off, step, jit) { // punti lungo il perimetro, spostati fuori dal mondo di "off"; lato: 0 nord, 1 sud, 2 ovest, 3 est
      const out = [], j = () => (rnd() - 0.5) * jit;
      for (let x = bx0 - off; x <= bx1 + off; x += step) { out.push([0, x + j(), bz0 - off + j()]); out.push([1, x + j(), bz1 + off + j()]); }
      for (let z = bz0 - off + step; z < bz1 + off - step * 0.5; z += step) { out.push([2, bx0 - off + j(), z + j()]); out.push([3, bx1 + off + j(), z + j()]); }
      return out;
    }
    if (TH.edge === 'mountains') {
      const cone = new T.ConeGeometry(1, 1, 7, 1, true), rock = [[], [], [], []], snow = [[], [], [], []], base = new T.Color(TH.hill);
      ringPoints(12.5, 7, 2).forEach(([side, x, z]) => {
        const h = 26 + rnd() * 16, r = 8 + rnd() * 2.5, ry = rnd() * 6;
        const col = (k) => base.clone().multiplyScalar(0.8 + rnd() * 0.35).getHex() + 0 * k;
        rock[side].push({ geo: cone, x, y: h / 2, z, s: [r, h, r], ry, color: col(0) });
        [[-0.55, 0.3, 0.55, 0.72], [0.6, -0.25, 0.5, 0.68]].forEach(([dx, dz, hs, rs]) => rock[side].push({ geo: cone, x: x + dx * r, y: h * hs / 2, z: z + dz * r, s: [r * rs, h * hs, r * rs], ry: ry + 1, color: col(1) }));
        snow[side].push({ geo: cone, x, y: h - h * 0.24, z, s: [r * 0.5, h * 0.48, r * 0.5], ry, color: 0xffffff });
      });
      for (let s = 0; s < 4; s++) {
        const a = new T.Mesh(B.mergeParts(rock[s]), mats.accent); scene.add(a);
        const b = new T.Mesh(B.mergeParts(snow[s]), mats.accent); scene.add(b);
      }
    } else {
      // Foresta fitta di bordo: tre file di alberi tondi (solo decorazione), più qualche collina verde dietro.
      const blob = new T.SphereGeometry(1, 9, 6), trunk = new T.CylinderGeometry(0.15, 0.25, 1.4, 6).translate(0, 0.7, 0), forest = [[], [], [], []];
      const BL = [[0, 2.45, 0, 1.2], [0.75, 2.15, 0.3, 0.85], [-0.7, 2.2, -0.2, 0.9], [0.1, 3.25, -0.1, 0.85], [-0.25, 2.2, 0.75, 0.75]];
      [[1, 2.2, 1.6], [4.5, 2.3, 2], [8, 2.6, 2.4], [12, 3, 2.8]].slice(0, Q.density < 0.5 ? 2 : Q.density < 1 ? 3 : 4).forEach(([off, step, sc0]) => ringPoints(off, step, 1.6).forEach(([side, x, z]) => {
        const sc = sc0 * (0.85 + rnd() * 0.5) / 1.6 + 0.4;
        forest[side].push({ geo: trunk, x, y: 0, z, s: sc, color: 0x7a4a30 });
        BL.forEach(([bx, by, bz, br], k) => forest[side].push({ geo: blob, x: x + bx * sc, y: by * sc, z: z + bz * sc, s: [br * sc, br * 0.88 * sc, br * sc], color: (TH.leafCols || [0x57c455, 0x34a448])[(k + side) % (TH.leafCols || [0, 0]).length] }));
      }));
      for (let s = 0; s < 4; s++) scene.add(new T.Mesh(B.mergeParts(forest[s]), mats.accent));
      ringPoints(24, 16, 6).forEach(([, x, z]) => { const h = 12 + rnd() * 10, r = 12 + rnd() * 5, m = new T.Mesh(new T.ConeGeometry(r, h, 14), mats.hill); m.position.set(x, h / 2, z); scene.add(m); });
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
      for (let i = 0, nf = Math.round((TH.flowerCount || 170) * Q.density); i < nf; i++) {
        const x = -30 + rnd() * 60, z = -20 + rnd() * 46;
        if (inLake(x, z, 2.2) || (x > -3 && x < 18 && z > -3.8 && z < 2.2) || (x > -8 && x < 8 && z < -3.6 && z > -9.4) || (x > 8 && x < 13 && z > -8 && z < -3)) continue;
        const c = FL[Math.floor(rnd() * FL.length)];
        parts.push({ geo: petal, x, y: 0.05, z, s: 0.8 + rnd() * 0.6, color: c }, { geo: heart, x, y: 0.07, z, color: c === 0xffd23a ? 0xff9a2a : 0xffd23a });
      }
      const fm = new T.Mesh(B.mergeParts(parts), mats.accent); fm.receiveShadow = true; scene.add(fm);
    }
    // Decorazioni sparse della stagione (sassi, cespugli, ciuffi d'erba, funghi, zucche): tutte fuse in una sola mesh.
    if (TH.decor) {
      const parts = [], pickC = a => a[Math.floor(rnd() * a.length)];
      const spot = () => {
        for (let k = 0; k < 25; k++) {
          const x = bx0 + 1 + rnd() * (bx1 - bx0 - 2), z = bz0 + 1 + rnd() * (bz1 - bz0 - 2);
          if (!(inLake(x, z, 2.4) || inLM(x, z, 1.8) || (x > -17 && x < 19 && z > -10.5 && z < 5.5))) return [x, z];
        }
        return null;
      };
      const sph = B.cached('dsph', () => new T.SphereGeometry(1, 9, 6)), cone = B.cached('dcone', () => new T.ConeGeometry(0.07, 0.6, 4)), stem = B.cached('dstem', () => new T.CylinderGeometry(0.04, 0.06, 0.16, 6));
      const cap = B.cached('dcap', () => new T.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)), dot = B.cached('ddot', () => new T.SphereGeometry(0.03, 5, 4));
      const MAKE = {
        rocks: (x, z) => { const s = 0.5 + rnd() * 1; parts.push({ geo: sph, x, y: 0.1 * s, z, s: [0.4 * s, 0.26 * s, 0.34 * s], ry: rnd() * 6, color: snowy ? 0x9aa6b8 : 0x9a9a92 }); if (snowy) parts.push({ geo: sph, x, y: 0.17 * s, z, s: [0.32 * s, 0.14 * s, 0.27 * s], color: 0xffffff }); },
        bushes: (x, z) => {
          const s = 0.6 + rnd() * 0.7, c = snowy ? 0xe6eef7 : pickC(TH.leafCols ? [0x4fae5a, 0x3f9c4e] : [0x45b05a, 0x56c46d]);
          parts.push({ geo: sph, x, y: 0.3 * s, z, s: [0.6 * s, 0.4 * s, 0.55 * s], color: snowy ? 0x4f8f6a : c });
          if (snowy) parts.push({ geo: sph, x, y: 0.5 * s, z, s: [0.5 * s, 0.22 * s, 0.46 * s], color: c });
          else if (TH.flowers) for (let k = 0; k < 3; k++) parts.push({ geo: dot, x: x + (rnd() - 0.5) * 0.5 * s, y: 0.5 * s, z: z + (rnd() - 0.5) * 0.5 * s, s: 1.6, color: pickC([0xffffff, 0xff7ac6, 0xffd23a]) });
        },
        grass: (x, z) => { const c = TH.fall === 'leaves' ? 0xc2a23c : 0x57c455; for (let k = 0; k < 3; k++) parts.push({ geo: cone, x: x + (rnd() - 0.5) * 0.2, y: 0.28, z: z + (rnd() - 0.5) * 0.2, s: [1, 0.8 + rnd() * 0.6, 1], ry: rnd() * 3, color: c }); },
        mushrooms: (x, z) => { const s = 0.8 + rnd() * 0.8; parts.push({ geo: stem, x, y: 0.08 * s, z, s, color: 0xf4ead2 }, { geo: cap, x, y: 0.16 * s, z, s, color: 0xe0453a }); for (let k = 0; k < 3; k++) { const a = rnd() * 6.28; parts.push({ geo: dot, x: x + Math.cos(a) * 0.07 * s, y: 0.26 * s, z: z + Math.sin(a) * 0.07 * s, s, color: 0xffffff }); } },
        pumpkins: (x, z) => { const s = 0.7 + rnd() * 0.8; parts.push({ geo: sph, x, y: 0.22 * s, z, s: [0.3 * s, 0.24 * s, 0.3 * s], color: 0xff8a1f }, { geo: stem, x, y: 0.46 * s, z, s: 0.8 * s, color: 0x4c8a2f }); }
      };
      const COUNT = { rocks: 36, bushes: 30, grass: 110, mushrooms: 36, pumpkins: 30 };
      TH.decor.forEach(kind => { for (let i = 0, n = Math.round((COUNT[kind] || 20) * Q.density); i < n; i++) { const p = spot(); if (p) MAKE[kind](p[0], p[1]); } });
      const dm = new T.Mesh(B.mergeParts(parts), mats.accent); scene.add(dm);
    }
    // Monumento della città: mulino a vento con pale che girano o faro con il fascio di luce che ruota.
    const lmAnim = [];
    if (LM) {
      const g = new T.Group(); g.position.set(LM.x, 0, LM.z); scene.add(g);
      if (level.landmark === 'windmill') {
        cyl(1.2, 1.9, 4.4, B.tint(0xf3e6c8), 0, 2.2, 0, g, 14);
        box(0.9, 1.5, 0.15, B.tint(0x7a4a30), 0, 0.75, 1.42, g, 0.05);
        const roof = new T.Mesh(B.cached('mroof', () => new T.ConeGeometry(1.5, 1.5, 12)), B.tint(0x9b3d2e)); roof.position.y = 5.15; roof.castShadow = true; g.add(roof);
        const hub = new T.Group(); hub.position.set(0, 4.4, 1.35); g.add(hub); ball(0.28, mats.dark, 0, 0, 0, hub, 10, 8);
        for (let k = 0; k < 4; k++) { const bl = new T.Group(); bl.rotation.z = k * Math.PI / 2; hub.add(bl); box(0.16, 3.7, 0.08, mats.trunk, 0, 1.9, 0, bl, 0.02); box(0.8, 2.4, 0.04, mats.white, 0.45, 2.3, 0.04, bl, 0.01); }
        lmAnim.push(dt => { hub.rotation.z -= dt * 0.8; });
      } else {
        let y = 0;
        [0xe0453a, 0xffffff, 0xe0453a, 0xffffff].forEach((c, k) => { const h = 1.9; cyl(1.55 - (k + 1) * 0.12, 1.55 - k * 0.12, h, B.tint(c), 0, y + h / 2, 0, g, 16); y += h; });
        cyl(1.3, 1.3, 0.2, mats.dark, 0, y + 0.1, 0, g, 16); y += 0.2;
        const lamp = new T.Mesh(B.cached('lamp', () => new T.CylinderGeometry(0.55, 0.55, 1.1, 14)), new T.MeshBasicMaterial({ color: 0xfff3a0 })); lamp.position.y = y + 0.55; g.add(lamp);
        const roof = new T.Mesh(B.cached('lroof', () => new T.ConeGeometry(0.85, 0.8, 14)), B.tint(0xb02e26)); roof.position.y = y + 1.5; roof.castShadow = true; g.add(roof);
        const beam = new T.Group(); beam.position.y = y + 0.55; g.add(beam);
        beam.add(new T.Mesh(B.cached('beam', () => new T.ConeGeometry(1.5, 14, 14, 1, true).rotateZ(Math.PI / 2).translate(7, 0, 0)), new T.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide })));
        lmAnim.push(dt => { beam.rotation.y += dt * 0.9; });
      }
      cols.push([LM.x - 1.7, LM.x + 1.7, LM.z - 1.7, LM.z + 1.7]);
    }
    // Lago con spiaggia, ninfee, paperelle e una barchetta (solo se il livello lo prevede).
    const ducks = [], bobbers = [], ripples = [];
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
      for (let i = 0; i < 6; i++) { // cerchi che si allargano sull'acqua
        const a = rnd() * 6.28, d = rnd() * (lake.r - 1.5), rm = new T.Mesh(B.cached('ripple', () => new T.RingGeometry(0.22, 0.3, 24).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        rm.position.set(lake.x + Math.cos(a) * d, 0.07, lake.z + Math.sin(a) * d); scene.add(rm); ripples.push({ m: rm, ph: rnd() });
      }
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
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.5) || inLake(x, z, 1.5) || inLM(x, z, 1)) continue;
      plantTree(x, z, 1); near++;
    }
    for (let i = 0, planted = 0; i < P.forest_trees * 8 && planted < P.forest_trees; i++) {
      const x = bx0 + rnd() * (bx1 - bx0), z = bz0 + rnd() * (bz1 - bz0), sc = 0.8 + rnd() * 0.7;
      if (x > -16 && x < 18 && z > -11 && z < 15) continue;
      if (inLake(x, z, 2) || inLM(x, z, 1.5)) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.4)) continue; // lascia sempre un passaggio fra gli alberi
      plantTree(x, z, sc); planted++;
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
        if (h.last) { t.state = 'falling'; t.vel = Math.max(t.vel, 0.5); t.stump.visible = true; A.sfx('tree'); }
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
    // Due stili: 'cabin' (baita con muri, camino e letti, per l'inverno) e 'lido' (postazione sul lago con ombrellone,
    // lettini e barbecue, senza muri: bassi parapetti bianchi e una staccionata di bambù). Cambiano solo l'aspetto: ostacoli e regole sono gli stessi.
    const lido = TH.room === 'lido';
    const hedge = !!TH.fence, bambooM = B.tint(TH.fence || 0xd9b36c), railM = B.tint(0xf4f1e6), TOWELS = [0xff6b6b, 0x4fa3ff, 0xffd23a, 0x4cd964, 0xff9a2a, 0xc084fc];
    const rooms = level.rooms.map((def, i) => {
      const cx = def.x, g = new T.Group(); scene.add(g);
      box(RW, 0.2, 5, mats.plank, cx, 0.1, -6.5, g, 0.015);
      let wallL, wallR, flame, fireY, fireZ;
      if (lido) {
        if (hedge) box(RW, 1.05, 0.55, bambooM, cx, 0.72, -9.0, g, 0.22); // siepe fiorita sul retro (primavera)
        else { box(RW, 0.9, 0.16, bambooM, cx, 0.65, -9.1, g, 0.04); for (let k = 0; k < 7; k++) box(0.1, 1.05, 0.2, bambooM, cx - 2.7 + k * 0.9, 0.72, -9.1, g, 0.04); } // staccionata di bambù
        wallL = box(0.12, 0.55, 5, railM, cx - RW / 2 + 0.06, 0.47, -6.5, g, 0.03);
        wallR = box(0.12, 0.55, 5, railM, cx + RW / 2 - 0.06, 0.47, -6.5, g, 0.03);
        box(1.8, 0.03, 1.1, B.tint(0xffe08a), cx, 0.21, -7.6, g);
        // barbecue: ciotola nera su tre gambe, griglia, carbone e ripiano
        [-0.35, 0.35].forEach(dx => cyl(0.05, 0.05, 0.55, mats.dark, cx + dx, 0.47, -8.55, g, 8));
        const bowl = ball(0.62, mats.dark, cx, 0.95, -8.55, g, 18, 12); bowl.scale.set(1, 0.5, 1);
        cyl(0.6, 0.6, 0.03, mats.steel, cx, 1.12, -8.55, g, 20); cyl(0.5, 0.5, 0.06, mats.orange, cx, 1.04, -8.55, g, 16);
        box(0.5, 0.06, 0.5, mats.plank, cx + 0.95, 0.9, -8.55, g, 0.02);
        // ombrellone: palo e cappello a spicchi nei colori del lido
        cyl(0.05, 0.05, 2.9, mats.white, cx - 2.35, 1.45, -8.3, g, 8);
        const can = new T.Mesh(B.cached('umb', () => new T.ConeGeometry(1.75, 0.65, 12)), B.tint((TH.umbrellaCols || [0xff4d4d, 0x3d8bff, 0xffd23a])[i % 3])); can.position.set(cx - 2.35, 3.0, -8.3); can.castShadow = true; g.add(can);
        ball(0.07, mats.white, cx - 2.35, 3.35, -8.3, g, 8, 6);
        // due pali per il festone di bandierine
        cyl(0.04, 0.04, 1.7, bambooM, cx - 2.9, 0.85, -8.95, g, 6); cyl(0.04, 0.04, 1.7, bambooM, cx + 2.9, 0.85, -8.95, g, 6);
        flame = new T.Mesh(new T.ConeGeometry(0.22, 0.5, 16), mats.flame); flame.position.set(cx, 1.3, -8.55); g.add(flame);
        fireY = 1.25; fireZ = -8.5;
      } else {
        box(RW, 1.2, 0.3, mats.wood, cx, 0.6, -9.1, g, 0.03);
        wallL = box(0.3, 1.2, 5, mats.wood, cx - RW / 2 + 0.15, 0.6, -6.5, g);
        wallR = box(0.3, 1.2, 5, mats.wood, cx + RW / 2 - 0.15, 0.6, -6.5, g);
        box(1.8, 0.03, 1.1, mats.red, cx, 0.21, -7.6, g);
        box(1.5, 1.7, 0.8, mats.stone, cx, 0.85, -8.6, g); box(0.9, 0.65, 0.1, mats.dark, cx, 0.55, -8.17, g); box(1.7, 0.15, 0.9, mats.stone, cx, 1.75, -8.6, g);
        flame = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 16), mats.flame); flame.position.set(cx, 0.55, -8.25); g.add(flame);
        fireY = 0.7; fireZ = -8.1;
      }
      // festone di bandierine colorate sul retro
      const bun = B.mergeParts(Array.from({ length: 9 }, (_, k) => ({ geo: flagGeo, x: cx - 2.5 + k * 0.625, y: lido ? 1.55 : 1.2, z: -8.93, color: CONFETTI[(k + i) % CONFETTI.length] })));
      g.add(new T.Mesh(bun, mats.accent));
      const light = new T.PointLight(0xff8a3d, 0, 8); light.position.set(cx, 1.3, -7.4); scene.add(light);
      const beds = [-1.4, 1.4].map((o, k) => {
        const bx = cx + o;
        if (lido && TH.seat === 'table') {
          // tavolino con sedia: tavolo da picnic con panche e tovaglia a quadri (primavera) oppure tavolino rotondo con sedie (estate);
          // l'ospite si siede, sul tavolo c'è un piatto e la tazza con la bevanda del posto
          const picnic = TH.table === 'picnic', wood = B.tint(0xb98a56), linen = B.tint(TOWELS[(i * 2 + k) % TOWELS.length]);
          if (picnic) {
            box(1.5, 0.08, 0.8, wood, bx, 0.72, -6.85, g, 0.03); box(1.2, 0.02, 0.66, mats.red, bx, 0.77, -6.85, g, 0.01); box(0.5, 0.025, 0.66, mats.white, bx, 0.785, -6.85, g, 0.01);
            [-0.55, 0.55].forEach(lx => { const lg = box(0.08, 0.72, 0.8, wood, bx + lx, 0.36, -6.85, g, 0.02); lg.scale.z = 0.8; });
            box(1.5, 0.08, 0.3, wood, bx, 0.42, -6.02, g, 0.03); box(1.5, 0.08, 0.3, wood, bx, 0.42, -7.68, g, 0.03);       // le due panche
          } else {
            cyl(0.06, 0.06, 0.62, mats.white, bx, 0.34, -6.85, g, 8); cyl(0.3, 0.3, 0.04, mats.white, bx, 0.03, -6.85, g, 12); cyl(0.58, 0.58, 0.05, linen, bx, 0.66, -6.85, g, 18);
            [[-5.98, 1], [-7.72, -1]].forEach(([cz, dir]) => { // sedia (quella verso l'ospite e una vuota di fronte)
              box(0.44, 0.06, 0.44, wood, bx, 0.42, cz, g, 0.02); box(0.44, 0.5, 0.05, wood, bx, 0.68, cz + dir * 0.22, g, 0.02);
              [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(0.05, 0.4, 0.05, wood, bx + sx * 0.18, 0.2, cz + sz * 0.18, g, 0.01));
            });
          }
          const ty = picnic ? 0.8 : 0.69;
          cyl(0.22, 0.22, 0.02, mats.white, bx - 0.25, ty + 0.01, -6.85, g, 14); ball(0.1, mats.orange, bx - 0.25, ty + 0.08, -6.85, g, 8, 6);          // piatto con un cibo
          const cupM = new T.Mesh(B.cupGeo, mats.cup); cupM.position.set(bx + 0.3, ty + 0.1, -6.85); cupM.castShadow = true; g.add(cupM);               // tazza
        } else if (lido) {
          // lettino: telaio bianco, schienale inclinato, telo colorato e asciugamano arrotolato come cuscino
          box(1.05, 0.2, 2.1, mats.white, bx, 0.45, -6.7, g, 0.05);
          const back = box(1.05, 0.12, 0.85, mats.white, bx, 0.72, -7.65, g, 0.04); back.rotation.x = -0.55;
          box(0.98, 0.04, 1.25, B.tint(TOWELS[(i * 2 + k) % TOWELS.length]), bx, 0.57, -6.3, g, 0.01);
          box(0.85, 0.04, 0.7, B.tint(TOWELS[(i * 2 + k) % TOWELS.length]), bx, 0.8, -7.62, g, 0.01).rotation.x = -0.55;
          const roll = cyl(0.08, 0.08, 0.6, mats.white, bx, 0.66, -7.35, g, 10); roll.rotation.z = Math.PI / 2;
        } else {
          box(1.1, 0.4, 2.1, mats.bed, bx, 0.4, -6.7, g); box(1.12, 0.1, 1.3, mats.blanket, bx, 0.62, -6.3, g); box(0.8, 0.14, 0.45, mats.white, bx, 0.66, -7.45, g);
        }
        return { x: bx, guest: null };
      });
      const pile = new T.Group(); pile.position.set(cx + 1.7, 0, PILE_Z); scene.add(pile);
      const ghost = box(RW, 0.05, 5, mats.ghost, cx, 0.03, -6.5, null, 0.02); ghost.castShadow = false;
      const el = hud.label('fuel', '<i></i>');
      g.visible = false;
      return { i, cx, g, flame, light, beds, pile, pileN: 0, fuel: 0, pend: 0, flare: 0, open: false, ghost, el, bar: el.firstChild, wallL, wallR, colL: null, colR: null, fireY, fireZ, sit: lido && TH.seat === 'table', seatZ: -5.98 };
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
    const firePos = (r, v) => v.set(r.cx, r.fireY, r.fireZ);

    // --- banco bevande ------------------------------------------------------
    const cocoa = { g: new T.Group(), cups: 0, t: 0, open: false }; scene.add(cocoa.g);
    box(2.2, 1, 1.1, mats.wood, 11, 0.5, -6.8, cocoa.g); box(2.4, 0.1, 1.25, mats.plank, 11, 1.05, -6.8, cocoa.g);
    cyl(0.35, 0.3, 0.5, mats.stone, 10.2, 1.35, -6.95, cocoa.g); cyl(0.3, 0.3, 0.08, mats.cocoa, 10.2, 1.6, -6.95, cocoa.g);
    box(0.12, 2.2, 0.12, mats.wood, 12.1, 1.1, -7.3, cocoa.g); box(1.2, 0.5, 0.08, mats.red, 11.6, 2.1, -7.3, cocoa.g);
    const cupMeshes = [0, 1, 2, 3, 4, 5].map(i => { const c = add(new T.Mesh(B.cupGeo, mats.cup), cocoa.g); c.position.set(10.55 + i * 0.28, 1.21, -6.55); c.visible = false; return c; });
    cocoa.g.visible = false;
    function openCocoa() { if (cocoa.open) return; cocoa.open = true; cocoa.g.visible = true; cols.push([9.9, 12.1, -7.35, -6.25]); }

    // --- percorsi per gli aiutanti -------------------------------------------
    // Griglia di 0,5 m sul mondo: una cella è chiusa se è vicina a un ostacolo (muri, letti, camino, banco, lago, alberi, mascotte).
    // I percorsi si trovano con A* (8 direzioni, niente angoli tagliati) e si accorciano togliendo i punti inutili (linea di vista).
    // La griglia si ricostruisce da sola quando gli ostacoli cambiano (stanza aperta, parete tolta, banco, mascotte).
    const CELL = 0.5, MARGIN = 0.48, GX0 = P.world_min[0], GZ0 = P.world_min[1];
    const GW = Math.ceil((P.world_max[0] - GX0) / CELL) + 1, GH = Math.ceil((P.world_max[1] - GZ0) / CELL) + 1;
    const grid = new Uint8Array(GW * GH), gScore = new Float32Array(GW * GH), came = new Int32Array(GW * GH);
    let gridSig = -1;
    const clampI = (v, n) => Math.max(0, Math.min(n - 1, v));
    function buildGrid() {
      grid.fill(0);
      for (const c of cols) {
        const x0 = clampI(Math.floor((c[0] - MARGIN - GX0) / CELL), GW), x1 = clampI(Math.ceil((c[1] + MARGIN - GX0) / CELL), GW);
        const z0 = clampI(Math.floor((c[2] - MARGIN - GZ0) / CELL), GH), z1 = clampI(Math.ceil((c[3] + MARGIN - GZ0) / CELL), GH);
        for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
          const cx = GX0 + ix * CELL, cz = GZ0 + iz * CELL;
          const qx = Math.max(c[0], Math.min(cx, c[1])), qz = Math.max(c[2], Math.min(cz, c[3]));
          if (Math.hypot(cx - qx, cz - qz) < MARGIN) grid[iz * GW + ix] = 1;
        }
      }
      gridSig = cols.length;
    }
    const cellX = x => clampI(Math.round((x - GX0) / CELL), GW), cellZ = z => clampI(Math.round((z - GZ0) / CELL), GH);
    const blockedAt = (x, z) => grid[cellZ(z) * GW + cellX(x)] === 1;
    function lineClear(ax, az, bx, bz) {
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
      for (let i = 1; i < n; i++) { const t = i / n; if (blockedAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
      return true;
    }
    // La cella libera più vicina all'obiettivo (che può stare dentro un albero): fra quelle a pari distanza, la più vicina a chi parte.
    function freeGoal(tx, tz, sx, sz) {
      const gx = cellX(tx), gz = cellZ(tz);
      if (!grid[gz * GW + gx]) return [gx, gz];
      for (let r = 1; r <= 8; r++) {
        let best = null, bd = 1e9;
        for (let iz = gz - r; iz <= gz + r; iz++) for (let ix = gx - r; ix <= gx + r; ix++) {
          if (ix < 0 || iz < 0 || ix >= GW || iz >= GH || Math.max(Math.abs(ix - gx), Math.abs(iz - gz)) !== r || grid[iz * GW + ix]) continue;
          const d = Math.hypot(GX0 + ix * CELL - sx, GZ0 + iz * CELL - sz);
          if (d < bd) { bd = d; best = [ix, iz]; }
        }
        if (best) return best;
      }
      return null;
    }
    // Percorso da (sx, sz) a (tx, tz): lista di punti {x, z} (senza il punto di partenza), vuota se non si trova niente.
    function findPath(sx, sz, tx, tz) {
      if (gridSig !== cols.length) buildGrid();
      const goal = freeGoal(tx, tz, sx, sz); if (!goal) return [];
      const s0 = cellZ(sz) * GW + cellX(sx), g0 = goal[1] * GW + goal[0];
      gScore.fill(1e9); came.fill(-1); gScore[s0] = 0;
      // coda con priorità (heap binario)
      const hp = [], hf = [];
      const push = (i, f) => { let k = hp.length; hp.push(i); hf.push(f); while (k > 0) { const q = (k - 1) >> 1; if (hf[q] <= hf[k]) break; [hp[q], hp[k]] = [hp[k], hp[q]]; [hf[q], hf[k]] = [hf[k], hf[q]]; k = q; } };
      const pop = () => {
        const top = hp[0], li = hp.pop(), lf = hf.pop();
        if (hp.length) { hp[0] = li; hf[0] = lf; let k = 0; for (;;) { let m = k; const a = 2 * k + 1, b = a + 1; if (a < hp.length && hf[a] < hf[m]) m = a; if (b < hp.length && hf[b] < hf[m]) m = b; if (m === k) break; [hp[m], hp[k]] = [hp[k], hp[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; } }
        return top;
      };
      const gx = goal[0], gz = goal[1], heur = (ix, iz) => { const dx = Math.abs(ix - gx), dz = Math.abs(iz - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
      push(s0, heur(s0 % GW, (s0 / GW) | 0));
      let found = false, steps = 0;
      while (hp.length && steps++ < 12000) {
        const cur = pop(); if (cur === g0) { found = true; break; }
        const cx = cur % GW, cz = (cur / GW) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GW || nz >= GH) continue;
          const ni = nz * GW + nx; if (grid[ni]) continue;
          if (dx && dz && (grid[cz * GW + nx] || grid[nz * GW + cx])) continue; // niente angoli tagliati
          const ng = gScore[cur] + (dx && dz ? 1.414 : 1);
          if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = cur; push(ni, ng + heur(nx, nz)); }
        }
      }
      if (!found) return [];
      const pts = []; for (let i = g0; i !== -1; i = came[i]) pts.push({ x: GX0 + (i % GW) * CELL, z: GZ0 + ((i / GW) | 0) * CELL });
      pts.reverse(); // dal punto di partenza all'arrivo
      // si tolgono i punti intermedi quando c'è visuale libera fra due punti lontani
      const out = []; let i = 0;
      while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !lineClear(pts[i].x, pts[i].z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); i = j; }
      return out;
    }

    // --- aiutanti: boscaioli e camerieri ------------------------------------
    // Come l'omino del giocatore, urtano contro muri, letti, alberi e lago (collide), ma prima cercano un percorso che li evita.
    // Un boscaiolo e un cameriere al massimo per ogni stanza.
    const helpers = [], waiters = [];
    const HCOL = [0x3fae6e, 0x2f7bd6, 0xd0883a];
    // Cammina verso (tx, tz) lungo il percorso trovato; true quando è arrivato (o è arrivato alla cella libera più vicina).
    // Il percorso si ricalcola se la meta cambia o se resta bloccato per più di un secondo.
    function nav(h, tx, tz, sp, dt, stop) {
      const g = h.g, p = g.position;
      if (Math.hypot(p.x - tx, p.z - tz) <= stop) { h.route = null; B.walk(g, 0, dt); return true; }
      if (!h.route || Math.abs(h.gx - tx) > 0.4 || Math.abs(h.gz - tz) > 0.4 || h.sig !== cols.length) {
        h.route = findPath(p.x, p.z, tx, tz); h.gx = tx; h.gz = tz; h.sig = cols.length; h.stuck = 0;
        if (!h.route.length) { // nessun percorso: ci riprova fra poco, intanto resta fermo
          h.route = null; h.wait = (h.wait || 0) + dt; B.walk(g, 0, dt); return h.wait > 3 ? (h.wait = 0, true) : false;
        }
      }
      const wp = h.route[0], bx = p.x, bz = p.z;
      if (B.moveTo(g, wp.x, wp.z, sp, dt, 0.2)) { h.route.shift(); if (!h.route.length) { h.route = null; return true; } }
      collide(p);
      if (Math.hypot(p.x - bx, p.z - bz) < sp * dt * 0.3) { h.stuck = (h.stuck || 0) + dt; if (h.stuck > 1) { h.route = null; h.stuck = 0; } } else h.stuck = 0;
      return false;
    }
    function navPath(h, sp, dt) {
      if (!h.path.length) return true;
      if (nav(h, h.path[0][0], h.path[0][1], sp, dt, 0.25)) h.path.shift();
      return !h.path.length;
    }
    const needFuel = r => r.open && r.fuel + r.pend < 8;

    // Gli aiutanti scelgono solo alberi raggiungibili camminando: quelli dietro le casette li lasciano al giocatore.
    const behindCabin = t => t.z < -4 && level.rooms.some(r => Math.abs(t.x - r.x) < RW / 2 + 0.6);
    function treeForHelper(p) {
      let best = null, bd = 99;
      for (const t of trees) { if (t.logs <= 0 || behindCabin(t)) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = t; } }
      return best;
    }
    function spawnHelper(ri) {
      if (helpers[ri]) return;
      const g = B.person(HCOL[ri % 3], 0xb07848, true, OUTFIT, { shorts: SHORTS[(ri + 1) % SHORTS.length] }); g.position.set(-11, 0, ri * 2 - 1);
      B.setTool(g, hasEffect('saw') ? 'saw' : 'axe');
      const sg = new T.Group(); sg.position.set(0, 0.75, -0.32); g.add(sg);
      helpers[ri] = { g, sg, ri, logs: 0, inb: 0, state: 'idle', cd: 0, path: [], tree: null };
    }
    function updateHelper(h, dt) {
      const g = h.g, r = rooms[h.ri]; h.cd -= dt;
      if (h.state === 'idle') {
        B.walk(g, 0, dt);
        if (h.logs > 0 && needFuel(r) && (h.logs >= P.helper_load || r.fuel < 5)) h.state = 'pick';
        else if (h.logs < P.helper_load) { const t = treeForHelper(g.position); if (t) { h.tree = t; h.state = 'toTree'; } }
      }
      else if (h.state === 'toTree') { if (h.tree.logs <= 0) h.state = 'idle'; else if (nav(h, h.tree.x, h.tree.z, 3.2, dt, 1.1)) h.state = 'chop'; }
      else if (h.state === 'chop') {
        B.walk(g, 0, dt);
        if (h.tree.logs <= 0 || h.logs >= P.helper_load) h.state = 'idle';
        else if (h.cd <= 0) {
          const tr = h.tree, dur = 0.45;
          h.cd = chopInterval() * 1.3; g.rotation.y = Math.atan2(tr.x - g.position.x, tr.z - g.position.z); B.swing(g, dur);
          chopTree(tr, g.position.x, g.position.z, dur * B.HIT_AT); h.logs++; h.inb++;
          after(dur * B.HIT_AT, () => {
            burst(tr.x, 1.2, tr.z, 4, [0xb07848, 0xe6b27a], 2.2, 3, 0.5, 0.1); A.sfx(hasEffect('saw') ? 'saw' : 'chop');
            _v.set(tr.x, 1.1, tr.z);
            fly('log', _v, o => h.sg.getWorldPosition(o), 0.3, 0.5, () => { h.inb--; B.drawStack(h.sg, h.logs - h.inb, 0); });
          });
        }
      }
      else if (h.state === 'pick') {
        B.walk(g, 0, dt);
        if (needFuel(r)) { h.path = [[r.cx, -3], [r.cx, -7.2]]; h.state = 'deliver'; } else h.state = 'idle';
      }
      else if (h.state === 'deliver') { if (navPath(h, 3.2, dt)) h.state = 'feed'; }
      else if (h.state === 'feed') {
        if (h.logs > 0 && r.fuel + r.pend + 1 <= P.fuel_max) {
          if (h.cd <= 0) {
            h.cd = 0.25; h.logs--; r.pend++; B.toss(g, 0.22); g.rotation.y = Math.PI; B.drawStack(h.sg, h.logs, 0);
            h.sg.getWorldPosition(_v);
            fly('log', _v, firePos(r, new T.Vector3()), 0.38, 0.9, () => landLog(r));
          }
        } else { h.path = [[r.cx, -3]]; h.state = 'leave'; }
      }
      else if (h.state === 'leave') { if (navPath(h, 3.2, dt)) h.state = 'idle'; }
    }

    // Cameriere: prende le bevande dal banco e le porta agli ospiti della sua stanza che le chiedono.
    function spawnWaiter(ri) {
      if (waiters[ri]) return;
      const r = rooms[ri], g = B.person(0x17171d, 0x17171d, false, 'waiter'); g.position.set(r.cx - 1.6, 0, -2.2);
      const sg = new T.Group(); sg.position.set(0, 0.75, -0.32); g.add(sg);
      waiters[ri] = { g, sg, ri, cup: 0, state: 'idle', cd: 0, target: null, home: [r.cx - 1.6, -2.2], path: [] };
    }
    const wantsDrink = (gu, ri) => gu.state === 'bed' && gu.want && !gu.served && gu.r === rooms[ri];
    function updateWaiter(h, dt) {
      const g = h.g, p = g.position; h.cd -= dt;
      if (h.state === 'idle') {
        const gu = guests.find(x => wantsDrink(x, h.ri) && !x.taken);
        if (h.cup > 0 && gu) { h.target = gu; gu.taken = true; h.state = 'toGuest'; }
        else if (gu && cocoa.open && cocoa.cups > 0) { h.target = gu; gu.taken = true; h.state = 'toStand'; }
        else if (nav(h, h.home[0], h.home[1], 3.2, dt, 0.3)) { B.walk(g, 0, dt); g.rotation.y = 0; }
      }
      else if (h.state === 'toStand') {
        if (!h.target || h.target.state !== 'bed' || h.target.served) { if (h.target) h.target.taken = false; h.target = null; h.state = 'idle'; }
        else if (nav(h, COCOA_PICK[0], COCOA_PICK[1] + 0.3, 3.4, dt, 0.9)) {
          const take = Math.min(cocoa.cups, 2, cupCapW() - h.cup);
          if (take > 0) {
            cocoa.cups -= take; h.cup += take; B.toss(g, 0.2); A.sfx('pickup');
            for (let k = 0; k < take; k++) { _v.set(10.55 + Math.min(5, cocoa.cups + k) * 0.28, 1.3, -6.55); fly('cup', _v, o => g.userData.tray.getWorldPosition(o), 0.35, 0.7, () => B.setTray(g, h.cup), k * 0.1); }
            h.state = 'toGuest';
          } else { h.target.taken = false; h.target = null; h.state = 'idle'; }
        }
      }
      else if (h.state === 'toGuest') {
        const gu = h.target;
        if (!gu || gu.state !== 'bed' || gu.served) { if (gu) gu.taken = false; h.target = null; h.state = h.cup > 0 ? 'idle' : 'idle'; }
        else if (nav(h, gu.b.x, -4.5, 3.4, dt, 0.4) || Math.hypot(p.x - gu.b.x, p.z + 6.6) < 2.6) {
          if (h.cd <= 0) { h.cd = 0.3; h.cup--; B.toss(g, 0.22); g.rotation.y = Math.PI; B.setTray(g, h.cup); serveGuest(gu, g.userData.tray); gu.taken = false; h.target = null; h.state = 'idle'; }
        }
      }
    }
    const cupCapW = () => 2;
    // Una bevanda vola dallo zaino (o dal vassoio) all'ospite: quando arriva paga la mancia e fa festa.
    function serveGuest(gu, fromObj) {
      const rushWin = gu.rush > 0; // servito in tempo: premio
      gu.served = true;
      fromObj.getWorldPosition(_v);
      fly('cup', _v, o => o.set(gu.b.x, 1.1, -6.4), 0.45, 1.0, () => {
        S.cocoa++; gu.cold = 0; hud.floatText(TX.thanks, gu.b.x, 1.6, -6.4); A.sfx('cup');
        if (rushWin) { S.coins += 40; R.settings.addGems(2); hud.toast('⚡ Servizio lampo! +40 monete e 2 gemme'); A.sfx('goal'); fauna.celebrate(); }
        burst(gu.b.x, 1.3, -6.4, 6, [0xff7ac6, 0xff4d4d], 1.4, 3, 0.9, 0.12, 1.5);
      });
    }
    // Un pezzo di legna arriva nel camino: il fuoco sale e fa scintille.
    function landLog(r) {
      r.pend--; r.fuel = Math.min(P.fuel_max, r.fuel + 1); S.fed++; r.flare = 1; A.sfx('log');
      burst(r.cx, r.fireY + 0.1, r.fireZ, 5, [0xffa233, 0xffd23a, 0xff6a2a], 1.6, 4, 0.55, 0.09, 6);
    }

    // --- piazzole di sblocco (da level.unlocks) -----------------------------
    // Ogni piazzola è un riquadro a terra con gli angoli tondi: la barra di avanzamento dei pagamenti corre lungo il perimetro
    // (in senso orario, partendo dal centro del lato alto) e si riempie man mano che si spendono le monete.
    const PAD_PX = 192, PAD_SIZE = 2.3;
    const padGeo = new T.PlaneGeometry(PAD_SIZE, PAD_SIZE).rotateX(-Math.PI / 2);
    function drawPad(pd, frac) {
      const x = pd.cv.getContext('2d'), S = PAD_PX, mg = 14, r = 38, lw = 14, x0 = mg, y0 = mg, x1 = S - mg, y1 = S - mg;
      const path = () => {
        x.beginPath(); x.moveTo(S / 2, y0); x.lineTo(x1 - r, y0); x.arc(x1 - r, y0 + r, r, -Math.PI / 2, 0); x.lineTo(x1, y1 - r); x.arc(x1 - r, y1 - r, r, 0, Math.PI / 2);
        x.lineTo(x0 + r, y1); x.arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI); x.lineTo(x0, y0 + r); x.arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5); x.lineTo(S / 2, y0);
      };
      x.clearRect(0, 0, S, S);
      x.fillStyle = 'rgba(255,255,255,0.6)'; path(); x.fill();
      x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = 'rgba(31,42,55,0.25)'; path(); x.stroke();                       // binario vuoto
      if (frac > 0.004) {
        const per = 4 * (S - 2 * mg - 2 * r) + 2 * Math.PI * r;                          // lunghezza del perimetro
        const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#ffd23a'); g.addColorStop(1, '#4cd964');
        x.setLineDash([per * Math.min(1, frac), per]); x.strokeStyle = g; path(); x.stroke(); x.setLineDash([]);
      }
      x.font = '60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText('🪙', S / 2, S / 2 + 4);
      pd.tex.needsUpdate = true;
    }
    const pads = level.unlocks.map(u => {
      const cv = document.createElement('canvas'); cv.width = cv.height = PAD_PX;
      const tex = new T.CanvasTexture(cv);
      const m = new T.Mesh(padGeo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.position.set(u.pos[0], 0.06, u.pos[1]); m.renderOrder = 2; scene.add(m);
      const el = hud.label('pad', `<b>${u.title}</b><span></span>`);
      const pd = Object.assign({}, u, { x: u.pos[0], z: u.pos[1], m, cv, tex, el, sp: el.querySelector('span'), cd: 0, frac: -1 });
      pd.frac = Math.round(state.paid(u.id) / u.cost * 200) / 200; drawPad(pd, pd.frac);
      return pd;
    });
    function padShown(pd) {
      if (pd.needRoom != null && !rooms[pd.needRoom].open) return false; // camerieri e boscaioli solo per le stanze già aperte
      if (pd.effect === 'waiter' && !state.isBought('cocoa')) return false; // il cameriere serve solo se c'è il banco
      // I miglioramenti compaiono a gradini: ognuno richiede di aver già comprato un certo numero di altri miglioramenti (non dipende dagli obiettivi).
      const need = pd.requires && pd.requires.purchases;
      return !need || Object.keys(S.bought).length >= need;
    }
    // Decorazioni acquistabili: lanterne colorate lungo i sentieri e la mascotte del livello.
    // Lanterne: palo di ferro, lanterna con telaio, vetro colorato che brilla, tettuccio; di notte un alone, una macchia di luce a terra
    // e (per le 4 più vicine all'omino) una vera luce che illumina i dintorni.
    const lamps = [], lampMats = {}, lampLights = [], lampOrder = [];
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new T.CanvasTexture(c);
    })();
    function buildLamps() {
      if (lamps.length) return;
      const BC = [0xffd27a]; // tutte le lanterne hanno la stessa luce calda
      const spots = [[5, 2.7], [9, 2.7], [13, 2.7], [17, 2.7], [-9, -1.7], [-5, -1.7], [5.5, -1.7], [9.5, -1.7]];
      const iron = B.tint(0x2b2f3a), poolGeo = B.cached('lpool', () => new T.PlaneGeometry(5, 5).rotateX(-Math.PI / 2)), glassGeo = B.cached('lglass', () => new T.CylinderGeometry(0.13, 0.11, 0.32, 10));
      BC.forEach(c => { lampMats[c] = {
        halo: new T.SpriteMaterial({ map: glowTex, color: c, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.3 }),
        pool: new T.MeshBasicMaterial({ map: glowTex, color: c, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
        glass: new T.MeshBasicMaterial({ color: new T.Color(c).lerp(new T.Color(0xffffff), 0.45) })
      }; });
      spots.forEach(([x, z], i) => {
        const c = BC[i % BC.length], m = lampMats[c], g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
        cyl(0.13, 0.15, 0.1, iron, 0, 0.05, 0, g, 10); cyl(0.035, 0.05, 1.85, iron, 0, 0.98, 0, g, 8);          // base e palo
        cyl(0.15, 0.1, 0.07, iron, 0, 1.95, 0, g, 10);                                                          // piattello
        const glass = new T.Mesh(glassGeo, m.glass); glass.position.y = 2.14; g.add(glass);                    // vetro che brilla
        [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => cyl(0.012, 0.012, 0.34, iron, sx * 0.1, 2.14, sz * 0.1, g, 4)); // telaio
        const cap = new T.Mesh(B.cached('lcap', () => new T.ConeGeometry(0.2, 0.17, 10)), iron); cap.position.y = 2.38; cap.castShadow = true; g.add(cap);
        ball(0.035, iron, 0, 2.5, 0, g, 6, 5);
        const halo = new T.Sprite(m.halo); halo.position.y = 2.14; halo.scale.setScalar(1.4); g.add(halo);        // alone
        const pool = new T.Mesh(poolGeo, m.pool); pool.position.y = 0.07; pool.renderOrder = 3; g.add(pool);     // macchia di luce a terra
        lamps.push({ x, z, c, glass, halo, ph: i });
      });
      for (let k = 0; k < 4; k++) { const l = new T.PointLight(0xffd9a0, 0, 9, 2); scene.add(l); lampLights.push(l); } // luci vere (quelle vicine all'omino)
    }
    function updateLamps() {
      if (!lamps.length) return;
      const n = env ? env.night : 0, p = player.position;
      for (const c in lampMats) { lampMats[c].halo.opacity = 0.22 + n * 0.6; lampMats[c].pool.opacity = n * 0.4; }
      for (const l of lamps) { l.halo.scale.setScalar(1.2 + n * 0.9); l._d = Math.hypot(l.x - p.x, l.z - p.z); }
      const near = lampOrder; lampOrder.length = 0; for (const l of lamps) near.push(l); near.sort((a, b) => a._d - b._d); // riusa lo stesso elenco
      lampLights.forEach((li, k) => { const l = near[k]; li.position.set(l.x, 2.3, l.z); li.color.setHex(l.c); li.intensity = n * 2.2; }); // stessa intensità, senza tremolio
    }
    function buildMascot(pd) {
      const hold = (g, amp) => { scene.add(g); bobbers.push({ g, ph: 1, base: 0, amp: amp || 0.04 }); cols.push([pd.x - 0.6, pd.x + 0.6, pd.z - 0.6, pd.z + 0.6]); };
      if (TH.deco === 'duck') { const d = makeDuck(2.4); d.position.set(pd.x, 0, pd.z); d.rotation.y = 1.2; bobbers.push({ g: d, ph: 1, base: 0, amp: 0.06 }); cols.push([pd.x - 0.6, pd.x + 0.6, pd.z - 0.6, pd.z + 0.6]); return; }
      if (TH.deco === 'bunny') { // coniglio gigante
        const g = new T.Group(); g.position.set(pd.x, 0, pd.z); g.rotation.y = 0.9;
        ball(0.55, mats.white, 0, 0.6, 0, g, 18, 12).scale.set(1, 0.95, 1.15);
        ball(0.38, mats.white, 0, 1.3, 0.35, g, 16, 12);
        [-0.16, 0.16].forEach(s => { const e = ball(0.14, mats.white, s, 2.0, 0.28, g, 10, 8); e.scale.set(0.55, 2.3, 0.45); e.rotation.z = -s * 0.5; const i2 = ball(0.09, mats.pink, s, 2.0, 0.33, g, 8, 6); i2.scale.set(0.5, 2.0, 0.3); i2.rotation.z = -s * 0.5; });
        [-0.14, 0.14].forEach(s => { ball(0.05, mats.dark, s, 1.4, 0.69, g, 6, 5); ball(0.08, mats.pink, s * 1.8, 1.25, 0.62, g, 6, 5).scale.set(1, 0.7, 0.4); });
        ball(0.06, mats.pink, 0, 1.3, 0.73, g, 6, 5); ball(0.18, mats.white, 0, 0.55, -0.62, g, 10, 8);
        [-0.28, 0.28].forEach(s => ball(0.2, mats.white, s, 0.12, 0.5, g, 10, 8).scale.set(0.8, 0.5, 1.5));
        hold(g, 0.05); return;
      }
      if (TH.deco === 'scarecrow') { // spaventapasseri con testa a zucca
        const g = new T.Group(); g.position.set(pd.x, 0, pd.z);
        cyl(0.07, 0.07, 2.8, mats.trunk, 0, 1.4, 0, g, 8);
        const bar = cyl(0.06, 0.06, 2.2, mats.trunk, 0, 2.0, 0, g, 8); bar.rotation.z = Math.PI / 2;
        box(0.8, 0.9, 0.4, B.tint(0xc0553a), 0, 1.7, 0, g, 0.15);
        ball(0.4, mats.orange, 0, 2.6, 0, g, 14, 10).scale.set(1, 0.85, 1);
        [-0.14, 0.14].forEach(s => box(0.1, 0.1, 0.05, mats.dark, s, 2.65, 0.36, g, 0.02));
        box(0.28, 0.07, 0.05, mats.dark, 0, 2.45, 0.37, g, 0.02);
        cyl(0.55, 0.55, 0.05, B.tint(0xe8c66a), 0, 2.95, 0, g, 14); cyl(0.28, 0.32, 0.4, B.tint(0xe8c66a), 0, 3.15, 0, g, 12);
        [-1, 1].forEach(s => { box(0.18, 0.28, 0.12, B.tint(0xe8c66a), s * 1.15, 2.0, 0, g, 0.05); box(0.26, 0.5, 0.1, B.tint(0xe8c66a), s * 0.3, 1.0, 0.05, g, 0.04); });
        hold(g, 0.02); return;
      }
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
      else if (pd.effect === 'helper') spawnHelper(pd.room);
      else if (pd.effect === 'waiter') spawnWaiter(pd.room);
      else if (pd.effect === 'saw') refreshTools();
      else if (pd.effect === 'lamps') buildLamps();
      else if (pd.effect === 'mascot') buildMascot(pd);
      // "bag", "bag2", "boots", "axe", "insul", "sign" e "cocoa2" sono letti da hasEffect()
      // (un aiutante è un oggetto "helper" o "waiter" legato alla stanza pd.room: rooms[pd.room] deve esistere)
    }
    const hasEffect = e => pads.some(p => p.effect === e && state.isBought(p.id));
    // Usati dagli strumenti di prova: comprano uno sblocco (con quel che richiede) e rendono vero un obiettivo.
    let speedMul = 1, fpsOn = false, fpsEl = null, fpsN = 0, fpsT = 0;
    function buyPad(pd) {
      if (!pd || state.isBought(pd.id)) return;
      if (pd.needRoom != null) rooms[pd.needRoom].open || buyPad(pads.find(p => p.effect === 'room' && p.room === pd.needRoom));
      if (pd.effect === 'waiter') buyPad(pads.find(p => p.effect === 'cocoa'));
      S.paid[pd.id] = pd.cost; S.bought[pd.id] = true; applyEffect(pd);
    }
    function satisfy(o) {
      if (!o) return;
      if (o.bought) buyPad(pads.find(p => p.id === o.bought));
      else if (o.stat === 'stars') S.happy = Math.max(S.happy, Math.ceil(o.n / P.star_per_guest));
      else S[o.stat] = Math.max(S[o.stat] || 0, o.n);
    }

    // --- giocatore ----------------------------------------------------------
    // Aspetto dell'omino scelto nel menu (colore, cappello, accessorio).
    const look = R.settings.get('look'), CAT = R.settings.CATALOG;
    const lookColor = (CAT.color.find(c => c.id === look.color) || CAT.color[0]).hex;
    const player = B.person(lookColor, lookColor === 0xffd23a ? 0xff7ac6 : 0xffd23a, true, OUTFIT, { shorts: 0x2d6cdf, hat: look.hat, acc: look.acc }); player.position.set(0, 0, 0);
    const stackG = new T.Group(); stackG.position.set(0, 0.75, -0.32); player.add(stackG);
    const carry = { logs: 0, cups: 0 };
    let inLogs = 0, inCups = 0; // pezzi ancora in volo verso lo zaino: compaiono sulla schiena solo quando arrivano
    // Lo zaino ha due scomparti separati: legna e bevande.
    const logCap = () => hasEffect('bag2') ? P.bag_huge_logs : hasEffect('bag') ? P.bag_big_logs : P.bag_logs;
    const cupCap = () => hasEffect('bag2') ? P.bag_huge_cups : hasEffect('bag') ? P.bag_big_cups : P.bag_cups;
    const speed = () => (hasEffect('boots') ? P.speed_fast : P.speed_base) * speedMul;
    const chopInterval = () => P.chop_interval * (hasEffect('saw') ? P.saw_mul : hasEffect('axe') ? P.axe_mul : 1) * (R.shop.has('goldtool') ? 0.85 : 1); // "Attrezzi d'oro": -15%
    // Attrezzo in mano a giocatore e boscaioli: ascia, o motosega dopo l'acquisto.
    function refreshTools() { const t = hasEffect('saw') ? 'saw' : 'axe'; B.setTool(player, t); helpers.forEach(h => h && B.setTool(h.g, t)); }
    const burnMul = () => hasEffect('insul') ? P.insul_mul : 1;
    const cocoaInterval = () => hasEffect('cocoa2') ? P.cocoa2_interval : P.cocoa_interval;
    const cocoaMax = () => hasEffect('cocoa2') ? P.cocoa2_max : P.cocoa_max;
    const refreshStack = () => B.drawStack(stackG, Math.max(0, carry.logs - inLogs), Math.max(0, carry.cups - inCups));
    const stars = () => Math.min(P.stars_max, S.happy * P.star_per_guest);
    openRoom(rooms[0]); // la prima stanza è sempre aperta
    rooms.forEach((r, i) => { r.pileN = S.piles[i] || 0; drawPile(r); });
    pads.forEach(pd => { if (state.isBought(pd.id)) applyEffect(pd); });
    // Atmosfera: giorno/notte e meteo; animali e compagno.
    env = R.createEnv({ T, TH, A, Q, level, hemi, sun, scene, player, mats, hud });
    fauna = R.createFauna({ T, B, scene, A, Q, level, player, trees, collide, inLake, inLM, bounds: [bx0, bx1, bz0, bz1] });

    // --- freccia guida e caduta (neve o petali) ------------------------------
    const arrow = new T.Mesh(new T.ConeGeometry(0.35, 0.7, 20), mats.arrow); arrow.rotation.x = Math.PI; scene.add(arrow);
    const leafy = TH.fall === 'leaves', NS = Math.round((snowy ? 500 : leafy ? 110 : 200) * Math.max(0.4, Q.density)), snowPos = new Float32Array(NS * 3), fallSpeed = snowy ? 1.3 : leafy ? 0.9 : 0.7;
    for (let i = 0; i < NS; i++) { snowPos[i * 3] = -20 + Math.random() * 40; snowPos[i * 3 + 1] = Math.random() * 14; snowPos[i * 3 + 2] = -20 + Math.random() * 40; }
    const snowGeo = new T.BufferGeometry(); snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
    scene.add(new T.Points(snowGeo, new T.PointsMaterial(snowy ? { color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9 } : { color: TH.fallColor || 0xff9ec7, size: leafy ? 0.27 : 0.17, transparent: true, opacity: 0.95 })));
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
    // L'ospite si sdraia (letto o lettino) oppure, dove ci sono tavolini e sedie, si siede al tavolo con le braccia in avanti.
    function seatGuest(gu) {
      const u = gu.g.userData;
      if (gu.r.sit) {
        gu.g.rotation.set(0, Math.PI, 0); gu.g.position.set(gu.b.x, 0.03, gu.r.seatZ);
        u.legs.forEach(l => { l.rotation.x = -1.45; });
        u.arms.forEach(a => { a.rotation.set(-0.9, 0, 0); }); u.elbows.forEach(e => { e.rotation.set(-0.9, 0, 0); });
        u.up.rotation.set(0, 0, 0); u.up.position.y = 0.42; u.blob.visible = true;
      } else { gu.g.rotation.set(-Math.PI / 2, 0, 0); gu.g.position.set(gu.b.x, 0.62, -5.7); u.blob.visible = false; }
    }
    // kind: undefined (ospite normale), 'vip' (paga il triplo), 'scout' (squadra: pagano il 50% in più), 'rush' (ospite affamato: servito in fretta dà un premio).
    function spawnGuest(kind) {
      let fb = null;
      for (const r of rooms) if (r.open) for (const b of r.beds) if (!b.guest && !fb) fb = [r, b];
      if (!fb) return null;
      const [r, b] = fb;
      const look = kind === 'vip' ? { coat: 0xffd23a, hat: 0xffffff, opt: { hat: 'crown' } } : kind === 'scout' ? { coat: 0x4cd964, hat: 0x8b5a2b, opt: {} } : kind === 'rush' ? { coat: 0xff7ac6, hat: 0xffffff, opt: {} } : null;
      const g = B.person(look ? look.coat : COATS[Math.floor(Math.random() * COATS.length)], look ? look.hat : CONFETTI[Math.floor(Math.random() * CONFETTI.length)], false, OUTFIT,
        Object.assign({ shorts: SHORTS[Math.floor(Math.random() * SHORTS.length)], shoes: Math.random() < 0.5 ? 0xffffff : 0x3d8bff }, look ? look.opt : {}));
      g.scale.setScalar(kind === 'vip' ? 1 : 0.88); g.position.set(SPAWN[0], 0, SPAWN[1]);
      const gu = { g, r, b, state: 'in', path: [[r.cx, -2.8], [b.x, -4.6]], stay: P.guest_stay * (kind === 'vip' ? 1.4 : 1), cold: 0, want: false, served: false, el: hud.label('pill', ''), vip: kind === 'vip', scout: kind === 'scout', rush: kind === 'rush' ? 24 : 0, taken: false };
      b.guest = gu; guests.push(gu);
      return gu;
    }
    // --- tutorial a fumetti: solo la prima volta e solo nella prima stagione ---
    const tut = { on: !R.settings.get('tutorial') && level.id === 'inverno' && S.done === 0, i: 0, moved: 0, lx: null, lz: null };
    const TSTEPS = [
      ['👆 Trascina il dito sullo schermo per muoverti', () => tut.moved > 3],
      [`🪓 Vai verso ${V.treeArt || 'un albero'}: segui la freccia gialla`, () => S.wood >= 1 || !!nearTree(player.position, P.chop_range)],
      [`🌲 Fermati vicino all'${V.tree || 'albero'}: la ${V.wood || 'legna'} si taglia da sola!`, () => S.wood >= 4],
      [`🔥 Porta la ${V.wood || 'legna'} al ${V.fire || 'camino'}, dove c'è la barra del fuoco`, () => S.fed >= 1],
      [`${V.guestEmoji || '🧑'} Presto arriverà un ${V.guest || 'ospite'}: tieni il ${V.fire || 'camino'} acceso`, () => S.guests >= 1],
      [`🪙 Raccogli le monete lasciate davanti alla ${V.room || 'stanza'}`, () => S.collected >= 1],
      ['✨ Spendile nei riquadri a terra: la barra si riempie!', () => Object.keys(S.bought).length >= 1 || S.done >= 5]
    ];
    function endTutorial() { tut.on = false; hud.hint(null); R.settings.set('tutorial', true); }
    hud.onHintSkip(endTutorial);
    function updateTutorial(dt) {
      const p = player.position;
      if (tut.lx != null) tut.moved += Math.hypot(p.x - tut.lx, p.z - tut.lz); tut.lx = p.x; tut.lz = p.z;
      while (tut.on && tut.i < TSTEPS.length && TSTEPS[tut.i][1]()) tut.i++;
      if (tut.on && tut.i >= TSTEPS.length) { endTutorial(); hud.toast('Ora sai tutto: buon divertimento! 🎉'); return; }
      if (tut.on) hud.hint(TSTEPS[tut.i][0]);
    }
    // Consigli che compaiono una volta sola, al momento giusto.
    function tips() {
      if (carry.logs >= logCap() && S.fed === 0 && R.settings.tip('bag')) hud.toast(`🎒 Zaino pieno! Porta la ${V.wood || 'legna'} al ${V.fire || 'camino'}`);
      if (guests.some(g => g.want && g.state === 'bed' && !g.served) && R.settings.tip('want')) hud.toast(`${TX.want} Portagli l'ordinazione dal banco!`);
      if (cocoa.open && carry.cups === 0 && S.cocoa === 0 && R.settings.tip('stand')) hud.toast(`${V.foodEmoji || '☕'} ${upFirst(V.stand || 'il banco')} prepara le ordinazioni: avvicinati per prenderle`);
    }
    // Eventi a sorpresa ogni 75-135 secondi, dopo i primi obiettivi: un VIP, una squadra di scout o un ospite affamato.
    let eventT = 70;
    function runEvent() {
      const free = rooms.reduce((n, r) => n + (r.open ? r.beds.filter(b => !b.guest).length : 0), 0);
      if (!free) return;
      const kinds = ['vip', 'scout', 'rush'].filter(k => (k !== 'scout' || free >= 2) && (k !== 'rush' || cocoa.open));
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      if (k === 'vip') { if (spawnGuest('vip')) hud.toast(`⭐ Sta arrivando un ${V.guest || 'ospite'} VIP: paga il triplo!`); }
      else if (k === 'rush') { if (spawnGuest('rush')) hud.toast(`⏱ Un ${V.guest || 'ospite'} affamato! Portagli subito l'ordinazione ${V.foodEmoji || ''}: +40 monete`); }
      else { for (let i = 0; i < Math.min(3, free); i++) spawnGuest('scout'); hud.toast('🏕️ Arriva una squadra di scout! Pagano di più'); }
      A.sfx('guest'); fauna.celebrate();
    }
    function leave(gu, happy) {
      const g = gu.g; g.rotation.set(0, 0, 0); g.position.set(gu.b.x, 0, -4.6); gu.b.guest = null; gu.state = 'out'; g.userData.blob.visible = true;
      gu.path = [[gu.r.cx, -2.8], [SPAWN[0], SPAWN[1]]];
      if (happy) {
        const pay = Math.round((P.pay + (gu.served ? P.tip : 0)) * (gu.vip ? 3 : gu.scout ? 1.5 : 1) * (R.shop.has('boost') ? 1.5 : 1)); // "Ospiti generosi" dallo shop: +50%
        gu.r.pileN += pay; drawPile(gu.r); S.happy++; S.guests++;
        hud.floatText('+' + pay, gu.r.cx + 1.7, 1.2, PILE_Z);
        burst(gu.r.cx + 1.7, 0.6, PILE_Z, 8, [0xffd23a, 0xfff2a8], 2.2, 4, 0.7, 0.1);
      } else {
        S.happy = Math.max(0, S.happy - P.cold_penalty);
        hud.toast(TX.coldLeave); A.sfx('cold');
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
      hud.setGems(R.settings.get('gems'));
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
    let perfT = 0, perfSlow = 0;
    let running = false, paused = false, tt = 0, saveT = 0, chopCd = 0, feedCd = 0, cupCd = 0, hopT = 0, dustT = 0;
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
          burst(tr.x, 1.2, tr.z, 5, [0xb07848, 0xe6b27a, 0x7a4a30], 2.4, 3.2, 0.5, 0.1); A.sfx(hasEffect('saw') ? 'saw' : 'chop');
          if (R.shop.has('goldtool')) burst(tr.x, 1.3, tr.z, 5, [0xffd23a, 0xfff2a8], 2.6, 3.6, 0.6, 0.09, 4); // scintille dorate
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
          burst(r.cx + 1.7, 0.6, PILE_Z, 6, [0xffd23a, 0xfff2a8], 2, 4, 0.6, 0.1); A.sfx('coin');
        }
      }
      if (cocoa.open) {
        cocoa.t += dt; if (cocoa.t > cocoaInterval() && cocoa.cups < cocoaMax()) { cocoa.cups++; cocoa.t = 0; }
        if (cocoa.cups > 0 && carry.cups < cupCap() && cupCd <= 0 && Math.hypot(p.x - COCOA_PICK[0], p.z - COCOA_PICK[1]) < 1.5) {
          cupCd = 0.22; cocoa.cups--; carry.cups++; inCups++; changed = true; A.sfx('pickup');
          _v.set(10.55 + Math.min(5, cocoa.cups) * 0.28, 1.3, -6.55);
          fly('cup', _v, o => stackG.getWorldPosition(o), 0.4, 0.8, () => { inCups--; refreshStack(); });
        }
        cupMeshes.forEach((c, i) => { c.visible = i < cocoa.cups; });
      }
      for (const gu of guests) {
        if (gu.state === 'bed' && gu.want && !gu.served && carry.cups > 0 && Math.hypot(p.x - gu.b.x, p.z + 6.6) < 2) {
          carry.cups--; changed = true; refreshStack();
          B.toss(player, 0.26); if (!moving) player.rotation.y = Math.atan2(gu.b.x - p.x, -6.6 - p.z);
          serveGuest(gu, stackG);
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
            burst(pd.x, 0.8, pd.z, 26, CONFETTI, 4, 7, 1.1, 0.16); hopT = 0.5; A.sfx('buy');
          }
        }
      }
      if (changed) refreshStack();

      // camini e griglie
      for (const r of rooms) if (r.open) r.fuel = Math.max(0, r.fuel - dt / ((busy(r) ? P.burn_busy : P.burn_idle) * burnMul()));
      // fumo dal camino o dal barbecue acceso, polvere (o neve) sotto i passi
      for (const r of rooms) if (r.open && r.fuel > 0) { r.smokeT = (r.smokeT || 0) - dt; if (r.smokeT <= 0) { r.smokeT = 0.45 + Math.random() * 0.3; burst(r.cx + (Math.random() - 0.5) * 0.2, r.fireY + (lido ? 0.4 : 1.35), r.fireZ - (lido ? 0.05 : 0.45), 1, [0xeef1f5, 0xd5dbe3], 0.2, 0.9, 2, 0.2, -0.25); } }
      dustT -= dt;
      if (moving && dustT <= 0) { dustT = 0.17; burst(p.x - Math.sin(player.rotation.y) * 0.18, 0.08, p.z - Math.cos(player.rotation.y) * 0.18, 1, [TH.dust || 0xffffff, 0xffffff], 0.3, 0.7, 0.45, 0.11, 2.5); }
      // alberi che ricrescono
      regrowTrees(dt);
      if (tut.on) updateTutorial(dt); else tips();
      // eventi a sorpresa
      eventT -= dt; if (S.done >= 3 && S.fed > 0 && eventT <= 0) { eventT = 75 + Math.random() * 60; runEvent(); }
      // ospiti
      if (S.fed > 0) { spawnT -= dt; if (spawnT <= 0) { spawnT = (P.guest_spawn_min + Math.random() * (P.guest_spawn_max - P.guest_spawn_min)) * (hasEffect('sign') ? P.sign_mul : 1); spawnGuest(); } }
      for (let i = guests.length - 1; i >= 0; i--) {
        const gu = guests[i];
        if (gu.state === 'in') {
          if (B.follow(gu.g, gu.path, 2.6, dt)) {
            gu.state = 'bed'; seatGuest(gu); A.sfx('guest'); fauna.react();
            gu.want = cocoa.open && (gu.vip || gu.scout || gu.rush > 0 || Math.random() < P.cocoa_chance);
          }
        } else if (gu.state === 'bed') {
          if (gu.rush > 0 && !gu.served) gu.rush -= dt;
          if (gu.r.fuel > 0) { gu.stay -= dt; gu.cold = Math.max(0, gu.cold - dt * 2); } else gu.cold += dt;
          if (gu.cold > P.guest_cold_limit) leave(gu, false); else if (gu.stay <= 0) leave(gu, true);
        } else if (B.follow(gu.g, gu.path, 2.8, dt)) { scene.remove(gu.g); gu.el.remove(); guests.splice(i, 1); }
      }
      helpers.forEach(h => h && updateHelper(h, dt));
      waiters.forEach(h => h && updateWaiter(h, dt));

      // obiettivi
      while (S.done < objectives.length && objValue(objectives[S.done]) >= objTarget(objectives[S.done])) {
        const rw = objectives[S.done].reward || 10;
        S.done++; S.coins += rw; R.settings.addGems(1); hud.toast(`Obiettivo completato! +${rw} monete 🎉`); save(); fauna.celebrate();
        burst(p.x, 1.6, p.z, 34, CONFETTI, 4.5, 8, 1.2, 0.17); hopT = 0.5; A.sfx('goal');
      }
      if (S.done >= objectives.length && !S.won) {
        S.won = true; R.settings.addGems(10); save(); running = false; endJoy();
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
        r.light.intensity = lit ? (0.6 + r.fuel / P.fuel_max + 0.15 * Math.sin(tt * 17 + r.i) + r.flare * 0.8) * (1 - (env ? env.night : 0) * 0.35) : 0; // di notte il fuoco illumina meno (prima di più: abbagliava)
        r.light.distance = 8;
        r.pile.rotation.y = tt * 0.8; r.pile.position.y = 0.05 + 0.04 * Math.sin(tt * 3 + r.i);
      }
      for (const t of trees) { animateTree(t, dt); fadeTree(t, p, dt); }
      pads.forEach(pd => {
        pd.m.visible = !state.isBought(pd.id) && padShown(pd);
        if (!pd.m.visible) return;
        const f = Math.round(state.paid(pd.id) / pd.cost * 200) / 200;
        if (f !== pd.frac) { pd.frac = f; drawPad(pd, f); } // si ridisegna solo quando il pagamento avanza
        pd.m.scale.setScalar(1 + 0.03 * Math.sin(tt * 4));
      });
      const tg = running ? taskTarget() : null;
      arrow.visible = !!tg && Math.hypot(tg[0] - p.x, tg[1] - p.z) > 1.4;
      if (tg) { arrow.position.set(tg[0], 2.9 + Math.sin(tt * 4) * 0.25, tg[1]); arrow.rotation.y = tt * 2; }
      // salto di gioia quando si completa qualcosa
      if (hopT > 0) { hopT = Math.max(0, hopT - dt); p.y = Math.sin(Math.PI * (1 - hopT / 0.5)) * 0.55; } else p.y = 0;
      const a = snowGeo.attributes.position.array;
      for (let i = 0; i < NS; i++) {
        a[i * 3 + 1] -= dt * fallSpeed * (env ? env.fallMul : 1); a[i * 3] += Math.sin(tt + i) * dt * (snowy ? 0.2 : leafy ? 1.2 : 0.6) + (env ? env.windX : 0) * dt * (snowy ? 1 : 0.5);
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
      for (const fnA of lmAnim) fnA(dt);
      for (const rp of ripples) { const k = (tt * 0.3 + rp.ph) % 1; rp.m.scale.setScalar(0.6 + k * 2.6); rp.m.material.opacity = 0.5 * (1 - k) * Math.min(1, k * 6); }
      for (const b of bobbers) { const base = b.base == null ? 0.05 : b.base, amp = b.amp == null ? 0.05 : b.amp; b.g.position.y = base + Math.sin(tt * 1.6 + b.ph) * amp; if (b.amp == null) b.g.rotation.z = Math.sin(tt * 1.2 + b.ph) * 0.05; }
      updateLamps();
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
          const badge = gu.vip ? '⭐ VIP' : gu.scout ? '🏕️' : gu.rush > 0 && !gu.served ? `⏱${Math.ceil(gu.rush)}` : '';
          if (badge) txt = txt ? `${badge} ${txt}` : badge;
        }
        if (gu.el.textContent !== txt) gu.el.textContent = txt;
        if (gu.el.className !== cls) gu.el.className = cls;
        hud.put(gu.el, gu.b.x, gu.r.sit ? 2.2 : 1.4, gu.r.sit ? -6 : -6.6, !!txt);
      });
      hud.updateFloats(dt);
    }

    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    cam.position.set(0, 15, 12);
    let last = performance.now();
    function frame(now) {
      const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
      // Se per 8 secondi il gioco va sotto i 25 fotogrammi al secondo, si suggerisce (una volta sola) di abbassare la qualità grafica.
      if (running && !paused && raw < 0.5) {
        perfT += raw; if (raw > 0.04) perfSlow += raw;
        if (perfT >= 8) { if (perfSlow / perfT > 0.6 && R.settings.get('quality') !== 'low' && R.settings.tip('perf')) hud.toast('🐢 Il gioco va a scatti? Prova la qualità Media o Bassa: menu ☰ → Impostazioni'); perfT = 0; perfSlow = 0; }
      }
      if (fpsOn) { fpsN++; fpsT += raw; if (fpsT >= 0.5) { fpsEl.textContent = Math.round(fpsN / fpsT) + ' fps'; fpsN = 0; fpsT = 0; } }
      if (running && !paused) { update(dt); tickLater(dt); updateFlyers(dt); updateParts(dt); env.update(dt); fauna.update(dt); }
      anim(dt); renderer.render(scene, cam); overlays(dt); refreshHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      start() { running = true; hud.toast(S.done === 0 ? 'Vai verso il bosco: segui la freccia gialla ➜' : `${level.cityEmoji || ''} ${level.cityName || ''} · ${level.emoji} ${level.name}`); },
      resume() { running = true; },
      pause(on) { paused = !!on; if (on) { endJoy(); save(); } },
      save,
      // Strumenti di prova (menu Debug e `window.rifugioDebug` con ?debug).
      debug: {
        player, S, carry, trees, rooms, helpers, waiters, guests, cocoa, pads, padShown, openRoom, openCocoa, spawnHelper, spawnWaiter, spawnGuest,
        tp(x, z) { player.position.x = x; player.position.z = z; },
        coins(n) { S.coins += n; },
        // porta l'omino in un punto utile
        go(where) {
          if (where === 'casetta') this.tp(0, -3);
          else if (where === 'banco') this.tp(11, -4.6);
          else if (where === 'sentiero') this.tp(10, 1.2);
          else if (where === 'bosco') { const t = trees.filter(t => t.logs > 0 && t.z > 4).sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z))[0]; if (t) this.tp(t.x, t.z - 1.1); }
          else if (where === 'lago' && lake) this.tp(lake.x + lake.r + 2, lake.z);
        },
        // completa l'obiettivo di turno (o i prossimi n): il ciclo di gioco li chiude subito
        skip(n) { for (let k = 0; k < (n || 1); k++) satisfy(objectives[S.done + k]); },
        finishLevel() { objectives.slice(S.done).forEach(satisfy); },
        unlockAll() { pads.forEach(buyPad); },
        callGuest() { if (!S.fed) S.fed = 1; spawnGuest(); },
        fillFuel() { rooms.forEach(r => { if (r.open) r.fuel = P.fuel_max; }); },
        fillBag() { carry.logs = logCap(); carry.cups = cupCap(); refreshStack(); },
        fillStand() { if (cocoa.open) cocoa.cups = cocoaMax(); },
        hireAll() { pads.forEach(pd => { if (pd.effect === 'helper' || pd.effect === 'waiter') buyPad(pd); }); },
        fast(on) { speedMul = on ? 2 : 1; },
        showFps(on) { fpsOn = !!on; if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.style.cssText = 'position:fixed;left:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font:12px monospace;padding:3px 6px;border-radius:6px;z-index:50'; document.body.appendChild(fpsEl); } fpsEl.hidden = !on; },
        weather(k) { env.setWeather(k); }, time(n) { env.setTime(n); }, autoEnv() { env.release(); env.setWeather('auto'); },
        event(k) { if (!S.fed) S.fed = 1; if (k === 'scout') for (let i = 0; i < 3; i++) spawnGuest('scout'); else spawnGuest(k); },
        gems(n) { R.settings.addGems(n); },
        info() { return { fast: speedMul > 1, fps: fpsOn, done: S.done, total: objectives.length, env: env.info(), critters: fauna.count() }; }
      }
    };
  };
})(window.Rifugio);
