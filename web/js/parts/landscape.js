// Bordi della mappa, cumuli, fiori, decorazioni sparse e monumento della citta (parte di game.js).
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).landscape = function (G) {
    const { T, scene, B, mats, box, cyl, ball, add, TH, P, Q, level, rnd, cols, SEA_Z, LM, ROAD_W, nearPad, nearRoad, inLake, inLM, snowy } = G;
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
        if (SEA_Z != null && side === 1) return; // al Porto a sud c'è il mare, non i monti
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
      const blob = new T.SphereGeometry(1, 7, 5), trunk = new T.CylinderGeometry(0.15, 0.25, 1.4, 5).translate(0, 0.7, 0), forest = [[], [], [], []];
      const BL = [[0, 2.45, 0, 1.2], [0.75, 2.15, 0.3, 0.85], [-0.7, 2.2, -0.2, 0.9]]; // tre palloni per albero di bordo: da lontano non si vede la differenza
      [[1, 2.4, 1.6], [4.5, 2.6, 2], [8.5, 2.9, 2.4]].slice(0, Q.density < 0.5 ? 1 : Q.density < 1 ? 2 : 3).forEach(([off, step, sc0]) => ringPoints(off, step, 1.6).forEach(([side, x, z]) => {
        if (SEA_Z != null && side === 1) return; // il mare non ha alberi
        const sc =sc0 * (0.85 + rnd() * 0.5) / 1.6 + 0.4;
        forest[side].push({ geo: trunk, x, y: 0, z, s: sc, color: 0x7a4a30 });
        BL.forEach(([bx, by, bz, br], k) => forest[side].push({ geo: blob, x: x + bx * sc, y: by * sc, z: z + bz * sc, s: [br * sc, br * 0.88 * sc, br * sc], color: (TH.leafCols || [0x57c455, 0x34a448])[(k + side) % (TH.leafCols || [0, 0]).length] }));
      }));
      for (let s = 0; s < 4; s++) scene.add(new T.Mesh(B.mergeParts(forest[s]), mats.accent));
      ringPoints(24, 16, 6).forEach(([side, x, z]) => { if (SEA_Z != null && side === 1) return; const h = 12 + rnd() * 10, r = 12 + rnd() * 5, m = new T.Mesh(new T.ConeGeometry(r, h, 14), mats.hill); m.position.set(x, h / 2, z); scene.add(m); });
    }
    const moundGeo = new T.SphereGeometry(1, 14, 8);
    for (let i = 0; i < 14; i++) {
      const s = new T.Mesh(moundGeo, mats.ground);
      s.scale.set(1 + rnd() * 1.5, 0.35, 1 + rnd()); s.position.set(-16 + rnd() * 32, 0, -12 + rnd() * 28);
      if (Math.abs(s.position.z + 6) < 4 && Math.abs(s.position.x) < 13) continue;
      if (nearPad(s.position.x, s.position.z, Math.max(s.scale.x, s.scale.z) + 1.5)) continue; // niente cumuli di neve sopra i riquadri
      if (nearRoad(s.position.x, s.position.z, Math.max(s.scale.x, s.scale.z) + ROAD_W / 2 + 0.6)) continue; // né sulle strade
      if (inLake(s.position.x, s.position.z, 3)) continue;
      add(s);
    }
    // Prato fiorito: margherite e fiorellini colorati fusi in una sola mesh.
    if (TH.flowers) {
      const FL = [0xffffff, 0xffd23a, 0xff7ac6, 0xff4d4d, 0xa066ff, 0xff9a2a], petal = B.cached('petal', () => new T.CylinderGeometry(0.13, 0.13, 0.03, 8)), heart = B.cached('flc', () => new T.CylinderGeometry(0.06, 0.06, 0.05, 8));
      const parts = [];
      for (let i = 0, nf = Math.round((TH.flowerCount || 170) * Q.density); i < nf; i++) {
        const x = -30 + rnd() * 60, z = -20 + rnd() * 46;
        if (inLake(x, z, 2.2) || nearRoad(x, z, ROAD_W / 2 + 0.3) || (x > -3 && x < 18 && z > -3.8 && z < 2.2) || (x > -8 && x < 8 && z < -3.6 && z > -9.4) || (x > 8 && x < 13 && z > -8 && z < -3)) continue;
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
          if (!(inLake(x, z, 2.4) || inLM(x, z, 1.8) || nearPad(x, z, 2.2) || nearRoad(x, z, ROAD_W / 2 + 1.1) || (x > -17 && x < 19 && z > -10.5 && z < 5.5))) return [x, z];
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
    return { lmAnim };
  };
})(window.Rifugio);
