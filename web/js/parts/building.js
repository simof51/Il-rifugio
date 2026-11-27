// Costruzione del rifugio (parte di game.js): pavimenti, muri bassi (si vede dentro), stanze con due letti e bagno,
// corridoio, mensa con i tavoli, sala cinema, locale caldaia/cucina, sgabuzzino.
(function (R) {
  'use strict';
  const TOWELS = [0xff6b6b, 0x4fa3ff, 0xffd23a, 0x4cd964, 0xff9a2a, 0xc084fc];

  (R.parts = R.parts || {}).building = function (G) {
    const { T, scene, B, mats, PL, L, cols, RES } = G;
    // senza un gruppo indicato, i pezzi si segnano come fissi (poi si fondono)
    const mark = (o, p) => { if (!p) o.userData.build = true; return o; };
    const box = (w, h, d, m, x, y, z, p, r) => mark(G.box(w, h, d, m, x, y, z, p, r), p), cyl = (a, b, h, m, x, y, z, p, s) => mark(G.cyl(a, b, h, m, x, y, z, p, s), p), ball = (r, m, x, y, z, p, a, b) => mark(G.ball(r, m, x, y, z, p, a, b), p);
    const STYLE = PL.style || 'alpine';
    const wallM = PL.walls != null ? B.tint(PL.walls) : mats.wood, trimM = PL.trim != null ? B.tint(PL.trim) : mats.plank;
    const floorM = PL.floor != null ? B.tint(PL.floor) : mats.plank, rugM = PL.rug != null ? B.tint(PL.rug) : mats.red;
    const corrM = B.tint(STYLE === 'harbor' ? 0x6d86a8 : STYLE === 'dutch' ? 0xc98a5a : 0xa8514a), tileM = B.tint(0xd8eef2), porcM = mats.white;
    const LOW = 0.85, TALL = 1.5, TH = 0.22;

    // Muro lungo x o lungo z (con ostacolo). Restituisce la mesh e l'ostacolo.
    function wall(x0, z0, x1, z1, h, parent, noCol) {
      parent = parent || fixed;
      const w = Math.max(TH, x1 - x0), d = Math.max(TH, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const m = slab(w, h, d, wallM, cx, h / 2 + 0.05, cz, parent);
      slab(w + 0.05, 0.08, d + 0.05, trimM, cx, h + 0.08, cz, parent);
      const c = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2];
      if (!noCol) cols.push(c);
      return { m, c };
    }
    // Muro lungo z con una porta (apertura larga "gap" attorno a doorZ).
    function doorWallZ(x, z0, z1, doorZ, gap, h, parent) {
      parent = parent || fixed;
      const out = [];
      if (doorZ - gap / 2 > z0 + 0.05) out.push(() => wall(x - TH / 2, z0, x + TH / 2, doorZ - gap / 2, h, parent));
      if (z1 > doorZ + gap / 2 + 0.05) out.push(() => wall(x - TH / 2, doorZ + gap / 2, x + TH / 2, z1, h, parent));
      out.forEach(f => f());
      [-gap / 2, gap / 2].forEach(dz => box(0.28, h + 0.25, 0.14, trimM, x, h / 2 + 0.1, doorZ + dz, parent, 0.02)); // stipiti
    }
    const floor = (x0, x1, z0, z1, m, parent, y) => { const f = slab(x1 - x0, 0.1, z1 - z0, m, (x0 + x1) / 2, y || 0.05, (z0 + z1) / 2, parent || fixed); f.castShadow = false; return f; };
    const group = vis => { const g = new T.Group(); g.visible = vis !== false; scene.add(g); return g; };

    // Le parti fisse stanno nel gruppo "fixed" e alla fine si fondono per materiale.
    const fixed = new T.Group(); scene.add(fixed);
    // scatole a spigoli vivi per muri e pavimenti: 12 triangoli invece di 300
    const slab = (w, h, d, m, x, y, z, p) => { const o = new T.Mesh(B.cached(`sl${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`, () => new T.BoxGeometry(w, h, d)), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };

    // --- corridoio centrale e ingresso ------------------------------------
    // il tratto tra mensa e cinema c'è sempre; quello fra le stanze si allunga di una fila a ogni ampliamento
    floor(-L.HW, L.HW, -23, L.Z0, corrM, null, 0.055);
    for (let z = -22; z < L.Z0 - 0.5; z += 2) floor(-0.25, 0.25, z, z + 0.9, trimM, null, 0.07);
    floor(-4.5, 4.5, L.boiler.z0, L.boiler.z1, B.tint(0x9aa1ab), null, 0.05);
    [-L.HW, L.HW].forEach(x => cyl(0.09, 0.1, 2.2, trimM, x, 1.1, L.boiler.z0, null, 8)); box(L.HW * 2 + 0.4, 0.3, 0.2, trimM, 0, 2.25, L.boiler.z0, null, 0.04); // arco d'ingresso, verso strada e reception

    // --- locale caldaia / cucina ------------------------------------------
    const bz0 = L.boiler.z0, bz1 = L.boiler.z1, closetLeft = L.closet.x1 < 0;
    wall(-4.5, bz0 - TH / 2, -L.HW, bz0 + TH / 2, TALL); wall(L.HW, bz0 - TH / 2, 4.5, bz0 + TH / 2, TALL);
    wall(-4.5, bz1 - TH / 2, -L.HW, bz1 + TH / 2, LOW); wall(L.HW, bz1 - TH / 2, 4.5, bz1 + TH / 2, LOW);
    if (closetLeft) { wall(4.5 - TH / 2, bz0, 4.5 + TH / 2, bz1, TALL); doorWallZ(-4.5, bz0, bz1, -25.6, 1.9, TALL); }
    else { wall(-4.5 - TH / 2, bz0, -4.5 + TH / 2, bz1, TALL); doorWallZ(4.5, bz0, bz1, -25.6, 1.9, TALL); }
    const [fx, fz] = L.boiler.fire;
    let flame, fireY;
    if (RES.kind === 'wood') { // caldaia: corpo di ghisa con sportello e tubo
      cyl(0.85, 0.95, 1.5, mats.dark, fx, 0.8, fz, null, 18); cyl(0.9, 0.9, 0.12, mats.steel, fx, 1.58, fz, null, 18);
      cyl(0.18, 0.18, 1.6, mats.steel, fx, 2.4, fz - 0.4, null, 10); box(0.8, 0.6, 0.2, B.tint(0x5a3320), fx, 0.7, fz + 0.9, null, 0.05); fireY = 0.65;
    } else if (RES.kind === 'grain') { // forno a cupola
      box(2.0, 0.8, 1.5, mats.stone, fx, 0.45, fz, null, 0.08); const d = ball(0.95, B.tint(0xc9714a), fx, 0.85, fz, null, 18, 12); d.scale.set(1.05, 0.85, 0.8);
      box(0.8, 0.5, 0.2, mats.dark, fx, 1.05, fz + 0.7, null, 0.08); cyl(0.16, 0.18, 1.0, mats.stone, fx, 2.0, fz - 0.2, null, 8); fireY = 1.0;
    } else { // cucina (ortaggi) o calderone (zucche)
      box(2.3, 0.9, 1.2, mats.stone, fx, 0.5, fz, null, 0.08);
      const p = ball(0.7, RES.kind === 'veg' ? mats.steel : mats.dark, fx, 1.4, fz, null, 18, 12); p.scale.set(1, 0.7, 1);
      cyl(0.66, 0.66, 0.06, B.tint(RES.kind === 'veg' ? 0x7ac943 : 0xff9a2a), fx, 1.66, fz, null, 18); fireY = 0.85;
    }
    cols.push([fx - 1.15, fx + 1.15, fz - 0.8, fz + 0.9]);
    flame = new T.Mesh(new T.ConeGeometry(0.3, 0.65, 14), mats.flame); flame.position.set(fx, fireY, fz + (RES.kind === 'wood' ? 1.05 : 0.85)); scene.add(flame);
    // tappeto dove si consegna
    floor(L.boiler.feed[0] - 0.9, L.boiler.feed[0] + 0.9, L.boiler.feed[1] - 0.7, L.boiler.feed[1] + 0.7, B.tint(0xffd23a), null, 0.1);

    // --- sgabuzzino --------------------------------------------------------
    const C = L.closet;
    floor(C.x0, C.x1, C.z0, C.z1, B.tint(0xcdb489), null, 0.05);
    wall(C.x0, C.z0 - TH / 2, C.x1, C.z0 + TH / 2, TALL); wall(C.x0, C.z1 - TH / 2, C.x1, C.z1 + TH / 2, LOW);
    const outerX = closetLeft ? C.x0 : C.x1; wall(outerX - TH / 2, C.z0, outerX + TH / 2, C.z1, TALL);
    const [sx, sz] = C.shelf;
    [0.35, 0.95, 1.55].forEach(y => box(1.6, 0.08, 0.6, mats.plank, sx, y, sz, null, 0.02));
    [-0.8, 0.8].forEach(dx => box(0.08, 1.7, 0.6, mats.wood, sx + dx, 0.85, sz, null, 0.02));
    for (let i = 0; i < 5; i++) { box(0.2, 0.16, 0.3, B.tint(i % 2 ? 0xff9bb5 : 0x9be7c4), sx - 0.6 + i * 0.3, 1.09, sz, null, 0.05); cyl(0.13, 0.13, 0.22, porcM, sx - 0.6 + i * 0.3, 1.7, sz, null, 10); }
    cols.push([sx - 0.85, sx + 0.85, sz - 0.35, sz + 0.35]);
    floor(C.pick[0] - 0.7, C.pick[0] + 0.7, C.pick[1] - 0.55, C.pick[1] + 0.55, B.tint(0x4fa3ff), null, 0.1);

    // --- stanze ------------------------------------------------------------
    const rooms = L.rooms.map(def => {
      const g = group(false), ghost = G.box(L.ROOM_W - 0.2, 0.05, L.ROOM_D - 0.2, mats.ghost, def.cx, 0.03, (def.z0 + def.z1) / 2, null, 0.02); ghost.castShadow = false;
      ghost.visible = def.row === 0;
      return { i: def.k, def, cx: def.cx, g, ghost, open: false, soap: 4, paper: 4, beds: def.beds.map(b => ({ x: b.x, z: b.z, guest: null })) };
    });
    function openRoom(r) {
      if (r.open) return;
      r.open = true; r.g.visible = true; r.ghost.visible = false;
      const d = r.def, g = r.g, s = d.side, ax = x => s * x, outer = ax(L.HW + L.ROOM_W);
      floor(d.x0, d.x1, d.z0, d.z1, floorM, g, 0.06);
      wall(d.x0, d.z0 - TH / 2, d.x1, d.z0 + TH / 2, LOW, g); wall(d.x0, d.z1 - TH / 2, d.x1, d.z1 + TH / 2, LOW, g);
      wall(outer - TH / 2, d.z0, outer + TH / 2, d.z1, TALL, g);
      doorWallZ(d.doorX, d.z0, d.z1, d.doorZ, 1.9, LOW, g);
      // finestra sul muro esterno
      box(0.1, 0.55, 1.3, B.tint(0xbfe6ff), outer - s * 0.12, 0.95, d.z0 + 1.4, g, 0.02);
      // due letti con testata a nord e comodino
      r.beds.forEach((b, k) => {
        box(1.1, 0.4, 2.1, mats.bed, b.x, 0.35, b.z, g); box(1.12, 0.1, 1.3, B.tint(TOWELS[(d.k * 2 + k) % TOWELS.length]), b.x, 0.57, b.z + 0.4, g);
        box(0.8, 0.14, 0.45, porcM, b.x, 0.61, b.z - 0.75, g); box(1.2, 0.7, 0.12, trimM, b.x, 0.5, b.z - 1.08, g, 0.04);
        cols.push([b.x - 0.55, b.x + 0.55, b.z - 1.1, b.z + 1.05]);
      });
      box(1.4, 0.03, 0.9, rugM, ax(3.0), 0.125, d.z0 + 3.4, g, 0.01);
      // bagno nell'angolo in basso verso l'esterno: pavimento a piastrelle, water, lavandino, muretti
      const bx0 = Math.min(ax(5.5), outer), bx1 = Math.max(ax(5.5), outer);
      floor(bx0, bx1, d.z0 + 2.9, d.z1, tileM, g, 0.1);
      wall(bx0, d.z0 + 2.8, bx1, d.z0 + 2.95, 0.6, g);
      const tx = ax(7.1);
      cyl(0.22, 0.18, 0.4, porcM, tx, 0.35, d.z0 + 4.35, g, 14); box(0.18, 0.55, 0.45, porcM, ax(7.45), 0.55, d.z0 + 4.35, g, 0.05); // water
      box(0.6, 0.12, 0.45, porcM, tx, 0.75, d.z0 + 3.35, g, 0.05); cyl(0.07, 0.09, 0.6, porcM, ax(7.25), 0.4, d.z0 + 3.35, g, 8);   // lavandino
      box(0.08, 0.5, 0.55, B.tint(0x9bd8ff), ax(7.55), 1.15, d.z0 + 3.35, g, 0.02);                                              // specchio
      cols.push([tx - 0.4, tx + 0.4, d.z0 + 3.1, d.z0 + 4.65]);
      B.bake(g);
    }

    // --- ampliamenti: corridoio e muro in fondo -------------------------------
    // Le due stanze dell'ultima fila condividono il muro in basso, che passa anche davanti al corridoio e lo chiude.
    const segments = [];
    for (let k = 0; k < L.ROWS; k++) {
      const g = group(k === 0), z0 = L.Z0 + k * L.ROOM_D;
      floor(-L.HW, L.HW, z0, z0 + L.ROOM_D, corrM, g, 0.055);
      for (let z = z0 + 0.5; z < z0 + L.ROOM_D - 0.8; z += 2) floor(-0.25, 0.25, z, z + 0.9, trimM, g, 0.07);
      B.bake(g); segments.push(g);
    }
    const endG = group(true), half = L.HW + L.ROOM_W, endCol = [-half, half, 0, 0];
    slab(half * 2 + 0.3, LOW + 0.03, TH + 0.06, wallM, 0, LOW / 2 + 0.06, 0, endG);
    slab(half * 2 + 0.36, 0.09, TH + 0.12, trimM, 0, LOW + 0.11, 0, endG);
    cols.push(endCol);
    const wing = { rows: 1, end: 0 };
    function expand(n) {
      wing.rows = Math.max(wing.rows, Math.min(L.ROWS, n + 1));
      wing.end = L.Z0 + wing.rows * L.ROOM_D;
      endG.position.z = wing.end; endCol[2] = wing.end - TH / 2; endCol[3] = wing.end + TH / 2;
      segments.forEach((g, k) => { g.visible = k < wing.rows; });
      rooms.forEach(r => { r.ghost.visible = !r.open && r.def.row < wing.rows; });
    }
    expand(0);

    // --- mensa --------------------------------------------------------------
    const M = L.mensa, mensa = { g: group(false), ghost: null, open: false };
    mensa.ghost = G.box(M.x1 - M.x0 - 0.2, 0.05, 7.8, mats.ghost, (M.x0 + M.x1) / 2, 0.03, (M.z0 + M.z1) / 2, null, 0.02); mensa.ghost.castShadow = false;
    function openMensa() {
      if (mensa.open) return;
      mensa.open = true; mensa.g.visible = true; mensa.ghost.visible = false;
      const g = mensa.g, outer = L.m > 0 ? M.x0 : M.x1;
      floor(M.x0, M.x1, M.z0, M.z1, B.tint(0xf2dcae), g, 0.06);
      wall(M.x0, M.z0 - TH / 2, M.x1, M.z0 + TH / 2, TALL, g); wall(M.x0, M.z1 - TH / 2, M.x1, M.z1 + TH / 2, 0.45, g);
      wall(outer - TH / 2, M.z0, outer + TH / 2, M.z1, TALL, g); doorWallZ(M.doorX, M.z0, M.z1, M.doorZ, 2.2, LOW, g);
      const done = {};
      L.seats.forEach(s => {
        const key = s.tx + ':' + s.z;
        if (!done[key]) {
          done[key] = 1;
          cyl(0.55, 0.55, 0.07, B.tint(TOWELS[Object.keys(done).length % TOWELS.length]), s.tx, 0.7, s.z, g, 18); cyl(0.07, 0.07, 0.65, mats.dark, s.tx, 0.36, s.z, g, 8);
          cols.push([s.tx - 0.45, s.tx + 0.45, s.z - 0.45, s.z + 0.45]);
        }
        box(0.42, 0.08, 0.42, mats.wood, s.x, 0.42, s.z, g, 0.02); box(0.08, 0.45, 0.42, mats.wood, s.x + (s.x < s.tx ? -0.2 : 0.2), 0.68, s.z, g, 0.02);
      });
      B.bake(g);
    }

    // --- sala cinema ---------------------------------------------------------
    const CI = L.cinema, cinema = { g: group(false), ghost: null, open: false, screen: null };
    cinema.ghost = G.box(CI.x1 - CI.x0 - 0.2, 0.05, 7.8, mats.ghost, (CI.x0 + CI.x1) / 2, 0.03, (CI.z0 + CI.z1) / 2, null, 0.02); cinema.ghost.castShadow = false;
    function openCinema() {
      if (cinema.open) return;
      cinema.open = true; cinema.g.visible = true; cinema.ghost.visible = false;
      const g = cinema.g, outer = L.m > 0 ? CI.x1 : CI.x0;
      floor(CI.x0, CI.x1, CI.z0, CI.z1, B.tint(0x4a3a5c), g, 0.06);
      wall(CI.x0, CI.z0 - TH / 2, CI.x1, CI.z0 + TH / 2, TALL, g); wall(CI.x0, CI.z1 - TH / 2, CI.x1, CI.z1 + TH / 2, 0.45, g);
      wall(outer - TH / 2, CI.z0, outer + TH / 2, CI.z1, TALL, g); doorWallZ(CI.doorX, CI.z0, CI.z1, CI.doorZ, 2.2, LOW, g);
      box(6.4, 2.2, 0.18, mats.dark, CI.cx, 1.8, CI.z0 + 0.25, g, 0.04);
      cinema.screen = new T.Mesh(new T.PlaneGeometry(6.0, 1.85), new T.MeshBasicMaterial({ color: 0x9fd3ff })); cinema.screen.position.set(CI.cx, 1.8, CI.z0 + 0.36); g.add(cinema.screen);
      L.chairs.forEach(c => { box(0.8, 0.25, 0.65, B.tint(0xc23b5a), c.x, 0.3, c.z, g, 0.08); box(0.8, 0.55, 0.16, B.tint(0xc23b5a), c.x, 0.65, c.z + 0.34, g, 0.07); });
      B.bake(g);
    }

    // tutto ciò che non è in un gruppo (caldaia, sgabuzzino, arco) si sposta nel gruppo fisso e si fonde
    scene.children.slice().forEach(o => { if (o.isMesh && o.userData.build) fixed.add(o); });
    B.bake(fixed);

    return { rooms, openRoom, expand, wing, mensa, openMensa, cinema, openCinema, flame, fireY };
  };
})(window.Rifugio);
