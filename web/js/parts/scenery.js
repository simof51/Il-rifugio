// Strutture del posto e ambiente della citta (parte di game.js).
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).scenery = function (G) {
    const { T, scene, B, mats, box, cyl, ball, PL, P, trees, cols, ROAD_W, SEA_Z, CANAL, FARMS, CHAPEL, SEASON_ID, nearPad, nearRoad, inLake, inLM } = G;
    // --- strutture del posto: ogni città e stagione ha le sue (fontana, barca, fienili, bancarelle, tulipani…) ---
    const structPlaced = [];
    const SLOTS = [[-15.5, -3], [15.5, -3], [-15.5, -18], [15.5, -18], [-15.5, -11], [15.5, -26], [-15.5, 6], [15.5, 7], [-15.5, -26], [-21, 7], [21, -3], [21, 6]];
    const STRUCT = {
      picnic(g) { [[-1, 0], [1.2, 0.6]].forEach(([x, z]) => { cyl(0.6, 0.6, 0.07, B.tint(0xffa6c9), x, 0.7, z, g, 14); cyl(0.07, 0.07, 0.65, mats.white, x, 0.36, z, g, 8); [-0.8, 0.8].forEach(d => box(0.4, 0.4, 0.4, mats.wood, x + d, 0.2, z, g, 0.04)); }); return 1.6; },
      signpost(g) { cyl(0.07, 0.08, 2.1, mats.wood, 0, 1.05, 0, g, 6); [[0.55, 1.75, 0.15], [-0.5, 1.4, -0.2]].forEach(([dx, y, rz]) => { box(1.1, 0.3, 0.06, mats.plank, dx, y, 0, g, 0.01).rotation.z = rz; }); return 0.5; },
      bench(g) { box(1.5, 0.1, 0.5, mats.plank, 0, 0.5, 0, g, 0.02); box(1.5, 0.45, 0.08, mats.plank, 0, 0.8, -0.24, g, 0.02); [-0.6, 0.6].forEach(x => box(0.1, 0.5, 0.45, mats.wood, x, 0.25, 0, g)); return 0.9; },
      fountain(g) { cyl(1.2, 1.3, 0.45, mats.stone, 0, 0.22, 0, g, 18); cyl(1.0, 1.0, 0.06, B.tint(0x7ad0ff), 0, 0.46, 0, g, 18); cyl(0.16, 0.22, 1.1, mats.stone, 0, 0.9, 0, g, 8); ball(0.28, mats.stone, 0, 1.5, 0, g, 10, 8); return 1.35; },
      tulips(g) {
        const geo = B.cached('tul', () => new T.SphereGeometry(0.15, 6, 4)), parts = [], cs = [0xff4d6d, 0xffd23a, 0xff7ac6, 0xa066ff, 0xff9a2a];
        for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) parts.push({ geo, x: -1.8 + k * 0.45, y: 0.32 + (k % 2) * 0.04, z: -0.6 + r * 0.6, s: 1, color: cs[(k + r) % cs.length] });
        g.add(new T.Mesh(B.mergeParts(parts), mats.accent)); box(4.2, 0.12, 2.0, B.tint(0x4a9b4a), 0, 0.06, 0, g, 0.02); return 0;
      },
      crates(g) { box(0.9, 0.9, 0.9, mats.wood, 0, 0.45, 0, g, 0.03); box(0.8, 0.8, 0.8, mats.plank, 0.95, 0.4, 0.1, g, 0.03); box(0.7, 0.7, 0.7, mats.wood, 0.4, 1.25, 0, g, 0.03); cyl(0.4, 0.4, 0.9, B.tint(0x8a5a35), -0.95, 0.45, 0.2, g, 12); return 1.3; },
      boat(g) { box(3.0, 0.55, 1.15, B.tint(0x8a5a35), 0, 0.55, 0, g, 0.12); box(2.6, 0.08, 0.9, mats.plank, 0, 0.84, 0, g, 0.02); cyl(0.06, 0.06, 2.6, mats.wood, -0.2, 1.9, 0, g, 6); box(0.05, 1.5, 1.0, mats.white, 0.1, 2.0, 0, g, 0.01); [-0.9, 0.9].forEach(x => box(0.2, 0.3, 1.0, mats.wood, x, 0.15, 0, g)); return 1.7; },
      sled(g) { box(1.3, 0.12, 0.6, mats.wood, 0, 0.35, 0, g, 0.02); [-0.25, 0.25].forEach(z => box(1.5, 0.06, 0.06, mats.dark, 0, 0.18, z, g)); box(0.5, 0.2, 0.5, mats.red, 0.1, 0.5, 0, g, 0.03); return 0; },
      logs(g) { for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { cyl(0.2, 0.2, 1.6, mats.wood, 0, 0.22 + r * 0.36, -0.7 + k * 0.45 + r * 0.22, g, 8).rotation.z = Math.PI / 2; } return 1.1; },
      flowerbed(g) {
        ball(1.3, B.tint(0x4a9b4a), 0, 0, 0, g, 12, 6).scale.y = 0.3;
        const geo = B.cached('flw', () => new T.SphereGeometry(0.13, 6, 4)), cs = [0xff4d6d, 0xffd23a, 0xffffff, 0xa066ff, 0xff9a2a], parts = [];
        for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 0.2 + (i % 6) * 0.17; parts.push({ geo, x: Math.cos(a) * r, y: 0.38, z: Math.sin(a) * r, s: 1, color: cs[i % cs.length] }); }
        g.add(new T.Mesh(B.mergeParts(parts), mats.accent)); return 0;
      },
      well(g) {
        cyl(0.75, 0.8, 0.8, mats.stone, 0, 0.4, 0, g, 14); cyl(0.55, 0.55, 0.05, B.tint(0x1f3a5a), 0, 0.8, 0, g, 12); [-0.7, 0.7].forEach(x => cyl(0.06, 0.06, 1.6, mats.wood, x, 1.5, 0, g, 6));
        const r = new T.Mesh(B.cached('wroof', () => new T.ConeGeometry(1.2, 0.7, 4)), B.tint(0xb02e26)); r.position.y = 2.6; r.rotation.y = Math.PI / 4; r.castShadow = true; g.add(r); return 0.95;
      },
      stall(g) {
        box(2.2, 0.9, 0.9, mats.wood, 0, 0.45, 0, g, 0.03); [-1, 1].forEach(x => cyl(0.05, 0.05, 2.2, mats.wood, x, 1.1, -0.4, g, 6));
        box(2.5, 0.12, 1.2, B.tint(0xff7a3d), 0, 2.2, -0.2, g, 0.02).rotation.x = 0.25; box(2.5, 0.12, 0.5, mats.white, 0, 2.12, 0.35, g, 0.02).rotation.x = 0.25;
        [[-0.6, 0xff4d4d], [0, 0xffd23a], [0.6, 0x4cd964]].forEach(([x, c]) => ball(0.2, B.tint(c), x, 1.05, 0, g, 8, 6)); return 1.3;
      },
      umbrellas(g) { [[-0.9, 0xff4d4d], [1.0, 0x3d8bff]].forEach(([x, c]) => { cyl(0.04, 0.04, 2.3, mats.white, x, 1.15, 0, g, 6); const u = new T.Mesh(B.cached('umb2', () => new T.ConeGeometry(1.3, 0.5, 10)), B.tint(c)); u.position.set(x, 2.35, 0); u.castShadow = true; g.add(u); box(0.9, 0.04, 1.6, B.tint(0xffe08a), x, 0.04, 0.9, g); }); return 0; },
      hay(g) { [[0, 0], [1.0, 0.2], [0.5, -0.85]].forEach(([x, z], i) => { const b = cyl(0.55, 0.55, 0.95, B.tint(0xd9b45b), x, 0.55, z, g, 12); b.rotation.z = Math.PI / 2; b.rotation.y = i * 0.7; }); return 1.5; },
      pumpkins(g) { [[0, 0, 0.5], [0.9, 0.3, 0.4], [-0.7, 0.6, 0.35], [0.3, -0.8, 0.45], [-0.4, -0.5, 0.3]].forEach(([x, z, r]) => { ball(r, B.tint(0xff8a1f), x, r * 0.8, z, g, 10, 8).scale.y = 0.8; cyl(0.05, 0.06, 0.18, B.tint(0x4a7a2a), x, r * 1.6, z, g, 5); }); return 0; }
    };
    (SEASON_ID === 'primavera' || SEASON_ID === 'estate' ? PL.structs.concat(['picnic']) : PL.structs).forEach((kind, i) => {
      const fn = STRUCT[kind]; if (!fn) return;
      for (let t = 0; t < SLOTS.length; t++) {
        const [x, z] = SLOTS[(i * 3 + t) % SLOTS.length];
        if (nearRoad(x, z, ROAD_W / 2 + 2.6) || nearPad(x, z, 3.2) || inLake(x, z, 3.5) || inLM(x, z, 3.5) || x < P.world_min[0] + 3 || x > P.world_max[0] - 3 || structPlaced.some(p => Math.hypot(p[0] - x, p[1] - z) < 5) || trees.some(tr => Math.hypot(tr.x - x, tr.z - z) < 2.4)) continue;
        const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = (i * 1.1 + 0.4) % 6; scene.add(g);
        const r = fn(g); if (r) cols.push([x - r, x + r, z - r, z + r]);
        structPlaced.push([x, z]); break;
      }
    });

    // --- ambiente della città: mare e molo (Porto), campi e canale (Mulini), cappella (Valle) ---
    {
      const iceSea = SEASON_ID === 'inverno', waterM = c => new T.MeshPhongMaterial({ color: c, shininess: 60, specular: 0x88aacc });
      if (SEA_Z != null) {
        const sea = new T.Mesh(new T.PlaneGeometry(140, 40).rotateX(-Math.PI / 2), waterM(iceSea ? 0x9fd0e8 : 0x3ba3d9)); sea.position.set(0, 0.03, SEA_Z + 20); scene.add(sea);
        box(140, 0.06, 2.4, B.tint(iceSea ? 0xf4f8ff : 0xf2e2b3), 0, 0.045, SEA_Z - 0.9, null, 0.01); // spiaggia
        cols.push([-40, 40, SEA_Z + 0.6, 60]);
        box(2.6, 0.2, 10, mats.plank, 7, 0.17, SEA_Z + 3.5, null, 0.02);                                    // molo
        for (let k = 0; k < 5; k++) [-1.25, 1.25].forEach(dx => cyl(0.1, 0.1, 0.8, mats.wood, 7 + dx, 0.25, SEA_Z + 0.5 + k * 2.2, null, 6));
        [[-7, SEA_Z + 5, 0.3, 0x2d6cdf], [15, SEA_Z + 8, -0.5, 0xd9433b], [-17, SEA_Z + 10, 0.8, 0xf4f1e6]].forEach(([x, z, ry, c]) => { // barche in mare
          const g = new T.Group(); g.position.set(x, 0.05, z); g.rotation.y = ry; scene.add(g);
          box(2.6, 0.5, 1.0, B.tint(c), 0, 0.25, 0, g, 0.12); box(2.0, 0.08, 0.7, mats.plank, 0, 0.52, 0, g, 0.02); cyl(0.05, 0.05, 2.2, mats.wood, -0.2, 1.5, 0, g, 6); box(0.04, 1.4, 0.9, mats.white, 0.1, 1.6, 0, g, 0.01);
        });
      }
      if (CANAL) {
        const mid = (CANAL[0] + CANAL[1]) / 2;
        const cm = new T.Mesh(new T.PlaneGeometry(140, CANAL[1] - CANAL[0]).rotateX(-Math.PI / 2), waterM(iceSea ? 0xb9dcef : 0x4fb6e8)); cm.position.set(0, 0.03, mid); scene.add(cm);
        box(140, 0.1, 0.3, mats.stone, 0, 0.05, CANAL[0] - 0.15, null, 0.02); box(140, 0.1, 0.3, mats.stone, 0, 0.05, CANAL[1] + 0.15, null, 0.02);
        cols.push([-40, 40, CANAL[0] - 0.3, CANAL[1] + 0.3]);
        const crop = { inverno: [0xf2f6ff, 0xdfe8f5], primavera: [0xff5d8f, 0xffd23a, 0xa066ff], estate: [0xffd23a, 0x7ac943], autunno: [0xd98a3a, 0xb8862b, 0x8b5a2b] }[SEASON_ID] || [0x7ac943];
        const bgeo = B.cached('fieldbox', () => new T.BoxGeometry(1, 0.1, 1)), parts = [];
        FARMS.forEach(f => { for (let r = 0, n = Math.floor(f[3] / 0.8); r < n; r++) parts.push({ geo: bgeo, x: f[0] + f[2] / 2, y: 0.06, z: f[1] + 0.5 + r * 0.8, s: [f[2] - 0.5, 1, 0.55], color: r % 2 ? 0x6b4a2f : crop[(r >> 1) % crop.length] }); });
        const fm = new T.Mesh(B.mergeParts(parts), mats.accent); fm.receiveShadow = true; scene.add(fm);
      }
      if (CHAPEL) {
        const g = new T.Group(); g.position.set(CHAPEL.x, 0, CHAPEL.z); g.rotation.y = -0.5; scene.add(g);
        box(2.6, 2.2, 2.6, mats.white, 0, 1.1, 0, g, 0.04); box(0.8, 1.6, 0.8, mats.white, 0, 2.9, -0.6, g, 0.03);
        const roof = new T.Mesh(B.cached('chroof', () => new T.ConeGeometry(2.1, 1.2, 4)), B.tint(0xb02e26)); roof.position.y = 2.8; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
        const tr = new T.Mesh(B.cached('chtroof', () => new T.ConeGeometry(0.75, 0.8, 4)), B.tint(0xb02e26)); tr.position.set(0, 4.1, -0.6); tr.rotation.y = Math.PI / 4; g.add(tr);
        box(0.06, 0.5, 0.06, mats.dark, 0, 4.75, -0.6, g); box(0.3, 0.06, 0.06, mats.dark, 0, 4.85, -0.6, g);
        box(0.7, 1.2, 0.1, mats.dark, 0, 0.6, 1.33, g); [-0.85, 0.85].forEach(x => box(0.4, 0.6, 0.08, B.tint(0xbfe6ff), x, 1.3, 1.32, g));
        cols.push([CHAPEL.x - 1.6, CHAPEL.x + 1.6, CHAPEL.z - 1.6, CHAPEL.z + 1.6]);
      }
    }
    return {  };
  };
})(window.Rifugio);
