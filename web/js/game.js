// Livello in gioco: costruisce la scena 3D e fa girare il ciclo (taglio, camini, ospiti, bevande, sblocchi, obiettivi).
// L'aspetto (colori, alberi, lago, fiori) e i numeri vengono dal livello (js/levels/*.js).
(function (R) {
  'use strict';

  // Il banco delle bevande sta davanti alle camere, rivolto verso il giocatore (sud); un camminamento gli passa davanti e si prende da lì.
  const STAND = { x: 3, z: 0.2 };
  const FEED_Z = -7.6, PILE_Z = -3.2, COCOA_PICK = [STAND.x, STAND.z + 1.3];
  const RECEP = { x: -5.35, z: -6.8 }; // reception: bancone con la receptionist; gli ospiti che partono pagano qui, l'omino riscuote davanti
  const COATS = [0x4f8cff, 0xa066ff, 0xff9a2a, 0x2ec4b6, 0xff5d8f, 0x6bcf3a];
  const CONFETTI = [0xff4d4d, 0xffd23a, 0x3d8bff, 0x4cd964, 0xff7ac6, 0xa066ff];
  const SHORTS = [0x3b6fd4, 0xe8c66a, 0xf2f2f2, 0x2ec4b6, 0xff8a65];

  R.createGame = function ({ hud, level, state, audio }) {
    const T = THREE, P = level.tuning, S = state.data, objectives = level.objectives, TH = level.theme, TX = level.text;
    // Personalità del posto (città + stagione): disposizione, colori, vestiario, strutture e ospite speciale (vedi levels/places.js).
    const PL = level.place || { layout: { stand: 3, recep: 'left' }, coats: [], hats: [], structs: [], host: null };
    STAND.x = PL.layout.stand; COCOA_PICK[0] = STAND.x; COCOA_PICK[1] = STAND.z + 1.3;
    const EX = R.extras; EX.bind(hud);
    const MT = R.meta; MT.bind(hud); // premi, figurine, eventi di stagione, decorazioni
    const seasonNote = EX.applySeason(P, level); // ogni stagione cambia un po' il modo di giocare
    const A = audio || { sfx() {} }; // suoni (se manca l'audio il gioco funziona lo stesso)
    const OUTFIT = TH.outfit || 'winter'; // guardaroba degli omini: 'winter', 'spring' o 'summer'
    const V = level.voc || {}; // parole della tappa (albero, camino o barbecue, ospite, area, bevanda…): i testi si adattano a stagione e luogo
    const upFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

    // --- motore -------------------------------------------------------------
    // Qualità grafica scelta nel menu (Alta, Media, Bassa): risoluzione, antialiasing, ombre e quantità di decorazioni.
    // Alta e Media usano l'antialiasing (bordi lisci) e una risoluzione fino a 2x / 1,5x; se il telefono fatica la risoluzione scende da sola, a piccoli passi.
    const Q = R.settings ? R.settings.quality() : { ratio: 2, aa: true, shadows: 'pcf', map: 1024, density: 1 };
    const renderer = new T.WebGLRenderer({ antialias: !!Q.aa, powerPreference: 'high-performance' });
    let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.ratio);
    renderer.setPixelRatio(pixelRatio);
    let shadowN = 0; renderer.shadowMap.autoUpdate = false;
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
    // Ogni città ha il suo ambiente: Valle = cappella tra i monti, Borgo dei Mulini = campi coltivati e un canale, Porto = mare con molo e barche.
    // Qui si dicono le zone "occupate" (acqua, campi, cappella): alberi, decorazioni e strutture le evitano come il lago.
    const CITYID = level.cityId || 'valle', SEASON_ID = level.season;
    const SEA_Z = CITYID === 'porto' ? 16.5 : null;
    const FARMS = CITYID === 'mulini' ? [[18, 3.5, 10, 5.5], [18, 10, 10, 5.5], [-28, 17.2, 17, 4.2]] : []; // campi: x, z, larghezza, profondità
    const CANAL = CITYID === 'mulini' ? [22.8, 24.8] : null;
    const CHAPEL = CITYID === 'valle' ? { x: 22, z: -8 } : null;
    const inLake = (x, z, pad) => {
      pad = pad || 0;
      return (!!lake && Math.hypot(x - lake.x, z - lake.z) < lake.r + pad) || (SEA_Z != null && z > SEA_Z - pad) || (!!CANAL && z > CANAL[0] - pad && z < CANAL[1] + pad) ||
        FARMS.some(f => x > f[0] - pad && x < f[0] + f[2] + pad && z > f[1] - pad && z < f[1] + f[3] + pad) || (!!CHAPEL && Math.hypot(x - CHAPEL.x, z - CHAPEL.z) < 3.2 + pad);
    };
    // Monumento della città (mulino o faro): occupa un angolo della mappa, senza alberi né decorazioni intorno.
    const LM = level.landmark === 'windmill' ? { x: 23.5, z: -11.5, r: 4.4 } : level.landmark === 'lighthouse' ? { x: -25, z: -12.5, r: 3.8 } : null;
    const inLM = (x, z, pad) => !!LM && Math.hypot(x - LM.x, z - LM.z) < LM.r + (pad || 0);
    // I punti upgrade (riquadri a terra) non devono finire sotto la neve, un sasso o un albero: attorno a loro niente decorazioni.
    const PADS = (level.unlocks || []).map(u => u.pos);
    PADS.push(...(R.parts.city.RESERVE[level.cityId || 'valle'] || [])); // spazio per l'attivita' della citta'
    const nearPad = (x, z, r) => PADS.some(p => Math.hypot(p[0] - x, p[1] - z) < r);
    const snowy = TH.fall === 'snow'; // d'inverno: neve che cade, sassi e cespugli innevati

    // --- paesaggio ----------------------------------------------------------
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), mats.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // Sentieri: piani con la texture della ghiaia (inverno) o della sabbia (estate), a quote leggermente diverse
    // (altrimenti le facce piatte coincidono e lampeggiano, z-fighting) e senza ombre proprie.
    mats.path.polygonOffset = true; mats.path.polygonOffsetFactor = -1; mats.path.polygonOffsetUnits = -1;
    // Ogni sentiero è un nastro che segue una curva morbida (spline), con le estremità arrotondate, la larghezza che respira appena
    // e due bordi sfumati (strisce più larghe e trasparenti sotto) più qualche sassolino ai lati: niente più rettangoli con angoli netti.
    const edgeMat = (o, f) => { const m = new T.MeshPhongMaterial({ color: new T.Color(TH.ground).lerp(new T.Color(TH.path || 0x888888), f), transparent: true, opacity: o, depthWrite: false, shininess: 0 }); m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; return m; };
    // Ogni tappa (città + stagione) ha le sue strade: larghezza, ondulazione, numero di strade d'ingresso, bordi e sassolini cambiano.
    const rh = EX.hash(String(level.id) + String(level.cityId || level.cityName || ''));
    const ROAD_W = [1.4, 1.6, 1.8, 2.0][rh % 4], WAVE = 0.4 + ((rh >> 3) % 5) * 0.25, PEB = ['none', 'sparse', 'dense'][(rh >> 9) % 3];
    const wv = k => Math.sin(k * 1.9 + (rh % 89)) * WAVE;   // ondulazione dolce e regolare
    const EDGES = (rh >> 5) % 2 ? [[0.62, 0.3, 0.012], [0.5, 0.55, 0.016]] : [[0.55, 0.4, 0.012]];
    const pebbles = [];
    function pathRibbon(pts, w, y, mat, uvScale, extra, wobble) {
      const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], 0, p[1])), false, 'centripetal');
      const len = curve.getLength(), n = Math.max(8, Math.ceil(len / 0.35)), P0 = curve.getSpacedPoints(n);
      const pos = [], uv = [], idx = [], cap = 0.7;
      for (let i = 0; i <= n; i++) {
        const a = P0[Math.max(0, i - 1)], b = P0[Math.min(n, i + 1)], tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
        const nx = -tz / tl, nz = tx / tl, s = i / n * len, e = Math.min(s, len - s);
        const taper = e < cap ? Math.sqrt(Math.max(0.02, 1 - Math.pow(1 - e / cap, 2))) : 1; // estremità tonde
        const hw = (w / 2 + extra) * taper * (1 + (wobble ? 0.07 * Math.sin(s * 1.7 + pts[0][0]) : 0));
        pos.push(P0[i].x + nx * hw, y, P0[i].z + nz * hw, P0[i].x - nx * hw, y, P0[i].z - nz * hw);
        // texture in coordinate del mondo: la ghiaia è continua anche dove due strade si incontrano (niente cuciture)
        uv.push((P0[i].x + nx * hw) / uvScale, (P0[i].z + nz * hw) / uvScale, (P0[i].x - nx * hw) / uvScale, (P0[i].z - nz * hw) / uvScale);
        if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      for (let i = 0; i < geo.attributes.normal.count; i++) geo.attributes.normal.setXYZ(i, 0, 1, 0);
      const m = new T.Mesh(geo, mat); m.receiveShadow = true; scene.add(m);
      return { P0, len };
    }
    function pathPlane(pts, w) { // strada di larghezza costante (uniforme), bordi sfumati e, secondo il luogo, sassolini regolari
      EDGES.forEach(([o, f, y], k) => pathRibbon(pts, w, y, edgeMat(o, f), 2.4, 0.5 - k * 0.22, false));
      const r = pathRibbon(pts, w, 0.026, mats.path, 2.4, 0, false);
      const pc = (TH.pathTex && TH.pathTex.cols) || ['#8c8b87'], step = PEB === 'dense' ? 3 : 7;
      if (PEB !== 'none') for (let i = 3, k = 0; i < r.P0.length - 3; i += step, k++) {
        const a = r.P0[i - 1], b = r.P0[i + 1], tl = Math.hypot(b.x - a.x, b.z - a.z) || 1, side = k % 2 ? 1 : -1, off = (w / 2 + 0.45) * side;
        pebbles.push({ geo: pebbleGeo, x: r.P0[i].x - (b.z - a.z) / tl * off, y: 0.04, z: r.P0[i].z + (b.x - a.x) / tl * off, s: [0.13, 0.08, 0.13], ry: k, color: new T.Color(pc[k % pc.length]).getHex() });
      }
      r.P0.forEach((p, i) => { if (i % 6 === 0) roadPts.push([p.x, p.z]); });
      return r.P0;
    }
    const roadPts = [];
    // True se il punto è vicino a una strada: lì niente cumuli di neve, sassi, alberi, pupazzi, decorazioni o lanterne.
    const nearRoad = (x, z, r) => { for (const p of roadPts) if (Math.hypot(p[0] - x, p[1] - z) < r) return true; return false; };
    const pebbleGeo = new T.SphereGeometry(1, 6, 4);
    const sampleRoad = (P0, step) => P0.filter((_, i) => i % step === 0 || i === P0.length - 1).map(p => [p.x, p.z]);
    // Passeggiata davanti alle camere: da lì i clienti escono verso est, fino al bordo della mappa.
    const WALK = [[-13.5, -2.9], [-7, -2.9 + wv(1) * 0.3], [0, -2.9 + wv(2) * 0.3], [7, -2.8 + wv(3) * 0.25], [13, -2.5 + wv(4) * 0.3], [19, -1.2 + wv(5) * 0.4], [25, 0.6 + wv(6) * 0.3], [32, 1.4]];
    const walkP0 = pathPlane(WALK, ROAD_W), exitRoad = sampleRoad(walkP0, 8);
    // Camminamento del banco: si stacca dalla passeggiata a ovest, passa davanti al banco delle bevande e torna sulla passeggiata a est.
    // Le estremità entrano nella passeggiata nella stessa direzione, così le due strade si fondono senza spigoli.
    // Il camminamento segue il banco (che cambia posto da città a città): i punti sono relativi alla sua posizione.
    const walkZ = x => { let b = walkP0[0], bd = 1e9; for (const p of walkP0) { const d = Math.abs(p.x - x); if (d < bd) { bd = d; b = p; } } return b.z; };
    const sx = STAND.x;
    pathPlane([[sx - 11.4, walkZ(sx - 11.4)], [sx - 9.4, walkZ(sx - 9.4)], [sx - 8, -1.5], [sx - 6.6, 0.7], [sx - 4.6, 2.2], [sx - 2, 2.7 + wv(11) * 0.15], [sx + 1.5, 2.7], [sx + 4.4, 2.5 + wv(12) * 0.15], [sx + 7, 1.6], [sx + 9, -0.2], [sx + 10.6, walkZ(sx + 10.6) + 0.5], [sx + 12.6, walkZ(sx + 12.6)]], ROAD_W);
    // Strade d'ingresso: arrivano dal bordo ovest della mappa, ognuna da una parte diversa (due o tre, attorno al lago se c'è).
    const inRoads = [];
    const addIn = pts => { inRoads.push(sampleRoad(pathPlane(pts, ROAD_W), 9)); };
    addIn([[-32, -6], [-26, -5.6 + wv(7) * 0.5], [-20, -4.4 + wv(8) * 0.5], [-16, -3.3], [-13.5, -2.9], [-11.5, -2.9]]);
    addIn([[-32, 15], [-25, 14], [-17, 11 + wv(9) * 0.4], [-14, 5], [-13, 0.4], [-12.6, -1.8], [-11.2, -2.85], [-9.5, -2.9]]);
    if (!lake && !LM && (rh >> 7) % 2) addIn([[-32, -11], [-26, -9.6 + wv(10) * 0.4], [-20, -8.2], [-15.5, -6.4], [-13.4, -4.3], [-12.2, -3.1], [-10.5, -2.9]]);
    if (pebbles.length) scene.add(new T.Mesh(B.mergeParts(pebbles), mats.accent));

    // Bordi, decorazioni sparse e monumento: vedi parts/landscape.js
    const bx0 = P.world_min[0], bx1 = P.world_max[0], bz0 = P.world_min[1], bz1 = P.world_max[1];
    const { lmAnim } = R.parts.landscape({ T, scene, B, mats, box, cyl, ball, add, TH, P, Q, level, rnd, cols, SEA_Z, LM, ROAD_W, nearPad, nearRoad, inLake, inLM, snowy });
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
      const half = 0.2 * sc; // tronco: più stretto (prima 0.3) così fra due alberi si passa sempre
      trees.push({
        g, fall, stump, mats: tm, x, z, sc, logs: P.logs_per_tree, regrow: 0,
        state: 'up',            // 'up' in piedi, 'falling' cade, 'down' a terra (poi sparisce)
        ang: 0, vel: 0,         // inclinazione attuale (radianti) e sua velocità
        axis: new T.Vector3(1, 0, 0), hits: [], downT: 0,
        fade: 1, opacity: 1     // trasparenza quando copre il personaggio
      });
      const col = [x - half, x + half, z - half, z + half];
      trees[trees.length - 1].col = col; trees[trees.length - 1].half = half;
      cols.push(col);
    }
    // Ostacolo dell'albero: solo il tronco in piedi. Tagliato (tronco caduto o ceppo) non blocca mai.
    function setTreeCol(t, felled) {
      const h = t.half, c = t.col;
      if (felled) { c[0] = c[1] = c[2] = c[3] = 1e6; return; } // albero tagliato: nessun ostacolo
      c[0] = t.x - h; c[1] = t.x + h; c[2] = t.z - h; c[3] = t.z + h;
    }
    let tries = 0, near = 0;
    while (near < P.trees && tries < 800) {
      tries++;
      const x = -12 + rnd() * 24, z = 5 + rnd() * 8;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.5) || inLake(x, z, 1.5) || inLM(x, z, 1) || nearPad(x, z, 2.6) || nearRoad(x, z, ROAD_W / 2 + 1.3)) continue;
      plantTree(x, z, 1); near++;
    }
    for (let i = 0, planted = 0; i < P.forest_trees * 16 && planted < P.forest_trees; i++) {
      const x = bx0 + rnd() * (bx1 - bx0), z = bz0 + rnd() * (bz1 - bz0), sc = 0.8 + rnd() * 0.7;
      if (x > -16 && x < 18 && z > -11 && z < 15) continue;
      if (inLake(x, z, 2) || inLM(x, z, 1.5)) continue;
      if (x > RECEP.x - 3.5 && x < RECEP.x + 3.5 && z > RECEP.z - 6 && z < RECEP.z + 4) continue; // spazio per la reception
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.9)) continue; // lascia sempre un passaggio fra gli alberi
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
      if (t.logs <= 0) { t.regrow = P.tree_regrow; S.trees = (S.trees || 0) + 1; setTreeCol(t, true); }
    }
    // Ricrescita (logica di gioco): il nuovo albero spunta piccolo e cresce.
    function regrowTrees(dt) {
      for (const t of trees) {
        if (t.logs > 0) continue;
        t.regrow -= dt;
        if (t.regrow <= 0) {
          Object.assign(t, { logs: P.logs_per_tree, state: 'up', ang: 0, vel: 0, hits: [], downT: 0 });
          t.fall.quaternion.identity(); t.fall.visible = true; t.fall.scale.setScalar(0.2); t.stump.visible = false; setTreeCol(t, false);
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
        if (t.downT > 1.8) { t.fall.visible = false; t.stump.visible = false; } // il ceppo sparisce finché l'albero non ricresce
      }
      if (t.ang !== 0 || t.state !== 'up') t.fall.quaternion.setFromAxisAngle(t.axis, t.ang);
      if (t.fall.scale.x < 1) t.fall.scale.setScalar(Math.min(1, t.fall.scale.x + dt * 1.5));
    }
    // Gli alberi vicini al personaggio o fra lui e la camera diventano semitrasparenti, così lui resta sempre visibile.
    function fadeTree(t, p, dt) {
      const dx = t.x - p.x, dz = t.z - p.z;
      const covers = dz > -0.5 && dz < 4.2 && Math.abs(dx) < 0.8 + 0.45 * t.sc; // la camera guarda da sud (+z): solo gli alberi davanti all'omino
      const target = covers || Math.hypot(dx, dz) < 1.5 ? 0.35 : 1;
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

    // Effetti (oggetti volanti, particelle, tempi): vedi parts/fx.js
    const { _v, _w, after, fly, updateFlyers, burst, updateParts, tickLater } = R.parts.fx({ T, scene, B, mats });


    // --- stanze -------------------------------------------------------------
    // Ogni stanza è larga RW e le stanze vicine si toccano: quando sono aperte entrambe la parete in comune sparisce
    // e diventano un unico ambiente.
    const RW = 6;
    // Due stili: 'cabin' (baita con muri, camino e letti, per l'inverno) e 'lido' (postazione sul lago con ombrellone,
    // lettini e barbecue, senza muri: bassi parapetti bianchi e una staccionata di bambù). Cambiano solo l'aspetto: ostacoli e regole sono gli stessi.
    const lido = TH.room === 'lido';
    const hedge = !!TH.fence, bambooM = B.tint(TH.fence || 0xd9b36c), railM = B.tint(0xf4f1e6), TOWELS = [0xff6b6b, 0x4fa3ff, 0xffd23a, 0x4cd964, 0xff9a2a, 0xc084fc];
    const wallM = PL.walls != null ? B.tint(PL.walls) : mats.wood, trimM = PL.trim != null ? B.tint(PL.trim) : mats.plank, awnM = B.tint(PL.awning != null ? PL.awning : 0xd94f3d);
    // Stile della baita per città: 'alpine' (Valle: tronchi, tetto spiovente, persiane), 'dutch' (Mulini: mattoni, facciata a gradoni, fioriere),
    // 'harbor' (Porto: pareti bianche con fascia blu, salvagente, bandiera). Cambiano pavimento, tappeto, camino e decorazioni.
    const STYLE = PL.style || 'alpine';
    const floorM = PL.floor != null ? B.tint(PL.floor) : mats.plank, rugM = PL.rug != null ? B.tint(PL.rug) : mats.red, fireM = PL.fire != null ? B.tint(PL.fire) : mats.stone;
    const fenceM = STYLE === 'dutch' ? B.tint(0xb8523a) : STYLE === 'harbor' ? B.tint(0xf4f1e6) : bambooM, umbCols = PL.umb || TH.umbrellaCols || [0xff4d4d, 0x3d8bff, 0xffd23a];
    const rooms = level.rooms.map((def, i) => {
      const cx = def.x, g = new T.Group(); scene.add(g);
      box(RW, 0.2, 5, floorM, cx, 0.1, -6.5, g, 0.015);
      let wallL, wallR, flame, fireY, fireZ, glass = null;
      if (lido) {
        if (hedge) box(RW, 1.05, 0.55, bambooM, cx, 0.72, -9.0, g, 0.22); // siepe fiorita sul retro (primavera)
        else { box(RW, 0.9, 0.16, fenceM, cx, 0.65, -9.1, g, 0.04); for (let k = 0; k < 7; k++) box(0.1, 1.05, 0.2, fenceM, cx - 2.7 + k * 0.9, 0.72, -9.1, g, 0.04); } // staccionata (bambù, mattoni o bianca)
        if (STYLE === 'dutch') [-2, 0, 2].forEach((dx, k) => { box(1.0, 0.25, 0.4, B.tint(0x6b4a2f), cx + dx, 0.2, -8.7, g, 0.03); [-0.3, -0.1, 0.1, 0.3].forEach((fx, q) => ball(0.11, B.tint([0xff4d6d, 0xffd23a, 0xff7ac6, 0xa066ff][(q + k) % 4]), cx + dx + fx, 0.42, -8.7, g, 6, 5)); }); // fioriere di tulipani
        else if (STYLE === 'harbor') { box(RW, 0.14, 0.22, B.tint(0x2d6cdf), cx, 0.98, -9.1, g, 0.02); [-2.6, 2.6].forEach(dx => cyl(0.14, 0.17, 0.5, mats.dark, cx + dx, 0.45, -8.4, g, 8)); } // fascia blu e bitte
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
        const can = new T.Mesh(B.cached('umb', () => new T.ConeGeometry(1.75, 0.65, 12)), B.tint(umbCols[i % umbCols.length])); can.position.set(cx - 2.35, 3.0, -8.3); can.castShadow = true; g.add(can);
        ball(0.07, mats.white, cx - 2.35, 3.35, -8.3, g, 8, 6);
        flame = new T.Mesh(new T.ConeGeometry(0.22, 0.5, 16), mats.flame); flame.position.set(cx, 1.3, -8.55); g.add(flame);
        fireY = 1.25; fireZ = -8.5;
      } else {
        // pareti alte (2,4 m) con due finestre sul retro: vetro azzurro di giorno, giallo caldo la sera
        box(RW, 2.4, 0.3, wallM, cx, 1.2, -9.1, g, 0.03);
        box(RW + 0.1, 0.12, 0.42, trimM, cx, 2.46, -9.1, g, 0.02); box(RW, 0.14, 0.34, trimM, cx, 0.07, -9.1, g, 0.02); // cornice in alto e zoccolo
        wallL = box(0.3, 2.4, 5, wallM, cx - RW / 2 + 0.15, 1.2, -6.5, g);
        wallR = box(0.3, 2.4, 5, wallM, cx + RW / 2 - 0.15, 1.2, -6.5, g);
        glass = new T.MeshBasicMaterial({ color: 0xbfe6ff });
        [-1.95, 1.95].forEach(dx => {
          box(1.05, 0.95, 0.1, mats.white, cx + dx, 1.65, -8.93, g, 0.02);
          const gl = new T.Mesh(B.cached('winGlass', () => new T.BoxGeometry(0.86, 0.76, 0.06)), glass); gl.position.set(cx + dx, 1.65, -8.88); g.add(gl);
          box(0.9, 0.05, 0.09, mats.white, cx + dx, 1.65, -8.86, g, 0.005); box(0.05, 0.8, 0.09, mats.white, cx + dx, 1.65, -8.86, g, 0.005); // crocetta
          box(1.2, 0.08, 0.22, trimM, cx + dx, 1.15, -8.86, g, 0.01);                                                                         // davanzale
          const awn = box(1.3, 0.1, 0.5, awnM, cx + dx, 2.28, -8.78, g, 0.02); awn.rotation.x = 0.35;                                          // tenda colorata sopra la finestra
        });
        // decorazioni dello stile della città
        if (STYLE === 'alpine') {
          box(RW + 0.3, 0.14, 1.9, B.tint(0x7a3b2a), cx, 2.95, -9.45, g, 0.02).rotation.x = 0.6;                                              // tetto spiovente sul retro
          [-1.95, 1.95].forEach(dx => [-0.7, 0.7].forEach(sx => box(0.3, 0.95, 0.06, B.tint(0x2f6b4f), cx + dx + sx, 1.65, -8.88, g, 0.01))); // persiane verdi
        } else if (STYLE === 'dutch') {
          [[RW * 0.85, 2.65], [RW * 0.55, 3.15], [RW * 0.28, 3.65]].forEach(([w, y]) => { box(w, 0.5, 0.3, wallM, cx, y, -9.1, g, 0.02); box(w + 0.12, 0.08, 0.36, trimM, cx, y + 0.27, -9.1, g, 0.01); }); // facciata a gradoni
          [-1.95, 1.95].forEach((dx, k) => { box(1.1, 0.2, 0.3, B.tint(0x6b4a2f), cx + dx, 1.02, -8.78, g, 0.02); [-0.35, -0.12, 0.12, 0.35].forEach((fx, q) => ball(0.1, B.tint([0xff4d6d, 0xffd23a, 0xff7ac6, 0xffffff][(q + k) % 4]), cx + dx + fx, 1.2, -8.78, g, 6, 5)); }); // fioriere
        } else {
          box(RW, 0.4, 0.34, B.tint(0x2d6cdf), cx, 0.55, -9.1, g, 0.02);                                                                       // fascia blu
          const buoy = new T.Mesh(B.cached('buoy', () => new T.TorusGeometry(0.3, 0.1, 8, 16)), B.tint(0xd9433b)); buoy.position.set(cx, 2.1, -8.9); g.add(buoy); // salvagente
          cyl(0.04, 0.04, 1.6, mats.wood, cx + 2.6, 3.2, -9.1, g, 6); box(0.8, 0.45, 0.04, B.tint(i % 2 ? 0xffffff : 0x2d6cdf), cx + 3.0, 3.75, -9.1, g, 0.01); // bandiera
        }
        box(1.8, 0.03, 1.1, rugM, cx, 0.21, -7.6, g);
        box(1.5, 1.7, 0.8, fireM, cx, 0.85, -8.6, g); box(0.9, 0.65, 0.1, mats.dark, cx, 0.55, -8.17, g); box(1.7, 0.15, 0.9, fireM, cx, 1.75, -8.6, g);
        flame = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 16), mats.flame); flame.position.set(cx, 0.55, -8.25); g.add(flame);
        fireY = 0.7; fireZ = -8.1;
      }
      const light = { intensity: 0, distance: 8, position: new T.Vector3(cx, 1.3, -7.4) }; // la luce vera è una sola, condivisa (fireLight): tante luci rallentano il telefono
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
      return { i, cx, g, glass, flame, light, beds, pile, pileN: 0, fuel: 0, pend: 0, flare: 0, open: false, ghost, el, bar: el.firstChild, wallL, wallR, colL: null, colR: null, fireY, fireZ, sit: lido && TH.seat === 'table', seatZ: -5.98 };
    });
    const fireLight = new T.PointLight(0xff8a3d, 0, 8); scene.add(fireLight);
    function updateFireLight() { // la luce segue il fuoco acceso più vicino all'omino
      let best = null, bs = 0;
      for (const r of rooms) { if (r.light.intensity <= 0) continue; const d = Math.hypot(r.cx - player.position.x, 7.4 + player.position.z), s = r.light.intensity / (1 + d * d * 0.05); if (s > bs) { bs = s; best = r; } }
      if (!best) { fireLight.intensity = 0; return; }
      fireLight.position.copy(best.light.position); fireLight.intensity = best.light.intensity; fireLight.distance = 8;
    }
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
    // Costruito attorno all'origine: il lato di servizio (tazze, pentola) guarda a sud, verso il giocatore e il camminamento.
    box(2.2, 1, 1.1, mats.wood, 0, 0.5, 0, cocoa.g); box(2.4, 0.1, 1.25, mats.plank, 0, 1.05, 0, cocoa.g);
    cyl(0.35, 0.3, 0.5, mats.stone, -0.8, 1.35, -0.15, cocoa.g); cyl(0.3, 0.3, 0.08, mats.cocoa, -0.8, 1.6, -0.15, cocoa.g);
    box(0.12, 2.2, 0.12, mats.wood, 1.1, 1.1, -0.5, cocoa.g); box(1.2, 0.5, 0.08, mats.red, 0.6, 2.1, -0.5, cocoa.g);
    const cupMeshes = [0, 1, 2, 3, 4, 5].map(i => { const c = add(new T.Mesh(B.cupGeo, mats.cup), cocoa.g); c.position.set(-0.45 + i * 0.28, 1.21, 0.25); c.visible = false; return c; });
    cocoa.g.position.set(STAND.x, 0, STAND.z);
    cocoa.g.visible = false;
    function openCocoa() { if (cocoa.open) return; cocoa.open = true; cocoa.g.visible = true; cols.push([STAND.x - 1.25, STAND.x + 1.25, STAND.z - 0.65, STAND.z + 0.65]); }

    // --- reception ------------------------------------------------------------
    // Bancone di legno con campanello, ciotola per le monete, scaffale con le chiavi, insegna e una receptionist.
    // Gli ospiti soddisfatti passano di qui prima di partire e lasciano i soldi sul bancone: l'omino li prende restando sul tappeto rosso.
    const recep = { g: new T.Group(), n: S.recep || 0, bowl: new T.Group(), hop: 0, shown: -1, el: hud.label('pill', ''), who: null };
    scene.add(recep.g);
    {
      const rg = recep.g, rx = 0, rz = 0; // il gruppo si costruisce attorno all'origine e poi si sposta (segue le stanze)
      box(3.4, 1.0, 1.0, mats.wood, rx, 0.5, rz, rg, 0.03);
      box(3.7, 0.12, 1.3, mats.plank, rx, 1.06, rz + 0.05, rg, 0.03);
      box(2.2, 0.55, 0.05, mats.red, rx, 0.5, rz + 0.52, rg, 0.01);                                   // pannello rosso sul fronte
      box(3.4, 1.7, 0.25, mats.wood, rx, 0.85, rz - 1.7, rg, 0.02);                                   // parete dello scaffale
      box(3.0, 0.08, 0.35, mats.plank, rx, 1.25, rz - 1.5, rg, 0.02);
      for (let k = 0; k < 7; k++) box(0.14, 0.26, 0.08, B.tint(CONFETTI[k % CONFETTI.length]), rx - 1.2 + k * 0.4, 1.42, rz - 1.52, rg, 0.015); // chiavi
      cyl(0.045, 0.045, 3.0, mats.wood, rx - 1.45, 1.5, rz - 1.7, rg, 8); cyl(0.045, 0.045, 3.0, mats.wood, rx + 1.45, 1.5, rz - 1.7, rg, 8);
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
      recep.redraw = () => { drawSign(); tex.needsUpdate = true; }; // nome e colori cambiano al volo
      const board = new T.Mesh(new T.PlaneGeometry(3.0, 0.75), new T.MeshBasicMaterial({ map: tex })); board.position.set(rx, 2.6, rz - 1.56); rg.add(board);
      cyl(0.16, 0.16, 0.05, mats.gold, rx - 1.1, 1.15, rz + 0.1, rg, 14); ball(0.07, mats.gold, rx - 1.1, 1.22, rz + 0.1, rg, 10, 8); // campanello
      cyl(0.5, 0.42, 0.14, mats.white, rx + 0.95, 1.15, rz + 0.1, rg, 18);                           // ciotola per le monete
      ball(0.3, B.tint(0x2f9e5a), rx - 1.5, 1.35, rz + 0.1, rg, 12, 8); cyl(0.17, 0.13, 0.2, mats.stone, rx - 1.5, 1.2, rz + 0.1, rg, 10); // vasetto con pianta
      recep.rug = box(2.6, 0.03, 1.5, B.tint(MT.decoGet('rug').col), rx, 0.02, rz + 1.7, rg, 0.01);             // tappeto colorato: qui si riscuote
      box(2.2, 0.035, 1.1, B.tint(0xffd9a0), rx, 0.03, rz + 1.7, rg, 0.01);
      recep.bowl.position.set(rx + 0.95, 1.22, rz + 0.1); rg.add(recep.bowl);
      recep.who = B.person(PL.recepCoat != null ? PL.recepCoat : 0xc23b5a, 0xf2d6a2, false, OUTFIT, { shorts: 0x3f4a63 }); recep.who.position.set(rx + 0.3, 0, rz - 1.0); rg.add(recep.who);
      recep.col = [0, 0, 0, 0]; cols.push(recep.col);
    }
    // La reception sta quasi attaccata alla stanza più a sinistra e scivola di lato ogni volta che si apre una nuova stanza.
    function recepTarget() {
      // sta fuori da tutte le stanze del suo lato (anche quelle non ancora aperte: il loro riquadro non deve finirle addosso)
      if (PL.layout.recep === 'right') { let m = RW / 2; for (const r of rooms) m = Math.max(m, r.cx + RW / 2); return m + 2.35; }
      let e = 1e9; for (const r of rooms) e = Math.min(e, r.cx - RW / 2); if (e < 1e8) return e - 2.35;
      e = 1e9; for (const r of rooms) if (r.open) e = Math.min(e, r.cx - RW / 2); if (e > 1e8) e = -RW / 2; return e - 2.35; }
    function syncRecep() {
      const x = RECEP.x, z = RECEP.z, c = recep.col;
      recep.g.position.set(x, 0, z); c[0] = x - 1.9; c[1] = x + 1.9; c[2] = z - 1.95; c[3] = z + 0.65;
      if (recep.glow) recep.glow.position.set(x + 0.95, 1.5, z + 0.1);
    }
    function moveRecep(dt, snap) {
      const d = recepTarget() - RECEP.x;
      if (Math.abs(d) < 0.004) return;
      RECEP.x = snap || Math.abs(d) < 0.02 ? RECEP.x + d : RECEP.x + Math.sign(d) * Math.min(Math.abs(d), Math.max(0.8, Math.abs(d) * 2) * dt);
      syncRecep();
      if (!snap && Math.abs(recepTarget() - RECEP.x) < 0.004) NAV.invalidate(); // arrivata: gli aiutanti ricalcolano i percorsi
    }
    syncRecep();
    // Bagliori: alone morbido e luminoso (sprite additivo) sui fuochi e sulla ciotola delle monete.
    const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const makeGlow = (col, x, y, z) => { const s = new T.Sprite(new T.SpriteMaterial({ map: haloTex, color: col, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 })); s.position.set(x, y, z); s.visible = false; scene.add(s); return s; };
    rooms.forEach(r => { r.glow = makeGlow(0xff9a3d, r.cx, r.fireY + (lido ? 0.35 : 0.15), r.fireZ + 0.35); });
    recep.glow = makeGlow(0xffd23a, RECEP.x + 0.95, 1.5, RECEP.z + 0.1);
    // Decorazioni dell'evento di stagione (Natale, Carnevale, Pasqua, estate, Halloween) ai lati della reception.
    {
      const ev = MT.eventNow();
      if (ev) {
        [-3.4, 3.4].forEach((dx, k) => {
          const g = new T.Group(); g.position.set(dx, 0, 0.6); recep.g.add(g);
          if (ev.decor === 'tree') {
            cyl(0.1, 0.12, 0.4, mats.wood, 0, 0.2, 0, g, 8);
            [[0.8, 1.1, 0.7], [0.62, 1.0, 1.5], [0.44, 0.9, 2.2]].forEach(([r, h, y]) => { const c = new T.Mesh(B.cached('xcone' + r, () => new T.ConeGeometry(r, h, 10)), B.tint(0x2e8b57)); c.position.y = y + 0.3; c.castShadow = true; g.add(c); });
            for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 0.9 + i * 0.22; ball(0.07, new T.MeshBasicMaterial({ color: CONFETTI[i % CONFETTI.length] }), Math.cos(a) * (0.7 - i * 0.065), y, Math.sin(a) * (0.7 - i * 0.065), g, 8, 6); }
            ball(0.14, new T.MeshBasicMaterial({ color: 0xffe066 }), 0, 3.25, 0, g, 10, 8);
          } else if (ev.decor === 'pumpkin') {
            const pm = ball(0.55, B.tint(0xff8a1f), 0, 0.5, 0, g, 14, 10); pm.scale.set(1.15, 0.85, 1.15); cyl(0.07, 0.09, 0.2, B.tint(0x4a7a2a), 0, 1.02, 0, g, 6);
            ball(0.07, new T.MeshBasicMaterial({ color: 0xfff3a0 }), -0.2, 0.62, 0.5, g, 6, 5); ball(0.07, new T.MeshBasicMaterial({ color: 0xfff3a0 }), 0.2, 0.62, 0.5, g, 6, 5);
          } else if (ev.decor === 'egg') {
            [0, 1, 2].forEach(i => { const e = ball(0.28, B.tint(CONFETTI[(i + k * 2) % CONFETTI.length]), (i - 1) * 0.55, 0.3, i === 1 ? 0.25 : 0, g, 12, 9); e.scale.set(0.85, 1.15, 0.85); });
            box(1.8, 0.05, 0.7, mats.plank, 0, 0.03, 0.1, g, 0.01);
          } else {
            for (let i = 0; i < 4; i++) { const col = CONFETTI[(i + k * 3) % CONFETTI.length]; cyl(0.015, 0.015, 1.5 + i * 0.25, mats.white, (i - 1.5) * 0.4, 0.75 + i * 0.12, 0, g, 4); const b = ball(0.3, B.tint(col), (i - 1.5) * 0.4, 1.75 + i * 0.25, 0, g, 12, 9); b.scale.y = 1.2; }
          }
        });
      }
    }
    function drawRecep() {
      B.clear(recep.bowl);
      const n = Math.min(Math.ceil(recep.n / 5), 26);
      for (let i = 0; i < n; i++) { const c = new T.Mesh(B.coinGeo, mats.gold); c.position.set((i % 4) * 0.2 - 0.3, 0.06 + Math.floor(i / 4) * 0.07, ((i * 5) % 3) * 0.12 - 0.12); c.rotation.y = i; add(c, recep.bowl); }
    }
    drawRecep();
    // Incasso: l'ospite lascia i soldi nella ciotola (con un tintinnio e un volo di monete).
    function payAtReception(amount) {
      recep.n += amount; drawRecep(); recep.hop = 0.45;
      hud.floatText('+' + amount, RECEP.x + 0.95, 2.0, RECEP.z + 0.1);
      burst(RECEP.x + 0.95, 1.5, RECEP.z + 0.1, 8, [0xffd23a, 0xfff2a8], 2.2, 4, 0.7, 0.1); A.sfx('coin');
    }
    function collectRecep() {
      const n = recep.n; if (n <= 0) return;
      S.coins += n; S.collected += n; recep.n = 0; S.recep = 0; drawRecep(); recep.hop = 0.6; MT.see('r_pay');
      hud.floatText('+' + n, player.position.x, 2.4, player.position.z);
      _v.set(RECEP.x + 0.95, 1.4, RECEP.z + 0.1);
      for (let k = 0; k < Math.min(n, 10); k++) fly('coin', _v, o => o.set(player.position.x, 1.3, player.position.z), 0.4, 0.8, null, k * 0.045);
      burst(RECEP.x + 0.95, 1.5, RECEP.z + 0.1, 8, [0xffd23a, 0xfff2a8], 2, 4, 0.6, 0.1); A.sfx('coin');
    }

    // Strutture del posto e ambiente della citta': vedi parts/scenery.js
    R.parts.scenery({ T, scene, B, mats, box, cyl, ball, PL, P, trees, cols, ROAD_W, SEA_Z, CANAL, FARMS, CHAPEL, SEASON_ID, nearPad, nearRoad, inLake, inLM });


    // Percorsi per gli aiutanti: vedi parts/nav.js
    const NAV = R.parts.nav({ P, cols }), findPath = NAV.findPath;


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
        if (h.cup > 0 && gu && h.item === (gu.want === 'snack')) { h.target = gu; gu.taken = true; h.state = 'toGuest'; }
        else if (gu && stockOf(gu)) { h.target = gu; gu.taken = true; h.state = 'toStand'; }
        else if (nav(h, h.home[0], h.home[1], 3.2, dt, 0.3)) { B.walk(g, 0, dt); g.rotation.y = 0; }
      }
      else if (h.state === 'toStand') {
        if (!h.target || h.target.state !== 'bed' || h.target.served) { if (h.target) h.target.taken = false; h.target = null; h.state = 'idle'; }
        else { const sweet = h.target.want === 'snack', at = sweet ? ACT.SNACK_PICK : COCOA_PICK;
        if (nav(h, at[0], at[1] + 0.3, 3.4, dt, 0.9)) {
          if (h.item !== sweet) { h.cup = 0; h.item = sweet; }
          const take = Math.min(stockOf(h.target), 2, cupCapW() - h.cup);
          if (take > 0) {
            if (sweet) ACT.snack.n -= take; else cocoa.cups -= take; h.cup += take; B.toss(g, 0.2); A.sfx('pickup');
            for (let k = 0; k < take; k++) { _v.set(at[0] + (k - 0.5) * 0.28, 1.3, 0.45); fly('cup', _v, o => g.userData.tray.getWorldPosition(o), 0.35, 0.7, () => B.setTray(g, h.cup), k * 0.1); }
            h.state = 'toGuest';
          } else { h.target.taken = false; h.target = null; h.state = 'idle'; }
        } }
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
    const stockOf = gu => gu.want === 'snack' ? (ACT.snack.open ? ACT.snack.n : 0) : (cocoa.open ? cocoa.cups : 0);
    // Una bevanda vola dallo zaino (o dal vassoio) all'ospite: quando arriva paga la mancia e fa festa.
    function serveGuest(gu, fromObj) {
      const rushWin = gu.rush > 0; // servito in tempo: premio
      gu.served = true;
      fromObj.getWorldPosition(_v);
      fly('cup', _v, o => o.set(gu.b.x, 1.1, -6.4), 0.45, 1.0, () => {
        if (gu.want === 'snack') S.snacks = (S.snacks || 0) + 1; else S.cocoa++; gu.cold = 0; hud.floatText(TX.thanks, gu.b.x, 1.6, -6.4); A.sfx('cup'); EX.ev('cup');
        if (rushWin) { EX.ev('rush'); S.coins += 40; R.settings.addGems(2); hud.toast('⚡ Servizio lampo! +40 monete e 2 gemme'); A.sfx('goal'); fauna.celebrate(); }
        burst(gu.b.x, 1.3, -6.4, 6, [0xff7ac6, 0xff4d4d], 1.4, 3, 0.9, 0.12, 1.5);
      });
    }
    // Un pezzo di legna arriva nel camino: il fuoco sale e fa scintille.
    function landLog(r) {
      r.pend--; r.fuel = Math.min(P.fuel_max, r.fuel + 1); S.fed++; r.flare = 1; A.sfx('log'); EX.ev('log');
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
    // Lanterne e mascotte: vedi parts/deco.js
    const { buildLamps, updateLamps, buildMascot } = R.parts.deco({ T, scene, B, mats, cyl, ball, TH, walkP0, ROAD_W, nearPad, nearRoad, STAND, cols, bobbers, makeDuck, env: () => env, player: () => player });
    function applyEffect(pd) {
      if (pd.effect === 'room') openRoom(rooms[pd.room]);
      else if (pd.effect === 'cocoa') openCocoa();
      else if (pd.effect === 'helper') spawnHelper(pd.room);
      else if (pd.effect === 'waiter') spawnWaiter(pd.room);
      else if (pd.effect === 'saw') refreshTools();
      else if (pd.effect === 'lamps') buildLamps();
      else if (pd.effect === 'mascot') buildMascot(pd);
      else if (pd.effect === 'snack') ACT.openSnack();
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
    let personKids = player.children.slice(); // i pezzi dell'omino (per poterlo rifare al volo quando cambia l'aspetto)
    const stackG = new T.Group(); stackG.position.set(0, 0.75, -0.32); player.add(stackG);
    function applyLook() {
      const lk = R.settings.get('look'), lc = (CAT.color.find(c => c.id === lk.color) || CAT.color[0]).hex;
      const np = B.person(lc, lc === 0xffd23a ? 0xff7ac6 : 0xffd23a, true, OUTFIT, { shorts: 0x2d6cdf, hat: lk.hat, acc: lk.acc });
      personKids.forEach(k => player.remove(k));
      personKids = np.children.slice(); personKids.forEach(k => player.add(k));
      Object.assign(player.userData, np.userData);
    }
    function applyDeco() { if (recep.redraw) recep.redraw(); if (recep.rug) recep.rug.material = B.tint(MT.decoGet('rug').col); }
    const carry = { logs: 0, cups: 0, snacks: 0 };
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
    const guests = []; // ospiti presenti
    // Attivita' in piu' (banco dolci, richieste, eventi, arredo) e attivita' della citta': vedi parts/activities.js e parts/city.js
    const G2 = { T, scene, B, mats, box, cyl, ball, hud, A, P, S, level, player, rooms, guests, carry, cols, fly, burst, _v, CONFETTI, RECEP, EX, CITYID, SEASON_ID, SEA_Z, firePos, landLog, spawnGuest, refreshStack, cocoaMax, cocoaInterval, cupCap, stars,
      snackX: PL.layout.snack != null ? PL.layout.snack : 0, later: after, env: () => env, restock: () => { if (cocoa.open) cocoa.cups = Math.min(cocoaMax(), cocoa.cups + 1); } };
    const ACT = R.parts.activities(G2), CITY = R.parts.city(G2);
    openRoom(rooms[0]); // la prima stanza è sempre aperta
    rooms.forEach((r, i) => { r.pileN = S.piles[i] || 0; drawPile(r); });
    pads.forEach(pd => { if (state.isBought(pd.id)) applyEffect(pd); });
    // Atmosfera: giorno/notte e meteo; animali e compagno.
    env = R.createEnv({ T, TH, A, Q, level, hemi, sun, scene, player, mats, hud });
    fauna = R.createFauna({ T, B, scene, A, Q, level, player, trees, collide, inLake, inLM, bounds: [bx0, bx1, bz0, bz1] });

    // --- freccia guida e caduta (neve o petali) ------------------------------
    const arrow = new T.Mesh(new T.ConeGeometry(0.35, 0.7, 20), mats.arrow); arrow.rotation.x = Math.PI; scene.add(arrow);
    // Freccia a mezz'aria attorno all'omino: durante il tutorial indica la direzione da seguire (si vede anche dietro agli alberi).
    // Freccia 3D (asta + punta) ad altezza busto, un po' staccata dall'omino; punta lungo +z e si ruota verso il bersaglio.
    const guideArrow = new T.Group(), gaMat = new T.MeshPhongMaterial({ color: 0xffd23a, emissive: 0x7a5200, shininess: 40 });
    const gaShaft = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.7, 12).rotateX(Math.PI / 2), gaMat); gaShaft.position.z = -0.25;
    const gaHead = new T.Mesh(new T.ConeGeometry(0.26, 0.55, 14).rotateX(Math.PI / 2), gaMat); gaHead.position.z = 0.35;
    guideArrow.add(gaShaft, gaHead); guideArrow.scale.setScalar(1.3); guideArrow.visible = false; scene.add(guideArrow);
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
    let spawnT = 2;
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
    function spawnGuest(kind, path) {
      let fb = null;
      for (const r of rooms) if (r.open) for (const b of r.beds) if (!b.guest && !fb) fb = [r, b];
      if (!fb) return null;
      const [r, b] = fb;
      const H = PL.host, look = kind === 'vip' ? { coat: 0xffd23a, hat: 0xffffff, opt: { hat: 'crown' } } : kind === 'scout' ? { coat: 0x4cd964, hat: 0x8b5a2b, opt: {} } : kind === 'rush' ? { coat: 0xff7ac6, hat: 0xffffff, opt: {} } :
        kind === 'host' && H ? { coat: H.coat, hat: 0xffffff, opt: H.hat ? { hat: H.hat } : {} } : null;
      const pool = PL.coats && PL.coats.length ? PL.coats : COATS; // vestiario del posto (città + stagione)
      const hatOpt = !look && PL.hats && PL.hats.length && Math.random() < 0.55 ? { hat: PL.hats[Math.floor(Math.random() * PL.hats.length)] } : {};
      const g = B.person(look ? look.coat : pool[Math.floor(Math.random() * pool.length)], look ? look.hat : CONFETTI[Math.floor(Math.random() * CONFETTI.length)], false, OUTFIT,
        Object.assign({ shorts: SHORTS[Math.floor(Math.random() * SHORTS.length)], shoes: Math.random() < 0.5 ? 0xffffff : 0x3d8bff }, look ? look.opt : hatOpt));
      g.scale.setScalar(kind === 'vip' || kind === 'host' ? 1 : 0.88); const road = path || inRoads[Math.floor(Math.random() * inRoads.length)]; g.position.set(road[0][0], 0, road[0][1]); g.rotation.y = Math.PI / 2;
      const gu = { g, r, b, state: 'road', path: road.slice(1).map(p => p.slice()), stay: P.guest_stay * (kind === 'vip' ? 1.4 : 1), cold: 0, want: false, served: false, el: hud.label('pill', ''), vip: kind === 'vip', boat: kind === 'boat', scout: kind === 'scout', rush: kind === 'rush' ? 24 : 0, taken: false };
      b.guest = gu; guests.push(gu);
      return gu;
    }
    // --- tutorial a fumetti: solo la prima volta e solo nella prima stagione ---
    // I suggerimenti del tutorial compaiono solo la primissima volta che si gioca; gli obiettivi partono sempre dal primo.
    const FIRST_LEVEL = level.id === R.order[0];
    if (!FIRST_LEVEL && !R.settings.get('tutorial')) R.settings.set('tutorial', true);
    const tut = { on: !R.settings.get('tutorial') && FIRST_LEVEL && S.done === 0, i: 0, moved: 0, lx: null, lz: null };
    const TSTEPS = [
      ['👆 Trascina il dito sullo schermo per muoverti', () => tut.moved > 3],
      [`🪓 Vai verso ${V.treeArt || 'un albero'}: segui la freccia gialla`, () => S.wood >= 1 || !!nearTree(player.position, P.chop_range)],
      [`🌲 Fermati vicino all'${V.tree || 'albero'}: la ${V.wood || 'legna'} si taglia da sola!`, () => S.wood >= 4],
      [`🔥 Porta la ${V.wood || 'legna'} al ${V.fire || 'camino'}, dove c'è la barra del fuoco`, () => S.fed >= 1],
      [`${V.guestEmoji || '🧑'} Presto arriverà un ${V.guest || 'ospite'}: tieni il ${V.fire || 'camino'} acceso`, () => S.guests >= 1],
      ['🪙 Gli ospiti pagano alla reception: ritira le monete dal bancone, sul tappeto rosso', () => S.collected >= 1],
      ['✨ Spendile nei riquadri a terra: la barra si riempie!', () => Object.keys(S.bought).length >= 1 || S.done >= 5]
    ];
    function endTutorial() { tut.on = false; hud.hint(null); R.settings.set('tutorial', true); }
    function updateTutorial(dt) {
      const p = player.position;
      if (tut.lx != null) tut.moved += Math.hypot(p.x - tut.lx, p.z - tut.lz); tut.lx = p.x; tut.lz = p.z;
      while (tut.on && tut.i < TSTEPS.length && TSTEPS[tut.i][1]()) tut.i++;
      if (tut.on && tut.i >= TSTEPS.length) { endTutorial(); hud.toast('Ora sai tutto: buon divertimento! 🎉'); return; }
      if (tut.on) hud.hint(TSTEPS[tut.i][0], tut.i + 1, TSTEPS.length);
    }
    // Consigli che compaiono una volta sola, al momento giusto.
    function tips() {
      if (carry.logs >= logCap() && S.fed === 0 && R.settings.tip('bag')) hud.toast(`🎒 Zaino pieno! Porta la ${V.wood || 'legna'} al ${V.fire || 'camino'}`);
      if (guests.some(g => g.want && g.state === 'bed' && !g.served) && R.settings.tip('want')) hud.toast(`${TX.want} Portagli l'ordinazione dal banco!`);
      if (cocoa.open && carry.cups === 0 && S.cocoa === 0 && R.settings.tip('stand')) hud.toast(`${V.foodEmoji || '☕'} ${upFirst(V.stand || 'il banco')} prepara le ordinazioni: avvicinati per prenderle`);
    }
    // Eventi a sorpresa ogni 75-135 secondi, dopo i primi obiettivi: un VIP, una squadra di scout o un ospite affamato.
    let eventT = 70, hostT = 60;
    function runEvent() {
      const free = rooms.reduce((n, r) => n + (r.open ? r.beds.filter(b => !b.guest).length : 0), 0);
      if (!free) return;
      const kinds = ['vip', 'scout', 'rush'].filter(k => (k !== 'scout' || free >= 2) && (k !== 'rush' || cocoa.open));
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      if (k === 'vip') { const vg = spawnGuest('vip'); if (vg) { vg.persona = MT.vipPersona(); hud.toast(`⭐ Arriva ${vg.persona.name} ${vg.persona.e}: paga il triplo!`); } }
      else if (k === 'rush') { if (spawnGuest('rush')) hud.toast(`⏱ Un ${V.guest || 'ospite'} affamato! Portagli subito l'ordinazione ${V.foodEmoji || ''}: +40 monete`); }
      else { for (let i = 0; i < Math.min(3, free); i++) spawnGuest('scout'); hud.toast('🏕️ Arriva una squadra di scout! Pagano di più'); }
      A.sfx('guest'); fauna.celebrate();
    }
    // Percorso d'uscita: dalla passeggiata verso est fino al bordo della mappa (poi l'ospite sparisce).
    const exitFrom = x => exitRoad.filter(p => p[0] > x + 2.5).map(p => p.slice());
    function leave(gu, happy) {
      const g = gu.g; g.rotation.set(0, 0, 0); g.position.set(gu.b.x, 0, -4.6); gu.b.guest = null; gu.state = 'out'; g.userData.blob.visible = true;
      gu.path = [[gu.r.cx, -3.1]].concat(exitFrom(gu.r.cx)); // cold: esce subito, verso est
      if (happy) {
        const pay = Math.round((P.pay + (gu.served ? P.tip : 0)) * (gu.vip ? 3 : gu.host ? 4 : gu.scout ? 1.5 : 1) * (R.shop.has('boost') ? 1.5 : 1) * MT.payMul() * ACT.payBonus(gu)); // "Ospiti generosi" dallo shop: +50%; poi evento di stagione e nuove gestioni
        // passa dalla reception e lascia i soldi sul bancone
        gu.pay = pay; gu.path = [[gu.r.cx, -2.8], [RECEP.x + 0.7 + Math.random() * 0.6, RECEP.z + 1.35]]; // si paga a destra del bancone, vicino alla ciotola; la fila per entrare sta a sinistra
        S.happy++; S.guests++; EX.ev('guest'); if (gu.vip) { EX.ev('vip'); MT.vipServed(gu.persona); }
        if (gu.host) { R.settings.addGems(1); hud.toast(`${gu.host.e} ${gu.host.name}: «${gu.host.line}» +1 💎`); } // l'ospite speciale del posto lascia una gemma
      } else {
        S.happy = Math.max(0, S.happy - P.cold_penalty);
        hud.toast(TX.coldLeave); A.sfx('cold');
      }
    }

    // --- obiettivi e freccia ------------------------------------------------
    const objTarget = o => o.n || 1;
    const objValue = o => o.bought ? +state.isBought(o.bought) : (o.stat === 'stars' ? stars() : (S[o.stat] || 0));
    // Vecchie partite (v0.21.1) saltavano i primi 4 obiettivi: li si rifà, così si parte dal numero 1 (si torna indietro solo se non erano davvero fatti).
    while (S.done > 0 && S.done <= 4 && S.done <= objectives.length && !objectives[S.done - 1].bought && objValue(objectives[S.done - 1]) < objTarget(objectives[S.done - 1])) S.done--;
    function taskTarget() {
      if (S.done >= objectives.length) return null;
      const guide = objectives[S.done].guide || '', p = player.position;
      const treeTarget = () => { const t = nearTree(p, 99); return t ? [t.x, t.z] : null; };
      if (guide === 'tree') return carry.logs >= logCap() ? [rooms[0].cx, FEED_Z] : treeTarget();
      if (guide === 'feed') return carry.logs ? [rooms[0].cx, FEED_Z] : treeTarget();
      if (guide === 'pile') { if (recep.n > 0) return [RECEP.x, RECEP.z + 1.7]; const r = rooms.filter(r => r.pileN > 0).sort((a, b) => b.pileN - a.pileN)[0]; return r ? [r.cx + 1.7, PILE_Z] : null; }
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
      // a livello finito: tasto fisso per passare alla tappa successiva (senza chiudere e riaprire l'app)
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

    function collide(p) {
      for (const c of cols) {
        const qx = Math.max(c[0], Math.min(p.x, c[1])), qz = Math.max(c[2], Math.min(p.z, c[3]));
        const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
        if (d < 0.3) { if (d > 1e-4) { p.x = qx + dx / d * 0.3; p.z = qz + dz / d * 0.3; } else p.z = c[3] + 0.3; }
      }
      p.x = Math.max(P.world_min[0], Math.min(P.world_max[0], p.x)); p.z = Math.max(P.world_min[1], Math.min(P.world_max[1], p.z));
    }

    // --- salvataggio --------------------------------------------------------
    function save() { S.piles = rooms.map(r => r.pileN); S.recep = recep.n; state.save(); }
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
        chopCd = ci; chopTree(tr, p.x, p.z, delay); carry.logs++; S.wood++; inLogs++; changed = true; EX.ev('wood');
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
      if (recep.n > 0 && Math.hypot(p.x - RECEP.x, p.z - (RECEP.z + 1.7)) < 1.9) collectRecep();
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
          _v.set(-0.45 + Math.min(5, cocoa.cups) * 0.28, 1.3, 0.25); cocoa.g.localToWorld(_v);
          fly('cup', _v, o => stackG.getWorldPosition(o), 0.4, 0.8, () => { inCups--; refreshStack(); });
        }
        cupMeshes.forEach((c, i) => { c.visible = i < cocoa.cups; });
      }
      for (const gu of guests) {
        const key = gu.want === 'snack' ? 'snacks' : 'cups';
        if (gu.state === 'bed' && gu.want && !gu.served && carry[key] > 0 && Math.hypot(p.x - gu.b.x, p.z + 6.6) < 2) {
          carry[key]--; changed = true; refreshStack();
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
      if (tut.on && S.won) endTutorial();
      if (tut.on) updateTutorial(dt); else tips();
      // eventi a sorpresa
      eventT -= dt; if (S.done >= 3 && S.fed > 0 && eventT <= 0) { eventT = 75 + Math.random() * 60; runEvent(); }
      // ospite speciale (host) del posto: cambia con città e stagione, paga il quadruplo e porta una gemma
      hostT -= dt;
      if (PL.host && S.done >= 2 && S.fed > 0 && hostT <= 0) {
        const hg = spawnGuest('host');
        if (hg) { hostT = 110 + Math.random() * 70; hg.host = PL.host; hud.toast(`${PL.host.e} Arriva ${PL.host.name}: ospite speciale, paga il quadruplo!`); A.sfx('guest'); fauna.celebrate(); } else hostT = 20;
      }
      // ospiti
      if (S.fed > 0) { spawnT -= dt; if (spawnT <= 0) { spawnT = (P.guest_spawn_min + Math.random() * (P.guest_spawn_max - P.guest_spawn_min)) * (hasEffect('sign') ? P.sign_mul : 1); spawnGuest(); } }
      const queue = guests.filter(g => g.state === 'queue'); // fila alla reception, nell'ordine di arrivo
      for (let i = guests.length - 1; i >= 0; i--) {
        const gu = guests[i];
        if (gu.state === 'road') { if (B.follow(gu.g, gu.path, 3.2, dt)) gu.state = 'queue'; } // cammina lungo la sua strada, dal bordo ovest
        else if (gu.state === 'queue') {
          const k = queue.indexOf(gu); gu.path = [[RECEP.x - 0.55, RECEP.z + 1.45 + k * 0.85]];
          if (B.follow(gu.g, gu.path, 2.8, dt)) { // al suo posto nella fila: il primo fa il check-in e poi va in stanza
            gu.g.rotation.y = Math.PI;
            if (k === 0) { gu.wait = (gu.wait || 0) + dt; if (gu.wait > 1.1) { gu.wait = 0; recep.hop = 0.4; A.sfx('click'); gu.state = 'in'; gu.path = [[gu.r.cx, -2.8], [gu.b.x, -4.6]]; } }
          } else gu.wait = 0;
        } else if (gu.state === 'in') {
          if (B.follow(gu.g, gu.path, 2.6, dt)) {
            gu.state = 'bed'; seatGuest(gu); A.sfx('guest'); fauna.react();
            MT.see('g_' + (gu.vip ? 'vip' : gu.scout ? 'scout' : gu.rush > 0 ? 'rush' : 'hiker'));
            gu.want = cocoa.open && (gu.vip || gu.scout || gu.rush > 0 || Math.random() < P.cocoa_chance);
            if (gu.want && ACT.snack.open && !gu.rush && Math.random() < 0.35) gu.want = 'snack';
          }
        } else if (gu.state === 'bed') {
          if (gu.rush > 0 && !gu.served) gu.rush -= dt;
          if (gu.r.fuel > 0) { gu.stay -= dt; gu.cold = Math.max(0, gu.cold - dt * 2); } else gu.cold += dt;
          if (gu.cold > P.guest_cold_limit) leave(gu, false); else if (gu.stay <= 0) leave(gu, true);
        } else if (gu.wait > 0) { // al bancone della reception: lascia i soldi, poi esce
          gu.wait -= dt; gu.g.rotation.y = Math.PI;
          if (gu.wait <= 0) { payAtReception(gu.pay); gu.pay = 0; gu.path = [[gu.g.position.x + 0.6, -3.2]].concat(exitFrom(gu.g.position.x)); }
        } else if (B.follow(gu.g, gu.path, 2.8, dt)) {
          if (gu.pay > 0) gu.wait = 0.8; else { scene.remove(gu.g); gu.el.remove(); guests.splice(i, 1); }
        }
      }
      ACT.update(dt); CITY.update(dt);
      helpers.forEach(h => h && updateHelper(h, dt));
      waiters.forEach(h => h && updateWaiter(h, dt));

      // obiettivi
      while (S.done < objectives.length && objValue(objectives[S.done]) >= objTarget(objectives[S.done])) {
        const rw = objectives[S.done].reward || 10;
        S.done++; S.coins += rw; hud.toast(`Obiettivo completato! +${rw} monete 🎉`); save(); fauna.celebrate(); EX.ev('goal');
        burst(p.x, 1.6, p.z, 34, CONFETTI, 4.5, 8, 1.2, 0.17); hopT = 0.5; A.sfx('goal');
      }
      if (S.done >= objectives.length && !S.won) {
        S.won = true; R.settings.addGems(4); hud.toast('Stagione completata! +4 gemme 💎'); MT.stamp(level.id); save(); running = false; endJoy(); EX.ev('win');
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
        if (r.glass) { const k = Math.min(1, (env ? env.night : 0) * (lit ? 1.1 : 0.35)); r.glass.color.setRGB(0.75 + 0.25 * k, 0.9 - 0.1 * k, 1 - 0.65 * k); } // vetro: azzurro di giorno, giallo caldo di sera
        if (r.glow) { r.glow.visible = lit; if (lit) { const gs = 1.6 + s * 1.5 + 0.15 * Math.sin(tt * 11 + r.i); r.glow.scale.set(gs, gs, 1); r.glow.material.opacity = Math.min(0.9, 0.3 + (env ? env.night : 0) * 0.35 + r.flare * 0.3); } }
        r.pile.rotation.y = tt * 0.8; r.pile.position.y = 0.05 + 0.04 * Math.sin(tt * 3 + r.i);
      }
      updateFireLight(); moveRecep(dt, recepSnap); recepSnap = false;
      // receptionist: guarda l'omino quando è vicino, saltella quando arrivano o se ne vanno i soldi
      if (recep.glow) { recep.glow.visible = recep.n > 0; if (recep.n > 0) { const gs = 1.0 + 0.2 * Math.sin(tt * 5); recep.glow.scale.set(gs, gs, 1); recep.glow.material.opacity = 0.5 + 0.2 * Math.sin(tt * 5); } }
      if (recep.who) {
        const near = Math.hypot(p.x - RECEP.x, p.z - RECEP.z) < 9;
        const want = near ? Math.max(-1.1, Math.min(1.1, Math.atan2(p.x - (RECEP.x + 0.3), p.z - (RECEP.z - 1.0)))) : Math.sin(tt * 0.7) * 0.12;
        recep.who.rotation.y += (want - recep.who.rotation.y) * Math.min(1, dt * 6);
        recep.hop = Math.max(0, recep.hop - dt); recep.who.position.y = recep.hop > 0 ? Math.sin(Math.PI * (1 - recep.hop / 0.5)) * 0.22 : 0;
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
      if (tut.on && tg) {
        const gx = tg[0] - p.x, gz = tg[1] - p.z, gl = Math.hypot(gx, gz);
        if (gl > 2.5) { guideArrow.visible = true; guideArrow.position.set(p.x + gx / gl * 2.3, 1.05 + Math.sin(tt * 5) * 0.08, p.z + gz / gl * 2.3); guideArrow.rotation.y = Math.atan2(gx, gz); } else guideArrow.visible = false;
      } else guideArrow.visible = false;
      arrow.scale.setScalar(tut.on ? 2.4 : 1.6); // la freccia guida è grande, enorme durante il tutorial
      if (tg) { arrow.position.set(tg[0], (tut.on ? 3.8 : 3.2) + Math.sin(tt * 4) * 0.3, tg[1]); arrow.rotation.y = tt * 2; }
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

    let albumT = 0, recepSnap = true;
    function overlays(dt) {
      albumT -= dt;
      if (albumT <= 0 && env && running) { // ogni 3 secondi: meteo e notte danno figurine dell'album
        albumT = 3; const ei = env.info();
        if (ei.weather && ei.weather !== 'clear') MT.see('w_' + ei.weather);
        if (ei.night > 0.7) MT.see('n_night');
      }
      if (recep.shown !== recep.n) { recep.shown = recep.n; recep.el.textContent = recep.n > 0 ? '💰 ' + recep.n : ''; }
      hud.put(recep.el, RECEP.x + 0.95, 2.1, RECEP.z + 0.1, recep.n > 0);
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
          else if (gu.want && !gu.served) { txt = gu.want === 'snack' ? ACT.SN.e + '?' : TX.want; cls += ' want'; }
          else if (gu.req) { txt = gu.req.e + '?'; cls += ' want'; }
          const badge = gu.host ? `${gu.host.e} ${gu.host.name}` : gu.vip ? '⭐ VIP' : gu.scout ? '🏕️' : gu.rush > 0 && !gu.served ? `⏱${Math.ceil(gu.rush)}` : '';
          if (badge) txt = txt ? `${badge} ${txt}` : badge;
        }
        if (gu.el.textContent !== txt) gu.el.textContent = txt;
        if (gu.el.className !== cls) gu.el.className = cls;
        hud.put(gu.el, gu.b.x, gu.r.sit ? 2.2 : 1.4, gu.r.sit ? -6 : -6.6, !!txt);
      });
      ACT.overlays(); CITY.overlays(); MINIMAP(dt);
      hud.updateFloats(dt);
    }

    const MINIMAP = R.parts.minimap({ P, player, rooms, guests, recep: () => ({ x: RECEP.x, z: RECEP.z, n: recep.n }),
      stands: () => (cocoa.open ? [[STAND.x, STAND.z]] : []).concat(ACT.snack.open ? [[ACT.SNACK_PICK[0], STAND.z]] : []),
      pads: () => pads.filter(pd => !state.isBought(pd.id) && padShown(pd) && S.coins >= pd.cost - state.paid(pd.id)).map(pd => [pd.x, pd.z]),
      spots: () => ACT.spots().concat(CITY.spots()) });
    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    cam.position.set(0, 15, 12);
    let last = performance.now();
    function frame(now) {
      const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
      // Se per 8 secondi il gioco va sotto i 25 fotogrammi al secondo, si suggerisce (una volta sola) di abbassare la qualità grafica.
      if (running && !paused && raw < 0.5) {
        perfT += raw; if (raw > 0.04) perfSlow += raw;
        if (perfT >= 8 && perfSlow / perfT > 0.6 && pixelRatio > 1.05) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); } // adattamento: meno pixel se il telefono fatica
        if (perfT >= 8) { if (perfSlow / perfT > 0.6 && R.settings.get('quality') !== 'low' && R.settings.tip('perf')) hud.toast('🐢 Il gioco va a scatti? Prova la qualità Media o Bassa: menu ☰ → Impostazioni'); perfT = 0; perfSlow = 0; }
      }
      if (fpsOn) { fpsN++; fpsT += raw; if (fpsT >= 0.5) { fpsEl.textContent = Math.round(fpsN / fpsT) + ' fps'; fpsN = 0; fpsT = 0; } }
      if (running && !paused) { update(dt); tickLater(dt); updateFlyers(dt); updateParts(dt); env.update(dt); fauna.update(dt); }
      anim(dt); renderer.shadowMap.needsUpdate = (shadowN++ & 1) === 0; renderer.render(scene, cam); overlays(dt); refreshHud(); // le ombre si ridisegnano un fotogramma su due: dimezza il costo senza che si noti
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
      // Cambi estetici al volo (negozio delle gemme e profilo), senza riavviare il gioco.
      applyLook, applyDeco, setPet(kind) { fauna.setPet(kind); },
      addCoins(n) { S.coins += n; },
      furnish(i, id) { const r = ACT.furnish(i, id); if (r === 'ok') save(); return r; }, furnHtml: () => ACT.furnHtml(),
      // Foto ricordo: ridisegna la scena e la mette in una cornice (le scritte HTML non compaiono).
      photo() { renderer.render(scene, cam); return EX.photo(renderer.domElement, `${level.cityEmoji || ''} ${level.cityName || ''} · ${level.emoji} ${level.name}`); },
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
        scene, renderer, act: ACT, city: CITY,
        perf() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, lights: scene.children.filter(o => o.isLight).length, shadow: renderer.shadowMap.enabled, ratio: renderer.getPixelRatio(), objs: scene.children.length }; },
        info() { return { fast: speedMul > 1, fps: fpsOn, done: S.done, total: objectives.length, env: env.info(), critters: fauna.count() }; }
      }
    };
  };
})(window.Rifugio);
