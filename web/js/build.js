// Costruzione della scena: materiali, scatole con spigoli arrotondati, cilindri lisci, abeti, omini, pile di legna.
(function (R) {
  'use strict';

  const SEG = 16; // segmenti dei cilindri: abbastanza per bordi tondi senza pesare sul telefono

  R.createBuilder = function (scene) {
    const T = THREE;
    // Luce calcolata per pixel (Phong): le superfici curve restano lisce invece di mostrare le sfaccettature.
    const M = (c, extra) => new T.MeshPhongMaterial(Object.assign({ color: c, shininess: 6, specular: 0x111111 }, extra));
    const mats = {
      snow: M(0xf4f7fb), foliage: M(0xffffff, { vertexColors: true }), pine: M(0x2f6b4f), pine2: M(0x3d8460), trunk: M(0x6b4430), wood: M(0x9a6a45),
      plank: M(0xc89b6d), stone: M(0x8d939c), red: M(0xd94f3d), skin: M(0xf2c9a0), dark: M(0x2d3440),
      bed: M(0xe9e2d0), blanket: M(0x4f7cc4), gold: M(0xf2b632, { shininess: 40, specular: 0x665522 }), cup: M(0xb8452f),
      path: M(0xd8ccb8), rock: M(0x8fa6bf), cocoa: M(0x5a3220), steel: M(0xb9c2cc, { shininess: 50, specular: 0x555555 }),
      pad: new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      ghost: M(0xc89b6d, { transparent: true, opacity: 0.3 }),
      flame: new T.MeshBasicMaterial({ color: 0xffa233 }),
      arrow: new T.MeshBasicMaterial({ color: 0xf2b632 })
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

    // Abete. "fall" contiene tronco e chioma e può inclinarsi o cadere ruotando attorno alla base;
    // "stump" è il ceppo che resta dopo l'abbattimento. Ogni abete ha materiali propri per poter diventare trasparente.
    function tree(x, z, sc) {
      const tm = { trunk: mats.trunk.clone(), foliage: mats.foliage.clone(), snow: mats.snow.clone() };
      const g = new T.Group(); g.position.set(x, 0, z); if (sc) g.scale.setScalar(sc);
      const stump = cyl(0.22, 0.27, 0.3, tm.trunk, 0, 0.15, 0, g, 16); stump.visible = false;
      const fall = new T.Group(); g.add(fall);
      const part = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; fall.add(o); return o; };
      part(cached('treeTrunk', () => new T.CylinderGeometry(0.15, 0.25, 1.4, 10).translate(0, 0.7, 0)), tm.trunk);
      part(foliageGeo(), tm.foliage);
      part(snowCapsGeo(), tm.snow);
      scene.add(g);
      return { g, fall, stump, mats: Object.values(tm) };
    }

    // Chioma dell'abete: sei piani di cono sovrapposti e ruotati l'uno rispetto all'altro (due verdi che si alternano),
    // ognuno con un cappello di neve. Tutti i piani sono fusi in una sola mesh (la neve in un'altra) e condivisi da tutti gli abeti.
    const TIERS = [[1.4, 1.0, 0.8], [1.2, 0.95, 1.4], [1.0, 0.9, 1.95], [0.8, 0.85, 2.45], [0.6, 0.8, 2.9], [0.38, 0.8, 3.3]]; // raggio, altezza, base
    function mergeParts(parts) {
      const pos = [], nor = [], col = [], idx = []; let off = 0;
      parts.forEach(p => {
        const g = p.geo.clone().rotateY(p.ry || 0).translate(0, p.y, 0), pa = g.attributes.position, na = g.attributes.normal, c = new T.Color(p.color || 0xffffff);
        for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); col.push(c.r, c.g, c.b); }
        for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
        off += pa.count; g.dispose();
      });
      const m = new T.BufferGeometry();
      m.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      m.setAttribute('color', new T.Float32BufferAttribute(col, 3)); m.setIndex(idx);
      return m;
    }
    // Un piano di chioma morbido (non a spigoli): profilo curvo che si allarga verso il basso, bordo ondulato a ciuffi
    // che pende un po' e 24 lati con luce liscia. wob = profondità dei ciuffi, ph = fase delle onde.
    function tierGeo(r, h, wob, ph) {
      const g = new T.CylinderGeometry(0.02, r, h, 24, 4), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rad = Math.hypot(x, z);
        if (rad < 1e-5) continue;
        const k = Math.min(1, Math.max(0, 1 - (y + h / 2) / h)); // 0 in punta, 1 alla base
        const w = Math.sin(5 * Math.atan2(z, x) + ph);       // 5 ciuffi per piano
        const nr = r * Math.pow(k, 0.7) * (1 + wob * k * k * w);
        p.setXYZ(i, x / rad * nr, y - wob * h * 0.55 * Math.pow(k, 3) * (0.5 + 0.5 * w), z / rad * nr);
      }
      g.computeVertexNormals();
      return g;
    }
    const foliageGeo = () => cached('treeFoliage', () => mergeParts(TIERS.map(([r, h, y], i) => ({
      geo: tierGeo(r, h, 0.13, i * 1.3), y: y + h / 2, ry: i * 0.6, color: i % 2 ? 0x3d8460 : 0x2f6b4f
    }))));
    const snowCapsGeo = () => cached('treeSnow', () => mergeParts(TIERS.map(([r, h, y], i) => ({
      geo: tierGeo(r * 0.7, h * 0.42, 0.28, i * 1.3), y: y + h + 0.06 - h * 0.21, ry: i * 0.6
    }))));

    // Arto con perno in alto (anca o spalla). Ordine di rotazione YXZ: prima si alza (x), poi ruota sul piano orizzontale (y).
    function limb(parent, x, y, r, len, m) {
      const pivot = new T.Group(); pivot.position.set(x, y, 0); pivot.rotation.order = 'YXZ'; parent.add(pivot);
      cyl(r, r, len, m, 0, -len / 2, 0, pivot, 12);
      ball(r, m, 0, -len, 0, pivot, 12, 8); // estremità arrotondata
      return pivot;
    }

    // Ascia nella mano destra: il manico prosegue il braccio, la lama guarda nella direzione del colpo.
    function axe(arm) {
      const g = new T.Group(); arm.add(g);
      cyl(0.035, 0.035, 0.6, mats.trunk, 0, -0.78, 0, g, 12);
      box(0.24, 0.2, 0.04, mats.steel, -0.11, -1.0, 0, g, 0.015);
      g.visible = false;
      return g;
    }

    // Omino con cappotto, cappello a pon pon, braccia e gambe animabili. withAxe: porta l'ascia (giocatore, boscaiolo).
    function person(coat, hat, withAxe) {
      const g = new T.Group();
      // Stile "omino": busto stretto, testa grande e tonda, berretto basso con pon pon, arti sottili.
      cyl(0.19, 0.21, 0.74, tint(coat), 0, 0.8, 0, g);
      ball(0.19, tint(coat), 0, 1.17, 0, g).scale.y = 0.35; // spalle arrotondate
      ball(0.3, mats.skin, 0, 1.52, 0, g);
      const cap = new T.Mesh(cached('cap', () => new T.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), tint(hat)); cap.position.y = 1.56; cap.castShadow = true; g.add(cap);
      const pom = new T.Mesh(cached('pom', () => new T.SphereGeometry(0.085, 12, 10)), mats.snow); pom.position.y = 1.93; g.add(pom);
      [-0.1, 0.1].forEach(ex => { const e = new T.Mesh(cached('eye', () => new T.SphereGeometry(0.035, 8, 6)), mats.dark); e.position.set(ex, 1.5, 0.275); g.add(e); });
      const legs = [limb(g, -0.1, 0.42, 0.07, 0.38, mats.dark), limb(g, 0.1, 0.42, 0.07, 0.38, mats.dark)];
      const arms = [-1, 1].map(side => {
        const arm = limb(g, side * 0.27, 1.15, 0.06, 0.45, tint(coat));
        arm.rotation.z = side * 0.12; // leggermente aperte
        ball(0.08, mats.skin, 0, -0.5, 0, arm, 12, 10);
        return arm;
      });
      Object.assign(g.userData, { legs, arms, axe: withAxe ? axe(arms[1]) : null, ph: 0, chopT: 0, chopDur: 1 });
      scene.add(g);
      return g;
    }

    // Posa del personaggio, da chiamare ogni fotogramma: camminata (gambe e braccia opposte)
    // oppure colpo d'ascia orizzontale: braccia tese in avanti, carica di lato, colpo trasversale verso l'albero.
    function walk(o, moving, dt) {
      const u = o.userData;
      if (moving) u.ph += dt * 12;
      const a = moving ? Math.sin(u.ph) * 0.55 : 0;
      u.legs[0].rotation.x = a; u.legs[1].rotation.x = -a;
      let ax = [-a * 0.8, a * 0.8], ay = 0;
      if (u.chopT > 0) {
        u.chopT = Math.max(0, u.chopT - dt);
        const k = 1 - u.chopT / u.chopDur; // 0 → 1
        const lift = -1.45 * Math.min(1, k / 0.25);
        ay = k < 0.5 ? 1.3 * Math.sin(k / 0.5 * Math.PI / 2) : 1.3 - 2.0 * Math.sin((k - 0.5) / 0.5 * Math.PI / 2);
        ax = [lift, lift];
      }
      u.arms.forEach((arm, i) => { arm.rotation.x = ax[i]; arm.rotation.y = ay; });
      if (u.axe) u.axe.visible = u.chopT > 0;
    }
    // Avvia un colpo d'ascia della durata indicata (secondi).
    function swing(o, dur) { o.userData.chopT = o.userData.chopDur = dur; }
    // Frazione della durata del colpo in cui l'ascia arriva sul tronco (serve per far reagire l'albero al momento giusto).
    const HIT_AT = 0.72;

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
    // Carico sulla schiena: legna a strati di 3 tronchi, cioccolate sopra a file di 3.
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

    return { T, M, mats, tint, add, box, cyl, ball, clear, tree, person, walk, swing, HIT_AT, moveTo, follow, drawStack, cupGeo, coinGeo };
  };
})(window.Rifugio);
