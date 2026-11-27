// Raccolta (parte di game.js): alberi o coltivazioni del campo a nord (secondo la stagione), ricrescita, e il macchinario
// da guidare che raccoglie tutto quello che ha attorno e poi scarica nel locale caldaia/cucina.
(function (R) {
  'use strict';
  const HOPPER = 80;

  (R.parts = R.parts || {}).resources = function (G) {
    const { T, scene, B, mats, box, cyl, ball, hud, A, P, S, L, cols, RES, rnd, player, burst } = G;
    const nodes = [], isTree = RES.kind === 'wood';

    // Mesh delle coltivazioni: condivise fra tutte le piante (un solo pezzo per pianta).
    const sph = new T.SphereGeometry(1, 6, 4), stalk = new T.CylinderGeometry(0.025, 0.035, 1, 3, 1, true).translate(0, 0.5, 0);
    function cropGeo() {
      const parts = [];
      if (RES.kind === 'veg') {
        [[0, 0], [0.4, 0.25], [-0.35, 0.3], [0.1, -0.4]].forEach(([x, z], i) => {
          parts.push({ geo: sph, x, y: 0.22, z, s: [0.26, 0.2, 0.26], color: i % 2 ? 0x57c455 : 0x7ac943 });
          parts.push({ geo: sph, x, y: 0.36, z, s: [0.13, 0.13, 0.13], color: i % 2 ? 0xff7a3d : 0xa8e063 });
        });
      } else if (RES.kind === 'grain') {
        for (let i = 0; i < 13; i++) {
          const a = i * 2.4, r = 0.1 + (i % 5) * 0.13, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.65 + (i % 4) * 0.08;
          parts.push({ geo: stalk, x, y: 0, z, s: [1, h, 1], color: 0xd9a93a }, { geo: sph, x, y: h + 0.08, z, s: [0.085, 0.17, 0.085], color: 0xffd23a });
        }
      } else {
        [[0, 0, 0.36], [0.45, 0.3, 0.22], [-0.4, 0.25, 0.26]].forEach(([x, z, r]) => parts.push({ geo: sph, x, y: r * 0.75, z, s: [r, r * 0.78, r], color: 0xff8a1f }, { geo: stalk, x, y: r * 1.4, z, s: [1.6, 0.18, 1.6], color: 0x4a7a2a }));
        for (let i = 0; i < 5; i++) parts.push({ geo: sph, x: Math.cos(i * 1.3) * 0.55, y: 0.07, z: Math.sin(i * 1.3) * 0.55, s: [0.18, 0.05, 0.14], color: 0x4f9c3e });
      }
      return B.mergeParts(parts);
    }
    const geo = isTree ? null : cropGeo(), F = L.field;
    // Il campo (o il bosco abbattibile) è un solo appezzamento con gli angoli tondi: distanza dal bordo, positiva dentro.
    function inside(x, z) {
      const cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2, hx = (F.x1 - F.x0) / 2 - F.r, hz = (F.z1 - F.z0) / 2 - F.r;
      const dx = Math.abs(x - cx) - hx, dz = Math.abs(z - cz) - hz;
      return F.r - (Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0));
    }
    // contorno del rettangolo stondato, in senso orario, partendo dal cancello (lato sud)
    function outline() {
      const pts = [], r = F.r, arc = (cx, cz, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + i / 8 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
      pts.push([-F.gate, F.z1]);
      arc(F.x0 + r, F.z1 - r, Math.PI / 2); arc(F.x0 + r, F.z0 + r, Math.PI); arc(F.x1 - r, F.z0 + r, Math.PI * 1.5); arc(F.x1 - r, F.z1 - r, 0);
      pts.push([F.gate, F.z1]);
      return pts;
    }
    const edge = outline();
    if (!isTree) { // terra: un pezzo solo, con i solchi
      const shape = new T.Shape(edge.map(([x, z]) => new T.Vector2(x, -z)));
      const land = new T.Mesh(new T.ShapeGeometry(shape).rotateX(-Math.PI / 2), B.tint(0x8a6238)); land.position.y = 0.035; land.receiveShadow = true; scene.add(land);
      const dark = B.tint(0x75512e), furrows = new T.Group(); scene.add(furrows);
      for (let z = F.z0 + 1.6; z < F.z1 - 1; z += 1.9) {
        let x0 = F.x0 + 0.4; while (inside(x0, z) < 0.5) x0 += 0.2;
        const m = new T.Mesh(new T.PlaneGeometry(-x0 * 2, 0.45).rotateX(-Math.PI / 2), dark); m.position.set(0, 0.05, z + 0.95); m.receiveShadow = true; furrows.add(m);
      }
      B.bake(furrows);
    }
    { // staccionata: pali e due traverse lungo tutto il bordo (aperta solo al cancello), con ostacolo
      const parts = [], post = new T.BoxGeometry(0.18, 1, 0.18), rail = new T.BoxGeometry(1, 0.1, 0.07), wood = 0x9a6a45;
      const addPost = (x, z, h) => parts.push({ geo: post, x, y: h / 2, z, s: [1, h, 1], color: wood });
      for (let i = 0; i < edge.length - 1; i++) {
        const [ax, az] = edge[i], [bx, bz] = edge[i + 1], len = Math.hypot(bx - ax, bz - az);
        if (len < 0.05) continue;
        const n = Math.max(1, Math.ceil(len / 1.5));
        for (let k = 0; k < n; k++) {
          const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n, l = len / n;
          addPost(x0, z0, 0.9);
          [0.42, 0.72].forEach(y => parts.push({ geo: rail, x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, s: [l, 1, 1], ry: Math.atan2(-(z1 - z0), x1 - x0), color: 0xb8845a }));
          cols.push([Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, Math.min(z0, z1) - 0.1, Math.max(z0, z1) + 0.1]);
        }
      }
      [-F.gate, F.gate].forEach(x => { addPost(x, F.z1, 1.5); parts.push({ geo: post, x, y: 1.55, z: F.z1, s: [1.6, 0.14, 1.6], color: 0xf4f1e6 }); }); // pali del cancello
      const fence = new T.Mesh(B.mergeParts(parts), mats.accent); fence.castShadow = true; scene.add(fence);
    }
    function cropMesh(x, z) {
      const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      const stump = new T.Group(); g.add(stump); // dopo il raccolto resta solo la terra
      const fall = new T.Group(); g.add(fall); fall.add(new T.Mesh(geo, mats.accent));
      return { g, fall, stump, mats: [] };
    }
    function plant(x, z, sc) {
      const n = isTree ? B.tree(x, z, sc) : cropMesh(x, z);
      const t = {
        g: n.g, fall: n.fall, stump: n.stump, mats: n.mats, x, z, sc, logs: P.logs_per_tree, regrow: 0,
        state: 'up', ang: 0, vel: 0, axis: new T.Vector3(1, 0, 0), hits: [], downT: 0, fade: 1, opacity: 1,
        half: isTree ? 0.2 * sc : 0
      };
      t.col = [x - t.half, x + t.half, z - t.half, z + t.half];
      if (isTree) cols.push(t.col);
      nodes.push(t);
      return t;
    }
    // Piante a file dentro il recinto; resta libero il posto del macchinario (nel bosco anche il viale dal cancello).
    const dx = isTree ? 2.6 : 1.95, dz = isTree ? 2.6 : 1.9, edgeGap = isTree ? 1.2 : 0.9;
    for (let z = F.z1 - 1.5, row = 0; z > F.z0; z -= dz, row++) {
      for (let x = F.x0 + 0.9; x < F.x1; x += dx) {
        const j = isTree ? 0.4 : 0.1, px = x + (rnd() - 0.5) * j + (isTree && row % 2 ? 0.8 : 0), pz = z + (rnd() - 0.5) * j;
        if (inside(px, pz) < edgeGap || Math.hypot(px - L.park[0], pz - L.park[1]) < 2.4) continue;
        if (Math.abs(px) < (isTree ? 1.4 : 1.1) && (isTree || pz > F.z1 - 2.5)) continue;
        plant(px, pz, 1);
      }
    }

    function setCol(t, felled) {
      const h = t.half, c = t.col;
      if (!isTree) return;
      if (felled) { c[0] = c[1] = c[2] = c[3] = 1e6; return; }
      c[0] = t.x - h; c[1] = t.x + h; c[2] = t.z - h; c[3] = t.z + h;
    }
    // Il macchinario resta dentro il recinto (angoli tondi compresi) ed esce solo dal cancello.
    function keepInside(p) {
      const m = 1.2;
      if (Math.abs(p.x) <= F.gate - m && p.z > F.z1 - m - 0.5) return;
      const cx = Math.max(F.x0 + F.r, Math.min(F.x1 - F.r, p.x)), cz = Math.max(F.z0 + F.r, Math.min(F.z1 - F.r, p.z));
      p.x = Math.max(F.x0 + m, Math.min(F.x1 - m, p.x)); p.z = Math.max(F.z0 + m, Math.min(F.z1 - m, p.z));
      const d = Math.hypot(p.x - cx, p.z - cz);
      if (d > F.r - m && Math.abs(p.x - cx) > 0 && Math.abs(p.z - cz) > 0) { p.x = cx + (p.x - cx) / d * (F.r - m); p.z = cz + (p.z - cz) / d * (F.r - m); }
    }    function near(p, maxD) {
      let best = null, bd = maxD;
      for (const t of nodes) { if (t.logs <= 0) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = t; } }
      return best;
    }
    // Un colpo: il pezzo è subito di chi raccoglie; la pianta reagisce quando l'attrezzo la raggiunge (delay).
    function chop(t, fx, fz, delay) {
      t.logs--;
      let ddx = t.x - fx, ddz = t.z - fz; const d = Math.hypot(ddx, ddz) || 1; ddx /= d; ddz /= d;
      t.hits.push({ at: delay, dx: ddx, dz: ddz, n: P.logs_per_tree - t.logs, last: t.logs <= 0 });
      if (t.logs <= 0) { t.regrow = P.tree_regrow; S.trees = (S.trees || 0) + 1; setCol(t, true); }
    }
    function regrow(dt) {
      for (const t of nodes) {
        if (t.logs > 0) continue;
        t.regrow -= dt;
        if (t.regrow <= 0) {
          Object.assign(t, { logs: P.logs_per_tree, state: 'up', ang: 0, vel: 0, hits: [], downT: 0 });
          t.fall.quaternion.identity(); t.fall.visible = true; t.fall.scale.setScalar(0.2); t.stump.visible = false; setCol(t, false);
        }
      }
    }
    function animate(t, dt) {
      for (let i = t.hits.length - 1; i >= 0; i--) {
        const h = t.hits[i]; h.at -= dt;
        if (h.at > 0) continue;
        t.hits.splice(i, 1);
        t.axis.set(h.dz, 0, -h.dx);
        if (h.last) { t.state = 'falling'; t.vel = Math.max(t.vel, 0.5); t.stump.visible = true; if (isTree) A.sfx('tree'); }
        else t.vel += 1.2 + 0.45 * h.n;
      }
      if (t.state === 'up') { t.vel += (-90 * t.ang - 8 * t.vel) * dt; t.ang += t.vel * dt; }
      else if (t.state === 'falling') { t.vel += 6 * dt; t.ang += t.vel * dt; if (t.ang >= Math.PI / 2) { t.ang = Math.PI / 2; t.state = 'down'; t.downT = 0; } }
      else if (t.state === 'down') { t.downT += dt; if (t.downT > (isTree ? 1.8 : 0.5)) { t.fall.visible = false; if (isTree) t.stump.visible = false; } }
      if (t.ang !== 0 || t.state !== 'up') t.fall.quaternion.setFromAxisAngle(t.axis, t.ang);
      if (t.fall.scale.x < 1) t.fall.scale.setScalar(Math.min(1, t.fall.scale.x + dt * 1.5));
    }
    // Gli alberi vicini al personaggio o davanti a lui diventano trasparenti.
    function fade(t, p, dt) {
      if (!isTree) return;
      const ddx = t.x - p.x, ddz = t.z - p.z;
      const covers = ddz > -0.5 && ddz < 4.2 && Math.abs(ddx) < 0.8 + 0.45 * t.sc;
      t.fade += ((covers || Math.hypot(ddx, ddz) < 1.5 ? 0.35 : 1) - t.fade) * Math.min(1, dt * 8);
      const fallFade = t.state === 'down' ? Math.max(0, 1 - Math.max(0, t.downT - 1) / 0.8) : 1;
      const o = Math.round(Math.min(t.fade, fallFade) * 50) / 50;
      if (o === t.opacity) return;
      t.opacity = o;
      for (const m of t.mats) { const tr = o < 1; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = o; }
    }

    // --- il macchinario -----------------------------------------------------
    const machine = { g: new T.Group(), owned: false, driving: false, cool: 0, el: hud.label('pill', ''), reel: new T.Group() };
    {
      const g = machine.g, body = B.tint({ wood: 0xf2a02a, veg: 0x3fa84a, grain: 0xd9433b, pumpkin: 0xff7a1f }[RES.kind]);
      box(1.7, 0.7, 1.9, body, 0, 0.9, -0.2, g, 0.12); box(1.0, 0.85, 0.9, B.tint(0xbfe6ff), 0, 1.65, -0.35, g, 0.1); box(1.15, 0.12, 1.05, body, 0, 2.15, -0.35, g, 0.05);
      box(0.9, 0.5, 0.8, mats.dark, 0, 0.9, -1.35, g, 0.08);
      [[-0.95, 0.45, 0.5], [0.95, 0.45, 0.5], [-0.9, 0.32, -1.0], [0.9, 0.32, -1.0]].forEach(([x, r, z]) => { const w = cyl(r, r, 0.3, mats.dark, x, r, z, g, 16); w.rotation.z = Math.PI / 2; const h = cyl(r * 0.45, r * 0.45, 0.32, mats.yellow, x, r, z, g, 10); h.rotation.z = Math.PI / 2; });
      // testata davanti (+z): rullo che gira per il campo, braccio con lama per gli alberi
      box(2.8, 0.25, 0.5, mats.steel, 0, 0.35, 1.35, g, 0.05);
      machine.reel.position.set(0, 0.65, 1.45); g.add(machine.reel);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; box(2.6, 0.08, 0.08, mats.steel, 0, Math.sin(a) * 0.3, Math.cos(a) * 0.3, machine.reel, 0.02); }
      [-1.3, 1.3].forEach(x => cyl(0.3, 0.3, 0.08, body, x, 0, 0, machine.reel, 10).rotation.z = Math.PI / 2);
      g.position.set(L.park[0], 0, L.park[1]); g.visible = false; scene.add(g);
    }
    if (S.hopper == null) S.hopper = 0;
    function buy() { machine.owned = true; machine.g.visible = true; }
    function dismount() {
      if (!machine.driving) return;
      machine.driving = false; machine.cool = 2.5; player.visible = true;
      machine.g.position.set(L.park[0], 0, L.park[1]); machine.g.rotation.y = 0;
      const n = Math.min(S.hopper, Math.max(0, Math.floor(P.fuel_max - G.boiler.fuel - G.boiler.pend)));
      if (n > 0) { S.hopper -= n; G.feedMany(n); hud.toast(`🚜 Scaricati ${n} pezzi`); }
    }
    function update(dt) {
      for (const t of nodes) animate(t, dt);
      regrow(dt);
      machine.cool -= dt;
      if (!machine.owned) return;
      const p = player.position;
      if (!machine.driving) {
        if (machine.cool <= 0 && Math.hypot(p.x - L.park[0], p.z - L.park[1]) < 1.6) {
          machine.driving = true; player.visible = false; p.x = L.park[0]; p.z = L.park[1] - 0.8; A.sfx('saw'); hud.toast('🚜 Guida nel campo; esci dal cancello per scaricare');
        }
        return;
      }
      if (p.z > F.z1 + 0.6) { dismount(); return; }
      const g = machine.g;
      const moved = Math.hypot(p.x - g.position.x, p.z - g.position.z);
      g.position.set(p.x, 0, p.z); g.rotation.y = player.rotation.y; machine.reel.rotation.x += dt * (4 + moved * 40);
      const hx = p.x + Math.sin(player.rotation.y) * 1.3, hz = p.z + Math.cos(player.rotation.y) * 1.3;
      for (const t of nodes) {
        if (S.hopper >= HOPPER) break;
        if (t.logs <= 0 || Math.hypot(t.x - hx, t.z - hz) > 1.7) continue;
        const n = Math.min(t.logs, HOPPER - S.hopper);
        for (let k = 0; k < n; k++) chop(t, p.x, p.z, 0.05);
        S.hopper += n; S.wood += n; S.mowed = (S.mowed || 0) + n; G.EX.ev('wood', n); A.sfx('saw');
        burst(t.x, 0.8, t.z, 8, RES.cols, 2.4, 3.4, 0.6, 0.12);
      }
    }
    function overlays() {
      const txt = machine.owned && (machine.driving || S.hopper > 0) ? `🚜 ${S.hopper}/${HOPPER}${S.hopper >= HOPPER ? ' pieno!' : ''}` : '';
      if (machine.el.textContent !== txt) machine.el.textContent = txt;
      hud.put(machine.el, machine.g.position.x, 2.8, machine.g.position.z, !!txt);
    }
    return { nodes, near, chop, update, fade, machine, buy, dismount, overlays, keepInside, inside };
  };
})(window.Rifugio);
