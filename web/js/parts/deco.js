// Lanterne e mascotte comprabili (parte di game.js).
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).deco = function (G) {
    const { T, scene, B, mats, cyl, ball, TH, walkP0, ROAD_W, nearPad, nearRoad, STAND, cols, bobbers, makeDuck } = G;
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
      // lanterne a lato della passeggiata (mai sopra la strada, i riquadri o il banco)
      const spots = [];
      for (let i = 6; i < walkP0.length - 4 && spots.length < 10; i += 12) {
        const a = walkP0[i - 1], b = walkP0[i + 1], tl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        for (const extra of [1.2, 1.9, 2.6]) { // più vicino alla strada, poi più lontano se c'è un riquadro in mezzo
          const off = ROAD_W / 2 + extra, x = walkP0[i].x - (b.z - a.z) / tl * off, z = walkP0[i].z + (b.x - a.x) / tl * off;
          if (nearPad(x, z, 1.6) || nearRoad(x, z, ROAD_W / 2 + 0.8) || (Math.abs(x - STAND.x) < 2.6 && Math.abs(z - STAND.z) < 1.8) || x < -12 || x > 27) continue;
          if (spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 4)) continue;
          spots.push([x, z]); break;
        }
      }
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
      for (let k = 0; k < 2; k++) { const l = new T.PointLight(0xffd9a0, 0, 9, 2); scene.add(l); lampLights.push(l); } // luci vere (le 2 vicine all'omino): ogni luce in più rallenta ogni pixel
    }
    function updateLamps() {
      if (!lamps.length) return;
      const e = G.env(), n = e ? e.night : 0, p = G.player().position;
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
    return { buildLamps, updateLamps, buildMascot };
  };
})(window.Rifugio);
