// Livello in gioco: mette insieme le parti (pianta, edificio, raccolta, ospiti, personale, attività) e fa girare il ciclo.
// L'aspetto e i numeri vengono dal livello (js/levels/*.js); la forma del rifugio da parts/layout.js.
(function (R) {
  'use strict';
  const CONFETTI = [0xff4d4d, 0xffd23a, 0x3d8bff, 0x4cd964, 0xff7ac6, 0xa066ff];

  R.createGame = function ({ hud, level, state, audio }) {
    const T = THREE, P = level.tuning, S = state.data, objectives = level.objectives, TH = level.theme, TX = level.text;
    const PL = level.place || { coats: [], hats: [], structs: [], host: null };
    const CITYID = level.cityId || 'valle', SEASON_ID = level.season;
    const RES = R.RES[SEASON_ID] || R.RES.inverno;
    const L = R.parts.layout(CITYID);
    const WINTER = RES.kind === 'wood'; // d'inverno c'è la caldaia; nelle altre stagioni il raccolto va alla dispensa della mensa
    if (!WINTER) L.boiler.feed = L.pantry.feed.slice();
    const EX = R.extras; EX.bind(hud);
    const MT = R.meta; MT.bind(hud);
    const seasonNote = EX.applySeason(P, level);
    const A = audio || { sfx() {} };
    const OUTFIT = TH.outfit || 'winter';
    const V = level.voc || {};
    const upFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
    P.world_min = L.world.min.slice(); P.world_max = L.world.max.slice();

    // --- motore -------------------------------------------------------------
    const Q = R.settings ? R.settings.quality() : { ratio: 2, aa: true, shadows: 'pcf', map: 1024, density: 1 };
    const renderer = new T.WebGLRenderer({ antialias: !!Q.aa, powerPreference: 'high-performance' });
    let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.ratio);
    renderer.setPixelRatio(pixelRatio);
    let shadowN = 0; renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.enabled = Q.shadows !== 'off'; renderer.shadowMap.type = T.PCFShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(TH.sky);
    scene.fog = new T.Fog(TH.sky, TH.fog[0] + 18, TH.fog[1] + 30); // nebbia più lontana: immagine più nitida
    const cam = new T.PerspectiveCamera(45, 1, 4, 160);
    hud.setCamera(cam);
    const hemi = new T.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]); scene.add(hemi);
    let env = null, fauna = null;
    const sun = new T.DirectionalLight(TH.sun[0], TH.sun[1]);
    sun.castShadow = Q.shadows !== 'off'; sun.shadow.mapSize.set(Q.map || 512, Q.map || 512);
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    const sc = sun.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 70;
    scene.add(sun); scene.add(sun.target);

    const B = R.createBuilder(scene, Object.assign({}, TH, { resource: RES.kind })), mats = B.mats, box = B.box, cyl = B.cyl, ball = B.ball, add = B.add;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = []; // ostacoli come rettangoli [x0, x1, z0, z1]
    const lake = level.lake;
    // Ambiente della città, fuori dalla zona di gioco: Valle = cappella tra i monti, Mulini = campi e canale, Porto = mare.
    const SEA_Z = CITYID === 'porto' ? 16.5 : null;
    const FARMS = CITYID === 'mulini' ? [[20, -26, 12, 8], [20, -14, 12, 8], [-32, -26, 11, 8]] : [];
    const CANAL = CITYID === 'mulini' ? [17, 19] : null;
    const CHAPEL = CITYID === 'valle' ? { x: 16, z: -9 } : null;
    const inLake = (x, z, pad) => {
      pad = pad || 0;
      return (!!lake && Math.hypot(x - lake.x, z - lake.z) < lake.r + pad) || (SEA_Z != null && z > SEA_Z - pad) || (!!CANAL && z > CANAL[0] - pad && z < CANAL[1] + pad) ||
        FARMS.some(f => x > f[0] - pad && x < f[0] + f[2] + pad && z > f[1] - pad && z < f[1] + f[3] + pad) || (!!CHAPEL && Math.hypot(x - CHAPEL.x, z - CHAPEL.z) < 3.2 + pad);
    };
    const LM = level.landmark === 'windmill' ? { x: -20.5, z: -34, r: 4.4 } : level.landmark === 'lighthouse' ? { x: -21, z: -12.5, r: 3.8 } : null;
    const inLM = (x, z, pad) => !!LM && Math.hypot(x - LM.x, z - LM.z) < LM.r + (pad || 0);
    const PADS = (level.unlocks || []).map(u => u.pos);
    PADS.push(...(R.parts.city.RESERVE[CITYID] || []));
    // "nearPad" tiene libere anche tutta la zona costruita e il campo.
    const F = L.field;
    const nearPad = (x, z, r) => L.built(x, z, r * 0.4) || (x > F.x0 - r * 0.6 && x < F.x1 + r * 0.6 && z > F.z0 - r * 0.6 && z < F.z1 + r * 0.6) || PADS.some(p => Math.hypot(p[0] - x, p[1] - z) < r);
    const snowy = TH.fall === 'snow';

    // --- terreno e strada ---------------------------------------------------
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), mats.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    mats.path.polygonOffset = true; mats.path.polygonOffsetFactor = -1; mats.path.polygonOffsetUnits = -1;
    const roadPts = [];
    // Strada d'arrivo tra il campo e il rifugio, da ovest a est; vialetti verso il cancello del campo, l'ingresso e il giardino.
    function road(x0, z0, x1, z1, w) {
      const len = Math.hypot(x1 - x0, z1 - z0), geo = new T.PlaneGeometry(len, w).rotateX(-Math.PI / 2), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 2.4, uv.getY(i) * w / 2.4);
      const m = new T.Mesh(geo, mats.path); m.position.set((x0 + x1) / 2, 0.026, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.receiveShadow = true; scene.add(m);
      for (let i = 0; i <= len; i += 1.4) roadPts.push([x0 + (x1 - x0) * i / len, z0 + (z1 - z0) * i / len]);
    }
    const ROAD_W = 2;
    road(-34, L.roadZ, 34, L.roadZ, ROAD_W); road(0, F.z1, 0, L.roadZ, 2.4); road(0, L.roadZ, 0, -29, 2.4);
    const nearRoad = (x, z, r) => roadPts.some(p => Math.hypot(p[0] - x, p[1] - z) < r);
    const walkP0 = []; for (let x = -16; x <= 16; x += 0.5) walkP0.push({ x, z: L.roadZ });

    // Bordi, decorazioni sparse e monumento: vedi parts/landscape.js
    const bx0 = P.world_min[0], bx1 = P.world_max[0], bz0 = P.world_min[1], bz1 = P.world_max[1];
    const { lmAnim } = R.parts.landscape({ T, scene, B, mats, box, cyl, ball, add, TH, P, Q, level, rnd, cols, SEA_Z, LM, ROAD_W, nearPad, nearRoad, inLake, inLM, snowy });

    const ducks = [], bobbers = [], ripples = [];
    function makeDuck(scale) {
      const g = new T.Group();
      ball(0.3, mats.yellow, 0, 0.3, 0, g, 14, 10).scale.set(1, 0.85, 1.25);
      ball(0.2, mats.yellow, 0, 0.62, 0.22, g, 12, 8);
      const beak = new T.Mesh(B.cached('beak', () => new T.ConeGeometry(0.07, 0.16, 8).rotateX(Math.PI / 2)), mats.orange); beak.position.set(0, 0.6, 0.42); g.add(beak);
      [-0.08, 0.08].forEach(ex => ball(0.035, mats.dark, ex, 0.68, 0.36, g, 6, 5));
      ball(0.13, mats.yellow, 0, 0.42, -0.34, g, 8, 6);
      g.scale.setScalar(scale || 1); scene.add(g);
      return g;
    }
    if (lake) {
      const sand = new T.Mesh(new T.CircleGeometry(lake.r + 1.3, 40), mats.sand); sand.rotation.x = -Math.PI / 2; sand.position.set(lake.x, 0.02, lake.z); sand.receiveShadow = true; scene.add(sand);
      const water = new T.Mesh(new T.CircleGeometry(lake.r, 40), mats.water); water.rotation.x = -Math.PI / 2; water.position.set(lake.x, 0.04, lake.z); water.receiveShadow = true; scene.add(water);
      [mats.sand, mats.water].forEach(m => { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; });
      for (let i = 0; i < 3; i++) { const d = makeDuck(1); ducks.push({ g: d, a: i * 2.1, rr: 1.2 + i * 1.1, sp: 0.25 + i * 0.07 * (i % 2 ? -1 : 1) }); }
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.28, d = rnd() * (lake.r - 1.2), rm = new T.Mesh(B.cached('ripple', () => new T.RingGeometry(0.22, 0.3, 24).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        rm.position.set(lake.x + Math.cos(a) * d, 0.07, lake.z + Math.sin(a) * d); scene.add(rm); ripples.push({ m: rm, ph: rnd() });
      }
      cols.push([lake.x - lake.r * 0.8, lake.x + lake.r * 0.8, lake.z - lake.r * 0.8, lake.z + lake.r * 0.8]);
    }
    // Bosco di contorno (solo decorazione), ai lati del rifugio.
    {
      const forest = [], blob = new T.SphereGeometry(1, 7, 5), trunk = new T.CylinderGeometry(0.15, 0.25, 1.4, 5).translate(0, 0.7, 0), cone = new T.ConeGeometry(1, 1, 8);
      const leafs = TH.leafCols || [0x57c455, 0x34a448];
      for (let i = 0, n = 0; i < 400 && n < Math.round(70 * Q.density); i++) {
        const x = (rnd() < 0.5 ? -1 : 1) * (bx1 + 0.3 + rnd() * 3), z = bz0 + rnd() * (bz1 - bz0); // solo oltre il bordo percorribile
        if (nearPad(x, z, 2.4) || nearRoad(x, z, 2.4) || inLake(x, z, 1.6) || inLM(x, z, 1.5)) continue;
        const s = 0.8 + rnd() * 0.5; n++;
        forest.push({ geo: trunk, x, y: 0, z, s, color: 0x7a4a30 });
        if (TH.tree === 'leafy') forest.push({ geo: blob, x, y: 2.3 * s, z, s: [1.15 * s, s, 1.15 * s], color: leafs[n % leafs.length] });
        else [[1.2, 1.5, 1.4], [0.9, 1.3, 2.3], [0.55, 1.1, 3.0]].forEach(([r, h, y], k) => forest.push({ geo: cone, x, y: y * s, z, s: [r * s, h * s, r * s], color: k % 2 ? 0x3fae6e : 0x2a8a5a }));
        cols.push([x - 0.25, x + 0.25, z - 0.25, z + 0.25]);
      }
      if (forest.length) { const m = new T.Mesh(B.mergeParts(forest), mats.accent); m.castShadow = true; scene.add(m); }
    }

    // Effetti e percorsi.
    const { _v, after, fly, updateFlyers, burst, updateAll, tickLater, ring, fireworks } = R.parts.fx({ T, scene, B, mats });
    const NAV = R.parts.nav({ P, cols }), findPath = NAV.findPath;
    function collide(p) {
      for (const c of cols) {
        const qx = Math.max(c[0], Math.min(p.x, c[1])), qz = Math.max(c[2], Math.min(p.z, c[3]));
        const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
        if (d < 0.3) { if (d > 1e-4) { p.x = qx + dx / d * 0.3; p.z = qz + dz / d * 0.3; } else p.z = c[3] + 0.3; }
      }
      p.x = Math.max(-L.walk.x, Math.min(L.walk.x, p.x)); p.z = Math.max(L.walk.z0, Math.min(L.walk.z1, p.z));
    }

    // --- edificio -------------------------------------------------------------
    const BLD = R.parts.building({ T, scene, B, mats, box, cyl, ball, PL, L, cols, RES });
    const { rooms, openRoom, mensa, openMensa, cinema, openCinema, wing } = BLD;
    const expand = n => { BLD.expand(n); NAV.invalidate(); }; // il muro in fondo si sposta: i percorsi si ricalcolano
    R.parts.scenery({ T, scene, B, mats, box, cyl, ball, PL, P, trees: [], cols, ROAD_W, SEA_Z, CANAL, FARMS, CHAPEL, SEASON_ID, nearPad, nearRoad, inLake, inLM });

    // --- banchi della mensa -------------------------------------------------
    const cocoa = { g: new T.Group(), cups: 0, t: 0, open: false, pick: [L.stands.cocoa[0], L.stands.cocoa[1] + 1.3] }; scene.add(cocoa.g);
    box(2.2, 1, 1.1, mats.wood, 0, 0.5, 0, cocoa.g); box(2.4, 0.1, 1.25, mats.plank, 0, 1.05, 0, cocoa.g);
    cyl(0.35, 0.3, 0.5, mats.stone, -0.8, 1.35, -0.15, cocoa.g); cyl(0.3, 0.3, 0.08, mats.cocoa, -0.8, 1.6, -0.15, cocoa.g);
    box(0.12, 2.2, 0.12, mats.wood, 1.1, 1.1, -0.5, cocoa.g); box(1.2, 0.5, 0.08, mats.red, 0.6, 2.1, -0.5, cocoa.g);
    const cupMeshes = [0, 1, 2, 3, 4, 5].map(i => { const c = add(new T.Mesh(B.cupGeo, mats.cup), cocoa.g); c.position.set(-0.45 + i * 0.28, 1.21, 0.25); c.visible = false; return c; });
    cocoa.g.position.set(L.stands.cocoa[0], 0, L.stands.cocoa[1]); cocoa.g.visible = false;
    function openCocoa() { if (cocoa.open) return; openMensa(); cocoa.open = true; cocoa.g.visible = true; const s = L.stands.cocoa; cols.push([s[0] - 1.2, s[0] + 1.2, s[1] - 0.65, s[1] + 0.65]); }

    // --- reception ------------------------------------------------------------
    const RECEP = L.recep;
    const recep = { g: new T.Group(), n: (S.recep || 0) + (S.piles || []).reduce((a, n) => a + (n || 0), 0), bowl: new T.Group(), hop: 0, shown: -1, el: hud.label('pill', ''), who: null };
    S.piles = [];
    recep.g.position.set(RECEP.x, 0, RECEP.z); scene.add(recep.g);
    {
      const rg = recep.g;
      box(3.4, 1.0, 1.0, mats.wood, 0, 0.5, 0, rg, 0.03); box(3.7, 0.12, 1.3, mats.plank, 0, 1.06, 0.05, rg, 0.03); box(2.2, 0.55, 0.05, mats.red, 0, 0.5, 0.52, rg, 0.01);
      cyl(0.045, 0.045, 2.4, mats.wood, -1.7, 1.2, -1.4, rg, 8); cyl(0.045, 0.045, 2.4, mats.wood, 1.7, 1.2, -1.4, rg, 8);
      for (let k = 0; k < 7; k++) box(0.14, 0.26, 0.08, B.tint(CONFETTI[k % CONFETTI.length]), -1.2 + k * 0.4, 1.6, -1.4, rg, 0.015);
      box(3.4, 0.1, 0.2, mats.plank, 0, 1.78, -1.4, rg, 0.02);
      const cv = document.createElement('canvas'); cv.width = 384; cv.height = 96; const cx2 = cv.getContext('2d');
      const drawSign = () => {
        const signCol = MT.decoGet('sign').col, lodge = MT.lodgeName();
        cx2.fillStyle = '#fff6df'; cx2.fillRect(0, 0, 384, 96); cx2.strokeStyle = signCol; cx2.lineWidth = 8; cx2.strokeRect(6, 6, 372, 84);
        cx2.fillStyle = signCol; cx2.textAlign = 'center'; cx2.textBaseline = 'middle';
        if (lodge) { cx2.font = '600 24px Fredoka, system-ui, sans-serif'; cx2.fillText('RECEPTION', 192, 26); let fs = 50; cx2.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; while (cx2.measureText(lodge).width > 340 && fs > 22) { fs -= 2; cx2.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; } cx2.fillText(lodge, 192, 62); }
        else { cx2.font = '700 54px Fredoka, system-ui, sans-serif'; cx2.fillText('RECEPTION', 192, 52); }
      };
      drawSign();
      const tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
      recep.redraw = () => { drawSign(); tex.needsUpdate = true; };
      const board = new T.Mesh(new T.PlaneGeometry(3.0, 0.75), new T.MeshBasicMaterial({ map: tex })); board.position.set(0, 2.45, -1.38); rg.add(board);
      cyl(0.16, 0.16, 0.05, mats.gold, -1.1, 1.15, 0.1, rg, 14); ball(0.07, mats.gold, -1.1, 1.22, 0.1, rg, 10, 8);
      cyl(0.5, 0.42, 0.14, mats.white, 0.95, 1.15, 0.1, rg, 18);
      recep.rug = box(2.6, 0.03, 1.5, B.tint(MT.decoGet('rug').col), 0, 0.02, 1.7, rg, 0.01);
      box(2.2, 0.035, 1.1, B.tint(0xffd9a0), 0, 0.03, 1.7, rg, 0.01);
      recep.bowl.position.set(0.95, 1.22, 0.1); rg.add(recep.bowl);
      recep.who = B.person(PL.recepCoat != null ? PL.recepCoat : 0xc23b5a, 0xf2d6a2, false, OUTFIT, { shorts: 0x3f4a63 }); recep.who.position.set(0.3, 0, -0.85); rg.add(recep.who);
      cols.push([RECEP.x - 1.9, RECEP.x + 1.9, RECEP.z - 1.5, RECEP.z + 0.65]);
    }
    const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const makeGlow = (col, x, y, z) => { const s = new T.Sprite(new T.SpriteMaterial({ map: haloTex, color: col, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 })); s.position.set(x, y, z); s.visible = false; scene.add(s); return s; };
    recep.glow = makeGlow(0xffd23a, RECEP.x + 0.95, 1.5, RECEP.z + 0.1);
    {
      const ev = MT.eventNow();
      if (ev) [-2.6, 2.6].forEach((dx, k) => {
        const g = new T.Group(); g.position.set(dx, 0, 0.6); recep.g.add(g);
        if (ev.decor === 'tree') [[0.8, 1.1, 0.7], [0.62, 1.0, 1.5], [0.44, 0.9, 2.2]].forEach(([r, h, y]) => { const c = new T.Mesh(B.cached('xcone' + r, () => new T.ConeGeometry(r, h, 10)), B.tint(0x2e8b57)); c.position.y = y; g.add(c); });
        else if (ev.decor === 'pumpkin') ball(0.55, B.tint(0xff8a1f), 0, 0.5, 0, g, 14, 10).scale.set(1.15, 0.85, 1.15);
        else if (ev.decor === 'egg') [0, 1, 2].forEach(i => { ball(0.28, B.tint(CONFETTI[(i + k * 2) % CONFETTI.length]), (i - 1) * 0.55, 0.3, 0, g, 12, 9).scale.set(0.85, 1.15, 0.85); });
        else for (let i = 0; i < 4; i++) { cyl(0.015, 0.015, 1.5 + i * 0.25, mats.white, (i - 1.5) * 0.4, 0.75 + i * 0.12, 0, g, 4); ball(0.3, B.tint(CONFETTI[(i + k * 3) % CONFETTI.length]), (i - 1.5) * 0.4, 1.75 + i * 0.25, 0, g, 12, 9); }
      });
    }
    function drawRecep() {
      B.clear(recep.bowl);
      const n = Math.min(Math.ceil(recep.n / 5), 26);
      for (let i = 0; i < n; i++) { const c = new T.Mesh(B.coinGeo, mats.gold); c.position.set((i % 4) * 0.2 - 0.3, 0.06 + Math.floor(i / 4) * 0.07, ((i * 5) % 3) * 0.12 - 0.12); c.rotation.y = i; add(c, recep.bowl); }
    }
    drawRecep();
    function payAtReception(amount) {
      recep.n += amount; drawRecep(); recep.hop = 0.45;
      hud.floatText('+' + amount, RECEP.x + 0.95, 2.0, RECEP.z + 0.1);
      burst(RECEP.x + 0.95, 1.5, RECEP.z + 0.1, 8, [0xffd23a, 0xfff2a8], 2.2, 4, 0.7, 0.1); A.sfx('coin');
    }
    function collectRecep() {
      const n = recep.n; if (n <= 0) return;
      S.coins += n; S.collected += n; recep.n = 0; S.recep = 0; drawRecep(); recep.hop = 0.6; MT.see('r_pay');
      hud.floatText('+' + n, player.position.x, 2.4, player.position.z); hud.coinRain(RECEP.x + 0.95, 1.5, RECEP.z + 0.1, n);
      _v.set(RECEP.x + 0.95, 1.4, RECEP.z + 0.1);
      for (let k = 0; k < Math.min(n, 10); k++) fly('coin', _v, o => o.set(player.position.x, 1.3, player.position.z), 0.4, 0.8, null, k * 0.045);
      A.sfx('coin');
    }

    // --- caldaia / cucina: un solo serbatoio per tutte le stanze -------------
    const boiler = { fuel: Math.min(P.fuel_max, S.boiler || 0), pend: 0, flare: 0, el: hud.label('fuel', '<i></i>'), fire: WINTER ? new T.Vector3(L.boiler.fire[0], BLD.fireY, L.boiler.fire[1] + 0.8) : new T.Vector3(L.pantry.pos[0], BLD.fireY, L.pantry.pos[1] + 0.4) };
    // fuori dall'inverno banchi e dolci cucinano con le scorte della dispensa
    const useStock = () => { if (WINTER) return true; if (boiler.fuel < 0.5) return false; boiler.fuel -= 0.5; return true; };
    boiler.bar = boiler.el.firstChild;
    const fireLight = new T.PointLight(0xff8a3d, 0, 9); fireLight.position.set(boiler.fire.x, 1.4, boiler.fire.z + 0.6); scene.add(fireLight);
    boiler.glow = makeGlow(0xff9a3d, boiler.fire.x, boiler.fire.y + 0.1, boiler.fire.z + 0.3);
    function landLog() {
      boiler.pend--; boiler.fuel = Math.min(P.fuel_max, boiler.fuel + 1); S.fed++; boiler.flare = 1; A.sfx('log'); EX.ev('log');
      burst(boiler.fire.x, boiler.fire.y + 0.2, boiler.fire.z + 0.2, 4, WINTER ? [0xffa233, 0xffd23a, 0xff6a2a] : RES.cols, 1.6, 4, 0.55, 0.09, 6);
    }
    function feedOne(from, delay) { boiler.pend++; fly('log', from, o => o.copy(boiler.fire), 0.38, 0.9, landLog, delay); }
    function feedMany(n) { for (let k = 0; k < n; k++) { _v.set(0, 1.4, -31); feedOne(_v, k * 0.04); } }
    const busyRooms = () => rooms.reduce((n, r) => n + (r.open && r.beds.some(b => b.guest) ? 1 : 0), 0);
    const burnRate = () => (0.06 + 0.075 * busyRooms()) * (3.2 / P.burn_busy) * (hasEffect('insul') ? 1 / P.insul_mul : 1);

    // --- giocatore ----------------------------------------------------------
    const look = R.settings.get('look'), CAT = R.settings.CATALOG;
    const lookColor = (CAT.color.find(c => c.id === look.color) || CAT.color[0]).hex;
    const player = B.person(lookColor, lookColor === 0xffd23a ? 0xff7ac6 : 0xffd23a, true, OUTFIT, { shorts: 0x2d6cdf, hat: look.hat, acc: look.acc }); player.position.set(0, 0, -24.5);
    let personKids = player.children.slice();
    const stackG = new T.Group(); stackG.position.set(0, 0.75, -0.32); player.add(stackG);
    function applyLook() {
      const lk = R.settings.get('look'), lc = (CAT.color.find(c => c.id === lk.color) || CAT.color[0]).hex;
      const np = B.person(lc, lc === 0xffd23a ? 0xff7ac6 : 0xffd23a, true, OUTFIT, { shorts: 0x2d6cdf, hat: lk.hat, acc: lk.acc });
      scene.remove(np);
      personKids.forEach(k => player.remove(k));
      personKids = np.children.slice(); personKids.forEach(k => player.add(k));
      Object.assign(player.userData, np.userData);
    }
    function applyDeco() { if (recep.redraw) recep.redraw(); if (recep.rug) recep.rug.material = B.tint(MT.decoGet('rug').col); }

    // --- zaino ----------------------------------------------------------------
    const carry = { logs: 0, cups: 0, snacks: 0, soap: 0, paper: 0 };
    let inLogs = 0, inCups = 0, speedMul = 1, fpsOn = false, fpsEl = null, fpsN = 0, fpsT = 0;
    let pads = [], RES_M = null;
    const hasEffect = e => pads.some(p => p.effect === e && state.isBought(p.id));
    const logCap = () => hasEffect('bag2') ? P.bag_huge_logs : hasEffect('bag') ? P.bag_big_logs : P.bag_logs;
    const cupCap = () => hasEffect('bag2') ? P.bag_huge_cups : hasEffect('bag') ? P.bag_big_cups : P.bag_cups;
    const supCap = () => hasEffect('bag2') ? 18 : hasEffect('bag') ? 12 : 8;
    const speed = () => (hasEffect('boots') ? P.speed_fast : P.speed_base) * speedMul * (RES_M.machine.driving ? 1.4 : 1);
    const chopInterval = () => P.chop_interval * (hasEffect('saw') ? P.saw_mul : hasEffect('axe') ? P.axe_mul : 1) * (R.shop.has('goldtool') ? 0.85 : 1);
    const cocoaInterval = () => hasEffect('cocoa2') ? P.cocoa2_interval : P.cocoa_interval;
    const cocoaMax = () => hasEffect('cocoa2') ? P.cocoa2_max : P.cocoa_max;
    const refreshStack = () => B.drawStack(stackG, Math.max(0, carry.logs - inLogs), Math.max(0, carry.cups - inCups));
    const stars = () => Math.min(P.stars_max, S.happy * P.star_per_guest);

    // --- raccolta e macchinario ----------------------------------------------
    const guests = [];
    RES_M = R.parts.resources({ T, scene, B, mats, box, cyl, ball, hud, A, P, S, L, cols, RES, rnd, player, burst, boiler, feedMany, EX });
    const nodes = RES_M.nodes, nearTree = RES_M.near, chopTree = RES_M.chop;

    // --- attività in più e della città ---------------------------------------
    let GU = null;
    const G2 = { T, scene, B, mats, box, cyl, ball, hud, A, P, S, L, level, player, rooms, guests, carry, cols, fly, burst, _v, CONFETTI, RECEP, EX, MT, CITYID, SEASON_ID, SEA_Z, boiler, feedOne, refreshStack, cocoaMax, cocoaInterval, cupCap, stars, useStock,
      spawnGuest: (kind, path) => GU.spawn(kind, path), later: after, env: () => env, restock: () => { if (cocoa.open) cocoa.cups = Math.min(cocoaMax(), cocoa.cups + 1); } };
    const ACT = R.parts.activities(G2), CITY = R.parts.city(G2);

    // --- ospiti e personale ---------------------------------------------------
    const drinkOpen = () => cocoa.open, snackOpen = () => ACT.snack.open;
    GU = R.parts.guests({ scene, B, hud, A, P, S, L, PL, TX, RES, EX, MT, rooms, mensa, cinema, boiler, guests, recep: RECEP, fly, burst, _v, outfit: OUTFIT, snackE: ACT.SN.e,
      hasEffect, payBonus: gu => ACT.payBonus(gu), payAtReception, fauna: () => fauna, drinkOpen, snackOpen, foodOpen: () => drinkOpen() || snackOpen(),
      exitPoint: gu => gu.seat ? [gu.seat.x, gu.seat.z + 0.6] : gu.chair ? [gu.chair.x, gu.chair.z - 0.7] : [gu.b.x, gu.r.def.z0 + 3.1] });
    const STAFF = R.parts.staff({ T, B, A, P, L, cols, rooms, boiler, guests, res: RES_M, findPath, collide, fly, burst, after, _v, outfit: OUTFIT, RES, hasEffect, chopInterval, feedOne,
      serve: (gu, o) => GU.serve(gu, o), stock: w => w === 'snack' ? (ACT.snack.open ? ACT.snack.n : 0) : (cocoa.open ? cocoa.cups : 0), takeStock: (w, n) => { if (w === 'snack') ACT.snack.n -= n; else cocoa.cups -= n; } });

    // --- piazzole di sblocco --------------------------------------------------
    const PAD_PX = 192, PAD_SIZE = 2.1;
    const padGeo = new T.PlaneGeometry(PAD_SIZE, PAD_SIZE).rotateX(-Math.PI / 2);
    function drawPad(pd, frac) {
      const x = pd.cv.getContext('2d'), W = PAD_PX, mg = 14, r = 38, lw = 14, x0 = mg, y0 = mg, x1 = W - mg, y1 = W - mg;
      const path = () => {
        x.beginPath(); x.moveTo(W / 2, y0); x.lineTo(x1 - r, y0); x.arc(x1 - r, y0 + r, r, -Math.PI / 2, 0); x.lineTo(x1, y1 - r); x.arc(x1 - r, y1 - r, r, 0, Math.PI / 2);
        x.lineTo(x0 + r, y1); x.arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI); x.lineTo(x0, y0 + r); x.arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5); x.lineTo(W / 2, y0);
      };
      x.clearRect(0, 0, W, W);
      x.fillStyle = 'rgba(255,255,255,0.7)'; path(); x.fill();
      x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = 'rgba(31,42,55,0.25)'; path(); x.stroke();
      if (frac > 0.004) {
        const per = 4 * (W - 2 * mg - 2 * r) + 2 * Math.PI * r;
        const g = x.createLinearGradient(0, 0, W, W); g.addColorStop(0, '#ffd23a'); g.addColorStop(1, '#4cd964');
        x.setLineDash([per * Math.min(1, frac), per]); x.strokeStyle = g; path(); x.stroke(); x.setLineDash([]);
      }
      x.font = '60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText('🪙', W / 2, W / 2 + 4);
      pd.tex.needsUpdate = true;
    }
    pads = level.unlocks.map(u => {
      const cv = document.createElement('canvas'); cv.width = cv.height = PAD_PX;
      const tex = new T.CanvasTexture(cv);
      const m = new T.Mesh(padGeo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.position.set(u.pos[0], 0.16, u.pos[1]); m.renderOrder = 2; scene.add(m);
      const el = hud.label('pad', `<b>${u.title}</b><span></span>`);
      const pd = Object.assign({}, u, { x: u.pos[0], z: u.pos[1], m, cv, tex, el, sp: el.querySelector('span'), cd: 0, frac: -1 });
      pd.frac = Math.round(state.paid(u.id) / u.cost * 200) / 200; drawPad(pd, pd.frac);
      return pd;
    });
    function padShown(pd) {
      if (pd.needMensa && !mensa.open) return false;
      if (pd.needWing && wing.rows <= pd.needWing) return false; // serve prima l'ampliamento
      if (pd.needTool && !state.isBought(pd.needTool)) return false; // gli attrezzi stanno sullo stesso riquadro, uno dopo l'altro
      if (pd.effect === 'waiter' && !state.isBought('cocoa')) return false;
      const need = pd.requires && pd.requires.purchases;
      return !need || Object.keys(S.bought).length >= need;
    }
    // Lanterne (lungo la strada) e mascotte: vedi parts/deco.js
    const { buildLamps, updateLamps, buildMascot } = R.parts.deco({ T, scene, B, mats, box, cyl, ball, TH, walkP0, ROAD_W, nearPad: (x, z, r) => PADS.some(p => Math.hypot(p[0] - x, p[1] - z) < r), nearRoad, STAND: { x: 0, z: -99 }, cols, bobbers, makeDuck, env: () => env, player: () => player });
    function refreshTools() { const t = hasEffect('saw') ? 'saw' : 'axe'; B.setTool(player, t); STAFF.tools(t); }
    function applyEffect(pd) {
      if (pd.effect === 'room') openRoom(rooms[pd.room]);
      else if (pd.effect === 'expand') expand(pd.wing);
      else if (pd.effect === 'mensa') openMensa();
      else if (pd.effect === 'cinema') openCinema();
      else if (pd.effect === 'cocoa') openCocoa();
      else if (pd.effect === 'snack') { openMensa(); ACT.openSnack(); }
      else if (pd.effect === 'harvester') RES_M.buy();
      else if (pd.effect === 'helper') STAFF.spawnHelper(pd.room);
      else if (pd.effect === 'waiter') STAFF.spawnWaiter(pd.room);
      else if (pd.effect === 'cleaner') STAFF.spawnCleaner();
      else if (pd.effect === 'saw') refreshTools();
      else if (pd.effect === 'lamps') buildLamps();
      else if (pd.effect === 'mascot') buildMascot(pd);
    }
    function buyPad(pd) {
      if (!pd || state.isBought(pd.id)) return;
      if (pd.needMensa) buyPad(pads.find(p => p.id === 'mensa'));
      if (pd.needWing) buyPad(pads.find(p => p.id === 'wing' + pd.needWing));
      if (pd.needTool) buyPad(pads.find(p => p.id === pd.needTool));
      if (pd.effect === 'waiter') buyPad(pads.find(p => p.id === 'cocoa'));
      S.paid[pd.id] = pd.cost; S.bought[pd.id] = true; applyEffect(pd);
    }
    function satisfy(o) {
      if (!o) return;
      if (o.bought) buyPad(pads.find(p => p.id === o.bought));
      else if (o.stat === 'stars') S.happy = Math.max(S.happy, Math.ceil(o.n / P.star_per_guest));
      else S[o.stat] = Math.max(S[o.stat] || 0, o.n);
    }

    openRoom(rooms[0]);
    if (!WINTER) openMensa(); // la dispensa è in mensa: fuori dall'inverno è aperta da subito
    // Partite iniziate prima degli ampliamenti: le stanze già comprate hanno anche il loro ampliamento.
    for (let k = 2; k < 8; k++) if (S.bought['room' + k]) for (let w = 1; w <= Math.floor(k / 2); w++) S.bought['wing' + w] = true;
    // Partite iniziate prima della mensa: se i banchi erano già comprati, la mensa è data.
    if (['cocoa', 'cocoa2', 'snack', 'waiter', 'waiter2', 'waiter3'].some(id => S.bought[id])) S.bought.mensa = true;
    pads.forEach(pd => { if (state.isBought(pd.id)) applyEffect(pd); });
    env = R.createEnv({ T, TH, A, Q, level, hemi, sun, scene, player, mats, hud });
    fauna = R.createFauna({ T, B, scene, A, Q, level, player, trees: nodes, collide, inLake: (x, z, p) => inLake(x, z, p) || L.built(x, z, 1), inLM, bounds: [bx0, bx1, bz0, bz1] });

    // --- freccia guida e caduta (neve o petali) ------------------------------
    const arrow = new T.Mesh(new T.ConeGeometry(0.35, 0.7, 20), mats.arrow); arrow.rotation.x = Math.PI; scene.add(arrow);
    const guideArrow = new T.Group(), gaMat = new T.MeshPhongMaterial({ color: 0xffd23a, emissive: 0x7a5200, shininess: 40 });
    const gaShaft = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.7, 12).rotateX(Math.PI / 2), gaMat); gaShaft.position.z = -0.25;
    const gaHead = new T.Mesh(new T.ConeGeometry(0.26, 0.55, 14).rotateX(Math.PI / 2), gaMat); gaHead.position.z = 0.35;
    guideArrow.add(gaShaft, gaHead); guideArrow.scale.setScalar(1.3); guideArrow.visible = false; scene.add(guideArrow);
    const leafy = TH.fall === 'leaves', NS = Math.round((snowy ? 500 : leafy ? 110 : 200) * Math.max(0.4, Q.density)), snowPos = new Float32Array(NS * 3), fallSpeed = snowy ? 1.3 : leafy ? 0.9 : 0.7;
    for (let i = 0; i < NS; i++) { snowPos[i * 3] = -20 + Math.random() * 40; snowPos[i * 3 + 1] = Math.random() * 14; snowPos[i * 3 + 2] = -55 + Math.random() * 70; }
    const snowGeo = new T.BufferGeometry(); snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
    const fallPts = new T.Points(snowGeo, new T.PointsMaterial(snowy ? { color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9 } : { color: TH.fallColor || 0xff9ec7, size: leafy ? 0.27 : 0.17, transparent: true, opacity: 0.95 }));
    fallPts.frustumCulled = false; scene.add(fallPts);
    const flies = [];
    if (TH.butterflies) {
      const BCOL = [0xff7ac6, 0xffd23a, 0x4fc3f7, 0xff9a2a, 0xa066ff];
      for (let i = 0; i < 8; i++) {
        const m = new T.Mesh(B.cached('wing', () => new T.PlaneGeometry(0.42, 0.3)), new T.MeshBasicMaterial({ color: BCOL[i % BCOL.length], side: T.DoubleSide }));
        scene.add(m); flies.push({ m, cx: -15 + rnd() * 30, cz: -54 + rnd() * 64, r: 1.5 + rnd() * 3, ph: rnd() * 6.28, sp: 0.35 + rnd() * 0.3 });
      }
    }

    // --- tutorial --------------------------------------------------------------
    const FIRST_LEVEL = level.id === R.order[0];
    if (!FIRST_LEVEL && !R.settings.get('tutorial')) R.settings.set('tutorial', true);
    const tut = { on: !R.settings.get('tutorial') && FIRST_LEVEL && S.done === 0, i: 0, moved: 0, lx: null, lz: null };
    const TSTEPS = [
      ['👆 Trascina il dito sullo schermo per muoverti', () => tut.moved > 3],
      [`${RES.e} Sali nel campo: segui la freccia gialla`, () => S.wood >= 1 || !!nearTree(player.position, P.chop_range)],
      [`${RES.e} Fermati vicino: ${RES.the} si raccoglie da sé`, () => S.wood >= 4],
      [`🔥 Porta ${RES.the} ${RES.toFire}, sul tappeto giallo`, () => S.fed >= 1],
      [`${V.guestEmoji || '🧑'} Arriva un ospite: tieni ${RES.theFire} in funzione`, () => S.guests >= 1 || guests.some(g => g.state === 'bed')],
      ['🧻 I bagni finiscono le scorte: prendile nello sgabuzzino (tappeto blu)', () => carry.soap > 0 || (S.restock || 0) > 0],
      ['🪙 Gli ospiti pagano alla reception: ritira le monete dal bancone, sul tappeto rosso', () => S.collected >= 1],
      ['✨ Spendile nei riquadri a terra: la barra si riempie!', () => Object.keys(S.bought).length >= 1 || S.done >= 5]
    ];
    function endTutorial() { tut.on = false; hud.hint(null); R.settings.set('tutorial', true); }
    function updateTutorial() {
      const p = player.position;
      if (tut.lx != null) tut.moved += Math.hypot(p.x - tut.lx, p.z - tut.lz); tut.lx = p.x; tut.lz = p.z;
      while (tut.on && tut.i < TSTEPS.length && TSTEPS[tut.i][1]()) tut.i++;
      if (tut.on && tut.i >= TSTEPS.length) { endTutorial(); hud.toast('Ora sai tutto: buon divertimento! 🎉'); return; }
      if (tut.on) hud.hint(TSTEPS[tut.i][0], tut.i + 1, TSTEPS.length);
    }
    function tips() {
      if (carry.logs >= logCap() && S.fed === 0 && R.settings.tip('bag')) hud.toast(`🎒 Zaino pieno! Porta ${RES.the} ${RES.toFire}`);
      if (guests.some(g => g.state === 'table' && !g.served) && R.settings.tip('want')) hud.toast(`${TX.want} Portagli l'ordinazione in mensa!`);
      if (cocoa.open && carry.cups === 0 && S.cocoa === 0 && R.settings.tip('stand')) hud.toast(`${V.foodEmoji || '☕'} ${upFirst(V.stand || 'il banco')} è in mensa: avvicinati per prendere`);
    }
    let eventT = 70, hostT = 60;
    function runEvent() {
      const free = rooms.reduce((n, r) => n + (r.open ? r.beds.filter(b => !b.guest).length : 0), 0);
      if (!free) return;
      const kinds = ['vip', 'scout', 'rush'].filter(k => (k !== 'scout' || free >= 2) && (k !== 'rush' || (cocoa.open && mensa.open)));
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      if (k === 'vip') { const vg = GU.spawn('vip'); if (vg) { vg.persona = MT.vipPersona(); hud.toast(`⭐ Arriva ${vg.persona.name} ${vg.persona.e}: paga il triplo!`); } }
      else if (k === 'rush') { if (GU.spawn('rush')) hud.toast(`⏱ Un ${V.guest || 'ospite'} affamato! Servilo presto in mensa: +40 monete`); }
      else { for (let i = 0; i < Math.min(3, free); i++) GU.spawn('scout'); hud.toast('🏕️ Arriva una squadra di scout! Pagano di più'); }
      A.sfx('guest'); fauna.celebrate();
    }

    // --- obiettivi e freccia ------------------------------------------------
    const objTarget = o => o.n || 1;
    const objValue = o => o.bought ? +state.isBought(o.bought) : (o.stat === 'stars' ? stars() : (S[o.stat] || 0));
    while (S.done > 0 && S.done <= 4 && S.done <= objectives.length && !objectives[S.done - 1].bought && objValue(objectives[S.done - 1]) < objTarget(objectives[S.done - 1])) S.done--;
    const emptyBath = () => rooms.filter(r => r.open && (r.soap < 4 || r.paper < 4)).sort((a, b) => (a.soap + a.paper) - (b.soap + b.paper))[0];
    function taskTarget() {
      if (S.done >= objectives.length) return null;
      const o = objectives[S.done], guide = tut.on && tut.i === 5 ? 'bath' : o.guide || '', p = player.position;
      const treeTarget = () => { const t = nearTree(p, 99); return t ? [t.x, t.z] : null; };
      if (guide === 'tree' || guide === 'feed') { if (carry.logs >= (guide === 'tree' ? logCap() : 1)) return L.boiler.feed; return treeTarget(); }
      if (guide === 'pile') return recep.n > 0 ? [RECEP.x, RECEP.z + 1.7] : null;
      if (guide === 'bath') { if (!carry.soap && !carry.paper) return L.closet.pick; const r = emptyBath(); return r ? r.def.restock : null; }
      if (guide === 'machine') return RES_M.machine.driving ? null : L.park;
      if (guide === 'cocoa') {
        if (!carry.cups) return cocoa.open ? cocoa.pick : null;
        const g = guests.find(g => g.state === 'table' && !g.served && g.want !== 'snack'); return g ? [g.seat.x, g.seat.z] : null;
      }
      if (guide.startsWith('pad:')) { const pd = pads.find(p => p.id === guide.slice(4)); return pd ? [pd.x, pd.z] : null; }
      return null;
    }
    function refreshHud() {
      hud.setGems(R.settings.get('gems'));
      hud.setStats(S.coins, stars(), carry.logs, logCap(), carry.cups, cupCap(), cocoa.open);
      hud.setSupplies(carry.soap, carry.paper, supCap());
      if (S.done < objectives.length) {
        const o = objectives[S.done], n = objTarget(o), v = Math.min(n, objValue(o));
        const vt = n > 1 ? `${o.decimals ? v.toFixed(o.decimals) : Math.floor(v)}/${n}` : '';
        hud.setTask(`Obiettivo ${S.done + 1} di ${objectives.length}`, o.text, vt, v / n);
      } else hud.setTask('Livello completato', 'Continua a far crescere il rifugio! 🎉', '', 1);
      const nx = S.done >= objectives.length && level.next ? R.levels[level.next] : null;
      hud.setNext(nx ? `➜ Vai a ${nx.cityEmoji || ''} ${nx.cityName || ''} · ${nx.emoji} ${nx.name}` : null);
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

    function save() { S.recep = recep.n; S.boiler = Math.round(boiler.fuel + boiler.pend); state.save(); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); endJoy(); } });
    addEventListener('pagehide', save);

    // --- ciclo di gioco -----------------------------------------------------
    let perfT = 0, perfSlow = 0;
    let running = false, paused = false, tt = 0, saveT = 0, chopCd = 0, feedCd = 0, cupCd = 0, supCd = 0, hopT = 0, dustT = 0, smokeT = 0;
    function update(dt) {
      const p = player.position, driving = RES_M.machine.driving;
      let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), mz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      if (joy) { mx = joy.dx; mz = joy.dy; }
      const len = Math.hypot(mx, mz), moving = len > 0.15;
      if (moving) { const k = Math.min(1, len) / len; p.x += mx * k * speed() * dt; p.z += mz * k * speed() * dt; player.rotation.y = Math.atan2(mx, mz); }
      B.walk(player, moving, dt);
      if (driving) RES_M.keepInside(p); // il macchinario resta nel recinto ed esce solo dal cancello
      else collide(p);

      let changed = false;
      chopCd -= dt; feedCd -= dt; cupCd -= dt; supCd -= dt;
      const tr = driving ? null : nearTree(p, P.chop_range);
      if (tr && carry.logs < logCap() && chopCd <= 0) {
        const ci = chopInterval(), swingDur = ci * 0.95, delay = swingDur * B.HIT_AT;
        chopCd = ci; chopTree(tr, p.x, p.z, delay); carry.logs++; S.wood++; inLogs++; changed = true; EX.ev('wood');
        if (!moving) player.rotation.y = Math.atan2(tr.x - p.x, tr.z - p.z);
        B.swing(player, swingDur);
        after(delay, () => {
          burst(tr.x, 1.0, tr.z, 5, RES.cols, 2.4, 3.2, 0.5, 0.1); A.sfx(hasEffect('saw') ? 'saw' : 'chop');
          if (R.shop.has('goldtool')) burst(tr.x, 1.2, tr.z, 5, [0xffd23a, 0xfff2a8], 2.6, 3.6, 0.6, 0.09, 4);
          _v.set(tr.x, 1.0, tr.z);
          fly('log', _v, o => stackG.getWorldPosition(o), 0.32, 0.6, () => { inLogs--; refreshStack(); });
        });
      }
      if (!driving) {
        if (recep.n > 0 && Math.hypot(p.x - RECEP.x, p.z - (RECEP.z + 1.7)) < 1.9) collectRecep();
        if (carry.logs > 0 && boiler.fuel + boiler.pend + 1 <= P.fuel_max && feedCd <= 0 && Math.hypot(p.x - L.boiler.feed[0], p.z - L.boiler.feed[1]) < P.feed_range) {
          feedCd = P.feed_interval * 0.7; carry.logs--; changed = true; refreshStack();
          B.toss(player, 0.22); stackG.getWorldPosition(_v); feedOne(_v);
        }
        // sgabuzzino: sapone e carta igienica
        if (supCd <= 0 && Math.hypot(p.x - L.closet.pick[0], p.z - L.closet.pick[1]) < 1.5 && (carry.soap < supCap() || carry.paper < supCap())) {
          supCd = 0.08; if (carry.soap < supCap() && (carry.soap <= carry.paper || carry.paper >= supCap())) carry.soap++; else carry.paper++;
          A.sfx('pickup');
        }
        // bagni: si riforniscono passandoci davanti
        for (const r of rooms) {
          if (!r.open || supCd > 0 || Math.hypot(p.x - r.def.restock[0], p.z - r.def.restock[1]) > 1.5) continue;
          const kind = r.soap < 4 && carry.soap > 0 ? 'soap' : r.paper < 4 && carry.paper > 0 ? 'paper' : null;
          if (!kind) continue;
          supCd = 0.12; carry[kind]--; r[kind]++; S.restock = (S.restock || 0) + 1; EX.ev('restock'); B.toss(player, 0.2); A.sfx('pickup');
          _v.set(p.x, 1.2, p.z); fly('cup', _v, o => o.set(r.def.bath.x, 0.9, r.def.bath.z), 0.3, 0.6);
        }
      }
      if (cocoa.open) {
        cocoa.t += dt; if (cocoa.t > cocoaInterval() && cocoa.cups < cocoaMax() && useStock()) { cocoa.cups++; cocoa.t = 0; }
        if (!driving && cocoa.cups > 0 && carry.cups < cupCap() && cupCd <= 0 && Math.hypot(p.x - cocoa.pick[0], p.z - cocoa.pick[1]) < 1.4) {
          cupCd = 0.22; cocoa.cups--; carry.cups++; inCups++; changed = true; A.sfx('pickup');
          _v.set(-0.45 + Math.min(5, cocoa.cups) * 0.28, 1.3, 0.25); cocoa.g.localToWorld(_v);
          fly('cup', _v, o => stackG.getWorldPosition(o), 0.4, 0.8, () => { inCups--; refreshStack(); });
        }
        cupMeshes.forEach((c, i) => { c.visible = i < cocoa.cups; });
      }
      for (const gu of guests) {
        if (gu.state !== 'table' || gu.served || !gu.seat) continue;
        const key = gu.want === 'snack' ? 'snacks' : 'cups';
        if (carry[key] > 0 && Math.hypot(p.x - gu.seat.x, p.z - gu.seat.z) < 1.5) { carry[key]--; changed = true; refreshStack(); B.toss(player, 0.26); GU.serve(gu, stackG); }
      }
      for (const pd of pads) {
        if (driving || state.isBought(pd.id) || !padShown(pd)) continue;
        if (pd.hold) { if (Math.hypot(p.x - pd.x, p.z - pd.z) > 1.4) pd.hold = false; else continue; } // il prossimo attrezzo si paga solo dopo essere usciti dal riquadro
        pd.cd -= dt;
        if (S.coins > 0 && pd.cd <= 0 && Math.hypot(p.x - pd.x, p.z - pd.z) < 1.0) {
          pd.cd = 0.04;
          const paid = state.paid(pd.id), step = Math.min(S.coins, Math.max(1, Math.ceil(pd.cost / 40)), pd.cost - paid);
          S.coins -= step; S.paid[pd.id] = paid + step;
          if (S.paid[pd.id] >= pd.cost) {
            S.bought[pd.id] = true; applyEffect(pd); pads.forEach(x => { if (x.needTool === pd.id) x.hold = true; }); hud.toast(pd.title + ' sbloccato! ✨'); save(); ring(pd.x, pd.z, 0xffd23a); after(0.18, () => ring(pd.x, pd.z, 0x4cd964)); B.wave(player, 1.4);
            burst(pd.x, 0.8, pd.z, 26, CONFETTI, 4, 7, 1.1, 0.16); hopT = 0.5; A.sfx('buy');
          }
        }
      }
      if (changed) refreshStack();

      boiler.fuel = Math.max(0, boiler.fuel - burnRate() * dt);
      smokeT -= dt;
      if (WINTER && boiler.fuel > 0 && smokeT <= 0) { smokeT = 0.5; burst(boiler.fire.x, 2.6, boiler.fire.z - 1, 1, [0xeef1f5, 0xd5dbe3], 0.2, 0.9, 2, 0.2, -0.25); }
      dustT -= dt;
      if (moving && dustT <= 0) { dustT = 0.17; burst(p.x - Math.sin(player.rotation.y) * 0.18, 0.15, p.z - Math.cos(player.rotation.y) * 0.18, 1, [TH.dust || 0xffffff, 0xffffff], 0.3, 0.7, 0.45, 0.11, 2.5); }
      RES_M.update(dt);
      if (tut.on && S.won) endTutorial();
      if (tut.on) updateTutorial(); else tips();
      eventT -= dt; if (S.done >= 3 && S.fed > 0 && eventT <= 0) { eventT = 75 + Math.random() * 60; runEvent(); }
      hostT -= dt;
      if (PL.host && S.done >= 2 && S.fed > 0 && hostT <= 0) {
        const hg = GU.spawn('host');
        if (hg) { hostT = 110 + Math.random() * 70; hg.host = PL.host; hud.toast(`${PL.host.e} Arriva ${PL.host.name}: ospite speciale, paga il quadruplo!`); A.sfx('guest'); fauna.celebrate(); } else hostT = 20;
      }
      GU.update(dt);
      ACT.update(dt); CITY.update(dt);
      STAFF.update(dt);

      while (S.done < objectives.length && objValue(objectives[S.done]) >= objTarget(objectives[S.done])) {
        const rw = objectives[S.done].reward || 10;
        S.done++; S.coins += rw; hud.toast(`Obiettivo completato! +${rw} monete 🎉`); save(); fauna.celebrate(); EX.ev('goal'); B.wave(player, 1.2);
        burst(p.x, 1.6, p.z, 34, CONFETTI, 4.5, 8, 1.2, 0.17); hopT = 0.5; A.sfx('goal');
      }
      if (S.done >= objectives.length && !S.won) {
        S.won = true; R.settings.addGems(4); hud.toast('Stagione completata! +4 gemme 💎'); MT.stamp(level.id); save(); EX.ev('win');
        fireworks(p.x, p.z, CONFETTI); A.sfx('goal'); B.wave(player, 2.4);
        after(2.8, () => { running = false; endJoy(); hud.showWin(TX.winTitle, TX.winText(S), TX.winNext, level.next); });
      }
      saveT += dt; if (saveT > 2) { saveT = 0; save(); }
    }

    const camGoal = new T.Vector3(), sunDir = new T.Vector3(), sunX = new T.Vector3(), sunY = new T.Vector3(), sunT = new T.Vector3();
    function anim(dt) {
      tt += dt; const p = player.position;
      boiler.flare = Math.max(0, boiler.flare - dt * 3);
      const lit = WINTER && boiler.fuel > 0, s = lit ? 0.5 + boiler.fuel / P.fuel_max * 0.8 + boiler.flare * 0.35 : 0, night = env ? env.night : 0;
      BLD.glass.color.setRGB(0.75 + 0.25 * night, 0.9 - 0.1 * night, 1 - 0.62 * night); // vetri: azzurri di giorno, caldi la sera
      BLD.flame.visible = lit; BLD.flame.scale.set(s, s * (1 + 0.18 * Math.sin(tt * 13)), s);
      fireLight.intensity = lit ? (0.7 + 0.15 * Math.sin(tt * 17) + boiler.flare * 0.8) * (1 - night * 0.35) : 0;
      boiler.glow.visible = lit; if (lit) { const gs = 1.6 + s * 1.4; boiler.glow.scale.set(gs, gs, 1); boiler.glow.material.opacity = 0.3 + night * 0.3 + boiler.flare * 0.3; }
      if (cinema.screen) cinema.screen.material.color.setHSL((tt * 0.07) % 1, 0.6, 0.62 + 0.1 * Math.sin(tt * 9));
      if (recep.glow) { recep.glow.visible = recep.n > 0; if (recep.n > 0) { const gs = 1.0 + 0.2 * Math.sin(tt * 5); recep.glow.scale.set(gs, gs, 1); recep.glow.material.opacity = 0.5 + 0.2 * Math.sin(tt * 5); } }
      if (recep.who) {
        const near = Math.hypot(p.x - RECEP.x, p.z - RECEP.z) < 9;
        const want = near ? Math.max(-1.1, Math.min(1.1, Math.atan2(p.x - (RECEP.x + 0.3), p.z - (RECEP.z - 0.85)))) : Math.sin(tt * 0.7) * 0.12;
        recep.who.rotation.y += (want - recep.who.rotation.y) * Math.min(1, dt * 6);
        recep.hop = Math.max(0, recep.hop - dt); recep.who.position.y = recep.hop > 0 ? Math.sin(Math.PI * (1 - recep.hop / 0.5)) * 0.22 : 0;
      }
      for (const t of nodes) RES_M.fade(t, p, dt);
      pads.forEach(pd => {
        pd.m.visible = !state.isBought(pd.id) && padShown(pd);
        if (!pd.m.visible) return;
        const f = Math.round(state.paid(pd.id) / pd.cost * 200) / 200;
        if (f !== pd.frac) { pd.frac = f; drawPad(pd, f); }
        pd.m.scale.setScalar(1 + 0.03 * Math.sin(tt * 4));
      });
      const tg = running ? taskTarget() : null;
      arrow.visible = !!tg && Math.hypot(tg[0] - p.x, tg[1] - p.z) > 1.4;
      if (tut.on && tg) {
        const gx = tg[0] - p.x, gz = tg[1] - p.z, gl = Math.hypot(gx, gz);
        if (gl > 2.5) { guideArrow.visible = true; guideArrow.position.set(p.x + gx / gl * 2.3, 1.05 + Math.sin(tt * 5) * 0.08, p.z + gz / gl * 2.3); guideArrow.rotation.y = Math.atan2(gx, gz); } else guideArrow.visible = false;
      } else guideArrow.visible = false;
      arrow.scale.setScalar(tut.on ? 2.4 : 1.6);
      if (tg) { arrow.position.set(tg[0], (tut.on ? 3.8 : 3.2) + Math.sin(tt * 4) * 0.3, tg[1]); arrow.rotation.y = tt * 2; }
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
      for (const d of ducks) { d.a += dt * d.sp; d.g.position.set(lake.x + Math.cos(d.a) * d.rr, 0.02 + Math.sin(tt * 2 + d.a * 3) * 0.03, lake.z + Math.sin(d.a) * d.rr); d.g.rotation.y = -d.a + (d.sp > 0 ? 0 : Math.PI); }
      for (const fnA of lmAnim) fnA(dt);
      for (const rp of ripples) { const k = (tt * 0.3 + rp.ph) % 1; rp.m.scale.setScalar(0.6 + k * 2.2); rp.m.material.opacity = 0.5 * (1 - k) * Math.min(1, k * 6); }
      for (const b of bobbers) { const base = b.base == null ? 0.05 : b.base, amp = b.amp == null ? 0.05 : b.amp; b.g.position.y = base + Math.sin(tt * 1.6 + b.ph) * amp; }
      updateLamps();
      const asp = innerWidth / innerHeight, k = asp < 0.8 ? 1.85 : asp < 1.2 ? 1.3 : 1.05;
      camGoal.set(p.x, 15 * k, p.z + 12 * k); // l'omino resta sempre al centro, anche ai bordi della mappa
      cam.position.lerp(camGoal, Math.min(1, dt * 5));
      cam.lookAt(cam.position.x, 0, cam.position.z - 12 * k - 1);
      sunDir.set(-10, 22, 8).normalize(); sunX.set(0, 1, 0).cross(sunDir).normalize(); sunY.copy(sunDir).cross(sunX);
      const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
      sunT.set(p.x, 0, p.z);
      const sx = Math.round(sunT.dot(sunX) / texel) * texel - sunT.dot(sunX), sy = Math.round(sunT.dot(sunY) / texel) * texel - sunT.dot(sunY);
      sunT.addScaledVector(sunX, sx).addScaledVector(sunY, sy);
      sun.target.position.copy(sunT); sun.position.set(sunT.x - 10, 22, sunT.z + 8);
      sun.target.updateMatrixWorld();
    }

    let albumT = 0;
    function overlays(dt) {
      albumT -= dt;
      if (albumT <= 0 && env && running) {
        albumT = 3; const ei = env.info();
        if (ei.weather && ei.weather !== 'clear') MT.see('w_' + ei.weather);
        if (ei.night > 0.7) MT.see('n_night');
      }
      if (recep.shown !== recep.n) { recep.shown = recep.n; recep.el.textContent = recep.n > 0 ? '💰 ' + recep.n : ''; }
      hud.put(recep.el, RECEP.x + 0.95, 2.1, RECEP.z + 0.1, recep.n > 0);
      hud.put(boiler.el, boiler.fire.x, WINTER ? 3.0 : 2.3, boiler.fire.z - 0.8, true);
      const w = (boiler.fuel / P.fuel_max * 100).toFixed(1) + '%'; if (boiler.bar._w !== w) { boiler.bar._w = w; boiler.bar.style.width = w; }
      pads.forEach(pd => {
        const v = pd.m.visible;
        if (v) { const t = (pd.cost - state.paid(pd.id)) + ' monete'; if (pd.sp._t !== t) { pd.sp._t = t; pd.sp.textContent = t; } }
        hud.put(pd.el, pd.x, 0.5, pd.z - 0.2, v && Math.hypot(pd.x - player.position.x, pd.z - player.position.z) < 9);
      });
      for (const r of rooms) {
        if (!r.bathEl) r.bathEl = hud.label('pill', '');
        const t = r.open ? (r.soap < 2 ? '🧼' : '') + (r.paper < 2 ? '🧻' : '') : '';
        if (r.bathEl.textContent !== t) r.bathEl.textContent = t;
        hud.put(r.bathEl, r.def.bath.x, 1.6, r.def.bath.z, !!t);
      }
      GU.overlays(); RES_M.overlays(); ACT.overlays(); CITY.overlays(); MINIMAP(dt);
      hud.updateFloats(dt);
    }

    const MINIMAP = R.parts.minimap({ L, wing, winter: WINTER, player, rooms, guests, boiler, mensa, cinema, recep: () => ({ x: RECEP.x, z: RECEP.z, n: recep.n }),
      stands: () => (cocoa.open ? [L.stands.cocoa] : []).concat(ACT.snack.open ? [L.stands.snack] : []),
      pads: () => pads.filter(pd => !state.isBought(pd.id) && padShown(pd) && S.coins >= pd.cost - state.paid(pd.id)).map(pd => [pd.x, pd.z]),
      spots: () => ACT.spots().concat(CITY.spots()) });
    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    cam.position.set(0, 18, player.position.z + 14);
    let last = performance.now();
    function frame(now) {
      const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
      if (running && !paused && raw < 0.5) {
        perfT += raw; if (raw > 0.04) perfSlow += raw;
        const minRatio = Q.ratio >= 3 ? 1.75 : 1; // in Alta non si scende sotto 1,75 per non sgranare
        if (perfT >= 8 && perfSlow / perfT > 0.6 && pixelRatio > minRatio + 0.05) { pixelRatio = Math.max(minRatio, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); }
        if (perfT >= 8) { if (perfSlow / perfT > 0.6 && R.settings.get('quality') !== 'low' && R.settings.tip('perf')) hud.toast('🐢 Il gioco va a scatti? Prova la qualità Media o Bassa: menu ☰ → Impostazioni'); perfT = 0; perfSlow = 0; }
      }
      if (fpsOn) { fpsN++; fpsT += raw; if (fpsT >= 0.5) { fpsEl.textContent = Math.round(fpsN / fpsT) + ' fps'; fpsN = 0; fpsT = 0; } }
      if (running && !paused) { update(dt); tickLater(dt); updateFlyers(dt); updateAll(dt); env.update(dt); fauna.update(dt); }
      anim(dt); renderer.shadowMap.needsUpdate = (shadowN++ & 1) === 0; renderer.render(scene, cam); overlays(dt); refreshHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      start() {
        running = true;
        MT.see('s_' + level.season); const pk = R.settings.get('pet'); if (pk === 'dog' || pk === 'cat') MT.see('p_' + pk);
        const ev = MT.eventNow();
        if (ev) { MT.see('e_event'); hud.toast(`${ev.e} ${ev.name}: ${ev.text}`); }
        else if (S.done > 0) hud.toast(`${level.cityEmoji || ''} ${level.cityName || ''} · ${level.emoji} ${level.name}`);
      },
      resume() { running = true; },
      seasonNote,
      applyLook, applyDeco, setPet(kind) { fauna.setPet(kind); },
      addCoins(n) { S.coins += n; },
      furnish(i, id) { const r = ACT.furnish(i, id); if (r === 'ok') save(); return r; }, furnHtml: () => ACT.furnHtml(),
      photo() { renderer.render(scene, cam); return EX.photo(renderer.domElement, `${level.cityEmoji || ''} ${level.cityName || ''} · ${level.emoji} ${level.name}`); },
      pause(on) { paused = !!on; if (on) { endJoy(); save(); } },
      save,
      debug: {
        player, S, carry, trees: nodes, rooms, helpers: STAFF.helpers, waiters: STAFF.waiters, guests, cleaner: STAFF.cleaner, cocoa, pads, padShown, wing, openRoom, openCocoa, boiler, mensa, cinema, L, machine: RES_M.machine,
        spawnHelper: STAFF.spawnHelper, spawnWaiter: STAFF.spawnWaiter, spawnGuest: GU.spawn,
        tp(x, z) { player.position.x = x; player.position.z = z; },
        coins(n) { S.coins += n; },
        go(where) {
          if (where === 'casetta') this.tp(0, -15);
          else if (where === 'banco') this.tp(cocoa.pick[0], cocoa.pick[1]);
          else if (where === 'sentiero') this.tp(0, L.roadZ);
          else if (where === 'bosco') this.tp(0, -42);
          else if (where === 'lago' && lake) this.tp(-16, lake.z);
        },
        skip(n) { for (let k = 0; k < (n || 1); k++) satisfy(objectives[S.done + k]); },
        finishLevel() { objectives.slice(S.done).forEach(satisfy); },
        unlockAll() { pads.forEach(buyPad); },
        callGuest() { if (!S.fed) S.fed = 1; GU.spawn(); },
        fillFuel() { boiler.fuel = P.fuel_max; rooms.forEach(r => { r.soap = r.paper = 4; }); },
        fillBag() { carry.logs = logCap(); carry.cups = cupCap(); carry.soap = carry.paper = supCap(); refreshStack(); },
        fillStand() { if (cocoa.open) cocoa.cups = cocoaMax(); },
        hireAll() { pads.forEach(pd => { if (pd.effect === 'helper' || pd.effect === 'waiter' || pd.effect === 'cleaner') buyPad(pd); }); },
        fast(on) { speedMul = on ? 2 : 1; },
        showFps(on) { fpsOn = !!on; if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.style.cssText = 'position:fixed;left:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font:12px monospace;padding:3px 6px;border-radius:6px;z-index:50'; document.body.appendChild(fpsEl); } fpsEl.hidden = !on; },
        weather(k) { env.setWeather(k); }, time(n) { env.setTime(n); }, autoEnv() { env.release(); env.setWeather('auto'); },
        event(k) { if (!S.fed) S.fed = 1; if (k === 'scout') for (let i = 0; i < 3; i++) GU.spawn('scout'); else GU.spawn(k); },
        gems(n) { R.settings.addGems(n); },
        // per le prove: fa avanzare il gioco di "sec" secondi senza disegnare
        sim(sec) { for (let i = 0; i < sec * 20; i++) { update(0.05); tickLater(0.05); updateFlyers(0.05); updateAll(0.05); } },
        scene, renderer, act: ACT, city: CITY,
        perf() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, lights: scene.children.filter(o => o.isLight).length, shadow: renderer.shadowMap.enabled, ratio: renderer.getPixelRatio(), objs: scene.children.length }; },
        info() { return { fast: speedMul > 1, fps: fpsOn, done: S.done, total: objectives.length, env: env.info(), critters: fauna.count() }; }
      }
    };
  };
})(window.Rifugio);
