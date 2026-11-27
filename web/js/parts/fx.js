// Effetti: azioni ritardate, oggetti che volano e particelle (parte di game.js).
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).fx = function (G) {
    const { T, scene, B, mats } = G;
    // --- effetti: oggetti volanti, particelle, tempi -------------------------
    const _v = new T.Vector3(), _w = new T.Vector3();
    const later = [];
    const after = (sec, fn) => later.push({ t: sec, fn });
    // Oggetti che volano da un punto a un altro (legna, tazze, monete): non spariscono, viaggiano ad arco e poi atterrano.
    const flyers = [], flyFree = { log: [], cup: [], coin: [] };
    const flyDef = { log: [B.logGeo, B.logMat], cup: [B.cupGeo, mats.cup], coin: [B.coinGeo, mats.gold] };
    function fly(kind, from, to, dur, arc, done, delay) {
      let m = flyFree[kind].pop();
      if (!m) { m = new T.Mesh(flyDef[kind][0], flyDef[kind][1]); scene.add(m); }
      m.visible = false;
      flyers.push({ m, kind, a: from.clone(), to, t: -(delay || 0), dur, arc, done });
    }
    function updateFlyers(dt) {
      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]; f.t += dt;
        if (f.t < 0) continue;
        const k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        if (typeof f.to === 'function') f.to(_v); else _v.copy(f.to);
        f.m.visible = true;
        f.m.position.set(f.a.x + (_v.x - f.a.x) * e, f.a.y + (_v.y - f.a.y) * e + Math.sin(Math.PI * k) * f.arc, f.a.z + (_v.z - f.a.z) * e);
        f.m.rotation.x += dt * 9; f.m.rotation.z += dt * 6;
        f.m.scale.setScalar(1 + 0.25 * Math.sin(Math.PI * k));
        if (k >= 1) { f.m.visible = false; flyFree[f.kind].push(f.m); flyers.splice(i, 1); if (f.done) f.done(); }
      }
    }
    // Particelle: scheggie di legno, scintille, coriandoli, cuoricini.
    const partGeo = new T.BoxGeometry(1, 1, 1), partMat = {}, parts = [], partFree = [];
    function burst(x, y, z, n, colors, speed, up, life, size, grav) {
      for (let i = 0; i < n; i++) {
        let m = partFree.pop();
        if (!m) { m = new T.Mesh(partGeo, null); scene.add(m); }
        const c = colors[Math.floor(Math.random() * colors.length)];
        m.material = partMat[c] || (partMat[c] = new T.MeshBasicMaterial({ color: c }));
        const a = Math.random() * 6.283, sp = speed * (0.4 + Math.random() * 0.6), sz = size * (0.7 + Math.random() * 0.6);
        m.position.set(x, y, z); m.scale.setScalar(sz); m.visible = true;
        parts.push({ m, vx: Math.cos(a) * sp, vy: up * (0.5 + Math.random() * 0.7), vz: Math.sin(a) * sp, t: 0, life: life * (0.7 + Math.random() * 0.5), sz, g: grav == null ? 9 : grav });
      }
    }
    function updateParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.rotation.x += dt * 8; p.m.rotation.y += dt * 6;
        const k = p.t / p.life; p.m.scale.setScalar(p.sz * (k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3)));
        if (p.t >= p.life || p.m.position.y < 0) { p.m.visible = false; partFree.push(p.m); parts.splice(i, 1); }
      }
    }
    function tickLater(dt) {
      for (let i = later.length - 1; i >= 0; i--) { later[i].t -= dt; if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); f(); } }
    }
    // Anello che si allarga a terra (acquisti) e fuochi d'artificio (fine stagione).
    const rings = [], ringGeo = new T.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2);
    function ring(x, z, color) { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: T.DoubleSide })); m.position.set(x, 0.12, z); scene.add(m); rings.push({ m, t: 0 }); }
    function fireworks(x, z, colors) { for (let k = 0; k < 7; k++) after(k * 0.32, () => burst(x + (Math.random() - 0.5) * 9, 3 + Math.random() * 2.5, z - 1 + (Math.random() - 0.5) * 5, 30, [colors[k % colors.length], 0xffffff], 4, 3, 1.3, 0.16, 4)); }
    const updateAll = dt => { updateParts(dt); for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / 0.7; r.m.scale.setScalar(0.5 + k * 2.6); r.m.material.opacity = Math.max(0, 1 - k); if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } } };
    return { ring, fireworks, updateAll, _v, _w, after, fly, updateFlyers, burst, updateParts, tickLater };
  };
})(window.Rifugio);
