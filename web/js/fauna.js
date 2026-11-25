// Animali: un compagno che segue l'omino (cane o gatto, a scelta nel menu) e animali selvatici che vivono nei boschi
// (cervi, conigli, scoiattoli, uccellini) e scappano quando ci si avvicina. Solo atmosfera: non cambiano la partita.
(function (R) {
  'use strict';
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];

  // Quanti animali per stagione (moltiplicati per la qualità grafica scelta).
  const WILD = {
    inverno: { deer: 2, rabbit: 3, bird: 2 },
    primavera: { rabbit: 4, bird: 4, deer: 1 },
    estate: { squirrel: 3, bird: 4, rabbit: 1, deer: 1 },
    autunno: { squirrel: 4, deer: 2, bird: 2, rabbit: 2 }
  };

  R.createFauna = function (ctx) {
    const T = ctx.T, B = ctx.B, scene = ctx.scene, A = ctx.A, tint = B.tint, mats = B.mats;
    const ball = (r, m, x, y, z, g, sx, sy, sz) => { const o = B.ball(r, m, x, y, z, g, 10, 8); if (sx != null) o.scale.set(sx, sy, sz); return o; };
    const eyes = (g, y, z, sp, r) => [-1, 1].forEach(s => B.ball(r || 0.022, mats.dark, s * sp, y, z, g, 6, 5));
    const crit = [], player = ctx.player;

    // --- costruzione dei modelli (poche forme semplici, nello stile dell'omino) ---
    function rabbit() {
      const g = new T.Group(), m = tint(pick([0xd8c7b0, 0xb89c7d, 0xf3efe6]));
      ball(0.2, m, 0, 0.22, 0, g, 0.95, 0.85, 1.3); ball(0.13, m, 0, 0.38, 0.24, g);
      [-1, 1].forEach(s => { const e = ball(0.06, m, s * 0.06, 0.56, 0.22, g, 0.5, 2.3, 0.45); e.rotation.z = -s * 0.25; });
      ball(0.07, mats.white, 0, 0.24, -0.3, g); eyes(g, 0.42, 0.34, 0.06); ball(0.03, mats.pink, 0, 0.37, 0.36, g);
      return { g, kind: 'rabbit', speed: 3.2, flee: 6.5, hop: true };
    }
    function squirrel() {
      const g = new T.Group(), m = tint(0xb5651d);
      ball(0.13, m, 0, 0.17, 0, g, 0.9, 0.9, 1.3); ball(0.09, m, 0, 0.27, 0.17, g);
      const tail = ball(0.12, m, 0, 0.34, -0.2, g, 0.7, 1.8, 0.7); tail.rotation.x = -0.4;
      [-1, 1].forEach(s => ball(0.03, m, s * 0.05, 0.36, 0.15, g)); eyes(g, 0.29, 0.23, 0.04, 0.016);
      return { g, kind: 'squirrel', speed: 3.6, flee: 6, hop: true, tail };
    }
    function deer() {
      const g = new T.Group(), m = tint(pick([0xa86a3a, 0x9a7a5a])), legs = [];
      ball(0.38, m, 0, 0.9, 0, g, 0.85, 0.65, 1.5);
      [[-0.17, 0.4], [0.17, 0.4], [-0.17, -0.4], [0.17, -0.4]].forEach(([x, z]) => { const p = new T.Group(); p.position.set(x, 0.75, z); g.add(p); B.cyl(0.045, 0.035, 0.75, m, 0, -0.37, 0, p, 6); legs.push(p); });
      const neck = B.cyl(0.08, 0.1, 0.5, m, 0, 1.2, 0.5, g, 8); neck.rotation.x = 0.7;
      ball(0.13, m, 0, 1.5, 0.68, g, 0.85, 0.85, 1.25); ball(0.05, mats.dark, 0, 1.46, 0.85, g);
      [-1, 1].forEach(s => { ball(0.05, m, s * 0.12, 1.62, 0.62, g, 0.5, 1.4, 0.7); B.cyl(0.012, 0.015, 0.35, tint(0x6b4a2a), s * 0.08, 1.78, 0.62, g, 5).rotation.z = -s * 0.3; B.cyl(0.01, 0.012, 0.18, tint(0x6b4a2a), s * 0.16, 1.9, 0.62, g, 5).rotation.z = -s * 0.7; });
      ball(0.06, mats.white, 0, 0.98, -0.6, g); eyes(g, 1.55, 0.78, 0.08, 0.02);
      return { g, kind: 'deer', speed: 4.6, flee: 8, legs, sc: 1 };
    }
    function bird() {
      const g = new T.Group(), m = tint(pick([0xd9534f, 0x4fa3ff, 0xffd23a, 0x8a8f99])), wings = [];
      ball(0.1, m, 0, 0.12, 0, g, 1, 0.8, 1.4); ball(0.07, m, 0, 0.2, 0.12, g);
      const beak = new T.Mesh(B.cached('birdbeak', () => new T.ConeGeometry(0.025, 0.07, 6).rotateX(Math.PI / 2)), mats.orange); beak.position.set(0, 0.2, 0.2); g.add(beak);
      [-1, 1].forEach(s => { const p = new T.Group(); p.position.set(s * 0.08, 0.16, 0); g.add(p); const w = B.box(0.22, 0.02, 0.12, m, s * 0.11, 0, 0, p, 0.01); wings.push(p); });
      B.box(0.06, 0.02, 0.14, m, 0, 0.12, -0.17, g, 0.01); eyes(g, 0.22, 0.17, 0.035, 0.012);
      return { g, kind: 'bird', speed: 6, flee: 5.5, wings, fly: true };
    }
    const MAKE = { rabbit, squirrel, deer, bird };

    // --- posizioni libere: fuori dalla zona della baita, dal lago, dal monumento e dagli alberi ---
    function freeSpot() {
      const bx0 = ctx.bounds[0], bx1 = ctx.bounds[1], bz0 = ctx.bounds[2], bz1 = ctx.bounds[3];
      for (let k = 0; k < 40; k++) {
        const x = bx0 + 2 + rnd() * (bx1 - bx0 - 4), z = bz0 + 2 + rnd() * (bz1 - bz0 - 4);
        if (ctx.inLake(x, z, 2.5) || ctx.inLM(x, z, 2) || (x > -17 && x < 19 && z > -10.5 && z < 5.5)) continue;
        if (ctx.trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.2)) continue;
        return [x, z];
      }
      return [24, 18];
    }
    const dens = Math.max(0.35, ctx.Q.density), table = WILD[ctx.level.season] || WILD.estate;
    Object.keys(table).forEach(kind => {
      for (let i = 0, n = Math.round(table[kind] * dens); i < n; i++) {
        const c = MAKE[kind](), [x, z] = freeSpot();
        c.g.position.set(x, 0, z); c.home = [x, z]; c.st = 'idle'; c.t = rnd() * 4; c.ph = rnd() * 6; c.dest = null; c.y = 0; c.vy = 0;
        if (c.fly) c.g.position.y = 0.05;
        scene.add(c.g); crit.push(c);
      }
    });

    // --- compagno: cane o gatto che segue l'omino ---
    let pet = null;
    const kind = R.settings.get('pet');
    if (kind === 'dog' || kind === 'cat') {
      const g = new T.Group(), dog = kind === 'dog', m = tint(dog ? 0xc98b4b : 0x80848f), legs = [];
      ball(0.22, m, 0, 0.34, 0, g, 0.8, 0.8, 1.45); ball(0.15, m, 0, 0.55, 0.3, g);
      if (dog) { ball(0.08, tint(0xe8c7a0), 0, 0.5, 0.42, g, 1, 0.8, 1.1); ball(0.035, mats.dark, 0, 0.54, 0.5, g); [-1, 1].forEach(s => ball(0.075, tint(0x7a4a24), s * 0.14, 0.58, 0.27, g, 0.5, 1.4, 0.8).rotation.z = s * 0.35); }
      else { ball(0.03, mats.pink, 0, 0.52, 0.44, g); [-1, 1].forEach(s => { const e = new T.Mesh(B.cached('catear', () => new T.ConeGeometry(0.055, 0.12, 4)), m); e.position.set(s * 0.09, 0.7, 0.26); e.rotation.z = -s * 0.2; e.castShadow = true; g.add(e); }); }
      eyes(g, 0.58, 0.42, 0.06, 0.025);
      const collar = new T.Mesh(B.cached('collar', () => new T.TorusGeometry(0.115, 0.02, 6, 12)), mats.red); collar.position.set(0, 0.48, 0.24); collar.rotation.x = 1.0; g.add(collar);
      [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]].forEach(([x, z]) => { const p = new T.Group(); p.position.set(x, 0.25, z); g.add(p); B.cyl(0.035, 0.03, 0.26, m, 0, -0.12, 0, p, 6); legs.push(p); });
      const tail = new T.Group(); tail.position.set(0, 0.4, -0.3); g.add(tail); const tl = B.cyl(0.025, 0.02, dog ? 0.28 : 0.4, m, 0, 0.14, 0, tail, 6); tl.rotation.x = 0; tail.rotation.x = -0.9;
      g.scale.setScalar(1.15); g.position.set(player.position.x - 1.5, 0, player.position.z + 1);
      scene.add(g); pet = { g, legs, tail, dog, ph: 0, hop: 0, moving: 0 };
    }

    function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
    function face(g, dx, dz) { if (Math.abs(dx) + Math.abs(dz) > 1e-4) { let d = Math.atan2(dx, dz) - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * 0.25; } }

    function updateCrit(c, dt) {
      const p = c.g.position, pp = player.position, d = dist(p, pp);
      c.t -= dt; c.ph += dt * (c.st === 'idle' ? 2 : 9);
      if (c.fly) { updateBird(c, dt, d); return; }
      if (d < c.flee && c.st !== 'flee') { c.st = 'flee'; }
      let mv = 0, tx = 0, tz = 0;
      if (c.st === 'flee') {
        const dx = p.x - pp.x, dz = p.z - pp.z, l = Math.hypot(dx, dz) || 1; tx = dx / l; tz = dz / l; mv = c.speed * 1.5;
        if (d > c.flee + 5) { c.st = 'idle'; c.t = 2 + rnd() * 4; c.home = [p.x, p.z]; }
      } else if (c.st === 'wander') {
        const dx = c.dest[0] - p.x, dz = c.dest[1] - p.z, l = Math.hypot(dx, dz);
        if (l < 0.4 || c.t < 0) { c.st = 'idle'; c.t = 2 + rnd() * 5; } else { tx = dx / l; tz = dz / l; mv = c.speed * 0.35; }
      } else if (c.t < 0) { c.st = 'wander'; c.dest = [c.home[0] + (rnd() - 0.5) * 8, c.home[1] + (rnd() - 0.5) * 8]; c.t = 5; }
      if (mv) { p.x += tx * mv * dt; p.z += tz * mv * dt; ctx.collide(p); face(c.g, tx, tz); }
      // andatura: salti per conigli e scoiattoli, gambe per il cervo; da fermi un piccolo respiro
      if (c.hop) c.g.position.y = mv ? Math.abs(Math.sin(c.ph)) * (c.st === 'flee' ? 0.28 : 0.14) : 0;
      if (c.legs) c.legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(c.ph + (i % 2 ? 0 : Math.PI)) * 0.55 : 0; });
      if (c.tail) c.tail.rotation.z = Math.sin(c.ph * 1.3) * 0.15;
      c.g.scale.y = mv ? 1 : 1 + Math.sin(c.ph) * 0.02;
    }
    function updateBird(c, dt, d) {
      const p = c.g.position;
      if (c.st === 'idle' || c.st === 'wander') {
        c.wings.forEach(w => { w.rotation.z = 0; });
        if (d < c.flee) { c.st = 'fly'; const a = Math.atan2(p.x - player.position.x, p.z - player.position.z) + (rnd() - 0.5) * 1.2, r = 12 + rnd() * 8; c.dest = [Math.max(ctx.bounds[0] + 2, Math.min(ctx.bounds[1] - 2, p.x + Math.sin(a) * r)), Math.max(ctx.bounds[2] + 2, Math.min(ctx.bounds[3] - 2, p.z + Math.cos(a) * r))]; c.vy = 3; }
        else if (c.t < 0) { c.t = 1 + rnd() * 3; p.y = Math.abs(Math.sin(c.ph * 3)) > 0.9 ? 0.08 : 0.02; face(c.g, rnd() - 0.5, rnd() - 0.5); } // becchetta
      } else {
        const dx = c.dest[0] - p.x, dz = c.dest[1] - p.z, l = Math.hypot(dx, dz);
        if (l < 0.6) { c.st = 'idle'; c.t = 2; p.y = 0.02; c.home = [p.x, p.z]; return; }
        p.x += dx / l * c.speed * dt; p.z += dz / l * c.speed * dt; face(c.g, dx, dz);
        const target = l < 4 ? 0.1 : 3.2; p.y += (target - p.y) * Math.min(1, dt * 2.2);
        c.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(c.ph * 3.5) * 0.9; });
      }
    }

    function updatePet(dt) {
      const g = pet.g, p = g.position, pp = player.position, ry = player.rotation.y;
      // punto dietro a sinistra dell'omino
      const tx = pp.x - Math.sin(ry) * 1.7 + Math.cos(ry) * 0.9, tz = pp.z - Math.cos(ry) * 1.7 - Math.sin(ry) * 0.9;
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (dist(p, pp) > 16) { p.x = pp.x - 1.5; p.z = pp.z + 1.2; }
      let mv = 0;
      if (d > 0.7) { mv = Math.min(7, 2 + d * 1.5); p.x += dx / d * mv * dt; p.z += dz / d * mv * dt; ctx.collide(p); face(g, dx, dz); }
      else face(g, pp.x - p.x, pp.z - p.z);
      pet.ph += dt * (mv ? 11 : 4);
      pet.legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(pet.ph + (i % 2 ? 0 : Math.PI)) * 0.7 : 0; });
      pet.tail.rotation.z = Math.sin(pet.ph * (mv ? 0.6 : 1.6) * 2) * (pet.dog ? 0.6 : 0.25);
      pet.hop = Math.max(0, pet.hop - dt * 2.4);
      g.position.y = (mv ? Math.abs(Math.sin(pet.ph * 0.5)) * 0.04 : 0) + Math.sin(Math.PI * (1 - pet.hop)) * 0.5 * (pet.hop > 0 ? 1 : 0);
    }

    return {
      update(dt) { crit.forEach(c => updateCrit(c, dt)); if (pet) updatePet(dt); },
      // il compagno salta e fa il verso quando succede qualcosa di bello
      celebrate() { if (pet) { pet.hop = 1; A.sfx(pet.dog ? 'bark' : 'meow'); } },
      react() { if (pet && pet.hop <= 0 && Math.random() < 0.4) { pet.hop = 0.8; A.sfx(pet.dog ? 'bark' : 'meow'); } },
      count() { return crit.length; }
    };
  };
})(window.Rifugio);
