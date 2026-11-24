// Costruzione della scena: materiali, scatole con spigoli arrotondati, cilindri lisci, alberi (abeti d'inverno, alberi da frutto d'estate),
// omini con gomiti e faccia, pile di legna. "theme" (dal livello) sceglie colori e tipo di albero.
(function (R) {
  'use strict';

  const SEG = 16; // segmenti dei cilindri: abbastanza per bordi tondi senza pesare sul telefono
  const sm = x => x * x * (3 - 2 * x);                 // curva morbida 0 → 1
  const mix = (a, b, t) => a + (b - a) * t;

  R.createBuilder = function (scene, theme) {
    theme = theme || {};
    const T = THREE;
    // Luce calcolata per pixel (Phong): le superfici curve restano lisce invece di mostrare le sfaccettature.
    const M = (c, extra) => new T.MeshPhongMaterial(Object.assign({ color: c, shininess: 6, specular: 0x111111 }, extra));
    const mats = {
      snow: M(0xf6f9ff), ground: M(theme.ground || 0xf6f9ff), path: M(theme.path || 0xe8dcc4),
      hill: M(theme.hill || 0x8fb0d8), peak: M(theme.peak || 0xf6f9ff),
      foliage: M(0xffffff, { vertexColors: true }), accent: M(0xffffff, { vertexColors: true }), face: M(0xffffff, { vertexColors: true, shininess: 0, specular: 0x000000 }),
      trunk: M(0x7a4a30), wood: M(0xb07848),
      plank: M(0xe6b27a), stone: M(0x9aa1ab), red: M(0xf0503a), skin: M(0xffd0a8), dark: M(0x2f3a4d),
      bed: M(0xfff1da), blanket: M(0x3d8bff), gold: M(0xffc83a, { shininess: 60, specular: 0x887733 }), cup: M(theme.cup || 0xd0502e),
      cocoa: M(theme.cupLiquid || 0x5a3220), steel: M(0xc4ccd6, { shininess: 50, specular: 0x555555 }),
      water: M(theme.water || 0x4fc3f7, { shininess: 80, specular: 0xaaddff, transparent: true, opacity: 0.88 }), sand: M(0xf1dca0),
      white: M(0xffffff), pink: M(0xff9bb5), yellow: M(0xffd23a), orange: M(0xff9a2a),
      pad: new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      ghost: M(0xe6b27a, { transparent: true, opacity: 0.3 }),
      flame: new T.MeshBasicMaterial({ color: 0xffa233 }),
      arrow: new T.MeshBasicMaterial({ color: 0xffd23a }),
      glow: new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
    };
    const tintCache = {};
    const tint = c => tintCache[c] || (tintCache[c] = M(c));

    const geoCache = {};
    const cached = (key, make) => geoCache[key] || (geoCache[key] = make());

    // Scatola con spigoli arrotondati di raggio r: i vertici vicini agli spigoli vengono spinti su un quarto di cerchio
    // e le normali puntano verso l'esterno della curva, così la luce scorre morbida sugli angoli.
    function roundBoxGeo(w, h, d, r) {
      r = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
      return cached(`rb${w}_${h}_${d}_${r.toFixed(3)}`, () => {
        const m = 2, S = 2 * m + 1, half = [w / 2, h / 2, d / 2];
        const g = new T.BoxGeometry(1, 1, 1, S, S, S);
        const pos = g.attributes.position, nor = g.attributes.normal;
        const v = [0, 0, 0], inner = [0, 0, 0];
        for (let i = 0; i < pos.count; i++) {
          const c = [pos.getX(i), pos.getY(i), pos.getZ(i)];
          for (let a = 0; a < 3; a++) {
            const idx = Math.round((c[a] + 0.5) * S), hi = half[a] - r;
            v[a] = idx <= m ? -hi - r * (m - idx) / m : hi + r * (idx - (S - m)) / m;
            inner[a] = Math.max(-hi, Math.min(hi, v[a]));
          }
          const nx = v[0] - inner[0], ny = v[1] - inner[1], nz = v[2] - inner[2], len = Math.hypot(nx, ny, nz) || 1;
          pos.setXYZ(i, inner[0] + nx / len * r, inner[1] + ny / len * r, inner[2] + nz / len * r);
          nor.setXYZ(i, nx / len, ny / len, nz / len);
        }
        return g;
      });
    }

    function add(o, p) { o.castShadow = o.receiveShadow = true; (p || scene).add(o); return o; }
    // r: raggio degli spigoli (predefinito: proporzionato al lato più corto).
    function box(w, h, d, m, x, y, z, p, r) {
      const o = new T.Mesh(roundBoxGeo(w, h, d, r != null ? r : Math.min(0.08, Math.min(w, h, d) * 0.25)), m);
      o.position.set(x, y, z); return add(o, p);
    }
    function cyl(rt, rb, h, m, x, y, z, p, s) {
      const seg = s || SEG;
      const o = new T.Mesh(cached(`c${rt}_${rb}_${h}_${seg}`, () => new T.CylinderGeometry(rt, rb, h, seg)), m);
      o.position.set(x, y, z); return add(o, p);
    }
    function ball(r, m, x, y, z, p, ws, hs) {
      const o = new T.Mesh(cached(`s${r}_${ws || 20}`, () => new T.SphereGeometry(r, ws || 20, hs || 14)), m);
      o.position.set(x, y, z); return add(o, p);
    }
    function clear(g) { while (g.children.length) g.remove(g.children[0]); }

    // Fonde più geometrie in una sola (colore per vertice). parts: {geo, x, y, z, ry, s (numero o [sx,sy,sz]), color}.
    const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
    function mergeParts(parts) {
      const pos = [], nor = [], col = [], idx = []; let off = 0;
      parts.forEach(p => {
        const s = p.s == null ? [1, 1, 1] : (typeof p.s === 'number' ? [p.s, p.s, p.s] : p.s);
        _e.set(0, p.ry || 0, 0); _q.setFromEuler(_e); _p.set(p.x || 0, p.y || 0, p.z || 0); _s.set(s[0], s[1], s[2]);
        const g = p.geo.clone().applyMatrix4(_m.compose(_p, _q, _s)), pa = g.attributes.position, na = g.attributes.normal, c = new T.Color(p.color == null ? 0xffffff : p.color);
        for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); col.push(c.r, c.g, c.b); }
        for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
        off += pa.count; g.dispose();
      });
      const m = new T.BufferGeometry();
      m.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      m.setAttribute('color', new T.Float32BufferAttribute(col, 3)); m.setIndex(idx);
      return m;
    }

    // --- alberi -------------------------------------------------------------
    // "fall" contiene tronco e chioma e può inclinarsi o cadere ruotando attorno alla base;
    // "stump" è il ceppo che resta dopo l'abbattimento. Ogni albero ha materiali propri per poter diventare trasparente.
    function tree(x, z, sc) {
      const leafy = theme.tree === 'leafy';
      const tm = { trunk: mats.trunk.clone(), foliage: mats.foliage.clone(), top: (leafy ? mats.accent : mats.snow).clone() };
      const g = new T.Group(); g.position.set(x, 0, z); if (sc) g.scale.setScalar(sc);
      const stump = cyl(0.22, 0.27, 0.3, tm.trunk, 0, 0.15, 0, g, 16); stump.visible = false;
      const fall = new T.Group(); g.add(fall);
      const part = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; fall.add(o); return o; };
      part(cached('treeTrunk', () => new T.CylinderGeometry(0.15, 0.25, 1.4, 10).translate(0, 0.7, 0)), tm.trunk);
      part(leafy ? leafyGeo() : foliageGeo(), tm.foliage);
      part(leafy ? fruitGeo() : snowCapsGeo(), tm.top);
      scene.add(g);
      return { g, fall, stump, mats: Object.values(tm) };
    }

    // Abete: sei piani morbidi di cono sovrapposti e ruotati (due verdi che si alternano), ognuno con un cappello di neve a ciuffi.
    const TIERS = [[1.4, 1.0, 0.8], [1.2, 0.95, 1.4], [1.0, 0.9, 1.95], [0.8, 0.85, 2.45], [0.6, 0.8, 2.9], [0.38, 0.8, 3.3]]; // raggio, altezza, base
    function tierGeo(r, h, wob, ph) {
      const g = new T.CylinderGeometry(0.02, r, h, 24, 4), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rad = Math.hypot(x, z);
        if (rad < 1e-5) continue;
        const k = Math.min(1, Math.max(0, 1 - (y + h / 2) / h)); // 0 in punta, 1 alla base
        const w = Math.sin(5 * Math.atan2(z, x) + ph);           // 5 ciuffi per piano
        const nr = r * Math.pow(k, 0.7) * (1 + wob * k * k * w);
        p.setXYZ(i, x / rad * nr, y - wob * h * 0.55 * Math.pow(k, 3) * (0.5 + 0.5 * w), z / rad * nr);
      }
      g.computeVertexNormals();
      return g;
    }
    const foliageGeo = () => cached('treeFoliage', () => mergeParts(TIERS.map(([r, h, y], i) => ({
      geo: tierGeo(r, h, 0.13, i * 1.3), y: y + h / 2, ry: i * 0.6, color: i % 2 ? 0x3fae6e : 0x2a8a5a
    }))));
    const snowCapsGeo = () => cached('treeSnow', () => mergeParts(TIERS.map(([r, h, y], i) => ({
      geo: tierGeo(r * 0.7, h * 0.42, 0.28, i * 1.3), y: y + h + 0.06 - h * 0.21, ry: i * 0.6
    }))));
    // Albero estivo: chioma a palloni morbidi (due verdi) con frutti e fiorellini colorati.
    const BLOBS = [[0, 2.45, 0, 1.2], [0.75, 2.15, 0.3, 0.85], [-0.7, 2.2, -0.2, 0.9], [0.1, 3.25, -0.1, 0.85], [-0.25, 2.2, 0.75, 0.75], [0.4, 2.1, -0.75, 0.75]];
    const leafyGeo = () => cached('leafy', () => mergeParts(BLOBS.map(([x, y, z, r], i) => ({
      geo: cached('blob', () => new T.SphereGeometry(1, 14, 10)), x, y, z, s: [r, r * 0.88, r], color: i % 2 ? 0x5ccf5b : 0x3fb14f
    }))));
    const FRUIT = [[0.9, 2.6, 0.9, 0xff4d4d], [-0.9, 2.4, 0.5, 0xff8fb3], [0.2, 3.1, 0.85, 0xffd23a], [-0.3, 3.35, -0.7, 0xff4d4d], [0.95, 2.1, -0.5, 0xff8fb3], [-0.7, 1.95, -0.85, 0xffd23a], [0.4, 3.55, 0.3, 0xff8fb3], [-1.0, 2.8, -0.3, 0xff4d4d]];
    const fruitGeo = () => cached('fruit', () => mergeParts(FRUIT.map(([x, y, z, c]) => ({ geo: cached('fr', () => new T.SphereGeometry(0.13, 8, 6)), x, y, z, color: c }))));

    // --- personaggi ---------------------------------------------------------
    // Arto con perno in alto (anca o spalla). Ordine di rotazione YXZ: prima si alza (x), poi ruota sul piano orizzontale (y).
    function limb(parent, x, y, r, len, m) {
      const pivot = new T.Group(); pivot.position.set(x, y, 0); pivot.rotation.order = 'YXZ'; parent.add(pivot);
      cyl(r, r, len, m, 0, -len / 2, 0, pivot, 12);
      ball(r, m, 0, -len, 0, pivot, 12, 8); // estremità arrotondata
      return pivot;
    }
    // Braccio con gomito: spalla (sh) → braccio → gomito (el) → avambraccio → mano.
    const UP = 0.24, FORE = 0.24;
    function arm(parent, x, y, r, m) {
      const sh = new T.Group(); sh.position.set(x, y, 0); sh.rotation.order = 'YXZ'; parent.add(sh);
      cyl(r, r, UP, m, 0, -UP / 2, 0, sh, 10);
      ball(r * 1.05, m, 0, -UP, 0, sh, 10, 8); // gomito
      const el = new T.Group(); el.position.y = -UP; sh.add(el);
      cyl(r * 0.92, r * 0.92, FORE, m, 0, -FORE / 2, 0, el, 10);
      ball(r * 1.35, mats.skin, 0, -FORE - 0.02, 0, el, 10, 8); // mano
      return { sh, el };
    }
    // Ascia nella mano destra: il manico prosegue l'avambraccio, la lama guida il colpo.
    function axe(el) {
      const g = new T.Group(); el.add(g);
      cyl(0.03, 0.03, 0.62, mats.trunk, 0, -0.4, 0, g, 10);
      box(0.05, 0.22, 0.26, mats.steel, 0, -0.66, -0.1, g, 0.02);
      g.visible = false;
      return g;
    }
    // Faccia (una sola mesh condivisa, colori per vertice): occhioni bianchi con pupilla e riflesso, sorriso, guanciotte rosa.
    const faceGeo = () => cached('face', () => mergeParts([
      { geo: cached('eyeW', () => new T.SphereGeometry(0.075, 10, 8)), x: -0.11, y: 0.03, z: 0.235, color: 0xffffff },
      { geo: cached('eyeW', () => new T.SphereGeometry(0.075, 10, 8)), x: 0.11, y: 0.03, z: 0.235, color: 0xffffff },
      { geo: cached('eyeP', () => new T.SphereGeometry(0.045, 8, 6)), x: -0.11, y: 0.025, z: 0.27, color: 0x1f2a37 },
      { geo: cached('eyeP', () => new T.SphereGeometry(0.045, 8, 6)), x: 0.11, y: 0.025, z: 0.27, color: 0x1f2a37 },
      { geo: cached('eyeH', () => new T.SphereGeometry(0.016, 6, 5)), x: -0.1, y: 0.045, z: 0.305, color: 0xffffff },
      { geo: cached('eyeH', () => new T.SphereGeometry(0.016, 6, 5)), x: 0.12, y: 0.045, z: 0.305, color: 0xffffff },
      { geo: cached('cheek', () => new T.SphereGeometry(0.05, 8, 6)), x: -0.19, y: -0.07, z: 0.2, s: [1, 0.7, 0.4], color: 0xff8fa8 },
      { geo: cached('cheek', () => new T.SphereGeometry(0.05, 8, 6)), x: 0.19, y: -0.07, z: 0.2, s: [1, 0.7, 0.4], color: 0xff8fa8 },
      { geo: cached('smile', () => new T.TorusGeometry(0.07, 0.014, 6, 12, Math.PI).rotateZ(Math.PI)), x: 0, y: -0.07, z: 0.285, color: 0x7a2f2f }
    ]));
    // Omino stile "stickman": busto stretto, testa grande, sciarpa, berretto con pon pon, arti sottili con gomiti.
    // Il busto (up) sta su un perno all'altezza dei fianchi: si inclina e ruota quando taglia o lancia.
    const HIP = 0.42;
    function person(coat, hat, withAxe) {
      const g = new T.Group();
      const coatM = tint(coat), hatM = tint(hat);
      const legs = [limb(g, -0.1, HIP, 0.07, 0.38, mats.dark), limb(g, 0.1, HIP, 0.07, 0.38, mats.dark)];
      const up = new T.Group(); up.position.y = HIP; g.add(up);
      cyl(0.19, 0.21, 0.74, coatM, 0, 0.8 - HIP, 0, up);
      ball(0.19, coatM, 0, 1.17 - HIP, 0, up).scale.y = 0.35; // spalle arrotondate
      const scarf = new T.Mesh(cached('scarf', () => new T.TorusGeometry(0.2, 0.06, 8, 16).rotateX(Math.PI / 2)), hatM); scarf.position.y = 1.22 - HIP; scarf.castShadow = true; up.add(scarf);
      ball(0.3, mats.skin, 0, 1.52 - HIP, 0, up);
      const face = new T.Mesh(faceGeo(), mats.face); face.position.y = 1.52 - HIP; up.add(face);
      const cap = new T.Mesh(cached('cap', () => new T.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), hatM); cap.position.y = 1.57 - HIP; cap.castShadow = true; up.add(cap);
      const pom = new T.Mesh(cached('pom', () => new T.SphereGeometry(0.085, 12, 10)), mats.white); pom.position.y = 1.94 - HIP; up.add(pom);
      const arms = [-1, 1].map(side => arm(up, side * 0.27, 1.15 - HIP, 0.06, coatM));
      Object.assign(g.userData, {
        legs, up, arms: arms.map(a => a.sh), elbows: arms.map(a => a.el), axe: withAxe ? axe(arms[1].el) : null,
        ph: 0, t: Math.random() * 6, mv: 0, chopT: 0, chopDur: 1, ck: 1, cb: 0, tossT: 0, tossDur: 1, tk: 1, tb: 0
      });
      scene.add(g);
      return g;
    }

    // Pose del colpo d'ascia lungo un ciclo continuo k = 0 → 1: carica (sopra la testa), pausa, colpo veloce, seguito.
    // A fine ciclo la posa coincide con quella di inizio: colpi uno dopo l'altro scorrono senza scatti.
    const FOLLOW = { sh: -0.95, el: -0.15, lean: 0.18, tw: 0.12 }, READY = { sh: -2.55, el: -1.0, lean: -0.14, tw: -0.2 }, HIT = { sh: -1.3, el: -0.3, lean: 0.36, tw: 0.2 };
    const pose = { sh: 0, el: 0, lean: 0, tw: 0 };
    function lerpPose(a, b, t) { pose.sh = mix(a.sh, b.sh, t); pose.el = mix(a.el, b.el, t); pose.lean = mix(a.lean, b.lean, t); pose.tw = mix(a.tw, b.tw, t); }
    function chopPose(k) {
      if (k < 0.3) lerpPose(FOLLOW, READY, sm(k / 0.3));
      else if (k < 0.4) lerpPose(READY, READY, 0);
      else if (k < 0.7) { const t = (k - 0.4) / 0.3; lerpPose(READY, HIT, t * t * (0.4 + 0.6 * t)); }
      else { const t = (k - 0.7) / 0.3; lerpPose(HIT, FOLLOW, 1 - (1 - t) * (1 - t)); }
    }
    // Lancio (legna al camino, tazza all'ospite): le braccia vanno avanti e indietro con un piccolo affondo.
    function tossPose(k) {
      const a = Math.sin(Math.min(1, k) * Math.PI);
      pose.sh = -1.0 - 0.7 * a; pose.el = -0.7 + 0.55 * a; pose.lean = 0.28 * a; pose.tw = 0;
    }

    // Posa del personaggio, da chiamare ogni fotogramma: camminata (gambe e braccia opposte, gomiti piegati),
    // respiro quando sta fermo, colpo d'ascia e lancio che si fondono con la posa di base (niente scatti).
    function walk(o, moving, dt) {
      const u = o.userData;
      u.t += dt;
      if (moving) u.ph += dt * 12;
      u.mv += ((moving ? 1 : 0) - u.mv) * Math.min(1, dt * 10);
      const s = Math.sin(u.ph) * 0.55 * u.mv;
      u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
      let sh0 = [-s * 0.85, s * 0.85], el0 = -0.2 - 0.25 * u.mv, lean = 0.05 * u.mv, tw = Math.sin(u.ph) * 0.07 * u.mv, armIn = 0.12;
      let sh = sh0.slice(), el = [el0, el0];

      if (u.chopT > 0) { u.chopT = Math.max(0, u.chopT - dt); u.ck = 1 - u.chopT / u.chopDur; }
      u.cb += ((u.chopT > 0 ? 1 : 0) - u.cb) * Math.min(1, dt * 14);
      if (u.cb > 0.01) {
        chopPose(u.ck); const b = u.cb;
        sh[0] = mix(sh[0], pose.sh + 0.1, b); sh[1] = mix(sh[1], pose.sh, b); el[0] = mix(el[0], pose.el, b); el[1] = mix(el[1], pose.el, b);
        lean = mix(lean, pose.lean, b); tw = mix(tw, pose.tw, b); armIn = mix(armIn, -0.05, b);
      }
      if (u.tossT > 0) { u.tossT = Math.max(0, u.tossT - dt); u.tk = 1 - u.tossT / u.tossDur; }
      u.tb += ((u.tossT > 0 ? 1 : 0) - u.tb) * Math.min(1, dt * 16);
      if (u.tb > 0.01) {
        tossPose(u.tk); const b = u.tb;
        sh[0] = mix(sh[0], pose.sh, b); sh[1] = mix(sh[1], pose.sh, b); el[0] = mix(el[0], pose.el, b); el[1] = mix(el[1], pose.el, b); lean = mix(lean, pose.lean, b);
      }
      u.arms[0].rotation.x = sh[0]; u.arms[1].rotation.x = sh[1];
      u.arms[0].rotation.z = -armIn; u.arms[1].rotation.z = armIn;
      u.elbows[0].rotation.x = el[0]; u.elbows[1].rotation.x = el[1];
      u.up.rotation.x = lean; u.up.rotation.y = tw;
      u.up.position.y = HIP + Math.abs(Math.sin(u.ph)) * 0.05 * u.mv + Math.sin(u.t * 2.4) * 0.008 * (1 - u.mv);
      if (u.axe) u.axe.visible = u.cb > 0.15;
    }
    // Avvia un colpo d'ascia o un lancio della durata indicata (secondi).
    function swing(o, dur) { o.userData.chopT = o.userData.chopDur = dur; }
    function toss(o, dur) { o.userData.tossT = o.userData.tossDur = dur || 0.25; }
    // Frazione della durata del colpo in cui l'ascia arriva sul tronco (serve per far reagire l'albero al momento giusto).
    const HIT_AT = 0.7;

    // Muove o verso (x, z); true quando è arrivato entro stop.
    function moveTo(o, x, z, sp, dt, stop) {
      const p = o.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
      if (d <= stop) { walk(o, 0, dt); return true; }
      const s = Math.min(d, sp * dt); p.x += dx / d * s; p.z += dz / d * s; o.rotation.y = Math.atan2(dx, dz); walk(o, 1, dt);
      return false;
    }
    function follow(o, path, sp, dt) {
      if (!path.length) return true;
      if (moveTo(o, path[0][0], path[0][1], sp, dt, 0.12)) path.shift();
      return !path.length;
    }

    const logGeo = new T.CylinderGeometry(0.09, 0.09, 0.55, 14);
    const cupGeo = new T.CylinderGeometry(0.11, 0.08, 0.2, 16);
    const coinGeo = new T.CylinderGeometry(0.17, 0.17, 0.06, 24);
    // Carico sulla schiena: legna a strati di 3 tronchi, tazze sopra a file di 3.
    function drawStack(g, logs, cups) {
      clear(g);
      for (let i = 0; i < logs; i++) {
        const m = new T.Mesh(logGeo, mats.wood); m.rotation.z = Math.PI / 2;
        m.position.set(0, Math.floor(i / 3) * 0.19, -(i % 3) * 0.19); add(m, g);
      }
      const base = Math.ceil(logs / 3) * 0.19;
      for (let i = 0; i < cups; i++) {
        const m = new T.Mesh(cupGeo, mats.cup);
        m.position.set(((i % 3) - 1) * 0.22, base + 0.04 + Math.floor(i / 3) * 0.22, -0.19); add(m, g);
      }
    }

    return { T, M, mats, tint, add, box, cyl, ball, clear, tree, person, walk, swing, toss, HIT_AT, moveTo, follow, drawStack, cupGeo, coinGeo, logGeo, mergeParts, cached, sm };
  };
})(window.Rifugio);
