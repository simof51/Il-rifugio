// Costruzione della scena con primitive low-poly: materiali, scatole, cilindri, abeti, omini, pile di legna.
(function (R) {
  'use strict';

  R.createBuilder = function (scene) {
    const T = THREE;
    const M = c => new T.MeshLambertMaterial({ color: c });
    const mats = {
      snow: M(0xf4f7fb), pine: M(0x2f6b4f), pine2: M(0x3d8460), trunk: M(0x6b4430), wood: M(0x9a6a45),
      plank: M(0xc89b6d), stone: M(0x8d939c), red: M(0xd94f3d), skin: M(0xf2c9a0), dark: M(0x2d3440),
      bed: M(0xe9e2d0), blanket: M(0x4f7cc4), gold: M(0xf2b632), cup: M(0xb8452f), path: M(0xd8ccb8),
      rock: M(0x8fa6bf), cocoa: M(0x5a3220),
      pad: new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      ghost: new T.MeshLambertMaterial({ color: 0xc89b6d, transparent: true, opacity: 0.3 }),
      flame: new T.MeshBasicMaterial({ color: 0xffa233 }),
      arrow: new T.MeshBasicMaterial({ color: 0xf2b632 })
    };
    const tintCache = {};
    const tint = c => tintCache[c] || (tintCache[c] = M(c));

    function add(o, p) { o.castShadow = o.receiveShadow = true; (p || scene).add(o); return o; }
    function box(w, h, d, m, x, y, z, p) { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return add(o, p); }
    function cyl(rt, rb, h, m, x, y, z, p, s) { const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, s || 10), m); o.position.set(x, y, z); return add(o, p); }
    function clear(g) { while (g.children.length) g.remove(g.children[0]); }

    // Abete: tronco e chioma a tre strati con la punta innevata.
    function tree(x, z, sc) {
      const g = new T.Group(); g.position.set(x, 0, z); if (sc) g.scale.setScalar(sc);
      cyl(0.18, 0.25, 1, mats.trunk, 0, 0.5, 0, g, 6);
      const crown = new T.Group(); g.add(crown);
      [[1.3, 1.6, 1.5], [1, 1.3, 2.3], [0.7, 1, 3]].forEach(([r, h, y], i) => cyl(0, r, h, i % 2 ? mats.pine2 : mats.pine, 0, y, 0, crown, 7));
      cyl(0, 0.36, 0.45, mats.snow, 0, 3.55, 0, crown, 7);
      scene.add(g);
      return { g, crown };
    }

    // Omino con cappotto, cappello a pon pon e gambe animabili.
    function person(coat, hat) {
      const g = new T.Group();
      cyl(0.3, 0.38, 0.85, tint(coat), 0, 0.82, 0, g, 8);
      const head = add(new T.Mesh(new T.SphereGeometry(0.27, 12, 10), mats.skin), g); head.position.y = 1.48;
      cyl(0.29, 0.31, 0.12, tint(hat), 0, 1.66, 0, g, 10); cyl(0, 0.28, 0.4, tint(hat), 0, 1.9, 0, g, 10);
      const pom = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), mats.snow); pom.position.y = 2.12; g.add(pom);
      [-0.09, 0.09].forEach(ex => { const e = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), mats.dark); e.position.set(ex, 1.5, 0.25); g.add(e); });
      g.userData.legs = [cyl(0.1, 0.1, 0.42, mats.dark, -0.14, 0.21, 0, g, 6), cyl(0.1, 0.1, 0.42, mats.dark, 0.14, 0.21, 0, g, 6)];
      g.userData.ph = 0;
      scene.add(g);
      return g;
    }
    function walk(o, moving, dt) {
      const L = o.userData.legs; o.userData.ph += dt * 12 * moving;
      const a = moving ? Math.sin(o.userData.ph) * 0.55 : 0; L[0].rotation.x = a; L[1].rotation.x = -a;
    }
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

    const logGeo = new T.CylinderGeometry(0.09, 0.09, 0.55, 7);
    const cupGeo = new T.CylinderGeometry(0.11, 0.08, 0.2, 8);
    const coinGeo = new T.CylinderGeometry(0.17, 0.17, 0.06, 12);
    function drawStack(g, logs, cups) {
      clear(g); let y = 0;
      for (let i = 0; i < logs; i++) { const m = new T.Mesh(logGeo, mats.wood); m.rotation.z = Math.PI / 2; m.position.y = y; y += 0.19; add(m, g); }
      for (let i = 0; i < cups; i++) { const m = new T.Mesh(cupGeo, mats.cup); m.position.y = y + 0.04; y += 0.22; add(m, g); }
    }

    return { T, M, mats, tint, add, box, cyl, clear, tree, person, walk, moveTo, follow, drawStack, cupGeo, coinGeo };
  };
})(window.Rifugio);
