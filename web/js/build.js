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
    // Texture a puntini (ghiaia, sabbia) disegnata al volo: nessun file da scaricare.
    // Con "stones" (ghiaia e sabbia dei sentieri) la texture è più grande e nitida, con sassolini dal bordo scuro e un riflesso chiaro.
    function speckle(o) {
      const S = o.stones ? 256 : 128, k = S / 128;
      const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
      x.fillStyle = o.base; x.fillRect(0, 0, S, S);
      const n = o.stones ? Math.round(o.n * k * k * 0.7) : o.n;
      for (let i = 0; i < n; i++) {
        const col = o.cols[i % o.cols.length], s = (o.min + Math.random() * (o.max - o.min)) * (o.stones ? k * 0.8 : 1), px = Math.random() * S, py = Math.random() * S, rot = Math.random() * 3;
        x.fillStyle = col; x.beginPath(); x.ellipse(px, py, s, s * 0.75, rot, 0, 6.3); x.fill();
        if (o.stones) {
          x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 0.7 * k; x.stroke();
          x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.ellipse(px - s * 0.25, py - s * 0.25, s * 0.4, s * 0.25, rot, 0, 6.3); x.fill();
        }
      }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
    }
    // Terreno con una leggera texture a macchie dello stesso colore (neve, erba, terra): più vivo di un colore piatto.
    const gc = new T.Color(theme.ground != null ? theme.ground : 0xf6f9ff), gh = {}; gc.getHSL(gh);
    const shade = d => '#' + new T.Color().setHSL(gh.h, gh.s, Math.max(0, Math.min(1, gh.l + d))).getHexString();
    const groundTex = speckle({ base: '#' + gc.getHexString(), cols: [shade(0.035), shade(-0.035), shade(0.06), shade(-0.06)], n: 1100, min: 1.2, max: 5 });
    groundTex.repeat.set(34, 34);
    const mats = {
      snow: M(0xf6f9ff), ground: M(0xffffff, { map: groundTex }), blob: new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13, depthWrite: false, visible: false }), /* niente ombra rotonda sotto i personaggi: c'è già l'ombra vera */ path: theme.pathTex ? M(0xffffff, { map: speckle(Object.assign({ stones: true }, theme.pathTex)) }) : M(theme.path || 0xe8dcc4),
      hill: M(theme.hill || 0x8fb0d8), peak: M(theme.peak || 0xf6f9ff),
      foliage: M(0xffffff, { vertexColors: true }), accent: M(0xffffff, { vertexColors: true }), face: M(0xffffff, { vertexColors: true, shininess: 0, specular: 0x000000 }),
      trunk: M(0x7a4a30), wood: M(0xb07848),
      plank: M(0xe6b27a), stone: M(0x9aa1ab), red: M(0xf0503a), skin: M(0xffd0a8), dark: M(0x2f3a4d),
      bed: M(0xfff1da), blanket: M(0x3d8bff), gold: M(0xffc83a, { shininess: 60, specular: 0x887733 }), cup: M(theme.cup || 0xd0502e),
      cocoa: M(theme.cupLiquid || 0x5a3220), steel: M(0xc4ccd6, { shininess: 50, specular: 0x555555 }),
      water: M(theme.water || 0x4fc3f7, { shininess: 80, specular: 0xaaddff, transparent: true, opacity: 0.88 }), sand: M(0xf1dca0),
      pants: M(0x38487a), boots: M(0x5a3b2a), belt: M(0x3a2a20), tux: M(0x17171d, { shininess: 25, specular: 0x333333 }),
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
      const o = new T.Mesh(cached(`s${r}_${ws || 14}_${hs || 10}`, () => new T.SphereGeometry(r, ws || 14, hs || 10)), m);
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
      const part = (geo, m, shadow) => { const o = new T.Mesh(geo, m); o.castShadow = shadow; o.receiveShadow = shadow; fall.add(o); return o; };
      part(cached('treeTrunk', () => new T.CylinderGeometry(0.15, 0.25, 1.4, 8).translate(0, 0.7, 0)), tm.trunk, true);
      part(leafy ? leafyGeo() : foliageGeo(), tm.foliage, true);
      part(leafy ? fruitGeo() : snowCapsGeo(), tm.top, false); // frutti e neve non proiettano ombra (si disegnerebbero due volte per niente)
      scene.add(g);
      return { g, fall, stump, mats: Object.values(tm) };
    }

    // Abete: sei piani morbidi di cono sovrapposti e ruotati (due verdi che si alternano), ognuno con un cappello di neve a ciuffi.
    const TIERS = [[1.4, 1.0, 0.8], [1.2, 0.95, 1.4], [1.0, 0.9, 1.95], [0.8, 0.85, 2.45], [0.6, 0.8, 2.9], [0.38, 0.8, 3.3]]; // raggio, altezza, base
    function tierGeo(r, h, wob, ph) {
      const g = new T.CylinderGeometry(0.02, r, h, 15, 2), p = g.attributes.position;
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
      geo: cached('blob', () => new T.SphereGeometry(1, 10, 7)), x, y, z, s: [r, r * 0.88, r], color: (theme.leafCols || [0x5ccf5b, 0x3fb14f])[i % (theme.leafCols || [0, 0]).length]
    }))));
    const FRUIT = [[0.9, 2.6, 0.9, 0xff4d4d], [-0.9, 2.4, 0.5, 0xff8fb3], [0.2, 3.1, 0.85, 0xffd23a], [-0.3, 3.35, -0.7, 0xff4d4d], [0.95, 2.1, -0.5, 0xff8fb3], [-0.7, 1.95, -0.85, 0xffd23a], [0.4, 3.55, 0.3, 0xff8fb3], [-1.0, 2.8, -0.3, 0xff4d4d]];
    const fruitGeo = () => cached('fruit', () => mergeParts(FRUIT.map(([x, y, z, c], i) => ({ geo: cached('fr', () => new T.SphereGeometry(0.13, 6, 4)), x, y, z, color: theme.accentCols ? theme.accentCols[i % theme.accentCols.length] : c }))));

    // --- personaggi ---------------------------------------------------------
    // Arto con perno in alto (anca o spalla). Ordine di rotazione YXZ: prima si alza (x), poi ruota sul piano orizzontale (y).
    function limb(parent, x, y, r, len, m) {
      const pivot = new T.Group(); pivot.position.set(x, y, 0); pivot.rotation.order = 'YXZ'; parent.add(pivot);
      cyl(r, r, len, m, 0, -len / 2, 0, pivot, 12);
      ball(r, m, 0, -len, 0, pivot, 12, 8); // estremità arrotondata
      return pivot;
    }
    // Braccio con gomito: spalla (sh) → braccio → gomito (el) → avambraccio → mano.
    // o.short: maniche corte (braccio nudo con una manica di maglietta); o.cuffM: polsino; o.handM: guanto (senza: mano nuda).
    const UP = 0.24, FORE = 0.24;
    function arm(parent, x, y, r, m, o) {
      o = o || {};
      const upM = o.short ? mats.skin : m, handM = o.handM || mats.skin;
      const sh = new T.Group(); sh.position.set(x, y, 0); sh.rotation.order = 'YXZ'; parent.add(sh);
      cyl(r, r * 0.95, UP, upM, 0, -UP / 2, 0, sh, 10);
      if (o.short) cyl(r * 1.2, r * 1.15, 0.13, m, 0, -0.065, 0, sh, 10); // manica corta
      ball(r * 1.05, upM, 0, -UP, 0, sh, 10, 8); // gomito
      const el = new T.Group(); el.position.y = -UP; sh.add(el);
      cyl(r * 0.95, r * 0.85, FORE, o.short ? mats.skin : m, 0, -FORE / 2, 0, el, 10);
      if (o.cuffM) cyl(r * 1.08, r * 1.08, 0.05, o.cuffM, 0, -FORE + 0.015, 0, el, 10); // polsino
      ball(r * 1.45, handM, 0, -FORE - 0.03, 0, el, 10, 8); // mano
      return { sh, el };
    }
    // Attrezzi nella mano: il manico prosegue l'avambraccio. Il colpo è orizzontale (come un'ascia vera), quindi la lama
    // sta in un piano orizzontale e guida il movimento verso il lato (x negativo dell'avambraccio).
    function axe(el) {
      const g = new T.Group(); el.add(g);
      cyl(0.03, 0.03, 0.64, mats.trunk, 0, -0.4, 0, g, 10);
      box(0.28, 0.22, 0.04, mats.steel, -0.14, -0.68, 0, g, 0.015); // lama affilata
      box(0.07, 0.1, 0.07, mats.dark, 0, -0.66, 0, g, 0.02);         // testa dell'ascia
      g.visible = false;
      return g;
    }
    // Motosega: corpo arancione, barra d'acciaio con catena, impugnatura.
    function chainsaw(el) {
      const g = new T.Group(); el.add(g);
      box(0.15, 0.24, 0.17, mats.orange, 0, -0.3, 0, g, 0.03);
      box(0.1, 0.05, 0.1, mats.dark, 0, -0.16, 0, g, 0.02);
      box(0.12, 0.62, 0.05, mats.steel, 0, -0.74, 0, g, 0.015);
      box(0.135, 0.64, 0.03, mats.dark, 0, -0.74, 0, g, 0.01);
      g.visible = false;
      return g;
    }
    // Faccia (una sola mesh condivisa, colori per vertice): occhioni bianchi con pupilla e riflesso, sorriso, guanciotte rosa, naso, orecchie.
    const faceGeo = () => cached('face', () => mergeParts([
      { geo: cached('eyeW', () => new T.SphereGeometry(0.075, 10, 8)), x: -0.11, y: 0.03, z: 0.235, color: 0xffffff },
      { geo: cached('eyeW', () => new T.SphereGeometry(0.075, 10, 8)), x: 0.11, y: 0.03, z: 0.235, color: 0xffffff },
      { geo: cached('eyeP', () => new T.SphereGeometry(0.045, 8, 6)), x: -0.11, y: 0.025, z: 0.27, color: 0x1f2a37 },
      { geo: cached('eyeP', () => new T.SphereGeometry(0.045, 8, 6)), x: 0.11, y: 0.025, z: 0.27, color: 0x1f2a37 },
      { geo: cached('eyeH', () => new T.SphereGeometry(0.016, 6, 5)), x: -0.1, y: 0.045, z: 0.305, color: 0xffffff },
      { geo: cached('eyeH', () => new T.SphereGeometry(0.016, 6, 5)), x: 0.12, y: 0.045, z: 0.305, color: 0xffffff },
      { geo: cached('cheek', () => new T.SphereGeometry(0.05, 8, 6)), x: -0.19, y: -0.07, z: 0.2, s: [1, 0.7, 0.4], color: 0xff8fa8 },
      { geo: cached('cheek', () => new T.SphereGeometry(0.05, 8, 6)), x: 0.19, y: -0.07, z: 0.2, s: [1, 0.7, 0.4], color: 0xff8fa8 },
      { geo: cached('smile', () => new T.TorusGeometry(0.07, 0.014, 6, 12, Math.PI).rotateZ(Math.PI)), x: 0, y: -0.07, z: 0.285, color: 0x7a2f2f },
      { geo: cached('nose', () => new T.SphereGeometry(0.04, 8, 6)), x: 0, y: -0.01, z: 0.295, color: 0xffbd96 },
      { geo: cached('ear', () => new T.SphereGeometry(0.06, 8, 6)), x: -0.295, y: 0, z: 0, s: [0.55, 1, 0.8], color: 0xffd0a8 },
      { geo: cached('ear', () => new T.SphereGeometry(0.06, 8, 6)), x: 0.295, y: 0, z: 0, s: [0.55, 1, 0.8], color: 0xffd0a8 }
    ]));
    // Busto più umano: una sola forma tornita con spalle, torace, vita stretta e fianchi (poi appiattita davanti-dietro).
    const torsoGeo = () => cached('torso', () => new T.LatheGeometry([
      [0.001, 0], [0.17, 0.01], [0.215, 0.1], [0.2, 0.2], [0.165, 0.34], [0.19, 0.5], [0.225, 0.64], [0.2, 0.72], [0.1, 0.78], [0.001, 0.79]
    ].map(p => new T.Vector2(p[0], p[1])), 20).scale(1, 1, 0.78));

    // Omino stile "stickman" con tre guardaroba:
    //  'winter': giaccone con cintura e bottoni, sciarpa, berretto con pon pon, guanti, scarponcini;
    //  'summer': maglietta a maniche corte, pantaloncini, sneakers, berretto con visiera;
    //  'waiter': smoking nero, camicia bianca con papillon, pantaloni e scarpe nere, capelli neri, vassoio per le bevande.
    // Il busto (up) sta su un perno all'altezza dei fianchi: si inclina e ruota quando taglia o lancia.
    const HIP = 0.42;
    const roundBootGeo = () => roundBoxGeo(0.14, 0.1, 0.24, 0.04);
    const roundShoeGeo = () => roundBoxGeo(0.13, 0.08, 0.24, 0.035);
    function person(coat, hat, withTool, style, opt) {
      style = style || 'winter'; opt = opt || {};
      const g = new T.Group();
      // 'spring' = felpa a maniche lunghe, jeans, sneakers e berretto con visiera
      const summer = style === 'summer', spring = style === 'spring', waiter = style === 'waiter', visor = summer || spring;
      const coatM = waiter ? mats.tux : tint(coat), hatM = tint(hat);
      const pantsM = waiter ? mats.tux : summer ? tint(opt.shorts || 0x3b6fd4) : spring ? tint(0x3f62b0) : mats.pants;
      // gambe
      const legs = [-1, 1].map(s => {
        const leg = new T.Group(); leg.position.set(s * 0.09, HIP, 0); leg.rotation.order = 'YXZ'; g.add(leg);
        if (summer) {
          cyl(0.088, 0.085, 0.23, pantsM, 0, -0.115, 0, leg, 10);          // pantaloncini
          cyl(0.058, 0.052, 0.2, mats.skin, 0, -0.3, 0, leg, 10);          // polpaccio nudo
          cyl(0.062, 0.062, 0.04, mats.white, 0, -0.345, 0, leg, 10);      // calzino
          const shoe = new T.Mesh(roundShoeGeo(), tint(opt.shoes || 0xffffff)); shoe.position.set(0, -0.385, 0.05); shoe.castShadow = true; leg.add(shoe);
        } else {
          cyl(0.075, 0.07, 0.4, pantsM, 0, -0.2, 0, leg, 12); ball(0.075, pantsM, 0, -0.4, 0, leg, 12, 8);
          const shoe = spring ? new T.Mesh(roundShoeGeo(), tint(opt.shoes || 0xffffff)) : new T.Mesh(roundBootGeo(), waiter ? mats.tux : mats.boots);
          shoe.position.set(0, spring ? -0.385 : -0.375, 0.05); shoe.castShadow = true; leg.add(shoe);
        }
        return leg;
      });
      const up = new T.Group(); up.position.y = HIP; g.add(up);
      const torso = new T.Mesh(torsoGeo(), coatM); torso.castShadow = true; up.add(torso);
      if (waiter) {
        box(0.17, 0.32, 0.05, mats.white, 0, 0.56, 0.118, up, 0.02);                  // pettorina della camicia
        box(0.2, 0.05, 0.06, mats.white, 0, 0.745, 0.1, up, 0.02);                    // colletto
        [0.62, 0.52, 0.42].forEach(by => ball(0.014, mats.tux, 0, by, 0.147, up, 6, 5)); // bottoni
        [-1, 1].forEach(s => { const w = new T.Mesh(B_cone(), mats.tux); w.rotation.z = s * Math.PI / 2; w.position.set(s * 0.045, 0.725, 0.15); up.add(w); });
        ball(0.026, mats.tux, 0, 0.725, 0.15, up, 8, 6);                              // papillon
        const hair = new T.Mesh(cached('hairW', () => new T.SphereGeometry(0.315, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), mats.tux); hair.position.y = 1.56 - HIP; hair.castShadow = true; up.add(hair);
      } else if (visor) {
        const col = new T.Mesh(cached('tcol', () => new T.TorusGeometry(0.105, 0.02, 6, 14).rotateX(Math.PI / 2)), mats.white); col.position.y = 0.77; up.add(col); // scollo
        const str = new T.Mesh(cached('tstr', () => new T.TorusGeometry(0.196, 0.016, 6, 18).rotateX(Math.PI / 2)), mats.white); str.position.y = 0.47; str.scale.z = 0.78; up.add(str); // riga
      } else {
        const belt = new T.Mesh(cached('belt', () => new T.TorusGeometry(0.172, 0.022, 6, 18).rotateX(Math.PI / 2)), mats.belt); belt.position.y = 0.34; belt.scale.z = 0.78; up.add(belt);
        box(0.07, 0.06, 0.03, mats.gold, 0, 0.34, 0.138, up, 0.01);
        [0.47, 0.57, 0.67].forEach((by, k) => ball(0.022, mats.gold, 0, by, 0.148 + k * 0.007, up, 6, 5));
        const scarf = new T.Mesh(cached('scarf', () => new T.TorusGeometry(0.15, 0.062, 8, 16).rotateX(Math.PI / 2)), hatM); scarf.position.y = 0.76; scarf.castShadow = true; up.add(scarf);
      }
      ball(0.3, mats.skin, 0, 1.52 - HIP, 0, up);
      const face = new T.Mesh(faceGeo(), mats.face); face.position.y = 1.52 - HIP; up.add(face);
      const customHat = !waiter && opt.hat && opt.hat !== 'default';
      if (!waiter && !customHat) {
        const cap = new T.Mesh(cached('cap', () => new T.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), hatM); cap.position.y = 1.57 - HIP; cap.castShadow = true; up.add(cap);
        if (visor) {
          const brim = new T.Mesh(cached('brim', () => new T.CylinderGeometry(0.31, 0.31, 0.03, 14, 1, false, -Math.PI / 2, Math.PI)), hatM); // visiera davanti
          brim.position.set(0, 1.585 - HIP, 0.13); brim.rotation.x = 0.18; brim.castShadow = true; up.add(brim);
          ball(0.03, hatM, 0, 1.89 - HIP, 0, up, 6, 5);
        } else {
          const pom = new T.Mesh(cached('pom', () => new T.SphereGeometry(0.085, 12, 10)), mats.white); pom.position.y = 1.94 - HIP; up.add(pom);
        }
      }
      // Cappelli speciali (si comprano con le gemme) e accessori: solo per l'omino del giocatore.
      if (customHat) {
        const hy = 1.78 - HIP, gold = tint(0xffc83a);
        if (opt.hat === 'tophat') { cyl(0.2, 0.2, 0.36, hatM, 0, hy + 0.17, 0, up, 14); cyl(0.34, 0.34, 0.035, hatM, 0, hy, 0, up, 16); cyl(0.205, 0.205, 0.07, mats.red, 0, hy + 0.06, 0, up, 14); }
        else if (opt.hat === 'crown') { cyl(0.25, 0.27, 0.14, gold, 0, hy + 0.04, 0, up, 14); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c = new T.Mesh(cached('crc', () => new T.ConeGeometry(0.06, 0.18, 5)), gold); c.position.set(Math.sin(a) * 0.25, hy + 0.2, Math.cos(a) * 0.25); up.add(c); ball(0.03, mats.red, Math.sin(a) * 0.25, hy + 0.31, Math.cos(a) * 0.25, up, 6, 5); } }
        else if (opt.hat === 'cowboy') { const br = tint(0x9a6a3a); cyl(0.5, 0.5, 0.035, br, 0, hy - 0.01, 0, up, 18); const dm = new T.Mesh(cached('cowdome', () => new T.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), br); dm.position.y = hy; dm.castShadow = true; up.add(dm); cyl(0.275, 0.275, 0.05, mats.dark, 0, hy + 0.05, 0, up, 14); }
        else if (opt.hat === 'catears') { const cap = new T.Mesh(cached('cap', () => new T.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), hatM); cap.position.y = 1.57 - HIP; up.add(cap); [-1, 1].forEach(s => { const e = new T.Mesh(cached('cearc', () => new T.ConeGeometry(0.09, 0.2, 4)), hatM); e.position.set(s * 0.17, hy + 0.12, 0); e.rotation.z = -s * 0.25; up.add(e); const i2 = new T.Mesh(cached('cearc', () => new T.ConeGeometry(0.09, 0.2, 4)), mats.pink); i2.scale.set(0.55, 0.7, 0.55); i2.position.set(s * 0.17, hy + 0.1, 0.03); i2.rotation.z = -s * 0.25; up.add(i2); }); }
        else if (opt.hat === 'halo') { const h = new T.Mesh(cached('halo', () => new T.TorusGeometry(0.22, 0.03, 8, 22).rotateX(Math.PI / 2)), new T.MeshBasicMaterial({ color: 0xffe066 })); h.position.y = hy + 0.28; up.add(h); const cap = new T.Mesh(cached('cap', () => new T.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), hatM); cap.position.y = 1.57 - HIP; up.add(cap); }
        else if (opt.hat === 'chef') { cyl(0.2, 0.22, 0.28, mats.white, 0, hy + 0.1, 0, up, 14); ball(0.26, mats.white, 0, hy + 0.34, 0, up, 12, 8).scale.y = 0.8; }
      }
      if (opt.acc === 'sunglasses') { [-1, 1].forEach(s => box(0.13, 0.075, 0.035, mats.dark, s * 0.11, 1.55 - HIP, 0.3, up, 0.02)); box(0.1, 0.02, 0.03, mats.dark, 0, 1.56 - HIP, 0.3, up, 0.005); }
      if (opt.acc === 'wings') [-1, 1].forEach(s => { const w = box(0.5, 0.55, 0.03, mats.white, s * 0.3, 0.62, -0.2, up, 0.015); w.rotation.set(0.1, s * 0.5, s * 0.35); box(0.3, 0.35, 0.03, mats.white, s * 0.42, 0.42, -0.22, up, 0.015).rotation.set(0.1, s * 0.5, s * 0.5); });
      if (opt.acc === 'cape') { const cp = box(0.5, 0.78, 0.035, hatM, 0, 0.42, -0.2, up, 0.015); cp.rotation.x = 0.12; box(0.5, 0.06, 0.05, mats.gold, 0, 0.78, -0.17, up, 0.02); }
      const armOpt = waiter ? { cuffM: mats.white } : summer ? { short: true } : spring ? {} : { cuffM: hatM, handM: hatM };
      const arms = [-1, 1].map(side => arm(up, side * 0.255, 1.15 - HIP, 0.062, coatM, armOpt));
      // vassoio d'argento con le bevande (solo camerieri): compare quando portano qualcosa
      let tray = null, trayCups = null;
      if (waiter) {
        tray = new T.Group(); tray.position.set(0, 0.5, 0.45); tray.visible = false; up.add(tray);
        cyl(0.3, 0.3, 0.03, mats.steel, 0, 0, 0, tray, 18); cyl(0.32, 0.32, 0.02, mats.steel, 0, -0.005, 0, tray, 18);
        trayCups = new T.Group(); tray.add(trayCups);
      }
      // ombra di contatto morbida sotto i piedi (si nasconde quando l'ospite si sdraia)
      const blob = new T.Mesh(cached('blob', () => new T.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2)), mats.blob); blob.position.y = 0.04; blob.renderOrder = 1; g.add(blob);
      Object.assign(g.userData, {
        blob, legs, up, arms: arms.map(a => a.sh), elbows: arms.map(a => a.el),
        axe: withTool ? axe(arms[1].el) : null, saw: withTool ? chainsaw(arms[1].el) : null, tool: 'axe',
        tray, trayCups, hold: false, hb: 0,
        ph: 0, t: Math.random() * 6, mv: 0, chopT: 0, chopDur: 1, ck: 1, cb: 0, tossT: 0, tossDur: 1, tk: 1, tb: 0
      });
      scene.add(g);
      return g;
    }
    const B_cone = () => cached('bow', () => new T.ConeGeometry(0.05, 0.1, 6));
    // Attrezzo in uso: 'axe' (ascia) o 'saw' (motosega).
    function setTool(o, tool) { o.userData.tool = tool; }
    // Bevande sul vassoio del cameriere (0-2): se ce ne sono si regge il vassoio con due mani.
    function setTray(o, n) {
      const u = o.userData; if (!u.tray) return;
      clear(u.trayCups);
      for (let i = 0; i < n; i++) { const c = new T.Mesh(cupGeo, mats.cup); c.position.set(n > 1 ? (i ? 0.1 : -0.1) : 0, 0.115, 0); c.castShadow = true; u.trayCups.add(c); }
      u.tray.visible = n > 0; u.hold = n > 0;
    }

    // Pose del colpo d'ascia lungo un ciclo continuo k = 0 → 1: carica (braccia indietro sul fianco), pausa, colpo orizzontale veloce
    // verso l'albero, seguito. Il tronco ruota con le braccia. A fine ciclo la posa coincide con quella di inizio: i colpi uno dopo l'altro scorrono.
    // sh = alzata in avanti, yaw = rotazione sul piano orizzontale (colpo), el/elz = gomito (su-giù / di lato), lean = inclinazione, tw = rotazione del busto.
    const FOLLOW = { sh: -1.45, yaw: -0.9, el: -0.15, elz: -0.1, lean: 0.12, tw: -0.6 }, READY = { sh: -1.4, yaw: 1.25, el: -0.1, elz: 0.9, lean: -0.05, tw: 0.8 }, HIT = { sh: -1.5, yaw: 0.05, el: -0.1, elz: 0.1, lean: 0.25, tw: 0 };
    const pose = { sh: 0, yaw: 0, el: 0, elz: 0, lean: 0, tw: 0 };
    function lerpPose(a, b, t) { for (const k in pose) pose[k] = mix(a[k], b[k], t); }
    function chopPose(k) {
      if (k < 0.3) lerpPose(FOLLOW, READY, sm(k / 0.3));
      else if (k < 0.4) lerpPose(READY, READY, 0);
      else if (k < 0.7) { const t = (k - 0.4) / 0.3; lerpPose(READY, HIT, t * t * (0.4 + 0.6 * t)); }
      else { const t = (k - 0.7) / 0.3; lerpPose(HIT, FOLLOW, 1 - (1 - t) * (1 - t)); }
    }
    // Motosega: braccia tese in avanti, piccolo dondolio laterale e vibrazione.
    function sawPose(t) {
      pose.sh = -1.4 + Math.sin(t * 70) * 0.025; pose.yaw = Math.sin(t * 5) * 0.28; pose.el = -0.2; pose.elz = 0.2 + Math.sin(t * 60) * 0.03; pose.lean = 0.22; pose.tw = Math.sin(t * 5) * 0.18;
    }
    // Lancio (legna al camino, tazza all'ospite): le braccia vanno avanti e indietro con un piccolo affondo.
    function tossPose(k) {
      const a = Math.sin(Math.min(1, k) * Math.PI);
      pose.sh = -1.0 - 0.7 * a; pose.yaw = 0; pose.el = -0.7 + 0.55 * a; pose.elz = 0; pose.lean = 0.28 * a; pose.tw = 0;
    }
    // Vassoio retto con due mani davanti al petto.
    function holdPose() { pose.sh = -1.15; pose.yaw = 0; pose.el = -0.55; pose.elz = 0; pose.lean = 0.04; pose.tw = 0; }

    // Posa del personaggio, da chiamare ogni fotogramma: camminata (gambe e braccia opposte, gomiti piegati),
    // respiro quando sta fermo, colpo d'ascia, motosega, lancio e vassoio che si fondono con la posa di base (niente scatti).
    function walk(o, moving, dt) {
      const u = o.userData;
      u.t += dt;
      if (moving) u.ph += dt * 12;
      u.mv += ((moving ? 1 : 0) - u.mv) * Math.min(1, dt * 10);
      const s = Math.sin(u.ph) * 0.55 * u.mv;
      u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
      const el0 = -0.2 - 0.25 * u.mv;
      let lean = 0.05 * u.mv, tw = Math.sin(u.ph) * 0.07 * u.mv, armIn = 0.12;
      const sh = [-s * 0.85, s * 0.85], el = [el0, el0], yaw = [0, 0], elz = [0, 0];

      if (u.chopT > 0) { u.chopT = Math.max(0, u.chopT - dt); u.ck = 1 - u.chopT / u.chopDur; }
      u.cb += ((u.chopT > 0 ? 1 : 0) - u.cb) * Math.min(1, dt * 14);
      if (u.cb > 0.01) {
        if (u.tool === 'saw') sawPose(u.t); else chopPose(u.ck);
        const b = u.cb;
        sh[0] = mix(sh[0], pose.sh, b); sh[1] = mix(sh[1], pose.sh, b); el[0] = mix(el[0], pose.el, b); el[1] = mix(el[1], pose.el, b);
        yaw[0] = yaw[1] = pose.yaw * b; elz[1] = pose.elz * b; elz[0] = pose.elz * 0.4 * b;
        lean = mix(lean, pose.lean, b); tw = mix(tw, pose.tw, b); armIn = mix(armIn, -0.4, b);
      }
      if (u.tossT > 0) { u.tossT = Math.max(0, u.tossT - dt); u.tk = 1 - u.tossT / u.tossDur; }
      u.tb += ((u.tossT > 0 ? 1 : 0) - u.tb) * Math.min(1, dt * 16);
      if (u.tb > 0.01) {
        tossPose(u.tk); const b = u.tb;
        sh[0] = mix(sh[0], pose.sh, b); sh[1] = mix(sh[1], pose.sh, b); el[0] = mix(el[0], pose.el, b); el[1] = mix(el[1], pose.el, b); lean = mix(lean, pose.lean, b);
      }
      u.hb += ((u.hold ? 1 : 0) - u.hb) * Math.min(1, dt * 10);
      if (u.hb > 0.01) {
        holdPose(); const b = u.hb;
        sh[0] = mix(sh[0], pose.sh, b); sh[1] = mix(sh[1], pose.sh, b); el[0] = mix(el[0], pose.el, b); el[1] = mix(el[1], pose.el, b); lean = mix(lean, pose.lean, b); armIn = mix(armIn, -0.5, b);
      }
      u.arms[0].rotation.x = sh[0]; u.arms[1].rotation.x = sh[1];
      u.arms[0].rotation.y = yaw[0]; u.arms[1].rotation.y = yaw[1];
      u.arms[0].rotation.z = -armIn; u.arms[1].rotation.z = armIn;
      u.elbows[0].rotation.x = el[0]; u.elbows[1].rotation.x = el[1];
      u.elbows[0].rotation.z = elz[0]; u.elbows[1].rotation.z = elz[1];
      u.up.rotation.x = lean; u.up.rotation.y = tw;
      u.up.position.y = HIP + Math.abs(Math.sin(u.ph)) * 0.05 * u.mv + Math.sin(u.t * 2.4) * 0.008 * (1 - u.mv);
      const show = u.cb > 0.15;
      if (u.axe) u.axe.visible = show && u.tool === 'axe';
      if (u.saw) u.saw.visible = show && u.tool === 'saw';
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

    return { T, M, mats, tint, add, box, cyl, ball, clear, tree, person, setTool, setTray, walk, swing, toss, HIT_AT, moveTo, follow, drawStack, cupGeo, coinGeo, logGeo, mergeParts, cached, sm };
  };
})(window.Rifugio);
